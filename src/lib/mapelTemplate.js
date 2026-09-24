/**
 * Template resmi baris mapel Rapor LHBS & kode Legger (sesuai format PTS_RaporLegger.docx).
 * Dipakai untuk auto-sinkronisasi pemetaan Mapel database -> baris Rapor.
 */

export const TEMPLATE_ROWS = [
  { label: 'Pendidikan Agama', kelompok: 'Nasional', kode: 'PAI', urutan: 1, alias: ['Pendidikan Agama Islam', 'Pendidikan Agama', 'PAI', 'Agama'] },
  { label: 'Pendidikan Pancasila', kelompok: 'Nasional', kode: 'PP', urutan: 2, alias: ['Pendidikan Pancasila', 'PPKn', 'Pancasila'] },
  { label: 'Bahasa Indonesia', kelompok: 'Nasional', kode: 'BIND', urutan: 3, alias: ['Bahasa Indonesia', 'B. Indonesia'] },
  { label: 'Bahasa Inggris', kelompok: 'Nasional', kode: 'BING', urutan: 4, alias: ['Bahasa Inggris', 'B. Inggris'] },
  { label: 'Matematika', kelompok: 'Nasional', kode: 'MTK', urutan: 5, alias: ['Matematika', 'MTK'] },
  { label: 'Ilmu Pengetahuan Alam', kelompok: 'Nasional', kode: 'IPA', urutan: 6, alias: ['Ilmu Pengetahuan Alam', 'IPA'] },
  { label: 'Ilmu Pengetahuan Sosial', kelompok: 'Nasional', kode: 'IPS', urutan: 7, alias: ['Ilmu Pengetahuan Sosial', 'IPS'] },
  { label: 'Seni Budaya', kelompok: 'Nasional', kode: 'SBK', urutan: 8, alias: ['Seni Budaya', 'Seni Musik', 'Seni Rupa'] },
  { label: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kelompok: 'Nasional', kode: 'PJOK', urutan: 9, alias: ['Pendidikan Jasmani Olahraga dan Kesehatan', 'PJOK', 'Penjas'] },
  { label: 'Bahasa Sunda', kelompok: 'Mulok', kode: 'BSUN', urutan: 1, alias: ['Bahasa Sunda', 'B. Sunda'] },
  { label: 'Aqidah Akhlak', kelompok: 'Mulok', kode: 'AKID', urutan: 2, alias: ['Aqidah Akhlak', 'Akidah Akhlak', 'Akid'] },
  { label: "Baca Tulis Al Qur'an", kelompok: 'Mulok', kode: 'BTAQ', urutan: 3, alias: ["Baca Tulis Al Qur'an", 'BTAQ', 'Baca Tulis Al Quran', 'BTQ'] },
];

export function normalisasiNama(nama) {
  return String(nama || '')
    .toLowerCase()
    .trim()
    .replace(/[.,'’]/g, '')
    .replace(/\s+/g, ' ');
}

/** Cari baris template berdasarkan nama mapel database (pencocokan nama ternormalisasi) */
export function cariTemplate(nama) {
  const n = normalisasiNama(nama);
  if (!n) return null;
  return TEMPLATE_ROWS.find(t => t.alias.some(a => normalisasiNama(a) === n)) || null;
}