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
  // Setoran Iuran Muka bukan pembayaran iuran tahun ini — kecualikan dari hitungan
  const keuanganNonMuka = keuanganList.filter(k => !k.is_iuran_muka);
  const gratisMonths = getGratisBulanSPP(siswa?.id, biayaKhususList, tarifList);
  const gratisSet = new Set(gratisMonths);
  const sppTarif = getSppTarif(tarifList, tingkat);

  // SPP tunggakan: unpaid non-gratis months
  let sppTunggakan = 0;
  if (sppTarif) {
    const sppRecords = keuanganNonMuka.filter(k => k.tipe_transaksi === 'SPP/Bulanan');
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
    const trans = matchIuranItemTransactions(t, keuanganNonMuka, relevantTarifs);
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

// =====================================================================
// STATUS KEUANGAN TERPUSAT
// Satu logika untuk Laporan Tunggakan Bendahara, Akun Siswa (Portal),
// Wali Kelas, dan Kelola Data — semua modul menampilkan angka yang sama.
// Status tiga tingkat: Lunas (sisa 0), Cicilan (dibayar sebagian),
// Menunggak (belum membayar sama sekali). SPP dihitung dua angka:
// sisa jatuh tempo (Juli s/d bulan berjalan) dan sisa setahun (12 bulan).
// =====================================================================

export const PER_SISWA_JENIS = ['Mutasi', 'PPDB Gel 1', 'PPDB Gel 2'];

const NAMA_BULAN_KALENDER = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/**
 * Bulan SPP yang sudah jatuh tempo: Juli s/d bulan berjalan (urutan TA Juli-Juni).
 */
export function bulanJatuhTempo(asOf = new Date()) {
  const d = asOf instanceof Date ? asOf : new Date(asOf);
  if (isNaN(d)) return [...BULAN_SPP];
  const idx = BULAN_SPP.indexOf(NAMA_BULAN_KALENDER[d.getMonth()]);
  if (idx < 0) return [...BULAN_SPP];
  return BULAN_SPP.slice(0, idx + 1);
}

const statusDariSisa = (tagihan, dibayar, sisa) => {
  if (tagihan <= 0 || sisa <= 0) return 'Lunas';
  return dibayar > 0 ? 'Cicilan' : 'Menunggak';
};

/**
 * Hitung status keuangan satu siswa dengan logika tunggal.
 * @param {object} siswa - record Siswa
 * @param {array} keuanganList - seluruh transaksi Keuangan siswa (tanpa filter TA)
 * @param {array} tarifList - daftar TarifIuran
 * @param {array} biayaKhususList - seluruh BiayaKhusus (difilter per siswa di sini)
 * @param {array} kelasList - daftar Kelas (untuk tingkat)
 * @param {string} tahunAjaran - TA terpilih; '' = semua tahun (toleran: data tanpa TA tetap dihitung)
 * @param {Date} asOf - tanggal acuan jatuh tempo (default hari ini)
 * @param {string|null} iuranNama - batasi ke satu item tarif (filter iuran laporan)
 * @returns {object} { items, totalTagihan, totalDibayar, sisaJatuhTempo, sisaSetahun, status }
 */
export function computeStatusKeuangan({
  siswa,
  keuanganList = [],
  tarifList = [],
  biayaKhususList = [],
  kelasList = [],
  tahunAjaran = '',
  asOf = new Date(),
  iuranNama = null,
}) {
  const tingkat = getTingkat(siswa, kelasList) || '';
  const taCocok = (ta) => !tahunAjaran || !ta || ta === tahunAjaran;

  // Pembayaran yang diakui: pemasukan dalam TA terpilih (data lama tanpa TA tetap dihitung).
  // Setoran Iuran Muka TIDAK dihitung sebagai pembayaran iuran — saldo diterapkan
  // sebagai transaksi resmi (aplikasi_iuran_muka) saat tahun tujuan tiba.
  const payments = keuanganList.filter(k =>
    k.jenis !== 'Pengeluaran' && !k.is_iuran_muka && taCocok(k.tahun_ajaran)
  );

  const bkSiswa = biayaKhususList.filter(b =>
    b.siswa_id === siswa?.id && taCocok(b.tahun_ajaran)
  );

  const gratisSet = new Set(getGratisBulanSPP(siswa?.id, biayaKhususList, tarifList));

  const relevantTarifs = tarifList.filter(t =>
    t.status !== 'Tidak Aktif' &&
    tarifMatchesTingkat(t, tingkat) &&
    taCocok(t.tahun_ajaran) &&
    (!iuranNama || t.nama === iuranNama)
  );

  const items = [];

  // --- SPP (bulanan): dua angka — jatuh tempo & setahun ---
  const sppTarif = getSppTarif(relevantTarifs, tingkat);
  if (sppTarif) {
    const trans = matchIuranItemTransactions(sppTarif, payments, relevantTarifs);
    const dibayar = trans.reduce((s, k) => s + (k.jumlah || 0), 0);
    const paidMonths = new Set();
    trans.forEach(r => (r.bulan_dibayar || []).forEach(m => paidMonths.add(m)));
    const nominal = sppTarif.nominal || 0;
    const nonGratis = BULAN_SPP.filter(m => !gratisSet.has(m));
    const jatuhTempo = bulanJatuhTempo(asOf).filter(m => !gratisSet.has(m));
    const tagihanSetahun = nominal * nonGratis.length;
    const tagihanJatuhTempo = nominal * jatuhTempo.length;
    const sisaSetahun = Math.max(0, tagihanSetahun - dibayar);
    const sisaJatuhTempo = Math.max(0, tagihanJatuhTempo - dibayar);
    const gratisCount = BULAN_SPP.length - nonGratis.length;
    items.push({
      key: `spp-${sppTarif.id}`,
      jenis: 'SPP',
      nama: sppTarif.nama,
      periode: sppTarif.periode,
      gratis: false,
      khusus: null,
      tagihan: tagihanSetahun,
      tagihan_jatuh_tempo: tagihanJatuhTempo,
      dibayar,
      sisa_jatuh_tempo: sisaJatuhTempo,
      sisa_setahun: sisaSetahun,
      status: statusDariSisa(tagihanJatuhTempo, dibayar, sisaJatuhTempo),
      detail: `${paidMonths.size}/${BULAN_SPP.length} bulan${gratisCount > 0 ? ` · ${gratisCount} gratis` : ''}`,
    });
  }

  // --- Iuran umum per tingkat (Ujian, Awal Tahun, dll) ---
  relevantTarifs.forEach(t => {
    if (sppTarif && t.id === sppTarif.id) return;
    if (t.jenis_iuran === 'SPP' || (t.nama || '').toLowerCase().includes('spp')) return;
    if (PER_SISWA_JENIS.includes(t.jenis_iuran)) return;
    const bk = bkSiswa.find(b => b.tarif_iuran_id === t.id);
    if (bk?.is_gratis) {
      items.push({
        key: `gratis-${t.id}`, jenis: t.jenis_iuran || 'Lainnya', nama: t.nama, periode: t.periode,
        gratis: true, khusus: bk.kategori, tagihan: 0, tagihan_jatuh_tempo: 0, dibayar: 0,
        sisa_jatuh_tempo: 0, sisa_setahun: 0, status: 'Lunas', detail: 'Gratis',
      });
      return;
    }
    let multiplier = 1;
    if (t.periode === 'Bulanan') multiplier = 12;
    else if (t.periode === 'Semester') multiplier = 2;
    const tagihan = (bk ? (bk.nominal_khusus || t.nominal || 0) : (t.nominal || 0)) * multiplier;
    const trans = matchIuranItemTransactions(t, payments, relevantTarifs);
    const dibayar = trans.reduce((s, k) => s + (k.jumlah || 0), 0);
    const sisa = Math.max(0, tagihan - dibayar);
    items.push({
      key: t.id, jenis: t.jenis_iuran || 'Lainnya', nama: t.nama, periode: t.periode,
      gratis: false, khusus: bk?.kategori || null,
      tagihan, tagihan_jatuh_tempo: tagihan, dibayar,
      sisa_jatuh_tempo: sisa, sisa_setahun: sisa,
      status: statusDariSisa(tagihan, dibayar, sisa), detail: t.periode,
    });
  });

  // --- Iuran per siswa (Mutasi / PPDB): dibayar = transaksi tercatat + isian manual (di luar transaksi) ---
  bkSiswa.forEach(b => {
    const tarif = tarifList.find(t => t.id === b.tarif_iuran_id);
    if (!tarif || !PER_SISWA_JENIS.includes(tarif.jenis_iuran)) return;
    if (iuranNama && tarif.nama !== iuranNama) return;
    const nama = b.nama_iuran || tarif.nama;
    if (b.is_gratis) {
      items.push({
        key: `gratis-${b.id}`, jenis: tarif.jenis_iuran, nama, periode: tarif.periode,
        gratis: true, khusus: b.kategori, tagihan: 0, tagihan_jatuh_tempo: 0, dibayar: 0,
        sisa_jatuh_tempo: 0, sisa_setahun: 0, status: 'Lunas', detail: 'Gratis',
      });
      return;
    }
    const tagihan = b.nominal_khusus || tarif.nominal || 0;
    const trans = matchIuranItemTransactions(tarif, payments, tarifList);
    const dibayarTrans = trans.reduce((s, k) => s + (k.jumlah || 0), 0);
    const dibayarManual = b.sudah_bayar || 0;
    const dibayar = dibayarTrans + dibayarManual;
    const sisa = Math.max(0, tagihan - dibayar);
    items.push({
      key: b.id, jenis: tarif.jenis_iuran, nama, periode: tarif.periode,
      gratis: false, khusus: b.kategori || null,
      tagihan, tagihan_jatuh_tempo: tagihan, dibayar,
      sisa_jatuh_tempo: sisa, sisa_setahun: sisa,
      status: statusDariSisa(tagihan, dibayar, sisa), detail: 'Sekali Bayar',
      dibayar_transaksi: dibayarTrans,
      dibayar_manual: dibayarManual,
    });
  });

  const totalTagihan = items.reduce((s, i) => s + i.tagihan, 0);
  const totalDibayar = items.reduce((s, i) => s + i.dibayar, 0);
  const sisaJatuhTempo = items.reduce((s, i) => s + i.sisa_jatuh_tempo, 0);
  const sisaSetahun = items.reduce((s, i) => s + i.sisa_setahun, 0);
  return {
    items,
    totalTagihan,
    totalDibayar,
    sisaJatuhTempo,
    sisaSetahun,
    status: sisaJatuhTempo <= 0 ? 'Lunas' : (totalDibayar > 0 ? 'Cicilan' : 'Menunggak'),
  };
}