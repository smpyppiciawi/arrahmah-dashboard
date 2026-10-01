// Helper tampilan Pelapor & Pencatat untuk record PelanggaranImprovement.
// Record baru: pencatat_nama terpisah, pelapor_nama = nama pelapor (bisa manual/non-pegawai).
// Record lama (sebelum field pencatat): pelapor_nama menyimpan pencatat piket —
// ditampilkan sebagai Pencatat, Pelapor tidak diketahui.
export function getNamaPelapor(p = {}) {
  if (!p.pencatat_nama) return '-';
  return p.pelapor_nama || '-';
}

export function getNamaPencatat(p = {}) {
  return p.pencatat_nama || p.pelapor_nama || '-';
}