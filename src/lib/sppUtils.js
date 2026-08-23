// Shared utilities for SPP / Tarif Iuran / Biaya Khusus logic

export const BULAN_SPP = [
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'
];

export const SPP_JULI_THRESHOLD = 150000;

/**
 * Get tingkat from a siswa object using kelasList or nama_kelas fallback
 */
export function getTingkat(siswa, kelasList = []) {
  if (siswa?.kelas_id && kelasList.length > 0) {
    const kelas = kelasList.find(k => k.id === siswa.kelas_id);
    if (kelas?.tingkat) return kelas.tingkat;
  }
  return siswa?.nama_kelas?.[0] || '';
}

/**
 * Check if a tarif applies to a given tingkat
 */
export function tarifMatchesTingkat(tarif, tingkat) {
  if (!tingkat) return true;
  const arr = Array.isArray(tarif.tingkat) ? tarif.tingkat : (tarif.tingkat ? [tarif.tingkat] : ['Semua']);
  return arr.includes('Semua') || arr.includes(tingkat);
}

/**
 * Get gratis SPP months for a student based on BiayaKhusus records:
 * - PPDB Gel 1: spp_gratis_bulan_pertama → Juli free
 * - PPDB Gel 2: sudah_bayar > 150,000 → Juli free
 * - Prestasi: manual gratis_bulan_spp array
 */
export function getGratisBulanSPP(siswaId, biayaKhususList = [], tarifIuranList = []) {
  const gratis = new Set();
  biayaKhususList
    .filter(b => b.siswa_id === siswaId)
    .forEach(b => {
      const tarif = tarifIuranList.find(t => t.id === b.tarif_iuran_id);
      if (!tarif) return;
      // PPDB Gel 1: spp_gratis_bulan_pertama
      if (tarif.jenis_iuran === 'PPDB Gel 1' && tarif.spp_gratis_bulan_pertama) {
        gratis.add('Juli');
      }
      // PPDB Gel 2: sudah_bayar > 150,000
      if (tarif.jenis_iuran === 'PPDB Gel 2' && (b.sudah_bayar || 0) > SPP_JULI_THRESHOLD) {
        gratis.add('Juli');
      }
      // Prestasi: manual gratis_bulan_spp
      if (b.kategori === 'Prestasi' && Array.isArray(b.gratis_bulan_spp)) {
        b.gratis_bulan_spp.forEach(m => gratis.add(m));
      }
    });
  return [...gratis];
}

/**
 * Get the SPP tarif (Bulanan) for a student based on tingkat
 */
export function getSppTarif(tarifIuranList = [], tingkat = '') {
  return tarifIuranList.find(t =>
    t.nama?.toLowerCase().includes('spp') &&
    t.periode === 'Bulanan' &&
    tarifMatchesTingkat(t, tingkat)
  );
}