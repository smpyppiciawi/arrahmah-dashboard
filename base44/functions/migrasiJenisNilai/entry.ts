import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

// Migrasi satu kali format jenis penilaian Nilai ke skema baru (Kategori Nilai Harian / Nilai Ujian):
// - "Ulangan Harian" -> kategori "Nilai Harian", jenis "Harian", label dari kompetensi_bab (default "Nilai Harian")
// - "Tugas"          -> kategori "Nilai Harian", jenis "Harian", label kompetensi_bab || "Tugas" (label mengikuti nama asal)
// - "Praktik"        -> kategori "Nilai Harian", jenis "Harian", label kompetensi_bab || "Praktik" (label mengikuti nama asal)
// - "PTS"/"PAS"      -> kategori "Nilai Ujian" (jenis tetap, label & kompetensi dikosongkan)
// - "Harian"/"US"/"UP" (sudah format baru) -> kategori dipastikan
// Angka nilai, kkm & status_ketuntasan tidak diubah.
// dry_run true (default) = hanya scan & laporkan; false = eksekusi.
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

    // Muat seluruh record per halaman 1.000 (sort "id" — aman dari artefak paginasi)
    const all: any[] = [];
    let skip = 0;
    while (true) {
      const batch = await svc.list("id", 1000, skip);
      if (!batch || batch.length === 0) break;
      all.push(...batch);
      if (batch.length < 1000) break;
      skip += 1000;
    }

    const HARIAN_LAMA = ["Ulangan Harian", "Tugas", "Praktik"];
    const UJIAN = ["PTS", "PAS", "US", "UP"];

    const updates: any[] = [];
    let harianDikonversi = 0;
    let ujianDikonversi = 0;
    const contoh: any[] = [];

    for (const r of all) {
      const j = String(r.jenis_penilaian || "").trim();
      let data: any = null;

      if (HARIAN_LAMA.includes(j)) {
        const label = (String(r.kompetensi_bab || "").trim()) || j;
        data = { kategori: "Nilai Harian", jenis_penilaian: "Harian", kompetensi_bab: label, label };
        harianDikonversi++;
      } else if (UJIAN.includes(j)) {
        if (r.kategori === "Nilai Ujian" && j !== "Harian") continue; // sudah benar
        data = { kategori: "Nilai Ujian", kompetensi_bab: "", label: "" };
        ujianDikonversi++;
      } else {
        continue; // jenis tidak dikenal — biarkan
      }

      if (contoh.length < 10) {
        contoh.push({ id: r.id, jenis_lama: j, siswa: r.nama_siswa, mapel: r.mapel, menjadi: data });
      }
      updates.push({ id: r.id, ...data });
    }

    let applied = 0;
    if (!dryRun && updates.length > 0) {
      for (let i = 0; i < updates.length; i += 500) {
        await svc.bulkUpdate(updates.slice(i, i + 500));
      }
      applied = updates.length;
    }

    return Response.json({
      dry_run: dryRun,
      total_record: all.length,
      perlu_migrasi: updates.length,
      nilai_harian_dikonversi: harianDikonversi,
      nilai_ujian_dikonversi: ujianDikonversi,
      dieksekusi: dryRun ? 0 : applied,
      contoh: contoh,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}