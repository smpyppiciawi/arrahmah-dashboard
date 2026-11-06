import React, { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3, CalendarX2 } from 'lucide-react';
import StatCard from './StatCard';
import HeatmapKehadiran from './HeatmapKehadiran';
import DetailHarianKehadiran from './DetailHarianKehadiran';
import {
  PERIODE_LABEL, STATUSES, STATUS_COLORS,
  bucketAxis, bucketKey, bucketLabel, firstDateOfBucket,
} from '@/lib/statistikUtils';

export default function SubtabKehadiran({
  absensiUnik = [], loading, periode, tanggalMulai, tanggalAkhir, siswaAktif = 0,
}) {
  const [selectedDate, setSelectedDate] = useState(null);

  const rincianHarian = useMemo(
    () => (selectedDate ? absensiUnik.filter((a) => a.tanggal === selectedDate) : []),
    [absensiUnik, selectedDate]
  );

  const stats = useMemo(() => {
    const axis = bucketAxis(tanggalMulai, tanggalAkhir, periode);
    const initBucket = () => ({ Izin: 0, Sakit: 0, Alfa: 0 });
    const byBucket = new Map(axis.map((k) => [k, initBucket()]));
    const byKelas = new Map();
    const totals = { Izin: 0, Sakit: 0, Alfa: 0 };

    absensiUnik.forEach((a) => {
      const b = byBucket.get(bucketKey(a.tanggal, periode));
      if (b && b[a.status] !== undefined) b[a.status] += 1;
      const k = a.nama_kelas || '-';
      if (!byKelas.has(k)) byKelas.set(k, initBucket());
      if (byKelas.get(k)[a.status] !== undefined) byKelas.get(k)[a.status] += 1;
      if (totals[a.status] !== undefined) totals[a.status] += 1;
    });

    return {
      totals,
      total: totals.Izin + totals.Sakit + totals.Alfa,
      siswaTerdampak: new Set(absensiUnik.map((a) => a.siswa_id)).size,
      tren: axis.map((k) => ({
        label: bucketLabel(firstDateOfBucket(k, periode), periode),
        ...byBucket.get(k),
      })),
      perKelas: Array.from(byKelas.entries())
        .map(([nama_kelas, v]) => ({ nama_kelas, ...v, total: v.Izin + v.Sakit + v.Alfa }))
        .sort((a, b) => b.total - a.total || a.nama_kelas.localeCompare(b.nama_kelas, 'id')),
    };
  }, [absensiUnik, periode, tanggalMulai, tanggalAkhir]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
        <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" /> Ringkasan Kehadiran
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Siswa Aktif" value={siswaAktif} hint="sesuai filter kelas" tone="slate" />
          {STATUSES.map((s) => (
            <StatCard key={s} label={s} value={stats.totals[s]} hint="kejadian" tone={
              s === 'Izin' ? 'amber' : s === 'Sakit' ? 'blue' : 'rose'
            } />
          ))}
          <StatCard
            label="Total Ketidakhadiran"
            value={stats.total}
            hint={`${stats.siswaTerdampak} siswa terdampak`}
            tone="indigo"
          />
        </div>

        {stats.total === 0 && (
          <div className="flex flex-col items-center gap-1 py-8 mt-4 text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <CalendarX2 className="w-6 h-6" />
            <p className="text-xs">Tidak ada catatan ketidakhadiran pada periode dan filter ini</p>
          </div>
        )}

        <div className="mt-6">
          <HeatmapKehadiran
            absensiUnik={absensiUnik}
            tanggalMulai={tanggalMulai}
            tanggalAkhir={tanggalAkhir}
            onSelectDate={setSelectedDate}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
        <div className="mb-2 text-sm font-semibold text-slate-600">Tren {PERIODE_LABEL[periode]}</div>
        <div className="h-64 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.tren} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {STATUSES.map((s) => (
                <Line key={s} type="monotone" dataKey={s} stroke={STATUS_COLORS[s]}
                  strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
        <div className="mb-2 text-sm font-semibold text-slate-600">Perbandingan per Kelas</div>
        <div className="h-64 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.perKelas} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="nama_kelas" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {STATUSES.map((s) => (
                <Bar key={s} dataKey={s} fill={STATUS_COLORS[s]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <DetailHarianKehadiran
        tanggal={selectedDate}
        rows={rincianHarian}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  );
}