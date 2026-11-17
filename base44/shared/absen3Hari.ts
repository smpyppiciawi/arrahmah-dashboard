// Mesin Peringatan Absen Siswa — SATU sumber logika yang dipakai bersama oleh:
//   1. base44/functions/notifAbsen3Hari   (pengiriman WA ke Wali Kelas & Waka)
//   2. base44/functions/laporanAbsen3Hari (laporan Dashboard Kepsek)
// sehingga angka di Dashboard dan yang dinotifikasi selalu identik.
//
// PERIODE PEMANTAUAN: PERIODE_MULAI (1 November 2026) s/d HARI INI (zona Asia/Jakarta).
// Batas akhir bergerak maju setiap hari dan tidak pernah membaca tanggal setelah hari ini.
//
// Kriteria dihitung PER STATUS (Sakit / Izin / Alfa masing-masing):
//   1. Beruntun 3 Hari        — status sama pada 3 hari sekolah berurutan
//                               (Senin-Jumat, hari libur Kalender Akademik dilewati; Jumat -> Senin berurutan)
//   2. Akumulasi 3 Hari/Minggu — status sama 3x dalam satu minggu sekolah (Senin-Jumat)
//   3. Sama Hari 3 Minggu     — status sama pada hari yang sama di 3 minggu sekolah berbeda
// Pola beruntun/akumulasi gugur otomatis saat record absensi TERAKHIR siswa bukan lagi absen
// (mis. siswa tercatat Hadir kembali — aman terhadap koreksi data).

export const PERIODE_MULAI = '2026-11-01';
export const STATUS_ABSEN = ['Alfa', 'Sakit', 'Izin'];
export const PERAN_PENERIMA = ['Wali Kelas', 'Waka Kesiswaan', 'Waka Kurikulum'];

const HARI_NAMES = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat' };
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Prioritas status bila satu tanggal punya lebih dari satu record (koreksi data):
// kehadiran menang atas ketidakhadiran agar tidak memicu peringatan palsu.
const PRIORITAS_STATUS = { Hadir: 4, Terlambat: 4, Libur: 4, Izin: 3, Sakit: 2, Alfa: 1 };

export function fmtShort(dateStr) {
  if (!dateStr) return '-';
  const parts = String(dateStr).split('-').map(Number);
  return `${parts[2]} ${BULAN[(parts[1] || 1) - 1]}`;
}

export function periodeLabel(todayStr) {
  return `${fmtShort(PERIODE_MULAI)} s/d ${fmtShort(todayStr)}`;
}

// Tanggal hari ini menurut zona waktu sekolah (Asia/Jakarta / WIB, UTC+7).
export function wibTodayStr() {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Minggu sekolah (Senin-Jumat) untuk tanggal 'yyyy-MM-dd'.
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

// Tanggal libur dari Kalender Akademik (rentang tanggal_mulai..tanggal_selesai).
export function buildHolidaySet(kalenderList) {
  const set = new Set();
  (kalenderList || []).forEach((ev) => {
    if (!ev || !ev.tanggal_mulai) return;
    if (ev.kategori !== 'Hari Libur Nasional' && ev.kategori !== 'Libur Sekolah') return;
    const end = ev.tanggal_selesai || ev.tanggal_mulai;
    let d = ev.tanggal_mulai;
    let guard = 0;
    while (d <= end && guard < 400) {
      set.add(d);
      d = addDays(d, 1);
      guard += 1;
    }
  });
  return set;
}

// Hari belajar/sekolah: Senin-Jumat dan bukan hari libur sekolah.
export function isSchoolDay(dateStr, holidays) {
  if (!dateStr) return false;
  const wd = new Date(dateStr + 'T00:00:00').getUTCDay();
  if (wd < 1 || wd > 5) return false;
  return !(holidays && holidays.has(dateStr));
}

// Pembacaan entity tahan paginasi: SELALU membaca page.items (bukan objek page mentah),
// sehingga tidak ada lagi hasil kosong palsu karena respons paginasi.
export async function fetchAllRecords(entity, query, fields, sort) {
  const out = [];
  let cursor;
  for (;;) {
    const options = { limit: 1000, cursor };
    if (fields) options.fields = fields;
    if (sort) options.sort = sort;
    const page = await entity.filter(query || {}, options);
    if (Array.isArray(page)) {
      out.push(...page);
      break;
    }
    out.push(...(page?.items || []));
    if (!page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  return out;
}

export function eventKey(siswaId, ev) {
  return `${siswaId}|${ev.status}|${ev.kriteria}|${ev.minggu_key}`;
}

// absensiRecords: record absensi (SEMUA status) dalam periode pemantauan.
// Return: map siswa_id -> { events:[{status,kriteria,detail,minggu_key,tanggal_pemicu}], counts, lastDate, absenList }
export function detectAbsen3Hari({ absensiRecords, todayStr, kalenderList, periodStart = PERIODE_MULAI, stalenessDays = 10 }) {
  const start = periodStart && periodStart <= todayStr ? periodStart : todayStr;
  const staleStart = addDays(todayStr, -stalenessDays);
  const holidays = buildHolidaySet(kalenderList);
  const schoolDay = (d) => isSchoolDay(d, holidays);
  const nextSchoolDay = (d) => {
    let x = d;
    do {
      x = addDays(x, 1);
    } while (!schoolDay(x));
    return x;
  };

  // Dedup: satu record per siswa + tanggal + status, hanya dalam periode pemantauan.
  const seen = new Set();
  const bySiswa = {};
  (absensiRecords || []).forEach((r) => {
    if (!r || !r.siswa_id || !r.tanggal || !r.status) return;
    if (r.tanggal < start || r.tanggal > todayStr) return;
    const k = `${r.siswa_id}|${r.tanggal}|${r.status}`;
    if (seen.has(k)) return;
    seen.add(k);
    if (!bySiswa[r.siswa_id]) bySiswa[r.siswa_id] = [];
    bySiswa[r.siswa_id].push(r);
  });

  const result = {};
  Object.keys(bySiswa).forEach((siswaId) => {
    const all = bySiswa[siswaId]
      .slice()
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || (PRIORITAS_STATUS[a.status] || 0) - (PRIORITAS_STATUS[b.status] || 0));
    const latest = all[all.length - 1];
    const stillAbsent = !!latest && STATUS_ABSEN.includes(latest.status);
    const absentRecs = all.filter((r) => STATUS_ABSEN.includes(r.status) && schoolDay(r.tanggal));
    if (absentRecs.length === 0) return;

    const events = [];
    STATUS_ABSEN.forEach((status) => {
      const dates = [...new Set(absentRecs.filter((r) => r.status === status).map((r) => r.tanggal))].sort();
      if (dates.length === 0) return;

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

      // (3) Sama hari pada 3 minggu sekolah berbeda (cth: tiap Kamis, 3 minggu)
      const byWd = {};
      dates.forEach((d) => {
        const wd = new Date(d + 'T00:00:00').getUTCDay();
        (byWd[wd] = byWd[wd] || []).push(d);
      });
      Object.keys(byWd).forEach((wdStr) => {
        const wd = Number(wdStr);
        if (!HARI_NAMES[wd]) return;
        const list = byWd[wd];
        const weeksSet = new Set(list.map((d) => getSchoolWeek(d).weekKey));
        if (weeksSet.size >= 3 && list[list.length - 1] >= staleStart) {
          const last = list[list.length - 1];
          events.push({
            status,
            kriteria: 'Sama Hari 3 Minggu',
            detail: `${HARI_NAMES[wd]} — ${weeksSet.size} minggu (${list.map(fmtShort).join(', ')})`,
            minggu_key: `${getSchoolWeek(last).weekKey}-${HARI_NAMES[wd]}`,
            tanggal_pemicu: last,
          });
        }
      });
    });

    if (events.length === 0) return;
    result[siswaId] = {
      events,
      counts: {
        Alfa: absentRecs.filter((r) => r.status === 'Alfa').length,
        Sakit: absentRecs.filter((r) => r.status === 'Sakit').length,
        Izin: absentRecs.filter((r) => r.status === 'Izin').length,
      },
      lastDate: absentRecs[absentRecs.length - 1].tanggal,
      absenList: absentRecs.slice(-10).map((r) => ({ tanggal: r.tanggal, status: r.status, keterangan: r.keterangan || '' })),
    };
  });
  return result;
}

// Waka Kesiswaan & Waka Kurikulum dari pegawai AKTIF (data Guru terkini).
export function findWaka(guruList) {
  const waka = { ks: null, kr: null };
  (guruList || []).forEach((g) => {
    if (!g || g.status !== 'Aktif') return;
    if (g.tugas_tambahan === 'Waka Kesiswaan' && !waka.ks) waka.ks = g;
    if (g.tugas_tambahan === 'Waka Kurikulum' && !waka.kr) waka.kr = g;
  });
  return waka;
}

// Penerima per siswa: Wali Kelas (dari data kelas) + Waka Kesiswaan + Waka Kurikulum.
export function getRecipients({ siswa, kelasById, guruById, guruList, waka }) {
  const out = [];
  const kelas = siswa ? kelasById[siswa.kelas_id] : null;
  let wali = null;
  if (kelas) {
    wali = kelas.wali_kelas_id ? guruById[kelas.wali_kelas_id] || null : null;
    if (!wali && kelas.wali_kelas) wali = (guruList || []).find((g) => g.nama === kelas.wali_kelas) || null;
  }
  if (wali) out.push({ peran: 'Wali Kelas', guru_id: wali.id, nama: wali.nama || '', phone: wali.no_telp || '' });
  if (waka && waka.ks) out.push({ peran: 'Waka Kesiswaan', guru_id: waka.ks.id, nama: waka.ks.nama || '', phone: waka.ks.no_telp || '' });
  if (waka && waka.kr) out.push({ peran: 'Waka Kurikulum', guru_id: waka.kr.id, nama: waka.kr.nama || '', phone: waka.kr.no_telp || '' });
  return out;
}