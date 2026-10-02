// Pustaka rumus Nilai Akhir (Menu Nilai > Pengelolaan & Analisis)
// 3 format pembobotan, saling eksklusif — hanya 1 aktif secara global (PengaturanAplikasi.format_nilai_akhir).
// Nilai Akhir Rapor dibulatkan ke atas (ceil).

export const FORMAT_NILAI_AKHIR = {
  1: { bobotHarian: 0.70, bobotUjian: 0.30, label: '70% Rerata Nilai Harian + 30% Rerata Nilai Ujian' },
  2: { bobotHarian: 0.75, bobotUjian: 0.25, label: '75% Rerata Nilai Harian + 25% Rerata Nilai Ujian' },
  3: { bobotHarian: 0.60, bobotUjian: 0.40, label: '60% Rerata Nilai Harian + 40% Rerata Nilai Ujian' },
};

const JENIS_HARIAN = ['Harian', 'Ulangan Harian', 'Tugas', 'Praktik']; // termasuk jenis lama
const JENIS_UJIAN = ['PTS', 'PAS', 'US', 'UP'];

export const isJenisHarian = (j) => JENIS_HARIAN.includes(j);
export const isJenisUjian = (j) => JENIS_UJIAN.includes(j);

const rata = (arr) => (arr.length > 0 ? arr.reduce((s, r) => s + (r.nilai ?? 0), 0) / arr.length : null);

// Rerata Nilai Harian (seluruh entri per BAB/materi)
export function rerataHarian(rows) {
  return rata(rows.filter(r => isJenisHarian(r.jenis_penilaian)));
}

// Rerata Nilai Ujian (PTS/PAS/US/UP); jenisFilter opsional, contoh ['PTS'] untuk Kelas 9 Genap
export function rerataUjian(rows, jenisFilter = null) {
  return rata(rows.filter(r => isJenisUjian(r.jenis_penilaian) && (!jenisFilter || jenisFilter.includes(r.jenis_penilaian))));
}

// Nilai Akhir Rapor = bobot% × Rerata Nilai Harian + bobot% × Rerata Nilai Ujian, dibulatkan ke atas.
// Jika salah satu rerata belum ada, dipakai rerata yang tersedia.
// Kelas 9 Genap: komponen Ujian Rapor hanya PTS.
export function nilaiAkhirRapor(rows, { semester, tingkat, format = 1 } = {}) {
  const f = FORMAT_NILAI_AKHIR[format] || FORMAT_NILAI_AKHIR[1];
  const jenisUjian = (String(tingkat) === '9' && semester === 'Genap') ? ['PTS'] : null;
  const h = rerataHarian(rows);
  const u = rerataUjian(rows, jenisUjian);
  if (h === null && u === null) return null;
  if (h === null) return Math.ceil(u);
  if (u === null) return Math.ceil(h);
  return Math.ceil(f.bobotHarian * h + f.bobotUjian * u);
}

// Nilai Akhir Ijazah (Kelas 9 Genap): Rerata Nilai Ujian US/UP, dibulatkan ke atas
export function nilaiAkhirIjazah(rows) {
  const u = rerataUjian(rows, ['US', 'UP']);
  return u === null ? null : Math.ceil(u);
}