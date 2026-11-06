import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { bucketKey, bucketLabel, firstDateOfBucket } from '@/lib/statistikUtils';

// Urutan & warna konsisten untuk seluruh dashboard kehadiran
export const STATUS_KEHADIRAN = ['Hadir', 'Sakit', 'Izin', 'Alfa'];

export const WARNA_KEHADIRAN = {
  Hadir: '#10b981',
  Sakit: '#3b82f6',
  Izin: '#f59e0b',
  Alfa: '#ef4444',
};

export const bulatPct = (n) => Math.round((Number(n) || 0) * 10) / 10;
export const formatPct = (n) => `${bulatPct(n).toFixed(1)}%`;

export function labelTanggal(tanggal) {
  return format(parseISO(tanggal), 'EEE, dd MMM', { locale: idLocale });
}

// Rentang tanggal hari libur (Hari Libur Nasional / Libur Sekolah) dari Kalender Akademik
export function kumpulanHariLibur(kalender = []) {
  const set = new Set();
  kalender
    .filter((k) => ['Hari Libur Nasional', 'Libur Sekolah'].includes(k.kategori))
    .forEach((k) => {
      if (!k.tanggal_mulai) return;
      const akhir = k.tanggal_selesai || k.tanggal_mulai;
      let cur = k.tanggal_mulai;
      let guard = 0;
      while (cur <= akhir && guard < 400) {
        set.add(cur);
        const d = parseISO(cur);
        d.setDate(d.getDate() + 1);
        cur = format(d, 'yyyy-MM-dd');
        guard += 1;
      }
    });
  return set;
}

// Hari efektif = tanggal yang punya entri absensi, di dalam rentang, bukan libur, bukan tanggal mendatang
export function hariEfektifDari({ tanggalAbsensi = [], tanggalMulai, tanggalAkhir, hariLibur = new Set(), hariIni }) {
  if (!tanggalMulai || !tanggalAkhir) return [];
  const set = new Set();
  tanggalAbsensi.forEach((t) => {
    if (!t || t < tanggalMulai || t > tanggalAkhir) return;
    if (hariIni && t > hariIni) return;
    if (hariLibur.has(t)) return;
    set.add(t);
  });
  return Array.from(set).sort();
}

// Satu siswa hanya dihitung sekali per tanggal (hindari hitung ganda Kehadiran + Jumat)
export function dedupeHarian(absensi = []) {
  const seen = new Set();
  return absensi.filter((a) => {
    const key = `${a.tanggal}|${a.siswa_id || a.nama_siswa}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Hadir = Siswa Aktif − (Sakit + Izin + Alfa) per tanggal efektif
export function ringkasHarian({ absensi = [], siswaAktif = 0, hariEfektif = [] }) {
  const perTanggal = new Map();
  hariEfektif.forEach((t) => perTanggal.set(t, { tanggal: t, Sakit: 0, Izin: 0, Alfa: 0, absen: 0 }));

  absensi.forEach((a) => {
    const row = perTanggal.get(a.tanggal);
    if (!row || row[a.status] === undefined) return;
    row[a.status] += 1;
    row.absen += 1;
  });

  const harian = hariEfektif.map((t) => {
    const r = perTanggal.get(t);
    const hadir = Math.max(siswaAktif - r.absen, 0);
    return { ...r, Hadir: hadir, pct: siswaAktif ? (hadir / siswaAktif) * 100 : 0 };
  });

  const total = harian.reduce(
    (s, r) => ({
      Hadir: s.Hadir + r.Hadir,
      Sakit: s.Sakit + r.Sakit,
      Izin: s.Izin + r.Izin,
      Alfa: s.Alfa + r.Alfa,
    }),
    { Hadir: 0, Sakit: 0, Izin: 0, Alfa: 0 }
  );

  const kesempatan = siswaAktif * hariEfektif.length;
  return { harian, total, kesempatan, pctPeriode: kesempatan ? (total.Hadir / kesempatan) * 100 : 0 };
}

// Tren mengikuti periode filter (harian / mingguan / bulanan) — hanya hari efektif
export function trenKehadiran({ harian = [], periode = 'harian' }) {
  if (periode === 'harian') {
    return harian.map((r) => ({ label: labelTanggal(r.tanggal), ...r }));
  }
  const map = new Map();
  harian.forEach((r) => {
    const k = bucketKey(r.tanggal, periode);
    if (!map.has(k)) map.set(k, { Hadir: 0, Sakit: 0, Izin: 0, Alfa: 0 });
    const b = map.get(k);
    b.Hadir += r.Hadir;
    b.Sakit += r.Sakit;
    b.Izin += r.Izin;
    b.Alfa += r.Alfa;
  });
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => ({ label: bucketLabel(firstDateOfBucket(k, periode), periode), ...v }));
}

// Perbandingan & komposisi per kelas terhadap siswa aktif × hari efektif
export function perKelasKehadiran({ absensi = [], siswaPerKelas = {}, hariEfektif = [] }) {
  const hari = hariEfektif.length;
  const map = new Map();
  Object.keys(siswaPerKelas).forEach((k) => {
    map.set(k, { nama_kelas: k, siswa: siswaPerKelas[k], Sakit: 0, Izin: 0, Alfa: 0 });
  });
  absensi.forEach((a) => {
    const k = a.nama_kelas || '-';
    if (!map.has(k)) map.set(k, { nama_kelas: k, siswa: 0, Sakit: 0, Izin: 0, Alfa: 0 });
    const r = map.get(k);
    if (r[a.status] !== undefined) r[a.status] += 1;
  });

  return Array.from(map.values())
    .filter((r) => r.siswa > 0 && hari > 0)
    .map((r) => {
      const kesempatan = r.siswa * hari;
      const tidakHadir = r.Sakit + r.Izin + r.Alfa;
      const hadir = Math.max(kesempatan - tidakHadir, 0);
      return {
        ...r,
        kesempatan,
        tidakHadir,
        hadir,
        pct: kesempatan ? (hadir / kesempatan) * 100 : 0,
        pctSakit: kesempatan ? (r.Sakit / kesempatan) * 100 : 0,
        pctIzin: kesempatan ? (r.Izin / kesempatan) * 100 : 0,
        pctAlfa: kesempatan ? (r.Alfa / kesempatan) * 100 : 0,
      };
    })
    .sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas, 'id'));
}

// Rekap per siswa untuk tabel monitoring
export function perSiswaKehadiran({ absensi = [], hariEfektif = [] }) {
  const hari = hariEfektif.length;
  const map = new Map();
  absensi.forEach((a) => {
    const key = a.siswa_id || a.nama_siswa;
    if (!map.has(key)) {
      map.set(key, { siswa_id: a.siswa_id, nama: a.nama_siswa || '-', nama_kelas: a.nama_kelas || '-', Sakit: 0, Izin: 0, Alfa: 0 });
    }
    const r = map.get(key);
    if (r[a.status] !== undefined) r[a.status] += 1;
  });

  return Array.from(map.values()).map((r) => {
    const tidakHadir = r.Sakit + r.Izin + r.Alfa;
    return { ...r, tidakHadir, pct: hari ? Math.max(((hari - tidakHadir) / hari) * 100, 0) : 0 };
  });
}