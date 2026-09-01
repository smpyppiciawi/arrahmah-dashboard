import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { BACKFILL_KETERANGAN, SISTEM_BACKFILL_ID, SISTEM_PELAPOR_NAMA } from "../../shared/pelanggaranAlfa.ts";

// Menghapus SEMUA data hasil backfill (tanpa memandang tanggal):
//  - Absensi dengan keterangan "Backfill otomatis"
//  - PelanggaranImprovement berpelapor sistem SEMUanya: pelapor_nama "Admin/Sistem" (backfill lama, termasuk F-05 Jumat) dan pelapor_id "Sistem-Backfill" (backfill baru)
//    TANPA filter pencocokan siswa+tanggal agar tidak ada pelanggaran backfill yang tertinggal.
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "operator", "tu", "kepsek"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Tarik semua Absensi hasil backfill
    const backfillAbs = await base44.asServiceRole.entities.Absensi.filter({ keterangan: BACKFILL_KETERANGAN }, undefined, 20000);

    let absensiDeleted = 0;
    const absIds = (backfillAbs || []).map((a) => a.id);
    for (const c of chunk(absIds, 500)) {
      await base44.asServiceRole.entities.Absensi.deleteMany({ id: { $in: c } });
      absensiDeleted += c.length;
    }

    // 2. Hapus SEMUA PelanggaranImprovement berpelapor sistem (tanpa filter pencocokan siswa+tanggal)
    //    - pelapor_nama "Admin/Sistem" (backfill lama, termasuk F-05 Jumat)
    //    - pelapor_id "Sistem-Backfill" (backfill baru)
    const adminPel = await base44.asServiceRole.entities.PelanggaranImprovement.filter({ pelapor_nama: SISTEM_PELAPOR_NAMA }, undefined, 20000);
    const sistemPel = await base44.asServiceRole.entities.PelanggaranImprovement.filter({ pelapor_id: SISTEM_BACKFILL_ID }, undefined, 20000);

    const pelIdSet = new Set<string>();
    for (const p of adminPel || []) pelIdSet.add(p.id);
    for (const p of sistemPel || []) pelIdSet.add(p.id);

    let pelanggaranDeleted = 0;
    for (const c of chunk([...pelIdSet], 500)) {
      await base44.asServiceRole.entities.PelanggaranImprovement.deleteMany({ id: { $in: c } });
      pelanggaranDeleted += c.length;
    }

    return Response.json({
      status: "success",
      absensiDeleted,
      pelanggaranDeleted,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}