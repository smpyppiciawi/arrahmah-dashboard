import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, subDays } from 'date-fns';

const ABSENT = ['Alfa', 'Sakit', 'Izin'];
const HARI_NAMES = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat' };

// Minggu sekolah (Senin–Jumat) dari tanggal 'yyyy-MM-dd'
export function getSchoolWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const thu = new Date(monday);
  thu.setDate(monday.getDate() + 3);
  const year = thu.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const dayOfYear = Math.floor((thu - jan1) / 86400000);
  const jan1Day = (jan1.getDay() + 6) % 7;
  const weekNum = Math.ceil((dayOfYear + jan1Day + 1) / 7);
  return { weekKey: `${year}-${String(weekNum).padStart(2, '0')}`, weekStart: fmt(monday), weekEnd: fmt(friday) };
}

const fmtLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Tanggal libur dari Kalender Akademik (rentang tanggal_mulai..tanggal_selesai)
function buildHolidaySet(kalenderList) {
  const set = new Set();
  (kalenderList || []).forEach((ev) => {
    if (!ev.tanggal_mulai) return;
    if (ev.kategori !== 'Hari Libur Nasional' && ev.kategori !== 'Libur Sekolah') return;
    const end = new Date((ev.tanggal_selesai || ev.tanggal_mulai) + 'T00:00:00');
    for (let d = new Date(ev.tanggal_mulai + 'T00:00:00'); d <= end; d.setDate(d.getDate() + 1)) set.add(fmtLocal(d));
  });
  return set;
}

// Peringatan absen siswa — 3 kriteria ketentuan:
// (1) BERUNTUN 3 Hari: Alfa/Sakit/Izin 3 hari sekolah aktif berurutan (Senin–Jumat, hari libur
//     Kalender Akademik dilewati; Jumat -> Senin tetap berurutan).
// (2) AKUMULASI 3 Hari: total 3 hari Alfa/Sakit/Izin dalam satu minggu sekolah.
// (3) HARI SAMA: Alfa/Sakit/Izin 3x+ pada hari yang sama (mis. tiap Kamis) dalam 1 bulan terakhir.
// Data tampil selama kriteria terpenuhi; hilang otomatis saat siswa tercatat Hadir kembali /
// pola tidak lagi sesuai. Query khusus record Alfa/Sakit/Izin (subset kecil, akurat).
export function useAbsen3Hari(siswaList, kalenderList) {
  return useQuery({
    queryKey: ['absen3hari-alert', siswaList?.length || 0, kalenderList?.length || 0],
    queryFn: async () => {
      const today = new Date();
      const todayStr = fmtLocal(today);
      const windowStart = fmtLocal(subDays(today, 34)); // jendela deteksi
      const monthStart = fmtLocal(subDays(today, 30));  // pola hari sama (1 bulan)
      const { weekStart: curWeekStart, weekEnd: curWeekEnd } = getSchoolWeek(todayStr);

      const holidays = buildHolidaySet(kalenderList);
      const isSchoolDay = (dstr) => {
        const wd = new Date(dstr + 'T00:00:00').getDay();
        return wd >= 1 && wd <= 5 && !holidays.has(dstr);
      };
      const nextSchoolDay = (dstr) => {
        let d = new Date(dstr + 'T00:00:00');
        do { d.setDate(d.getDate() + 1); } while (!isSchoolDay(fmtLocal(d)));
        return fmtLocal(d);
      };

      const records = await base44.entities.Absensi.filter(
        { status: { $in: ABSENT }, tanggal: { $gte: windowStart } },
        'tanggal',
        5000
      );

      const bySiswa = {};
      (records || []).forEach((r) => {
        if (!r.siswa_id || !r.tanggal || r.tanggal > todayStr) return;
        if (!isSchoolDay(r.tanggal)) return; // absensi pada hari libur tidak dihitung
        (bySiswa[r.siswa_id] = bySiswa[r.siswa_id] || []).push(r);
      });

      const siswaIds = Object.keys(bySiswa);
      if (siswaIds.length === 0) return [];

      // Record absensi TERAKHIR tiap kandidat (semua status) — aturan selesai:
      // peringatan beruntun/akumulasi gugur saat siswa sudah tercatat Hadir kembali.
      const latestMap = {};
      await Promise.all(siswaIds.map(async (id) => {
        const latest = await base44.entities.Absensi.filter({ siswa_id: id }, '-tanggal', 3);
        latestMap[id] = (latest || [])[0] || null;
      }));

      const siswaById = {};
      (siswaList || []).forEach((s) => { siswaById[s.id] = s; });

      const out = [];
      siswaIds.forEach((id) => {
        const s = siswaById[id];
        if (!s || s.status !== 'Aktif') return;
        const recs = bySiswa[id].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        const dates = recs.map((r) => r.tanggal);
        const last = latestMap[id];
        const stillAbsent = !!last && ABSENT.includes(last.status) && last.tanggal >= windowStart;

        const kriteria = [];
        let qualifyWeek = null;
        let sameDayInfo = null;

        // (1) Beruntun 3 hari sekolah aktif (lewati Sabtu-Minggu & hari libur)
        let beruntun = false;
        if (stillAbsent) {
          let run = [dates[0]];
          let bestRun = [];
          for (let i = 1; i < dates.length; i++) {
            if (dates[i] === nextSchoolDay(run[run.length - 1])) run.push(dates[i]);
            else { if (run.length > bestRun.length) bestRun = run; run = [dates[i]]; }
          }
          if (run.length > bestRun.length) bestRun = run;
          beruntun = bestRun.length >= 3;
          if (beruntun) kriteria.push('Beruntun 3 Hari');
        }

        // (2) Akumulasi >= 3 hari dalam satu minggu sekolah (minggu terbaru yang memenuhi)
        if (stillAbsent) {
          const weeks = {};
          dates.forEach((d) => {
            const w = getSchoolWeek(d);
            if (!weeks[w.weekKey]) weeks[w.weekKey] = { ...w, count: 0 };
            weeks[w.weekKey].count += 1;
          });
          const qualify = Object.values(weeks).filter((w) => w.count >= 3).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
          qualifyWeek = qualify[0] || null;
          if (qualifyWeek) kriteria.push('Akumulasi 3 Hari/Minggu');
        }

        // (3) Hari sama 3x+ dalam 1 bulan terakhir (mis. tiap Kamis, atau Selasa & Kamis)
        const sameDay = {};
        recs.forEach((r) => {
          if (r.tanggal >= monthStart) {
            const wd = new Date(r.tanggal + 'T00:00:00').getDay();
            sameDay[wd] = (sameDay[wd] || 0) + 1;
          }
        });
        const sameHits = Object.entries(sameDay).filter(([wd, c]) => HARI_NAMES[wd] && c >= 3);
        // pola dianggap usai bila absen terakhir sudah lebih dari 10 hari
        if (sameHits.length > 0 && dates[dates.length - 1] >= fmtLocal(subDays(today, 10))) {
          sameDayInfo = sameHits.map(([wd, c]) => `${HARI_NAMES[wd]} ${c}x`).sort().join(', ');
          kriteria.push('Sama Hari Tiap Minggu');
        }

        if (kriteria.length === 0) return;

        out.push({
          ...s,
          _absenList: recs.slice(-10).map((r) => ({ tanggal: r.tanggal, status: r.status, keterangan: r.keterangan })),
          _alfaCount: recs.filter((r) => r.status === 'Alfa').length,
          _sakitCount: recs.filter((r) => r.status === 'Sakit').length,
          _izinCount: recs.filter((r) => r.status === 'Izin').length,
          _lastAbsenDate: dates[dates.length - 1],
          _kriteriaLabel: kriteria.join(' · '),
          _sameDayInfo: sameDayInfo,
          _consecutive: beruntun,
          _carryover: !!qualifyWeek && qualifyWeek.weekStart < curWeekStart,
          _weekStart: qualifyWeek ? qualifyWeek.weekStart : curWeekStart,
          _weekEnd: qualifyWeek ? qualifyWeek.weekEnd : curWeekEnd,
        });
      });

      return out.sort((a, b) => b._lastAbsenDate.localeCompare(a._lastAbsenDate));
    },
    staleTime: 60 * 1000,
  });
}