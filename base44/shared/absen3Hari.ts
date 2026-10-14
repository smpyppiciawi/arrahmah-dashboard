// Mesin deteksi Peringatan Absen 3 Hari — dipakai bersama oleh fungsi notifAbsen3Hari.
// Kriteria dihitung PER STATUS (Sakit / Izin / Alfa dihitung masing-masing):
//   1. Beruntun 3 Hari        — status sama pada 3 hari sekolah aktif berurutan
//                               (Senin-Jumat, hari libur Kalender Akademik dilewati; Jumat -> Senin berurutan)
//   2. Akumulasi 3 Hari/Minggu — status sama 3x dalam satu minggu sekolah (Senin-Jumat)
//   3. Sama Hari 3 Minggu     — status sama pada hari yang sama di 3 minggu sekolah berbeda
// Pola beruntun/akumulasi aktif selama record absensi TERAKHIR siswa masih berstatus absen
// (gugur otomatis saat siswa tercatat Hadir kembali — aman terhadap koreksi data).

const ABSENT = ['Alfa', 'Sakit', 'Izin'];
const HARI_NAMES = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat' };
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function fmtShort(d) {
  const parts = d.split('-').map(Number);
  return `${parts[2]} ${BULAN[(parts[1] || 1) - 1]}`;
}

// Minggu sekolah (Senin-Jumat) untuk tanggal 'yyyy-MM-dd' (lingkungan server: UTC konsisten dgn dateStr)
export function getSchoolWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getUTCDay(); // 0=Minggu..6=Sabtu
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  const fmt = (x) => x.toISOString().slice(0, 10);
  const thu = new Date(monday);
  thu.setUTCDate(monday.getUTCDate() + 3);
  const year = thu.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor((thu.getTime() - jan1.getTime()) / 86400000);
  const jan1Day = (jan1.getUTCDay() + 6) % 7;
  const weekNum = Math.ceil((dayOfYear + jan1Day + 1) / 7);
  return { weekKey: `${year}-${String(weekNum).padStart(2, '0')}`, weekStart: fmt(monday), weekEnd: fmt(friday) };
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function buildHolidaySet(kalenderList) {
  const set = new Set();
  (kalenderList || []).forEach((ev) => {
    if (!ev.tanggal_mulai) return;
    if (ev.kategori !== 'Hari Libur Nasional' && ev.kategori !== 'Libur Sekolah') return;
    const end = ev.tanggal_selesai || ev.tanggal_mulai;
    let d = ev.tanggal_mulai;
    while (d <= end) {
      set.add(d);
      d = addDays(d, 1);
    }
  });
  return set;
}

// absensiRecords: record absensi (SEMUA status) dalam jendela deteksi, minimal berisi siswa_id, tanggal, status.
// Return: map siswa_id -> { events: [{status, kriteria, detail, minggu_key, tanggal_pemicu}], counts, lastDate, absenList }
export function detectAbsen3Hari({ absensiRecords, todayStr, kalenderList, windowDays = 35, stalenessDays = 10 }) {
  const windowStart = addDays(todayStr, -windowDays);
  const staleStart = addDays(todayStr, -stalenessDays);
  const holidays = buildHolidaySet(kalenderList);
  const isSchoolDay = (d) => {
    const wd = new Date(d + 'T00:00:00').getUTCDay();
    return wd >= 1 && wd <= 5 && !holidays.has(d);
  };
  const nextSchoolDay = (d) => {
    let x = d;
    do {
      x = addDays(x, 1);
    } while (!isSchoolDay(x));
    return x;
  };

  const bySiswa = {};
  for (const r of absensiRecords || []) {
    if (!r.siswa_id || !r.tanggal || r.tanggal > todayStr || r.tanggal < windowStart) continue;
    (bySiswa[r.siswa_id] = bySiswa[r.siswa_id] || []).push(r);
  }

  const result = {};
  for (const siswaId of Object.keys(bySiswa)) {
    const all = bySiswa[siswaId].slice().sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const latest = all[all.length - 1];
    const stillAbsent = !!latest && ABSENT.includes(latest.status) && latest.tanggal >= windowStart;
    const absentRecs = all.filter((r) => ABSENT.includes(r.status) && isSchoolDay(r.tanggal));
    if (absentRecs.length === 0) continue;

    const events = [];
    for (const status of ABSENT) {
      const dates = [...new Set(absentRecs.filter((r) => r.status === status).map((r) => r.tanggal))].sort();
      if (dates.length === 0) continue;

      if (stillAbsent) {
        // (1) Beruntun 3 hari sekolah aktif
        let best = [];
        let run = [dates[0]];
        for (let i = 1; i < dates.length; i++) {
          if (dates[i] === nextSchoolDay(run[run.length - 1])) run.push(dates[i]);
          else {
            if (run.length > best.length) best = run;
            run = [dates[i]];
          }
        }
        if (run.length > best.length) best = run;
        if (best.length >= 3) {
          const last = best[best.length - 1];
          events.push({
            status,
            kriteria: 'Beruntun 3 Hari',
            detail: best.map(fmtShort).join(', '),
            minggu_key: getSchoolWeek(last).weekKey,
            tanggal_pemicu: last,
          });
        }

        // (2) Akumulasi 3 hari dalam satu minggu sekolah (minggu terbaru yang memenuhi)
        const weeks = {};
        dates.forEach((d) => {
          const w = getSchoolWeek(d);
          if (!weeks[w.weekKey]) weeks[w.weekKey] = { ...w, dates: [] };
          weeks[w.weekKey].dates.push(d);
        });
        const qual = Object.values(weeks)
          .filter((w) => w.dates.length >= 3)
          .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
        if (qual) {
          const last = qual.dates[qual.dates.length - 1];
          events.push({
            status,
            kriteria: 'Akumulasi 3 Hari/Minggu',
            detail: `${fmtShort(qual.weekStart)} s/d ${fmtShort(qual.weekEnd)} (${qual.dates.map(fmtShort).join(', ')})`,
            minggu_key: qual.weekKey,
            tanggal_pemicu: last,
          });
        }
      }

      // (3) Sama hari 3 minggu sekolah berbeda (cth: tiap Kamis, 3 minggu)
      const byWd = {};
      dates.forEach((d) => {
        const wd = new Date(d + 'T00:00:00').getUTCDay();
        (byWd[wd] = byWd[wd] || []).push(d);
      });
      for (const wdStr of Object.keys(byWd)) {
        const wd = Number(wdStr);
        if (!HARI_NAMES[wd]) continue;
        const list = byWd[wd];
        const weeksSet = new Set(list.map((d) => getSchoolWeek(d).weekKey));
        if (weeksSet.size >= 3 && list[list.length - 1] >= staleStart) {
          const last = list[list.length - 1];
          // kunci minggu + nama hari — agar pola pada hari berbeda tidak menabrak kunci dedup yang sama
          events.push({
            status,
            kriteria: 'Sama Hari 3 Minggu',
            detail: `${HARI_NAMES[wd]} — ${weeksSet.size} minggu (${list.map(fmtShort).join(', ')})`,
            minggu_key: `${getSchoolWeek(last).weekKey}-${HARI_NAMES[wd]}`,
            tanggal_pemicu: last,
          });
        }
      }
    }

    if (events.length === 0) continue;
    result[siswaId] = {
      events,
      counts: {
        Alfa: absentRecs.filter((r) => r.status === 'Alfa').length,
        Sakit: absentRecs.filter((r) => r.status === 'Sakit').length,
        Izin: absentRecs.filter((r) => r.status === 'Izin').length,
      },
      lastDate: absentRecs[absentRecs.length - 1].tanggal,
      absenList: absentRecs.slice(-10).map((r) => ({ tanggal: r.tanggal, status: r.status, keterangan: r.keterangan })),
    };
  }
  return result;
}