import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Minggu sekolah (Senin–Jumat) dari tanggal 'yyyy-MM-dd' — versi browser (getDay lokal).
// Dipakai juga oleh Dashboard Kepsek untuk label minggu berjalan.
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

// Laporan Peringatan Absen Siswa untuk Dashboard Kepsek.
// Perhitungan dijalankan di server memakai mesin deteksi yang SAMA dengan fungsi notifikasi,
// sehingga angka di dashboard identik dengan yang dinotifikasi ke Wali Kelas & Waka.
// Periode: 1 November 2026 s/d hari ini (WIB), batas akhir bergerak maju setiap hari.
export function useAbsen3Hari() {
  return useQuery({
    queryKey: ['absen3hari-laporan'],
    queryFn: async () => {
      const res = await base44.functions.invoke('laporanAbsen3Hari', {});
      const data = res?.data ?? res;
      if (!data || data.error) throw new Error(data?.error || 'Gagal memuat laporan Peringatan Absen');

      const rows = (data.rows || []).map((r) => {
        const events = r.events || [];
        const sameDayParts = events
          .filter((ev) => ev.kriteria === 'Sama Hari 3 Minggu')
          .map((ev) => `${ev.detail.split(' — ')[0]} (${ev.status})`);
        return {
          id: r.siswa_id,
          nis: r.nis,
          nama: r.nama,
          nama_kelas: r.nama_kelas,
          _absenList: r.absen_list || [],
          _alfaCount: r.counts?.Alfa || 0,
          _sakitCount: r.counts?.Sakit || 0,
          _izinCount: r.counts?.Izin || 0,
          _lastAbsenDate: r.last_date || '',
          _kriteriaLabel: events.map((ev) => `${ev.status}: ${ev.kriteria}`).join(' · '),
          _sameDayInfo: sameDayParts.length > 0 ? sameDayParts.join(', ') : null,
          _notifLabel: r.wa_status || 'Menunggu',
          _events: events,
          _penerima: r.penerima || [],
        };
      });

      return {
        rows,
        periode: data.periode || null,
        ringkasan: data.ringkasan || null,
      };
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}