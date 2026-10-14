import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart3, Download, CalendarRange, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList
} from 'recharts';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { todayWIB } from '@/lib/wib.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Warna konsisten per status kehadiran (dipakai di semua grafik)
const STATUS_COLORS = { Izin: '#f59e0b', Sakit: '#3b82f6', Alfa: '#ef4444' };
const STATUSES = ['Izin', 'Sakit', 'Alfa'];

const PERIODE_LABEL = { harian: 'Harian', mingguan: 'Mingguan', bulanan: 'Bulanan' };

// ===== Util bucket waktu (berbasis tanggal string WIB, tanpa offset UTC) =====
function bucketKey(tanggal, periode) {
  const d = parseISO(tanggal);
  if (periode === 'bulanan') return format(d, 'yyyy-MM');
  if (periode === 'mingguan') return format(d, "RRRR-'W'II"); // ISO week
  return tanggal;
}
function bucketLabel(tanggal, periode) {
  const d = parseISO(tanggal);
  if (periode === 'bulanan') return format(d, 'MMM yyyy');
  if (periode === 'mingguan') return `W${format(d, 'II')}`;
  return format(d, 'dd MMM');
}
// Label bucket dari tanggal pertama bucket-nya
function firstDateOfBucket(k, periode) {
  if (periode === 'harian') return k;
  if (periode === 'bulanan') return `${k}-01`;
  // mingguan: bucket "2026-W41" → Senin minggu ISO tsb
  const [y, w] = k.split('-W');
  const jan4 = new Date(Date.UTC(Number(y), 0, 4)); // 4 Jan selalu di minggu ISO 1
  const day = jan4.getUTCDay() || 7;
  const mondayW1 = new Date(jan4); mondayW1.setUTCDate(jan4.getUTCDate() - (day - 1));
  const monday = new Date(mondayW1); monday.setUTCDate(mondayW1.getUTCDate() + (Number(w) - 1) * 7);
  return format(monday, 'yyyy-MM-dd');
}
// Semua bucket antara mulai–akhir supaya grafik tetap berurutan walau kosong
function bucketAxis(mulai, akhir, periode) {
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
  return Array.from(keys); // urutan sisip = urutan kronologis (sort string salah utk minggu 1-9 vs 10+)
}

// ===== Pengambilan data terfilter di server, dengan cursor (tanpa menghitung ganda halaman) =====
async function fetchFiltered(entity, query, fields, maxRecords = 10000) {
  const out = [];
  let cursor;
  do {
    const page = await entity.filter(query, { sort: 'tanggal', limit: 500, cursor, fields });
    out.push(...(page.items || []));
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor && out.length < maxRecords);
  return out;
}

export default function StatistikTab({ readOnly }) {
  const [periode, setPeriode] = useState('harian');
  const [tanggalMulai, setTanggalMulai] = useState(todayWIB());
  const [tanggalAkhir, setTanggalAkhir] = useState(todayWIB());
  const [kelasFilter, setKelasFilter] = useState('semua');
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Jaga urutan tanggal mulai <= akhir
  useEffect(() => {
    if (tanggalMulai > tanggalAkhir) setTanggalMulai(tanggalAkhir);
  }, [tanggalAkhir]);
  useEffect(() => {
    if (tanggalAkhir < tanggalMulai) setTanggalAkhir(tanggalMulai);
  }, [tanggalMulai]);

  const rangeQuery = useMemo(() => {
    const q = { tanggal: { $gte: tanggalMulai, $lte: tanggalAkhir } };
    if (kelasFilter !== 'semua') q.nama_kelas = kelasFilter;
    return q;
  }, [tanggalMulai, tanggalAkhir, kelasFilter]);

  const { data: kelasList = [] } = useQuery({
    queryKey: ['statistik-kelas'],
    queryFn: async () => {
      const kls = await base44.entities.Kelas.list();
      return Array.from(new Set(kls.map(k => k.nama_kelas).filter(Boolean))).sort();
    }
  });

  const absensiQuery = useQuery({
    queryKey: ['statistik-absensi', tanggalMulai, tanggalAkhir, kelasFilter, refreshKey],
    queryFn: () => fetchFiltered(base44.entities.Absensi,
      { ...rangeQuery, status: { $in: STATUSES } },
      ['tanggal', 'siswa_id', 'nama_siswa', 'nama_kelas', 'status', 'jenis_absensi'])
  });

  const pelanggaranQuery = useQuery({
    queryKey: ['statistik-pelanggaran', tanggalMulai, tanggalAkhir, kelasFilter, refreshKey],
    queryFn: () => fetchFiltered(base44.entities.PelanggaranImprovement,
      { ...rangeQuery, status: { $nin: ['Dibatalkan', 'Pending'] } },
      ['tanggal', 'nama_kelas', 'poin', 'uraian_pelanggaran'])
  });

  const improvementQuery = useQuery({
    queryKey: ['statistik-improvement', tanggalMulai, tanggalAkhir, kelasFilter, refreshKey],
    queryFn: () => fetchFiltered(base44.entities.Improvement,
      { ...rangeQuery, status: 'Aktif' },
      ['tanggal', 'nama_kelas', 'poin_pengurangan', 'uraian'])
  });

  const loading = absensiQuery.isLoading || pelanggaranQuery.isLoading || improvementQuery.isLoading;

  // ===== Olah data (memo) =====
  const stats = useMemo(() => {
    // Absensi: 1 kejadian = 1 (tanggal, siswa, jenis absensi) — tidak dihitung dobel
    const seen = new Set();
    const absensiUnik = [];
    (absensiQuery.data || []).forEach(a => {
      const key = `${a.tanggal}|${a.siswa_id}|${a.jenis_absensi || 'Kehadiran'}`;
      if (seen.has(key)) return;
      seen.add(key);
      absensiUnik.push(a);
    });

    const axis = bucketAxis(tanggalMulai, tanggalAkhir, periode);
    const initBucket = () => ({ Izin: 0, Sakit: 0, Alfa: 0 });
    const byBucket = new Map(axis.map(k => [k, initBucket()]));
    const byKelas = new Map();

    absensiUnik.forEach(a => {
      const b = byBucket.get(bucketKey(a.tanggal, periode));
      if (b) b[a.status] += 1;
      const k = a.nama_kelas || '-';
      if (!byKelas.has(k)) byKelas.set(k, initBucket());
      byKelas.get(k)[a.status] += 1;
    });

    const trenKehadiran = axis.map(k => ({
      label: bucketLabel(firstDateOfBucket(k, periode), periode),
      Izin: byBucket.get(k).Izin, Sakit: byBucket.get(k).Sakit, Alfa: byBucket.get(k).Alfa
    }));

    const kehadiranPerKelas = Array.from(byKelas.entries())
      .map(([nama_kelas, v]) => ({ nama_kelas, ...v, total: v.Izin + v.Sakit + v.Alfa }))
      .sort((a, b) => b.total - a.total || a.nama_kelas.localeCompare(b.nama_kelas));

    const totals = { Izin: 0, Sakit: 0, Alfa: 0 };
    absensiUnik.forEach(a => { totals[a.status] += 1; });

    // Poin pelanggaran & improvement: hanya record tercatat PADA periode terpilih (bukan kumulatif siswa)
    const poinTren = (rows, field) => {
      const m = new Map(axis.map(k => [k, 0]));
      rows.forEach(r => {
        const b = bucketKey(r.tanggal, periode);
        if (m.has(b)) m.set(b, m.get(b) + (r[field] || 0));
      });
      return axis.map(k => ({
        label: bucketLabel(firstDateOfBucket(k, periode), periode),
        poin: Math.round(m.get(k) * 10) / 10
      }));
    };
    const poinPerKelas = (rows, field) => {
      const m = new Map();
      rows.forEach(r => {
        const k = r.nama_kelas || '-';
        m.set(k, (m.get(k) || 0) + (r[field] || 0));
      });
      return Array.from(m.entries())
        .map(([nama_kelas, poin]) => ({ nama_kelas, poin: Math.round(poin * 10) / 10 }))
        .sort((a, b) => b.poin - a.poin);
    };

    const pelRows = pelanggaranQuery.data || [];
    const impRows = improvementQuery.data || [];
    return {
      totals,
      trenKehadiran,
      kehadiranPerKelas,
      pelanggaran: {
        totalPoin: Math.round(pelRows.reduce((s, r) => s + (r.poin || 0), 0) * 10) / 10,
        totalKejadian: pelRows.length,
        tren: poinTren(pelRows, 'poin'),
        perKelas: poinPerKelas(pelRows, 'poin')
      },
      improvement: {
        totalPoin: Math.round(impRows.reduce((s, r) => s + (r.poin_pengurangan || 0), 0) * 10) / 10,
        totalKejadian: impRows.length,
        tren: poinTren(impRows, 'poin_pengurangan'),
        perKelas: poinPerKelas(impRows, 'poin_pengurangan')
      }
    };
  }, [absensiQuery.data, pelanggaranQuery.data, improvementQuery.data, periode, tanggalMulai, tanggalAkhir]);

  const infoFilter = {
    periode: PERIODE_LABEL[periode],
    tanggalMulai, tanggalAkhir,
    kelas: kelasFilter === 'semua' ? 'Semua Kelas' : kelasFilter
  };

  // ===== Export .xlsx =====
  const exportExcel = () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // Ringkasan
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['STATISTIK CATATAN SISWA'],
        ['Periode', infoFilter.periode],
        ['Tanggal Mulai', infoFilter.tanggalMulai],
        ['Tanggal Akhir', infoFilter.tanggalAkhir],
        ['Kelas', infoFilter.kelas],
        ['Diekspor', todayWIB()],
        [],
        ['STATISTIK KEHADIRAN (Izin/Sakit/Alfa)'],
        ['Izin', stats.totals.Izin],
        ['Sakit', stats.totals.Sakit],
        ['Alfa', stats.totals.Alfa],
        [],
        ['STATISTIK POIN PELANGGARAN (periode terpilih)'],
        ['Total Poin', stats.pelanggaran.totalPoin],
        ['Jumlah Kejadian', stats.pelanggaran.totalKejadian],
        [],
        ['STATISTIK POIN IMPROVEMENT (periode terpilih)'],
        ['Total Poin', stats.improvement.totalPoin],
        ['Jumlah Kejadian', stats.improvement.totalKejadian]
      ]), 'Ringkasan');

      const trenSheet = (tren) => XLSX.utils.aoa_to_sheet([
        ['Periode', 'Poin'],
        ...tren.map(t => [t.label, t.poin])
      ]);
      const kehadiranTrenSheet = XLSX.utils.aoa_to_sheet([
        ['Periode', 'Izin', 'Sakit', 'Alfa'],
        ...stats.trenKehadiran.map(t => [t.label, t.Izin, t.Sakit, t.Alfa])
      ]);
      XLSX.utils.book_append_sheet(wb, kehadiranTrenSheet, 'Tren Kehadiran');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        stats.kehadiranPerKelas.map(k => ({ Kelas: k.nama_kelas, Izin: k.Izin, Sakit: k.Sakit, Alfa: k.Alfa, Total: k.total }))
      ), 'Kehadiran per Kelas');
      XLSX.utils.book_append_sheet(wb, trenSheet(stats.pelanggaran.tren), 'Tren Poin Pelanggaran');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        stats.pelanggaran.perKelas.map(k => ({ Kelas: k.nama_kelas, Poin: k.poin }))
      ), 'Pelanggaran per Kelas');
      XLSX.utils.book_append_sheet(wb, trenSheet(stats.improvement.tren), 'Tren Poin Improvement');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        stats.improvement.perKelas.map(k => ({ Kelas: k.nama_kelas, Poin: k.poin }))
      ), 'Improvement per Kelas');

      XLSX.writeFile(wb, `Statistik-Catatan-Siswa_${todayWIB()}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ===== Filter atas ===== */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
        <div className="flex flex-wrap items-end gap-3 md:gap-4">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Periode</Label>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {['harian', 'mingguan', 'bulanan'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriode(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    periode === p ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {PERIODE_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Tanggal Mulai</Label>
            <Input type="date" value={tanggalMulai} max={tanggalAkhir}
              onChange={e => setTanggalMulai(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Tanggal Akhir</Label>
            <Input type="date" value={tanggalAkhir} min={tanggalMulai}
              onChange={e => setTanggalAkhir(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Kelas</Label>
            <select
              value={kelasFilter}
              onChange={e => setKelasFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-40"
            >
              <option value="semua">Semua Kelas</option>
              {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}
              className="gap-2 border-slate-300">
              <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Muat Ulang</span>
            </Button>
            <Button size="sm" onClick={exportExcel} disabled={exporting || loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Download className="w-4 h-4" /> {exporting ? 'Mengekspor…' : 'Export Excel'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
          <CalendarRange className="w-3.5 h-3.5" />
          Semua tanggal memakai waktu sekolah (WIB). Poin pelanggaran & improvement dihitung dari nilai aktual database pada periode terpilih.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ===== Statistik Kehadiran ===== */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
            <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" /> Statistik Kehadiran (Izin / Sakit / Alfa)
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {STATUSES.map(s => (
                <div key={s} className="rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-xs font-medium text-slate-500">{s}</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1" style={{ color: STATUS_COLORS[s] }}>
                    {stats.totals[s]}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">kejadian</p>
                </div>
              ))}
            </div>
            <div className="mb-2 text-sm font-semibold text-slate-600">Tren {PERIODE_LABEL[periode]}</div>
            <div className="h-64 md:h-72 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trenKehadiran} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {STATUSES.map(s => (
                    <Line key={s} type="monotone" dataKey={s} stroke={STATUS_COLORS[s]}
                      strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mb-2 text-sm font-semibold text-slate-600">Perbandingan per Kelas</div>
            <div className="h-64 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.kehadiranPerKelas} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="nama_kelas" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {STATUSES.map(s => (
                    <Bar key={s} dataKey={s} fill={STATUS_COLORS[s]} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ===== Poin Pelanggaran ===== */}
          <PoinSection
            judul="Statistik Poin Pelanggaran"
            subjudul={`Total poin tercatat pada periode terpilih — poin berstatus Pending & Dibatalkan tidak dihitung`}
            warna="red"
            warnaChart="#ef4444"
            totalPoin={stats.pelanggaran.totalPoin}
            totalKejadian={stats.pelanggaran.totalKejadian}
            tren={stats.pelanggaran.tren}
            trenLabel={`Tren Akumulasi Poin Pelanggaran (${PERIODE_LABEL[periode]})`}
            perKelas={stats.pelanggaran.perKelas}
            topKelasLabel="Kelas dengan Poin Pelanggaran Tertinggi"
          />

          {/* ===== Poin Improvement ===== */}
          <PoinSection
            judul="Statistik Poin Improvement"
            subjudul="Total poin tercatat pada periode terpilih — hanya record berstatus Aktif"
            warna="emerald"
            warnaChart="#10b981"
            totalPoin={stats.improvement.totalPoin}
            totalKejadian={stats.improvement.totalKejadian}
            tren={stats.improvement.tren}
            trenLabel={`Tren Akumulasi Poin Improvement (${PERIODE_LABEL[periode]})`}
            perKelas={stats.improvement.perKelas}
            topKelasLabel="Kelas dengan Poin Improvement Tertinggi"
          />
        </>
      )}
    </div>
  );
}

function PoinSection({ judul, subjudul, warna, warnaChart, totalPoin, totalKejadian, tren, trenLabel, perKelas, topKelasLabel }) {
  const warnaMap = {
    red: { text: 'text-red-600', ring: 'border-red-200' },
    emerald: { text: 'text-emerald-600', ring: 'border-emerald-200' }
  };
  const c = warnaMap[warna];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
      <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-1">
        <BarChart3 className={`w-5 h-5 ${c.text}`} /> {judul}
      </h3>
      <p className="text-xs text-slate-400 mb-4">{subjudul}</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className={`rounded-xl border ${c.ring} p-4 text-center`}>
          <p className="text-xs font-medium text-slate-500">Total Poin</p>
          <p className={`text-2xl md:text-3xl font-bold mt-1 ${c.text}`}>{totalPoin}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs font-medium text-slate-500">Jumlah Kejadian</p>
          <p className="text-2xl md:text-3xl font-bold mt-1 text-slate-700">{totalKejadian}</p>
        </div>
      </div>
      <div className="mb-2 text-sm font-semibold text-slate-600">{trenLabel}</div>
      <div className="h-64 md:h-72 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={tren} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="poin" name="Poin" stroke={warnaChart} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mb-2 text-sm font-semibold text-slate-600">Perbandingan Poin per Kelas</div>
      <div className="h-64 md:h-72 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={perKelas} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="nama_kelas" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="poin" name="Poin" fill={warnaChart} radius={[3, 3, 0, 0]}>
              <LabelList dataKey="poin" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {perKelas.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-semibold text-slate-600">{topKelasLabel}</div>
          <div className="space-y-2">
            {perKelas.slice(0, 5).map((k, i) => (
              <div key={k.nama_kelas} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-slate-700 w-16">{k.nama_kelas}</span>
                <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${perKelas[0].poin > 0 ? Math.max((k.poin / perKelas[0].poin) * 100, 3) : 0}%`,
                    backgroundColor: warnaChart
                  }} />
                </div>
                <span className={`text-sm font-bold w-16 text-right ${c.text}`}>{k.poin}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}