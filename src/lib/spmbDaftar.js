// Daftar berkas pendaftaran SPMB + label & status
export const DOC_FIELDS = [
  { key: 'doc_birth_certificate', label: 'Akta Kelahiran' },
  { key: 'doc_family_card', label: 'Kartu Keluarga' },
  { key: 'doc_ktp_father', label: 'KTP Ayah' },
  { key: 'doc_ktp_mother', label: 'KTP Ibu' },
  { key: 'doc_photo_3x4', label: 'Foto 3x4' },
  { key: 'doc_ijazah', label: 'Ijazah SD/MI' },
  { key: 'doc_skhun', label: 'SKHUN' },
  { key: 'doc_nisn_card', label: 'Kartu NISN' },
  { key: 'doc_kip', label: 'KIP (jika ada)' },
];

export const JENIS_PEMBIAYAAN = [
  'Biaya Pendaftaran',
  'Daftar Ulang',
  'Seragam',
  'Buku & Perlengkapan',
  'Lainnya',
];

// Nomor pendaftaran otomatis: P<YY><MM>-<urut>
export function buatNomorPendaftaran(urut) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `P${yy}${mm}-${String(urut).padStart(3, '0')}`;
}

// Gelombang yang berlaku pada tanggal tertentu
export function gelombangBerlaku(list, tanggal) {
  const t = tanggal || new Date().toISOString().slice(0, 10);
  return (list || []).find(
    (g) => g.status !== 'Tidak Aktif' &&
      (!g.tanggal_mulai || g.tanggal_mulai <= t) &&
      (!g.tanggal_selesai || g.tanggal_selesai >= t)
  );
}