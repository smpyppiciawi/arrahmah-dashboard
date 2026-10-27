// Utilitas Menu Catatan Keuangan (khusus akun Gustini)

export const GUSTINI_EMAIL = 'gustini583@admin.smp.belajar.id';

export const BULAN_CATATAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const JENIS_ITEM = ['Pemasukan', 'Pengeluaran'];

/** Akses hanya untuk email Gustini dengan role Bendahara atau Kepala Sekolah. */
export function canAksesCatatanKeuangan(user) {
  if (!user) return false;
  const emailCocok = String(user.email || '').trim().toLowerCase() === GUSTINI_EMAIL;
  const roleCocok = ['bendahara', 'kepsek'].includes(user.role);
  return emailCocok && roleCocok;
}

export const formatRupiah = (nominal) =>
  `Rp ${new Intl.NumberFormat('id-ID').format(Number(nominal) || 0)}`;

export function hitungRingkasan(items = []) {
  const total = (jenis) =>
    items
      .filter((it) => it.jenis === jenis)
      .reduce((sum, it) => sum + (Number(it.nominal) || 0), 0);
  const pemasukan = total('Pemasukan');
  const pengeluaran = total('Pengeluaran');
  return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran };
}