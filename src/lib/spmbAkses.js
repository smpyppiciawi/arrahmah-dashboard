// Aturan hak akses Menu SPMB (dipakai bersama oleh navigasi, guard, dan kontrol fitur)

// Akses penuh: seluruh submenu + fitur pengaturan (Gelombang & Biaya) + Finalisasi
export const SPMB_PENUH = ['admin', 'tu', 'kepsek', 'bendahara'];

// Akses terbatas: hanya Pendaftar, Wawancara, Pembayaran (tambah & ubah)
export const SPMB_AKSES = [...SPMB_PENUH, 'guru', 'operator'];

export const bolehAksesSpmb = (role) => SPMB_AKSES.includes(role);
export const bolehKelolaPenuhSpmb = (role) => SPMB_PENUH.includes(role);

// Submenu SPMB sesuai peran
export const SPMB_ITEMS_PENUH = [
  { name: 'Pendaftar', icon: 'UserPlus', page: 'PendaftarSPMB', color: '#3b82f6' },
  { name: 'Wawancara', icon: 'MessagesSquare', page: 'WawancaraSPMB', color: '#8b5cf6' },
  { name: 'Pembayaran SPMB', icon: 'CreditCard', page: 'PembayaranSPMB', color: '#14b8a6' },
  { name: 'Finalisasi', icon: 'UserCheck', page: 'FinalisasiSPMB', color: '#10b981' },
];

export const SPMB_ITEMS_TERBATAS = SPMB_ITEMS_PENUH.filter((i) => i.page !== 'FinalisasiSPMB');