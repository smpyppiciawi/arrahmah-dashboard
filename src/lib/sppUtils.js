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
 * Normalisasi nama iuran untuk pencocokan toleran variasi penamaan:
 * lowercase, 'smt' → 'semester', spasi ganda dirapatkan.
 */
export function normalizeIuranName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\bsmt\b/g, 'semester')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fallback generik transaksi lama per jenis iuran (uraian tanpa nama item spesifik)
const JENIS_IURAN_GENERIC_MATCH = {
  'Ujian': { tipe: 'Ujian Sekolah', kategori: 'Ujian' },
  'Awal Tahun': { tipe: 'Daftar Ulang', kategori: 'Daftar Ulang' },
};

/**
 * Ambil transaksi Keuangan siswa yang cocok dengan satu item TarifIuran.
 * Cocok bila: (a) uraian/tipe_transaksi sama persis nama item setelah
 * normalisasi, (b) uraian/tipe mengandung nama item — selama transaksi tidak
 * teridentifikasi ke item lain sejenis (siblings jenis_iuran sama), atau
 * (c) fallback legacy tipe/kategori generik untuk transaksi lama yang tidak
 * menyebut item spesifik. SPP tidak dicakup (tetap berbasis bulan_dibayar).
 */
export function matchIuranItemTransactions(tarif, keuanganList = [], allTarifs = []) {
  if (!tarif) return [];
  const isSpp = tarif.jenis_iuran === 'SPP' || (tarif.nama || '').toLowerCase().includes('spp');
  if (isSpp) {
    return keuanganList.filter(k =>
      (k.tipe_transaksi || '').toLowerCase().includes('spp') || (k.bulan_dibayar || []).length > 0
    );
  }
  const target = normalizeIuranName(tarif.nama);
  const siblings = (allTarifs.length > 0 ? allTarifs : [tarif]).filter(s => s.jenis_iuran === tarif.jenis_iuran);
  const generic = JENIS_IURAN_GENERIC_MATCH[tarif.jenis_iuran];
  const identifiesName = (text, name) => {
    const t = normalizeIuranName(text);
    const n = normalizeIuranName(name);
    return !!n && !!t && (t === n || t.includes(n));
  };
  return keuanganList.filter(k => {
    // (a) nama persis setelah normalisasi
    if (target && (normalizeIuranName(k.uraian) === target || normalizeIuranName(k.tipe_transaksi) === target)) return true;
    // transaksi teridentifikasi ke item lain sejenis → bukan untuk item ini
    const keItemLain = siblings.some(s =>
      s.id !== tarif.id &&
      (identifiesName(k.uraian, s.nama) || identifiesName(k.tipe_transaksi, s.nama))
    );
    if (keItemLain) return false;
    // (b) mengandung nama item (variasi penamaan, cth: tipe 'Ulangan PTS SMT 1')
    if (target && (identifiesName(k.uraian, tarif.nama) || identifiesName(k.tipe_transaksi, tarif.nama))) return true;
    // (c) fallback legacy: transaksi lama tanpa nama item spesifik
    if (generic && (k.tipe_transaksi === generic.tipe || k.kategori === generic.kategori)) return true;
    return false;
  });
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

  // Other iuran tunggakan (Ujian, Awal Tahun) — per item via pencocokan transaksi
  let otherTunggakan = 0;
  const otherJenis = ['Ujian', 'Awal Tahun'];
  const relevantTarifs = tarifList.filter(t => tarifMatchesTingkat(t, tingkat));
  relevantTarifs.forEach(t => {
    if (!otherJenis.includes(t.jenis_iuran)) return;
    // BiayaKhusus per siswa untuk tarif ini (skip jika gratis)
    const bk = biayaKhususList.find(b => b.tarif_iuran_id === t.id && b.siswa_id === siswa?.id);
    if (bk?.is_gratis) return;
    const tagihan = bk ? (bk.nominal_khusus || t.nominal || 0) : (t.nominal || 0);
    const trans = matchIuranItemTransactions(t, keuanganList, relevantTarifs);
    const dibayar = trans
      .filter(k => k.jenis !== 'Pengeluaran')
      .reduce((sum, k) => sum + (k.jumlah || 0), 0);
    otherTunggakan += Math.max(0, tagihan - dibayar);
  });

  return {
    total: sppTunggakan + biayaKhususTunggakan + otherTunggakan,
    sppTunggakan,
    biayaKhususTunggakan,
    otherTunggakan,
  };
}