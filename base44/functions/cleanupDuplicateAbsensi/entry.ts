import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { cancelPelanggaranFromAlfa } from "../../shared/pelanggaranAlfa.ts";

// Pembersih duplikat Absensi: satu siswa + satu tanggal + satu jenis absensi = maksimal satu record.
// Pertahankan record TERAKHIR (created_date terbaru = koreksi final petugas), hapus sisanya,
// lalu rekonsiliasi pelanggaran Alfa otomatis terhadap status akhir (absensi = sumber kebenaran):
// bila record yang dihapus pernah Alfa tapi status akhir BUKAN Alfa -> batalkan pelanggaran sistem.
// dry_run: true (default) -> hanya scan & laporkan; false -> hapus + rekonsiliasi + sapu kembar pelanggaran.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Mendukung dua jalur: (1) invokasi manual oleh Admin/Kepsek (ada user),
    // (2) invokasi terjadwal oleh workflow harian (tanpa user -> service role).
    let user = null;
    try { user = await base44.auth.me(); } catch { user = null; }
    if (user && !["admin", "kepsek"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const svc = base44.asServiceRole.entities.Absensi;

    // 1) Kumpulkan seluruh tanggal unik lewat kursor batch 4000 (tidak terpotong batas baca data).
    const dates = new Set<string>();
    let cursor: string | null = null;
    while (true) {
      const query: any = cursor ? { tanggal: { $gt: cursor } } : {};
      const batch = await svc.filter(query, "tanggal", 4000);
      if (!batch || batch.length === 0) break;
      for (const r of batch) dates.add(r.tanggal);
      cursor = batch[batch.length - 1].tanggal;
      if (batch.length < 4000) break;
    }

    // 2) Per tanggal: grup per siswa_id + jenis_absensi (absensi Jumat yang sah tidak ikut).
    let twinSets = 0;
    const purgeIds: string[] = [];
    const toReconcile: any[] = [];
    const perDate: Record<string, number> = {};
    for (const tanggal of Array.from(dates).sort()) {
      const records = await svc.filter({ tanggal }, undefined, 5000);
      const groups: Record<string, any[]> = {};
      for (const r of records) {
        const key = `${r.siswa_id}|${r.jenis_absensi || "Kehadiran"}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      }
      for (const key of Object.keys(groups)) {
        const group = groups[key];
        if (group.length <= 1) continue;
        twinSets++;
        perDate[tanggal] = (perDate[tanggal] || 0) + (group.length - 1);
        group.sort((a: any, b: any) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());
        const keep = group[group.length - 1];
        const purge = group.slice(0, -1);
        for (const p of purge) purgeIds.push(p.id);
        // Rekonsiliasi: record terakhir BUKAN Alfa tapi yang dihapus pernah Alfa -> batalkan pelanggaran sistem.
        if (keep.status !== "Alfa" && purge.some((p: any) => p.status === "Alfa")) {
          toReconcile.push({ siswa_id: keep.siswa_id, tanggal, jenis_absensi: keep.jenis_absensi || "Kehadiran" });
        }
      }
    }

    // 3) Eksekusi: hapus kelebihan, rekonsiliasi pembatalan, lalu sapu bersih kembar pelanggaran.
    let recordsPurged = 0;
    let pelanggaranCancelled = 0;
    let pelanggaranCleanup: any = null;
    if (!dryRun && purgeIds.length > 0) {
      for (let i = 0; i < purgeIds.length; i += 500) {
        await svc.deleteMany({ id: { $in: purgeIds.slice(i, i + 500) } });
      }
      recordsPurged = purgeIds.length;
      for (const a of toReconcile) {
        try {
          const res = await cancelPelanggaranFromAlfa(base44, a);
          pelanggaranCancelled += res.cancelled || 0;
        } catch { /* lanjutkan pembersihan bila satu rekonsiliasi gagal */ }
      }
      // Jalankan pembersih duplikat pelanggaran yang sudah ada sekali untuk menyapu sisa kembar.
      try {
        const res = await base44.asServiceRole.functions.invoke("cleanupDuplicatePelanggaranAlfa", { dry_run: false });
        const data = res?.data ?? res;
        pelanggaranCleanup = { twin_sets: data?.twin_sets ?? 0, records_purged: data?.records_purged ?? 0 };
      } catch (e: any) {
        pelanggaranCleanup = { error: e?.message || "invoke_failed" };
      }
    }

    return Response.json({
      dry_run: dryRun,
      dates_scanned: dates.size,
      twin_sets: twinSets,
      duplicate_records: purgeIds.length,
      records_purged: recordsPurged,
      reconciliations: toReconcile.length,
      pelanggaran_cancelled: pelanggaranCancelled,
      pelanggaran_cleanup: pelanggaranCleanup,
      per_date: perDate,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}