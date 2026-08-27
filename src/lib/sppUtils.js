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

/**
 * Format date string (yyyy-MM-dd or ISO) to DD-MM-YYYY (Indonesian)
 */
export function formatDateID(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Compute total tunggakan (arrears) for a student.
 * @param {object} siswa - siswa record
 * @param {array} keuanganList - siswa's Keuangan records
 * @param {array} tarifList - active TarifIuran list
 * @param {array} biayaKhususList - siswa's BiayaKhusus records
 * @returns {object} { total, sppTunggakan, biayaKhususTunggakan, otherTunggakan }
 */
export function computeTunggakan(siswa, keuanganList = [], tarifList = [], biayaKhususList = []) {
  const tingkat = siswa?.nama_kelas?.charAt(0) || '';
  const gratisMonths = getGratisBulanSPP(siswa?.id, biayaKhususList, tarifList);
  const gratisSet = new Set(gratisMonths);
  const sppTarif = getSppTarif(tarifList, tingkat);

  // SPP tunggakan: unpaid non-gratis months
  let sppTunggakan = 0;
  if (sppTarif) {
    const sppRecords = keuanganList.filter(k => k.tipe_transaksi === 'SPP/Bulanan');
    const paidMonths = new Set();
    sppRecords.forEach(r => {
      if (r.bulan_dibayar && Array.isArray(r.bulan_dibayar)) {
        r.bulan_dibayar.forEach(m => paidMonths.add(m));
      }
    });
    const unpaidCount = BULAN_SPP.filter(m => !paidMonths.has(m) && !gratisSet.has(m)).length;
    sppTunggakan = unpaidCount * (sppTarif.nominal || 0);
  }

  // BiayaKhusus tunggakan (Mutasi, PPDB): nominal_khusus - sudah_bayar (non-gratis)
  let biayaKhususTunggakan = 0;
  biayaKhususList.forEach(b => {
    if (b.is_gratis) return;
    const sisa = Math.max(0, (b.nominal_khusus || 0) - (b.sudah_bayar || 0));
    biayaKhususTunggakan += sisa;
  });

  // Other iuran tunggakan (Ujian, Daftar Ulang, Kelulusan) — if not paid
  let otherTunggakan = 0;
  const relevantTarifs = tarifList.filter(t => tarifMatchesTingkat(t, tingkat));
  const otherJenis = ['Ujian Sekolah', 'Daftar Ulang', 'Kelulusan'];
  relevantTarifs.forEach(t => {
    if (!otherJenis.includes(t.jenis_iuran)) return;
    // Check if student has a BiayaKhusus for this tarif (skip if gratis)
    const bk = biayaKhususList.find(b => b.tarif_iuran_id === t.id);
    if (bk?.is_gratis) return;
    const paid = keuanganList.some(k =>
      k.tipe_transaksi === t.jenis_iuran ||
      (t.jenis_iuran === 'Ujian Sekolah' && k.kategori === 'Ujian') ||
      (t.jenis_iuran === 'Daftar Ulang' && k.kategori === 'Daftar Ulang')
    );
    if (!paid) {
      otherTunggakan += bk ? (bk.nominal_khusus || t.nominal || 0) : (t.nominal || 0);
    }
  });

  return {
    total: sppTunggakan + biayaKhususTunggakan + otherTunggakan,
    sppTunggakan,
    biayaKhususTunggakan,
    otherTunggakan,
  };
}