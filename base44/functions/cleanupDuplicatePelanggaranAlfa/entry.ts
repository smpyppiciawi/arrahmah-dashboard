import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { SISTEM_PELAPOR_NAMA, SISTEM_BACKFILL_NAMA } from "../../shared/pelanggaranAlfa.ts";

// Pembersihan satu-kali data ganda PelanggaranImprovement pelapor sistem (Admin/Sistem & Sistem-Backfill).
// dry_run: true (default) -> hanya scan & laporkan kembar; false -> hapus record kelebihan (keep oldest).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "kepsek"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;

    const SISTEM_PELAPOR = [SISTEM_PELAPOR_NAMA, SISTEM_BACKFILL_NAMA];
    const [a, b] = await Promise.all([
      base44.asServiceRole.entities.PelanggaranImprovement.filter({ pelapor_nama: SISTEM_PELAPOR_NAMA }, undefined, 20000),
      base44.asServiceRole.entities.PelanggaranImprovement.filter({ pelapor_nama: SISTEM_BACKFILL_NAMA }, undefined, 20000),
    ]);
    const all = [...(a || []), ...(b || [])].filter((p) => p.status !== "Dibatalkan");

    // Group by siswa_id|tanggal|kode
    const groups: Record<string, any[]> = {};
    for (const p of all) {
      const key = `${p.siswa_id}|${p.tanggal}|${p.kode}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }

    const flagged: any[] = [];
    let purgeIds: string[] = [];
    let pointsRestored = 0;
    let twinSets = 0;

    for (const key of Object.keys(groups)) {
      const group = groups[key];
      if (group.length <= 1) continue;
      twinSets++;
      group.sort((x, y) => new Date(x.created_date).getTime() - new Date(y.created_date).getTime());
      const keep = group[0];
      const purge = group.slice(1);
      flagged.push({
        id: keep.id, nama_siswa: keep.nama_siswa, nama_kelas: keep.nama_kelas,
        nis: keep.nis, tanggal: keep.tanggal, kode: keep.kode, poin: keep.poin,
        status: keep.status, created_date: keep.created_date, action: "keep",
      });
      for (const p of purge) {
        flagged.push({
          id: p.id, nama_siswa: p.nama_siswa, nama_kelas: p.nama_kelas,
          nis: p.nis, tanggal: p.tanggal, kode: p.kode, poin: p.poin,
          status: p.status, created_date: p.created_date, action: "purge",
        });
        pointsRestored += p.poin || 0;
        purgeIds.push(p.id);
      }
    }

    flagged.sort((x, y) => x.tanggal.localeCompare(y.tanggal) || x.nama_siswa.localeCompare(y.nama_siswa));

    if (!dryRun && purgeIds.length > 0) {
      for (let i = 0; i < purgeIds.length; i += 500) {
        await base44.asServiceRole.entities.PelanggaranImprovement.deleteMany({
          id: { $in: purgeIds.slice(i, i + 500) },
        });
      }
    }

    return Response.json({
      dry_run: dryRun,
      twin_sets: twinSets,
      flagged,
      records_purged: dryRun ? 0 : purgeIds.length,
      points_restored: dryRun ? 0 : pointsRestored,
      guard_source: SISTEM_PELAPOR,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}