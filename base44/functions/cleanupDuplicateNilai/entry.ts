import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Pembersih & normalisasi data Nilai (Menu Nilai):
// 1) Isi jenis_penilaian kosong/tidak valid -> "Ulangan Harian" (format lama -> format baru,
//    angka nilai tidak diubah).
// 2) Isi kkm & status_ketuntasan yang kosong berdasarkan nilai dan KKM (default 75).
// 3) Hapus record kembar (siswa_id + mapel + jenis_penilaian + semester + tahun_ajaran sama),
//    mempertahankan yang TERBARU (updated_date paling baru).
// dry_run true (default) = hanya scan & laporkan; false = eksekusi normalisasi + penghapusan.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch { user = null; }
    if (user && !["admin", "kepsek"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const svc = base44.asServiceRole.entities.Nilai;

    // 1) Muat seluruh record per halaman 1.000 (bentuk array + skip — aman dari batas baca 5.000)
    const all: any[] = [];
    let skip = 0;
    while (true) {
      const batch = await svc.list("id", 1000, skip);
      if (!batch || batch.length === 0) break;
      all.push(...batch);
      if (batch.length < 1000) break;
      skip += 1000;
    }

    const JENIS_VALID = ["Ulangan Harian", "Tugas", "PTS", "PAS", "Praktik"];
    const jenisValid = (v: any) => JENIS_VALID.includes(String(v || "").trim());
    const jenisOf = (r: any) => (jenisValid(r.jenis_penilaian) ? String(r.jenis_penilaian).trim() : "Ulangan Harian");

    // 2) Normalisasi format lama: jenis_penilaian kosong & kkm/status kosong
    const jenisFixIds: string[] = [];
    const kkmFixes: any[] = [];
    for (const r of all) {
      if (!jenisValid(r.jenis_penilaian)) jenisFixIds.push(r.id);
      if (!r.kkm || !r.status_ketuntasan) {
        const kkm = r.kkm || 75;
        kkmFixes.push({ id: r.id, kkm, status_ketuntasan: (r.nilai ?? 0) >= kkm ? "Tuntas" : "Belum Tuntas" });
      }
    }

    // 3) Kelompokkan kembar dengan jenis yang sudah dinormalisasi
    const groups: Record<string, any[]> = {};
    for (const r of all) {
      const key = [
        r.siswa_id || "",
        String(r.mapel || "").trim(),
        jenisOf(r),
        r.semester || "",
        r.tahun_ajaran || "",
      ].join("|");
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }

    const purgeIds: string[] = [];
    const contoh: any[] = [];
    for (const key of Object.keys(groups)) {
      const group = groups[key];
      if (group.length <= 1) continue;
      group.sort((a: any, b: any) =>
        new Date(b.updated_date || b.created_date || 0).getTime() -
        new Date(a.updated_date || a.created_date || 0).getTime()
      );
      const purge = group.slice(1);
      for (const p of purge) purgeIds.push(p.id);
      if (contoh.length < 10) {
        contoh.push({
          kombinasi: key,
          dipertahankan: { id: group[0].id, nilai: group[0].nilai, updated: group[0].updated_date || group[0].created_date },
          dihapus: purge.map((p: any) => ({ id: p.id, nilai: p.nilai, updated: p.updated_date || p.created_date })),
        });
      }
    }

    let jenisPenilaianFixed = 0;
    let kkmStatusFixed = 0;
    let recordsPurged = 0;

    if (!dryRun) {
      if (jenisFixIds.length > 0) {
        for (let i = 0; i < jenisFixIds.length; i += 500) {
          await svc.updateMany(
            { id: { $in: jenisFixIds.slice(i, i + 500) } },
            { $set: { jenis_penilaian: "Ulangan Harian" } }
          );
        }
        jenisPenilaianFixed = jenisFixIds.length;
      }
      if (kkmFixes.length > 0) {
        for (let i = 0; i < kkmFixes.length; i += 500) {
          await svc.bulkUpdate(kkmFixes.slice(i, i + 500));
        }
        kkmStatusFixed = kkmFixes.length;
      }
      for (let i = 0; i < purgeIds.length; i += 500) {
        await svc.deleteMany({ id: { $in: purgeIds.slice(i, i + 500) } });
      }
      recordsPurged = purgeIds.length;
    }

    return Response.json({
      dry_run: dryRun,
      total_sebelum: all.length,
      total_setelah: all.length - purgeIds.length,
      kelompok_duplikat: Object.keys(groups).filter((k) => groups[k].length > 1).length,
      duplikat_dihapus: purgeIds.length,
      jenis_penilaian_diperbaiki: jenisPenilaianFixed,
      jenis_penilaian_perlu_perbaikan: jenisFixIds.length,
      kkm_status_diperbaiki: kkmStatusFixed,
      kkm_status_perlu_perbaikan: kkmFixes.length,
      contoh_duplikat: contoh,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}