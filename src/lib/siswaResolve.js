// Mencari record Siswa dari sebuah baris laporan (absensi, izin, UKS, prestasi,
// home visit, pelanggaran, dll). Dipakai agar setiap baris laporan bisa diklik
// dan menampilkan popup detail siswa (read-only) beserta fotonya.

export function resolveSiswa(row, siswaList = []) {
  if (!row || !Array.isArray(siswaList) || siswaList.length === 0) return null;

  if (row.siswa_id) {
    const byId = siswaList.find(s => s.id === row.siswa_id);
    if (byId) return byId;
  }
  if (row.siswaId) {
    const byId = siswaList.find(s => s.id === row.siswaId);
    if (byId) return byId;
  }
  if (row.nis) {
    const byNis = siswaList.find(s => String(s.nis) === String(row.nis));
    if (byNis) return byNis;
  }
  // Baris siswa langsung (panel Data Siswa / Belum Home Visit)
  if (row.nama && row.nama_kelas && row.nis === undefined) {
    return siswaList.find(s => s.nama === row.nama && s.nama_kelas === row.nama_kelas) || null;
  }
  if (row.nama_siswa) {
    return siswaList.find(s => s.nama === row.nama_siswa) || null;
  }
  return null;
}