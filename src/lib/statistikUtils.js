import { addDays, format, parseISO, startOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { todayWIB } from '@/lib/wib.js';

// Warna konsisten per status kehadiran (dipakai di semua grafik)
export const STATUS_COLORS = { Izin: '#f59e0b', Sakit: '#3b82f6', Alfa: '#ef4444' };
export const STATUSES = ['Izin', 'Sakit', 'Alfa'];
export const PERIODE_LABEL = { harian: 'Harian', mingguan: 'Mingguan', bulanan: 'Bulanan' };

// ===== Util bucket waktu (berbasis tanggal string WIB, tanpa offset UTC) =====
export function bucketKey(tanggal, periode) {
  const d = parseISO(tanggal);
  if (periode === 'bulanan') return format(d, 'yyyy-MM');
  if (periode === 'mingguan') return format(d, "RRRR-'W'II"); // ISO week
  return tanggal;
}

export function bucketLabel(tanggal, periode) {
  const d = parseISO(tanggal);
  if (periode === 'bulanan') return format(d, 'MMM yyyy', { locale: idLocale });
  if (periode === 'mingguan') return `W${format(d, 'II')}`;
  return format(d, 'EEE, dd MMM', { locale: idLocale }); // contoh: Sen, 02 Nov
}

// Label bucket dari tanggal pertama bucket-nya
export function firstDateOfBucket(k, periode) {
  if (periode === 'harian') return k;
  if (periode === 'bulanan') return `${k}-01`;
  const [y, w] = k.split('-W');
  const jan4 = new Date(Date.UTC(Number(y), 0, 4)); // 4 Jan selalu di minggu ISO 1
  const day = jan4.getUTCDay() || 7;
  const mondayW1 = new Date(jan4);
  mondayW1.setUTCDate(jan4.getUTCDate() - (day - 1));
  const monday = new Date(mondayW1);
  monday.setUTCDate(mondayW1.getUTCDate() + (Number(w) - 1) * 7);
  return format(monday, 'yyyy-MM-dd');
}

// Semua bucket antara mulai–akhir supaya grafik tetap berurutan walau kosong
export function bucketAxis(mulai, akhir, periode) {
  const keys = new Set();
  let cur = mulai;
  let guard = 0;
  while (cur <= akhir && guard < 2000) {
    keys.add(bucketKey(cur, periode));
    const d = parseISO(cur);
    if (periode === 'bulanan') d.setMonth(d.getMonth() + 1);
    else if (periode === 'mingguan') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    cur = format(d, 'yyyy-MM-dd');
    guard++;
  }
  keys.add(bucketKey(akhir, periode));
  return Array.from(keys);
}

// Pengambilan data terfilter di server dengan cursor (tanpa menghitung ganda halaman)
export async function fetchFiltered(entity, query, fields, maxRecords = 10000) {
  const out = [];
  let cursor;
  do {
    const page = await entity.filter(query, { sort: 'tanggal', limit: 500, cursor, fields });
    out.push(...(page.items || []));
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor && out.length < maxRecords);
  return out;
}

// ===== Periode: semester & rentang cepat (basis tahun ajaran aktif) =====
export function semesterOf(tanggal) {
  const bulan = parseISO(tanggal || todayWIB()).getMonth() + 1;
  return bulan >= 7 ? 'Ganjil' : 'Genap';
}

export function semesterRange(tahunAjaran, semester) {
  const match = String(tahunAjaran || '').match(/(\d{4})/);
  const tahunMulai = match ? Number(match[1]) : parseISO(todayWIB()).getFullYear();
  if (semester === 'Genap') {
    return { mulai: `${tahunMulai + 1}-01-01`, akhir: `${tahunMulai + 1}-06-30` };
  }
  return { mulai: `${tahunMulai}-07-01`, akhir: `${tahunMulai}-12-31` };
}

export function quickRange(key) {
  const hariIni = todayWIB();
  if (key === 'hari-ini') return { mulai: hariIni, akhir: hariIni };
  if (key === '7-hari') {
    return { mulai: format(addDays(parseISO(hariIni), -6), 'yyyy-MM-dd'), akhir: hariIni };
  }
  if (key === '30-hari') {
    return { mulai: format(addDays(parseISO(hariIni), -29), 'yyyy-MM-dd'), akhir: hariIni };
  }
  return { mulai: format(startOfMonth(parseISO(hariIni)), 'yyyy-MM-dd'), akhir: hariIni };
}