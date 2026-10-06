import { format } from 'date-fns';

// Waktu "sekolah" selalu dipatok WIB (Asia/Jakarta) — bukan zona waktu perangkat.
// Ini menjaga data dashboard tetap identik di PC, laptop, tablet, HP Android/iPhone
// walaupun jam/zona waktu perangkat berbeda.
export function wibNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
}

export const todayWIB = () => format(wibNow(), 'yyyy-MM-dd');