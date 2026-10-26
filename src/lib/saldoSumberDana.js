/**
 * Perhitungan saldo per sumber dana & kategori — satu logika untuk Dashboard Kepsek
 * agar pembacaannya identik dengan Laporan Keuangan Bendahara.
 *
 * Aturan (sama dengan Bendahara):
 * - Penerapan Iuran Muka & Saldo Awal netral terhadap kas → tidak mengubah saldo.
 * - Transfer Dana menggeser saldo: mengurangi sumber asal, menambah sumber tujuan.
 * - Transaksi tanpa Sumber Dana resmi dikumpulkan pada baris "Belum Terpetakan".
 *
 * Tanpa dateFrom/dateTo → saldo berjalan (seluruh riwayat).
 * Dengan dateFrom/dateTo → saldo periode terpilih.
 */
export const BELUM_TERPETAKAN = 'Belum Terpetakan';

const isNetralKas = (k) => !!k.aplikasi_iuran_muka || !!k.is_saldo_awal;

export function buildSaldoSumberDana({ keuanganList = [], transferDanaList = [], sumberDanaList = [], dateFrom = '', dateTo = '' }) {
  const namaResmi = (sumberDanaList || []).map(s => s.nama).filter(Boolean);
  const inRange = (tanggal) => (!dateFrom || (tanggal || '') >= dateFrom) && (!dateTo || (tanggal || '') <= dateTo);
  const keySumber = (nama) => (nama && namaResmi.includes(nama)) ? nama : BELUM_TERPETAKAN;

  const map = {};
  [...namaResmi, BELUM_TERPETAKAN].forEach(key => {
    map[key] = { sumber_dana: key, masuk: 0, keluar: 0, transfer_masuk: 0, transfer_keluar: 0, transaksi: 0 };
  });

  const sumberDetail = {};

  keuanganList.forEach(k => {
    if (!inRange(k.tanggal) || isNetralKas(k)) return;
    const key = keySumber(k.sumber_rekening);
    const row = map[key];
    row.transaksi += 1;
    if (k.jenis === 'Pemasukan') row.masuk += (k.jumlah || 0);
    else row.keluar += (k.jumlah || 0);
    if (!sumberDetail[key]) sumberDetail[key] = [];
    sumberDetail[key].push(k);
  });

  (transferDanaList || []).forEach(t => {
    if (!inRange(t.tanggal)) return;
    const nominal = t.nominal || 0;
    const dari = keySumber(t.dari_sumber_dana);
    const ke = keySumber(t.ke_sumber_dana);
    map[dari].transfer_keluar += nominal;
    map[dari].transaksi += 1;
    map[ke].transfer_masuk += nominal;
    map[ke].transaksi += 1;
    if (!sumberDetail[dari]) sumberDetail[dari] = [];
    if (!sumberDetail[ke]) sumberDetail[ke] = [];
    sumberDetail[dari].push({
      id: `transfer-out-${t.id}`, tanggal: t.tanggal, jenis: 'Transfer Keluar',
      kategori: 'Transfer', uraian: t.keterangan || `Transfer ke ${t.ke_sumber_dana}`, jumlah: nominal,
    });
    sumberDetail[ke].push({
      id: `transfer-in-${t.id}`, tanggal: t.tanggal, jenis: 'Transfer Masuk',
      kategori: 'Transfer', uraian: t.keterangan || `Transfer dari ${t.dari_sumber_dana}`, jumlah: nominal,
    });
  });

  const sumberDanaBreakdown = Object.values(map)
    .map(r => ({ ...r, saldo: r.masuk + r.transfer_masuk - r.keluar - r.transfer_keluar }))
    .filter(r => r.transaksi > 0 || namaResmi.includes(r.sumber_dana));

  const katMap = {};
  keuanganList.forEach(k => {
    if (!inRange(k.tanggal) || isNetralKas(k)) return;
    const key = k.kategori || 'Lainnya';
    if (!katMap[key]) katMap[key] = { kategori: key, masuk: 0, keluar: 0, transaksi: 0 };
    katMap[key].transaksi += 1;
    if (k.jenis === 'Pemasukan') katMap[key].masuk += (k.jumlah || 0);
    else katMap[key].keluar += (k.jumlah || 0);
  });
  const kategoriBreakdown = Object.values(katMap)
    .map(r => ({ ...r, saldo: r.masuk - r.keluar }))
    .sort((a, b) => b.saldo - a.saldo);

  const total = sumberDanaBreakdown.reduce((acc, r) => ({
    masuk: acc.masuk + r.masuk,
    keluar: acc.keluar + r.keluar,
    transfer_masuk: acc.transfer_masuk + r.transfer_masuk,
    saldo: acc.saldo + r.saldo,
  }), { masuk: 0, keluar: 0, transfer_masuk: 0, saldo: 0 });

  return { sumberDanaBreakdown, sumberDetail, kategoriBreakdown, total };
}