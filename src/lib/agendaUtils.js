// Utilitas Menu Agenda Kelas

export const HARI_FILTER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const HARI_SEMUA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const STATUS_AGENDA = [
  { value: 'Hadir', letter: 'H', chip: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'Izin', letter: 'I', chip: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'Sakit', letter: 'S', chip: 'bg-sky-100 text-sky-700 border-sky-200' },
  { value: 'Alfa', letter: 'A', chip: 'bg-rose-100 text-rose-700 border-rose-200' },
];

const STATUS_LAIN = {
  Terlambat: 'bg-orange-100 text-orange-700 border-orange-200',
  Libur: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function parseDate(value) {
  if (!value) return new Date();
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return new Date(value);
  return new Date(y, m - 1, d);
}

export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const todayISO = () => toISODate(new Date());

/** Geser tanggal ISO sebanyak `delta` hari (boleh negatif). */
export function geserTanggal(tanggal, delta) {
  const d = parseDate(tanggal);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export const getHari = (tanggal) => HARI_SEMUA[parseDate(tanggal).getDay()];

export const getMingguKe = (tanggal) => Math.min(4, Math.ceil(parseDate(tanggal).getDate() / 7));

export const getBulanIndex = (tanggal) => parseDate(tanggal).getMonth() + 1;

export function formatTanggal(tanggal) {
  const d = parseDate(tanggal);
  return `${HARI_SEMUA[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTanggalSingkat(tanggal) {
  const d = parseDate(tanggal);
  return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function statusLetter(status) {
  const found = STATUS_AGENDA.find((s) => s.value === status);
  if (found) return found.letter;
  if (status === 'Terlambat') return 'T';
  if (status === 'Libur') return 'L';
  return '-';
}

export function statusChip(status) {
  const found = STATUS_AGENDA.find((s) => s.value === status);
  return found?.chip || STATUS_LAIN[status] || 'bg-slate-100 text-slate-400 border-slate-200';
}

/** Data lama menu Materi ditampilkan sebagai agenda (tanpa mengubah record aslinya). */
export function legacyMateriToAgenda(materi) {
  const tanggal = (materi.created_date || '').slice(0, 10) || todayISO();
  const isLink = materi.jenis_file === 'Link';
  return {
    id: `materi-${materi.id}`,
    legacy: true,
    raw: materi,
    tanggal,
    hari: getHari(tanggal),
    minggu_ke: getMingguKe(tanggal),
    kelas_id: '',
    nama_kelas: materi.tingkat_kelas === 'Semua' ? 'Semua Kelas' : `Kelas ${materi.tingkat_kelas}`,
    mapel: materi.mapel || '',
    jam_mulai: '',
    jam_selesai: '',
    guru_id: '',
    nama_guru: materi.guru_pengampu || '',
    jumlah_siswa: 0,
    materi_pokok: materi.bab || materi.judul || '',
    uraian_kegiatan: materi.deskripsi || '',
    deskripsi: materi.deskripsi || '',
    file_urls: !isLink && materi.file_url ? [materi.file_url] : [],
    link_materi: isLink ? materi.file_url || '' : '',
    absensi_agenda: [],
    tahun_ajaran: '',
  };
}

export function ringkasAbsensi(rows = []) {
  const total = rows.length;
  const hadir = rows.filter((r) => r.status_agenda === 'Hadir').length;
  return { total, hadir, tidakHadir: total - hadir };
}