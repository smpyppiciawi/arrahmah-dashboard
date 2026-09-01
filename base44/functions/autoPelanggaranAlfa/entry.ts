import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { createPelanggaranFromAlfa, cancelPelanggaranFromAlfa } from "../../shared/pelanggaranAlfa.ts";

// Dipanggil oleh workflow "Pelanggaran Otomatis Alfa" (entity trigger pada Absensi).
// Payload: { action: "create" | "cancel", absensi: { siswa_id, nis, nama_siswa, kelas_id, nama_kelas, tanggal, jenis_absensi } }
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, absensi } = body || {};
    if (!absensi || !absensi.siswa_id || !absensi.tanggal) {
      return Response.json({ error: "Missing absensi fields" }, { status: 400 });
    }
    let result;
    if (action === "cancel") {
      result = await cancelPelanggaranFromAlfa(base44, absensi);
    } else {
      result = await createPelanggaranFromAlfa(base44, absensi);
    }
    return Response.json({ ok: true, action, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}