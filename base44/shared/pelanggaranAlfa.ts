// Shared logic: buat / batalkan PelanggaranImprovement otomatis dari Absensi berstatus Alfa.
// Dipakai oleh backend function "autoPelanggaranAlfa" (workflow trigger), "backfillAlfa" (backfill massal), dan "cancelBackfill".

export const SISTEM_PELAPOR_ID = "Admin/Sistem";
export const SISTEM_PELAPOR_NAMA = "Admin/Sistem";
export const SISTEM_BACKFILL_ID = "Sistem-Backfill";
export const SISTEM_BACKFILL_NAMA = "Sistem-Backfill";
export const BACKFILL_KETERANGAN = "Backfill otomatis";

export const KODE_KEHADIRAN = "F-02"; // Tidak hadir sekolah tanpa keterangan (Alpha)
export const KODE_JUMAT = "F-05";     // Meninggalkan kegiatan nonakademis wajib tanpa izin
export const RINCIAN_JUMAT = "Tidak Mengikuti Salat Jumat di sekolah";

export function kodeByJenis(jenisAbsensi) {
  return jenisAbsensi === "Jumat" ? KODE_JUMAT : KODE_KEHADIRAN;
}

export async function getTahunAjaranAktif(base44) {
  const settings = await base44.asServiceRole.entities.PengaturanAplikasi.list("-updated_date", 1);
  return settings?.[0]?.tahun_ajaran_aktif || "";
}

// Master switch: true jika fitur backfill & auto-pelanggaran Alfa aktif (default true jika belum diatur).
export async function getBackfillAktif(base44) {
  const settings = await base44.asServiceRole.entities.PengaturanAplikasi.list("-updated_date", 1);
  return settings?.[0]?.backfill_aktif !== false;
}

export async function getKodeData(base44, kode) {
  const list = await base44.asServiceRole.entities.KodePelanggaranImprovement.filter({ kode });
  if (!list || list.length === 0) return null;
  return list.find((k) => k.aktif !== false) || list[0];
}

// Susun object record PelanggaranImprovement (tanpa IO) dari data absensi + data kode.
export function buildPelanggaranRecord(kodeData, absensi, tahunAjaran, pelaporId = SISTEM_PELAPOR_ID, pelaporNama = SISTEM_PELAPOR_NAMA) {
  const { siswa_id, nis, nama_siswa, kelas_id, nama_kelas, tanggal, jenis_absensi } = absensi;
  const rincian = jenis_absensi === "Jumat" ? RINCIAN_JUMAT : (kodeData.rincian || "");
  return {
    tanggal,
    siswa_id,
    nis: nis || "",
    nama_siswa,
    kelas_id: kelas_id || "",
    nama_kelas: nama_kelas || "",
    kode_pelanggaran_id: kodeData.id,
    kategori_utama: kodeData.kategori_utama || "",
    kode: kodeData.kode,
    uraian_pelanggaran: kodeData.uraian || "",
    rincian,
    tindak_lanjut: kodeData.tindak_lanjut || "",
    poin_min: kodeData.poin_min || 0,
    poin_max: kodeData.poin_max || 0,
    poin: kodeData.poin_min || 0,
    pelapor_id: pelaporId,
    pelapor_nama: pelaporNama,
    tahun_ajaran: tahunAjaran,
    // Poin >= 100 otomatis Pending (belum terakumulasi sebelum approval)
    status: (kodeData.poin_min || 0) >= 100 ? "Pending" : "Proses",
  };
}

// Buat PelanggaranImprovement dari sebuah Absensi Alfa (dipanggil workflow).
// Dedup dua lapis: (1) pre-check lewati jika record sistem aktif sudah ada,
// (2) re-check race-condition guard — hapus record kembar (keep oldest) bila
// eksekusi paralel sama-sama lolos pre-check.
export async function createPelanggaranFromAlfa(base44, absensi) {
  const { siswa_id, tanggal, jenis_absensi } = absensi;
  if (!siswa_id || !tanggal) return { skipped: true, reason: "missing_fields" };
  const kode = kodeByJenis(jenis_absensi);
  const tahunAjaran = await getTahunAjaranAktif(base44);
  const kodeData = await getKodeData(base44, kode);
  if (!kodeData) return { skipped: true, reason: "kode_not_found" };

  const SISTEM_PELAPOR = [SISTEM_PELAPOR_NAMA, SISTEM_BACKFILL_NAMA];
  const existing = await base44.asServiceRole.entities.PelanggaranImprovement.filter({
    siswa_id, tanggal, kode,
  });
  const activeSistem = (existing || []).filter(
    (p) => SISTEM_PELAPOR.includes(p.pelapor_nama) && p.status !== "Dibatalkan"
  );
  if (activeSistem.length > 0) return { skipped: true, reason: "duplicate" };

  const record = buildPelanggaranRecord(kodeData, absensi, tahunAjaran);
  await base44.asServiceRole.entities.PelanggaranImprovement.create(record);

  // Race-condition guard: re-query setelah create, hapus kelebihan (keep oldest).
  let removedDuplicates = 0;
  const recheck = await base44.asServiceRole.entities.PelanggaranImprovement.filter({
    siswa_id, tanggal, kode,
  });
  const activeRecheck = (recheck || [])
    .filter((p) => SISTEM_PELAPOR.includes(p.pelapor_nama) && p.status !== "Dibatalkan")
    .sort((a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());
  if (activeRecheck.length > 1) {
    const overflow = activeRecheck.slice(1).map((p) => p.id);
    await base44.asServiceRole.entities.PelanggaranImprovement.deleteMany({ id: { $in: overflow } });
    removedDuplicates = overflow.length;
  }
  return { created: true, removedDuplicates };
}

// Batalkan (set status "Dibatalkan") record pelanggaran sistem yang cocok untuk siswa+tanggal+jenis.
export async function cancelPelanggaranFromAlfa(base44, absensi) {
  const { siswa_id, tanggal, jenis_absensi } = absensi;
  if (!siswa_id || !tanggal) return { cancelled: 0 };
  const kode = kodeByJenis(jenis_absensi);
  // Cakup kedua pelapor sistem: Admin/Sistem (input petugas/workflow) & Sistem-Backfill (backfill massal),
  // agar koreksi absensi hasil backfill dari Alfa juga membatalkan pelanggarannya.
  const [a, b] = await Promise.all([
    base44.asServiceRole.entities.PelanggaranImprovement.filter({
      siswa_id, tanggal, kode, pelapor_nama: SISTEM_PELAPOR_NAMA,
    }),
    base44.asServiceRole.entities.PelanggaranImprovement.filter({
      siswa_id, tanggal, kode, pelapor_nama: SISTEM_BACKFILL_NAMA,
    }),
  ]);
  const existing = [...(a || []), ...(b || [])];
  const activeIds = existing.filter((p) => p.status !== "Dibatalkan").map((p) => p.id);
  if (activeIds.length === 0) return { cancelled: 0 };
  await base44.asServiceRole.entities.PelanggaranImprovement.updateMany(
    { id: { $in: activeIds } },
    { $set: { status: "Dibatalkan" } }
  );
  return { cancelled: activeIds.length };
}