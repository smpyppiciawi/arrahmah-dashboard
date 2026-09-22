// Helper terpusat untuk Foto Siswa — dipakai semua modul (Buku Induk, Data Siswa,
// dialog detail, Kartu Absensi/ID Card, dll) agar tidak ada duplikasi logika.
// Slot di entity Siswa: foto_7, foto_8, foto_9 (jenjang) dan foto_ayah, foto_ibu, foto_wali.

export const JENJANG_SLOTS = ['foto_7', 'foto_8', 'foto_9'];

export const ORTU_SLOTS = [
  { key: 'foto_ayah', label: 'Ayah' },
  { key: 'foto_ibu', label: 'Ibu' },
  { key: 'foto_wali', label: 'Wali' },
];

// Tingkat jenjang aktif siswa (dari nama kelas; lulusan = 9)
export function getTingkatAktif(siswa) {
  if (!siswa) return null;
  if (siswa.status === 'Lulus') return '9';
  const t = String(siswa.nama_kelas || '').trim().charAt(0);
  return ['7', '8', '9'].includes(t) ? t : null;
}

// Foto jenjang tertentu (null bila kosong)
export function getFotoPerJenjang(siswa, tingkat) {
  return siswa?.[`foto_${tingkat}`] || null;
}

// Foto jenjang aktif; bila slot aktif kosong, fallback ke jenjang tertinggi yang tersedia
export function getFotoAktif(siswa) {
  if (!siswa) return null;
  const t = getTingkatAktif(siswa);
  if (t && siswa[`foto_${t}`]) return siswa[`foto_${t}`];
  for (const j of ['9', '8', '7']) {
    if (siswa[`foto_${j}`]) return siswa[`foto_${j}`];
  }
  return null;
}

// Foto ayah/ibu/wali — jenis: 'ayah' | 'ibu' | 'wali'
export function getFotoOrtu(siswa, jenis) {
  return siswa?.[`foto_${jenis}`] || null;
}

// Label ramah untuk nama field slot foto
export function slotLabel(field) {
  const map = {
    foto_7: 'Jenjang 7',
    foto_8: 'Jenjang 8',
    foto_9: 'Jenjang 9',
    foto_ayah: 'Ayah',
    foto_ibu: 'Ibu',
    foto_wali: 'Wali',
  };
  return map[field] || field;
}

// Parse nama file upload massal:
//   NIS.jpg            -> slot jenjang aktif
//   NIS_7/_8/_9.jpg    -> slot jenjang spesifik
//   NIS_AYAH|IBU|WALI.jpg -> slot ortu/wali
// return { nis, slot } atau null bila format tidak valid
export function parseFotoFilename(filename) {
  const base = String(filename || '').replace(/\.\w+$/, '').trim();
  const m = base.match(/^(\d+)(?:_([789]|AYAH|IBU|WALI))?$/i);
  if (!m) return null;
  const suffix = m[2] ? m[2].toUpperCase() : null;
  if (!suffix) return { nis: m[1], slot: 'aktif' };
  if (['AYAH', 'IBU', 'WALI'].includes(suffix)) return { nis: m[1], slot: `foto_${suffix.toLowerCase()}` };
  return { nis: m[1], slot: `foto_${suffix}` };
}

// Resolve slot akhir berdasarkan data siswa (slot 'aktif' -> field jenjang aktif)
export function resolveSlotField(siswa, slot) {
  if (slot === 'aktif') {
    const t = getTingkatAktif(siswa);
    return t ? `foto_${t}` : null;
  }
  return slot;
}