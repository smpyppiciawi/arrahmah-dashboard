import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CalendarCheck, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';
import { todayWIB } from '@/lib/wib.js';
import {
  STATUSES, fetchFiltered, quickRange, semesterOf, semesterRange,
} from '@/lib/statistikUtils';
import StatistikFilters from '@/components/catatan/statistik/StatistikFilters';
import SubtabKehadiran from '@/components/catatan/statistik/SubtabKehadiran';
import PoinDashboard from '@/components/catatan/statistik/PoinDashboard';

const SUBTABS = [
  { value: 'kehadiran', label: 'Kehadiran', icon: CalendarCheck, active: 'data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md' },
  { value: 'pelanggaran', label: 'Pelanggaran', icon: AlertTriangle, active: 'data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-md' },
  { value: 'improvement', label: 'Improvement', icon: Sparkles, active: 'data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md' },
];

const sum = (rows, field) => rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);

export default function StatistikTab() {
  const [activeTab, setActiveTab] = useState('kehadiran');
  const [periode, setPeriode] = useState('harian');
  const [semester, setSemester] = useState(() => semesterOf(todayWIB()));
  const [range, setRange] = useState(() => quickRange('bulan-ini'));
  const [quickAktif, setQuickAktif] = useState('bulan-ini');
  const [tingkat, setTingkat] = useState('semua');
  const [kelasFilter, setKelasFilter] = useState('semua');
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  const { data: appSettings } = useQuery({
    queryKey: ['pengaturan-aplikasi'],
    queryFn: () => base44.entities.PengaturanAplikasi.list(),
  });
  const tahunAjaran = appSettings?.[0]?.tahun_ajaran_aktif || '';

  const { data: kelasData = [] } = useQuery({
    queryKey: ['statistik-kelas-list'],
    queryFn: () => base44.entities.Kelas.list(),
  });

  const kelasOptions = useMemo(() => {
    const list = tingkat === 'semua'
      ? kelasData
      : kelasData.filter((k) => String(k.tingkat) === String(tingkat));
    return Array.from(new Set(list.map((k) => k.nama_kelas).filter(Boolean))).sort();
  }, [kelasData, tingkat]);

  // Ganti tingkat → pilihan kelas kembali ke semua
  useEffect(() => { setKelasFilter('semua'); }, [tingkat]);

  const namaKelasFilter = useMemo(() => {
    if (kelasFilter !== 'semua') return [kelasFilter];
    if (tingkat !== 'semua') return kelasOptions;
    return null;
  }, [kelasFilter, tingkat, kelasOptions]);

  const rangeQuery = useMemo(() => {
    const q = { tanggal: { $gte: range.mulai, $lte: range.akhir } };
    if (namaKelasFilter) q.nama_kelas = { $in: namaKelasFilter.length ? namaKelasFilter : ['__tidak-ada__'] };
    return q;
  }, [range, namaKelasFilter]);

  const filterKey = `${range.mulai}|${range.akhir}|${namaKelasFilter ? namaKelasFilter.join(',') : 'semua'}|${refreshKey}`;

  const absensiQuery = useQuery({
    queryKey: ['statistik-absensi', filterKey],
    queryFn: () => fetchFiltered(
      base44.entities.Absensi,
      { ...rangeQuery, status: { $in: STATUSES } },
      ['tanggal', 'siswa_id', 'nama_siswa', 'nama_kelas', 'status', 'jenis_absensi']
    ),
  });

  const pelanggaranQuery = useQuery({
    queryKey: ['statistik-pelanggaran', filterKey],
    queryFn: () => fetchFiltered(
      base44.entities.PelanggaranImprovement,
      { ...rangeQuery, status: { $nin: ['Dibatalkan', 'Pending'] } },
      ['tanggal', 'siswa_id', 'nama_siswa', 'nama_kelas', 'poin', 'kode', 'kategori_utama', 'uraian_pelanggaran']
    ),
  });

  const improvementQuery = useQuery({
    queryKey: ['statistik-improvement', filterKey],
    queryFn: () => fetchFiltered(
      base44.entities.Improvement,
      { ...rangeQuery, status: 'Aktif' },
      ['tanggal', 'siswa_id', 'nama_siswa', 'nama_kelas', 'poin_pengurangan', 'kegiatan_pembinaan_nama', 'uraian']
    ),
  });

  // Jumlah siswa aktif (dikurangi yang diarsipkan) — mengikuti filter kelas
  const { data: siswaAktif = 0 } = useQuery({
    queryKey: ['statistik-siswa-aktif', namaKelasFilter ? namaKelasFilter.join(',') : 'semua', refreshKey],
    queryFn: async () => {
      const base = namaKelasFilter
        ? { status: 'Aktif', nama_kelas: { $in: namaKelasFilter.length ? namaKelasFilter : ['__tidak-ada__'] } }
        : { status: 'Aktif' };
      const [total, arsip] = await Promise.all([
        base44.entities.Siswa.count(base),
        base44.entities.Siswa.count({ ...base, is_arsip: true }),
      ]);
      return Math.max((total || 0) - (arsip || 0), 0);
    },
  });

  // Absensi unik: 1 kejadian = 1 (tanggal, siswa, jenis absensi) — hindari hitung ganda
  const absensiUnik = useMemo(() => {
    const seen = new Set();
    const out = [];
    (absensiQuery.data || []).forEach((a) => {
      const key = `${a.tanggal}|${a.siswa_id}|${a.jenis_absensi || 'Kehadiran'}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(a);
    });
    return out;
  }, [absensiQuery.data]);

  const handleSemester = (value) => {
    setSemester(value);
    setRange(semesterRange(tahunAjaran, value));
    setQuickAktif(null);
  };

  const handleQuick = (key) => {
    setRange(quickRange(key));
    setQuickAktif(key);
  };

  const handleTanggalMulai = (value) => {
    setQuickAktif(null);
    setRange((r) => ({ mulai: value, akhir: value > r.akhir ? value : r.akhir }));
  };

  const handleTanggalAkhir = (value) => {
    setQuickAktif(null);
    setRange((r) => ({ mulai: value < r.mulai ? value : r.mulai, akhir: value }));
  };

  const loading = absensiQuery.isLoading || pelanggaranQuery.isLoading || improvementQuery.isLoading;

  const exportExcel = () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const totals = { Izin: 0, Sakit: 0, Alfa: 0 };
      absensiUnik.forEach((a) => { if (totals[a.status] !== undefined) totals[a.status] += 1; });
      const pelRows = pelanggaranQuery.data || [];
      const impRows = improvementQuery.data || [];

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['STATISTIK CATATAN SISWA'],
        ['Tahun Ajaran', tahunAjaran || '-'],
        ['Semester', semester],
        ['Periode', `${range.mulai} s.d. ${range.akhir}`],
        ['Tingkat', tingkat === 'semua' ? 'Semua Tingkat' : `Tingkat ${tingkat}`],
        ['Kelas', kelasFilter === 'semua' ? 'Semua Kelas' : kelasFilter],
        ['Diekspor', todayWIB()],
        [],
        ['KEHADIRAN (Izin / Sakit / Alfa)'],
        ['Siswa Aktif', siswaAktif],
        ['Izin', totals.Izin],
        ['Sakit', totals.Sakit],
        ['Alfa', totals.Alfa],
        ['Total Ketidakhadiran', totals.Izin + totals.Sakit + totals.Alfa],
        [],
        ['PELANGGARAN'],
        ['Jumlah Kejadian', pelRows.length],
        ['Total Poin', sum(pelRows, 'poin')],
        [],
        ['IMPROVEMENT'],
        ['Jumlah Kegiatan', impRows.length],
        ['Total Poin', sum(impRows, 'poin_pengurangan')],
      ]), 'Ringkasan');

      const perKelasSheet = (rows, field, labelKejadian) => {
        const map = new Map();
        rows.forEach((r) => {
          const k = r.nama_kelas || '-';
          if (!map.has(k)) map.set(k, { kejadian: 0, poin: 0 });
          const row = map.get(k);
          row.kejadian += 1;
          row.poin += Number(r[field]) || 0;
        });
        return XLSX.utils.json_to_sheet(
          Array.from(map.entries())
            .map(([Kelas, v]) => ({ Kelas, [labelKejadian]: v.kejadian, 'Total Poin': Math.round(v.poin * 10) / 10 }))
            .sort((a, b) => a.Kelas.localeCompare(b.Kelas, 'id'))
        );
      };

      const absensiPerKelas = new Map();
      absensiUnik.forEach((a) => {
        const k = a.nama_kelas || '-';
        if (!absensiPerKelas.has(k)) absensiPerKelas.set(k, { Izin: 0, Sakit: 0, Alfa: 0 });
        const row = absensiPerKelas.get(k);
        if (row[a.status] !== undefined) row[a.status] += 1;
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        Array.from(absensiPerKelas.entries())
          .map(([Kelas, v]) => ({ Kelas, ...v, Total: v.Izin + v.Sakit + v.Alfa }))
          .sort((a, b) => a.Kelas.localeCompare(b.Kelas, 'id'))
      ), 'Kehadiran per Kelas');
      XLSX.utils.book_append_sheet(wb, perKelasSheet(pelRows, 'poin', 'Kejadian'), 'Pelanggaran per Kelas');
      XLSX.utils.book_append_sheet(wb, perKelasSheet(impRows, 'poin_pengurangan', 'Kegiatan'), 'Improvement per Kelas');

      XLSX.writeFile(wb, `Statistik-Catatan-Siswa_${todayWIB()}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <StatistikFilters
        tahunAjaran={tahunAjaran}
        semester={semester}
        onSemester={handleSemester}
        periode={periode}
        onPeriode={setPeriode}
        tanggalMulai={range.mulai}
        tanggalAkhir={range.akhir}
        onTanggalMulai={handleTanggalMulai}
        onTanggalAkhir={handleTanggalAkhir}
        onQuick={handleQuick}
        quickAktif={quickAktif}
        tingkat={tingkat}
        onTingkat={setTingkat}
        kelasFilter={kelasFilter}
        onKelas={setKelasFilter}
        kelasOptions={kelasOptions}
        onRefresh={() => setRefreshKey((k) => k + 1)}
        onExport={exportExcel}
        exporting={exporting}
        loading={loading}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full md:w-fit gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm overflow-x-auto no-scrollbar">
          {SUBTABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${t.active}`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="kehadiran" className="mt-4">
          <SubtabKehadiran
            absensiUnik={absensiUnik}
            loading={absensiQuery.isLoading}
            periode={periode}
            tanggalMulai={range.mulai}
            tanggalAkhir={range.akhir}
            siswaAktif={siswaAktif}
          />
        </TabsContent>

        <TabsContent value="pelanggaran" className="mt-4">
          <PoinDashboard
            variant="pelanggaran"
            rows={pelanggaranQuery.data || []}
            loading={pelanggaranQuery.isLoading}
            periode={periode}
            tanggalMulai={range.mulai}
            tanggalAkhir={range.akhir}
          />
        </TabsContent>

        <TabsContent value="improvement" className="mt-4">
          <PoinDashboard
            variant="improvement"
            rows={improvementQuery.data || []}
            loading={improvementQuery.isLoading}
            periode={periode}
            tanggalMulai={range.mulai}
            tanggalAkhir={range.akhir}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}