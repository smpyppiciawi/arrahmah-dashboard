import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { BACKFILL_KETERANGAN, SISTEM_BACKFILL_ID, SISTEM_PELAPOR_NAMA } from "../../shared/pelanggaranAlfa.ts";

// Menghapus SEMUA data hasil backfill (tanpa memandang tanggal):
//  - Absensi dengan keterangan "Backfill otomatis"
//  - PelanggaranImprovement dengan pelapor_id "Sistem-Backfill" (backfill baru)
//  - PelanggaranImprovement lama berpelapor "Admin/Sistem" yang cocok dengan siswa+tanggal Absensi backfill
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
    const pairs = new Set((backfillAbs || []).map((a) => `${a.siswa_id}|${a.tanggal}`));

    let absensiDeleted = 0;
    const absIds = (backfillAbs || []).map((a) => a.id);
    for (const c of chunk(absIds, 500)) {
      await base44.asServiceRole.entities.Absensi.deleteMany({ id: { $in: c } });
      absensiDeleted += c.length;
    }

    // 2. PelanggaranImprovement hasil backfill baru (pelapor_id Sistem-Backfill)
    const newPel = await base44.asServiceRole.entities.PelanggaranImprovement.filter({ pelapor_id: SISTEM_BACKFILL_ID }, undefined, 20000);

    // 3. PelanggaranImprovement lama berpelapor "Admin/Sistem" yang cocok siswa+tanggal Absensi backfill
    const systemPel = await base44.asServiceRole.entities.PelanggaranImprovement.filter({ pelapor_nama: SISTEM_PELAPOR_NAMA }, undefined, 20000);
    const oldPel = (systemPel || []).filter((p) => pairs.has(`${p.siswa_id}|${p.tanggal}`));

    const pelIdSet = new Set<string>();
    for (const p of newPel || []) pelIdSet.add(p.id);
    for (const p of oldPel) pelIdSet.add(p.id);

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