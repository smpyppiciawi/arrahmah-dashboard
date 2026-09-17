import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, subDays } from 'date-fns';

const DAY = 86400000;

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
  const dayOfYear = Math.floor((thu - jan1) / DAY);
  const jan1Day = (jan1.getDay() + 6) % 7;
  const weekNum = Math.ceil((dayOfYear + jan1Day + 1) / 7);
  return { weekKey: `${year}-${String(weekNum).padStart(2, '0')}`, weekStart: fmt(monday), weekEnd: fmt(friday) };
}

// Siswa absen (Alfa/Sakit) 3+ hari:
// - Masuk daftar saat akumulasi mingguan (Senin–Jumat) mencapai >= 3 hari.
// - PERSISTEN: tetap tampil di minggu berikutnya selama BELUM ADA PERUBAHAN
//   (record absensi terakhir siswa masih Alfa/Sakit). Hilang otomatis saat siswa hadir kembali.
// - Query khusus hanya record Alfa/Sakit (subset kecil) — bebas dari jendela 1000 record dashboard,
//   sehingga deteksi selalu utuh dan akurat.
export function useAbsen3Hari(siswaList) {
  return useQuery({
    queryKey: ['absen3hari-alert', siswaList?.length || 0],
    queryFn: async () => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const since = format(subDays(new Date(), 27), 'yyyy-MM-dd');
      const { weekStart: curStart, weekEnd: curEnd } = getSchoolWeek(todayStr);
      const prevStart = format(subDays(new Date(curStart + 'T00:00:00'), 7), 'yyyy-MM-dd');

      const records = await base44.entities.Absensi.filter(
        { status: { $in: ['Alfa', 'Sakit'] }, tanggal: { $gte: since } },
        'tanggal',
        5000
      );

      const bySiswa = {};
      (records || []).forEach((r) => {
        if (!r.siswa_id || !r.tanggal) return;
        if (!bySiswa[r.siswa_id]) bySiswa[r.siswa_id] = [];
        bySiswa[r.siswa_id].push(r);
      });

      const candidates = [];
      Object.keys(bySiswa).forEach((id) => {
        const recs = bySiswa[id].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        const curRecs = recs.filter((r) => r.tanggal >= curStart && r.tanggal <= curEnd);
        const prevRecs = recs.filter((r) => r.tanggal >= prevStart && r.tanggal < curStart);
        if (curRecs.length >= 3) candidates.push({ siswaId: id, curRecs, prevRecs, carryover: false });
        else if (prevRecs.length >= 3) candidates.push({ siswaId: id, curRecs, prevRecs, carryover: true });
      });

      if (candidates.length === 0) return [];

      // Persistensi: hanya tampil selama record absensi TERAKHIR siswa masih Alfa/Sakit
      // (belum hadir kembali). Data lama/stale otomatis tidak ditampilkan.
      const checked = await Promise.all(candidates.map(async (c) => {
        const latest = await base44.entities.Absensi.filter({ siswa_id: c.siswaId }, '-tanggal', 3);
        const last = (latest || [])[0];
        const stillAbsent = !!last && (last.status === 'Alfa' || last.status === 'Sakit') && last.tanggal >= prevStart;
        return { ...c, stillAbsent };
      }));

      const siswaById = {};
      (siswaList || []).forEach((s) => { siswaById[s.id] = s; });

      return checked.filter((c) => c.stillAbsent).map((c) => {
        const s = siswaById[c.siswaId];
        if (!s || s.status !== 'Aktif') return null;
        const base = c.carryover ? [...c.prevRecs, ...c.curRecs] : c.curRecs;
        const week = getSchoolWeek(base[base.length - 1].tanggal);
        const ts = base.map((r) => new Date(r.tanggal + 'T00:00:00').getTime());
        let consecutive = false;
        for (let i = 2; i < ts.length; i++) {
          const gap1 = ts[i] - ts[i - 1];
          const gap2 = ts[i - 1] - ts[i - 2];
          // gap <= 4 hari menjangkau lomatan Sabtu-Minggu (Jumat -> Senin)
          if (gap1 <= 4 * DAY && gap2 <= 4 * DAY) { consecutive = true; break; }
        }
        return {
          ...s,
          _absenList: base.slice(-10).map((r) => ({ tanggal: r.tanggal, status: r.status, keterangan: r.keterangan })),
          _alfaCount: base.filter((r) => r.status === 'Alfa').length,
          _sakitCount: base.filter((r) => r.status === 'Sakit').length,
          _lastAbsenDate: base[base.length - 1].tanggal,
          _consecutive: consecutive,
          _carryover: c.carryover,
          _weekStart: week.weekStart,
          _weekEnd: week.weekEnd,
        };
      }).filter(Boolean).sort((a, b) => b._lastAbsenDate.localeCompare(a._lastAbsenDate));
    },
    staleTime: 60 * 1000,
  });
}