import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { BACKFILL_KETERANGAN, SISTEM_BACKFILL_ID, SISTEM_PELAPOR_NAMA } from "../../shared/pelanggaranAlfa.ts";

// Menghapus SEMUA data hasil backfill (tanpa memandang tanggal):
//  - Absensi dengan keterangan "Backfill otomatis"
//  - PelanggaranImprovement berpelapor sistem SEMUanya: pelapor_nama "Admin/Sistem" (backfill lama, termasuk F-05 Jumat) dan pelapor_id "Sistem-Backfill" (backfill baru)
//    TANPA filter pencocokan siswa+tanggal agar tidak ada pelanggaran backfill yang tertinggal.
// Pakai deleteMany by-query (bukan fetch-by-id) supaya tidak tercap limit 5000 hasil fetch dan semua record terhapus.

// Loop deleteMany by-query hingga tidak ada lagi match (mengakomodasi limit internal jika ada).
async function deleteAllByQuery(entity: any, query: Record<string, any>): Promise<number> {
  let total = 0;
  let guard = 0;
  while (guard < 1000) {
    const res: any = await entity.deleteMany(query);
    const n = res?.deleted ?? 0;
    total += n;
    guard++;
    if (n === 0) break;
  }
  return total;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "operator", "tu", "kepsek"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Hapus SEMUA Absensi hasil backfill (keterangan "Backfill otomatis")
    const absensiDeleted = await deleteAllByQuery(
      base44.asServiceRole.entities.Absensi,
      { keterangan: BACKFILL_KETERANGAN }
    );

    // 2. Hapus SEMUA PelanggaranImprovement berpelapor sistem
    //    - pelapor_nama "Admin/Sistem" (backfill lama, termasuk F-05 Jumat)
    //    - pelapor_id "Sistem-Backfill" (backfill baru)
    const adminDeleted = await deleteAllByQuery(
      base44.asServiceRole.entities.PelanggaranImprovement,
      { pelapor_nama: SISTEM_PELAPOR_NAMA }
    );
    const backfillDeleted = await deleteAllByQuery(
      base44.asServiceRole.entities.PelanggaranImprovement,
      { pelapor_id: SISTEM_BACKFILL_ID }
    );

    return Response.json({
      status: "success",
      absensiDeleted,
      pelanggaranDeleted: adminDeleted + backfillDeleted,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}