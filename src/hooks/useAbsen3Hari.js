import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { subDays } from 'date-fns';

const ABSENT = ['Alfa', 'Sakit', 'Izin'];
const HARI_NAMES = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat' };
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Minggu sekolah (Senin–Jumat) dari tanggal 'yyyy-MM-dd' — versi browser (getDay lokal)
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
const fmtShort = (d) => {
  const p = d.split('-').map(Number);
  return `${p[2]} ${BULAN[(p[1] || 1) - 1]}`;
};

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

// Peringatan absen siswa — 3 kriteria ketentuan, dihitung PER STATUS (Sakit/Izin/Alfa masing-masing):
// (1) BERUNTUN 3 Hari: status sama pada 3 hari sekolah aktif berurutan (Senin–Jumat, hari libur
//     Kalender Akademik dilewati; Jumat -> Senin tetap berurutan).
// (2) AKUMULASI 3 Hari/Minggu: status sama 3x dalam satu minggu sekolah.
// (3) SAMA HARI 3 Minggu: status sama pada hari yang sama di 3 minggu sekolah berbeda
//     (mis. Sakit tiap Kamis, 3 minggu beruntun).
// Data tampil selama kriteria terpenuhi; pola beruntun/akumulasi gugur otomatis saat siswa
// tercatat Hadir kembali (aman terhadap koreksi data). Pemantauan otomatis berbasis WIB.
// _notifLabel = hasil pemrosesan notifikasi WA/Email dari log NotifAbsen3Hari.
export function useAbsen3Hari(siswaList, kalenderList) {
  return useQuery({
    queryKey: ['absen3hari-alert', siswaList?.length || 0, kalenderList?.length || 0],
    queryFn: async () => {
      const today = new Date();
      const todayStr = fmtLocal(today);
      const windowStart = fmtLocal(subDays(today, 35)); // jendela deteksi
      const staleStart = fmtLocal(subDays(today, 10));  // kesegaran pola hari sama

      // Absensi dalam jendela (SEMUA status — dibutuhkan utk aturan 'masih absen'), cursor-paginated
      const records = [];
      let cursor;
      for (;;) {
        const page = await base44.entities.Absensi.filter(
          { tanggal: { $gte: windowStart } },
          { sort: 'tanggal', limit: 1000, cursor, fields: ['siswa_id', 'tanggal', 'status', 'keterangan'] }
        );
        records.push(...(page.items || []));
        if (!page.has_more || !page.next_cursor) break;
        cursor = page.next_cursor;
      }

      // Log hasil pemrosesan notifikasi (indikator WA/Email di panel)
      const logs = await base44.entities.NotifAbsen3Hari.filter(
        {},
        { sort: '-created_date', limit: 500, fields: ['siswa_id', 'status', 'kriteria', 'minggu_key', 'wa_terkirim', 'email_terkirim'] }
      );
      const logMap = {};
      (logs || []).forEach((l) => {
        const key = `${l.siswa_id}|${l.status}|${l.kriteria}|${l.minggu_key}`;
        if (!logMap[key] || l.wa_terkirim || l.email_terkirim) logMap[key] = l;
      });

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

      const bySiswa = {};
      records.forEach((r) => {
        if (!r.siswa_id || !r.tanggal || r.tanggal > todayStr || r.tanggal < windowStart) return;
        (bySiswa[r.siswa_id] = bySiswa[r.siswa_id] || []).push(r);
      });

      const siswaById = {};
      (siswaList || []).forEach((s) => { siswaById[s.id] = s; });

      const out = [];
      Object.keys(bySiswa).forEach((id) => {
        const s = siswaById[id];
        if (!s || s.status !== 'Aktif') return;
        const all = bySiswa[id].slice().sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        const latest = all[all.length - 1];
        const stillAbsent = !!latest && ABSENT.includes(latest.status) && latest.tanggal >= windowStart;
        const absentRecs = all.filter((r) => ABSENT.includes(r.status) && isSchoolDay(r.tanggal));
        if (absentRecs.length === 0) return;

        const events = [];
        ABSENT.forEach((status) => {
          const dates = [...new Set(absentRecs.filter((r) => r.status === status).map((r) => r.tanggal))].sort();
          if (dates.length === 0) return;

          if (stillAbsent) {
            // (1) Beruntun 3 hari sekolah aktif
            let best = [];
            let run = [dates[0]];
            for (let i = 1; i < dates.length; i++) {
              if (dates[i] === nextSchoolDay(run[run.length - 1])) run.push(dates[i]);
              else { if (run.length > best.length) best = run; run = [dates[i]]; }
            }
            if (run.length > best.length) best = run;
            if (best.length >= 3) {
              const last = best[best.length - 1];
              events.push({ status, kriteria: 'Beruntun 3 Hari', detail: best.map(fmtShort).join(', '), minggu_key: getSchoolWeek(last).weekKey, tanggal_pemicu: last });
            }

            // (2) Akumulasi 3 hari dalam satu minggu sekolah
            const weeks = {};
            dates.forEach((d) => {
              const w = getSchoolWeek(d);
              if (!weeks[w.weekKey]) weeks[w.weekKey] = { ...w, dates: [] };
              weeks[w.weekKey].dates.push(d);
            });
            const qual = Object.values(weeks).filter((w) => w.dates.length >= 3).sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
            if (qual) {
              const last = qual.dates[qual.dates.length - 1];
              events.push({ status, kriteria: 'Akumulasi 3 Hari/Minggu', detail: `${fmtShort(qual.weekStart)} s/d ${fmtShort(qual.weekEnd)} (${qual.dates.map(fmtShort).join(', ')})`, minggu_key: qual.weekKey, tanggal_pemicu: last });
            }
          }

          // (3) Sama hari 3 minggu sekolah berbeda
          const byWd = {};
          dates.forEach((d) => {
            const wd = new Date(d + 'T00:00:00').getDay();
            (byWd[wd] = byWd[wd] || []).push(d);
          });
          Object.keys(byWd).forEach((wdStr) => {
            const wd = Number(wdStr);
            if (!HARI_NAMES[wd]) return;
            const list = byWd[wd];
            const weeksSet = new Set(list.map((d) => getSchoolWeek(d).weekKey));
            if (weeksSet.size >= 3 && list[list.length - 1] >= staleStart) {
              const last = list[list.length - 1];
              events.push({ status, kriteria: 'Sama Hari 3 Minggu', detail: `${HARI_NAMES[wd]} — ${weeksSet.size} minggu (${list.map(fmtShort).join(', ')})`, minggu_key: `${getSchoolWeek(last).weekKey}-${HARI_NAMES[wd]}`, tanggal_pemicu: last });
            }
          });
        });

        if (events.length === 0) return;

        const done = events.filter((ev) => {
          const l = logMap[`${id}|${ev.status}|${ev.kriteria}|${ev.minggu_key}`];
          return l && (l.wa_terkirim || l.email_terkirim);
        }).length;
        const notifLabel = done === 0 ? 'Menunggu' : done === events.length ? 'Terkirim' : `Sebagian (${done}/${events.length})`;
        const sameDayParts = events
          .filter((ev) => ev.kriteria === 'Sama Hari 3 Minggu')
          .map((ev) => `${ev.detail.split(' — ')[0]} (${ev.status})`);

        out.push({
          ...s,
          _absenList: absentRecs.slice(-10).map((r) => ({ tanggal: r.tanggal, status: r.status, keterangan: r.keterangan })),
          _alfaCount: absentRecs.filter((r) => r.status === 'Alfa').length,
          _sakitCount: absentRecs.filter((r) => r.status === 'Sakit').length,
          _izinCount: absentRecs.filter((r) => r.status === 'Izin').length,
          _lastAbsenDate: absentRecs[absentRecs.length - 1].tanggal,
          _kriteriaLabel: events.map((ev) => `${ev.status}: ${ev.kriteria}`).join(' · '),
          _sameDayInfo: sameDayParts.length > 0 ? sameDayParts.join(', ') : null,
          _notifLabel: notifLabel,
        });
      });

      return out.sort((a, b) => b._lastAbsenDate.localeCompare(a._lastAbsenDate));
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // realtime: perbarui data tiap 1 menit
  });
}