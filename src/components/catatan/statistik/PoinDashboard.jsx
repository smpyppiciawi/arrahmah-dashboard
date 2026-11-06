import React, { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, LabelList, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3, ListOrdered } from 'lucide-react';
import StatCard from './StatCard';
import { PERIODE_LABEL, bucketAxis, bucketKey, bucketLabel, firstDateOfBucket } from '@/lib/statistikUtils';

const VARIANTS = {
  pelanggaran: {
    field: 'poin',
    kategoriField: 'kategori_utama',
    kodeField: 'kode',
    deskripsiField: 'uraian_pelanggaran',
    kpiKategoriLabel: 'Kategori Terbanyak',
    warna: '#ef4444',
    tone: 'rose',
    chartJudul: 'Total Poin Pelanggaran',
    topJudul: 'Top 10 Pelanggaran',
    topKodeLabel: 'Kode',
  },
  improvement: {
    field: 'poin_pengurangan',
    kategoriField: 'kegiatan_pembinaan_nama',
    kodeField: 'kegiatan_pembinaan_nama',
    deskripsiField: 'uraian',
    kpiKategoriLabel: 'Jenis Terbanyak',
    warna: '#10b981',
    tone: 'emerald',
    chartJudul: 'Total Poin Improvement',
    topJudul: 'Top 10 Improvement',
    topKodeLabel: 'Kegiatan',
  },
};

const METRICS = [
  { key: 'poin', label: 'Total Poin' },
  { key: 'kejadian', label: 'Jumlah Kejadian' },
  { key: 'rata', label: 'Rata-rata / Siswa' },
];

const round1 = (n) => Math.round(n * 10) / 10;

export default function PoinDashboard({ variant, rows = [], loading, periode, tanggalMulai, tanggalAkhir }) {
  const cfg = VARIANTS[variant];
  const [metric, setMetric] = useState('poin');

  const stats = useMemo(() => {
    const axis = bucketAxis(tanggalMulai, tanggalAkhir, periode);
    const tren = new Map(axis.map((k) => [k, 0]));
    const perKelas = new Map();
    const top = new Map();
    const kategori = new Map();
    const siswa = new Set();
    let totalPoin = 0;

    rows.forEach((r) => {
      const nilai = Number(r[cfg.field]) || 0;
      totalPoin += nilai;
      if (r.siswa_id) siswa.add(r.siswa_id);

      const b = bucketKey(r.tanggal, periode);
      if (tren.has(b)) tren.set(b, tren.get(b) + nilai);

      const kelas = r.nama_kelas || '-';
      if (!perKelas.has(kelas)) perKelas.set(kelas, { poin: 0, kejadian: 0, siswa: new Set() });
      const kRow = perKelas.get(kelas);
      kRow.poin += nilai;
      kRow.kejadian += 1;
      if (r.siswa_id) kRow.siswa.add(r.siswa_id);

      const kat = r[cfg.kategoriField] || 'Tanpa Kategori';
      kategori.set(kat, (kategori.get(kat) || 0) + 1);

      const kode = r[cfg.kodeField] || '-';
      if (!top.has(kode)) top.set(kode, { kode, deskripsi: r[cfg.deskripsiField] || '', kejadian: 0, totalPoin: 0 });
      const tRow = top.get(kode);
      tRow.kejadian += 1;
      tRow.totalPoin += nilai;
      if (!tRow.deskripsi && r[cfg.deskripsiField]) tRow.deskripsi = r[cfg.deskripsiField];
    });

    const kategoriTeratas = Array.from(kategori.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      totalPoin: round1(totalPoin),
      totalKejadian: rows.length,
      totalSiswa: siswa.size,
      kategoriTeratas: kategoriTeratas ? { nama: kategoriTeratas[0], jumlah: kategoriTeratas[1] } : null,
      tren: axis.map((k) => ({
        label: bucketLabel(firstDateOfBucket(k, periode), periode),
        poin: round1(tren.get(k)),
      })),
      perKelas: Array.from(perKelas.entries()).map(([nama_kelas, v]) => ({
        nama_kelas,
        poin: round1(v.poin),
        kejadian: v.kejadian,
        rata: v.siswa.size ? round1(v.poin / v.siswa.size) : 0,
      })).sort((a, b) => b.poin - a.poin || a.nama_kelas.localeCompare(b.nama_kelas, 'id')),
      top: Array.from(top.values())
        .map((t) => ({ ...t, totalPoin: round1(t.totalPoin), poinStandar: round1(t.totalPoin / t.kejadian) }))
        .sort((a, b) => b.kejadian - a.kejadian || b.totalPoin - a.totalPoin)
        .slice(0, 10),
    };
  }, [rows, periode, tanggalMulai, tanggalAkhir, cfg.field, cfg.kategoriField, cfg.kodeField, cfg.deskripsiField]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
        <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
          <BarChart3 className="w-5 h-5" style={{ color: cfg.warna }} /> Ringkasan {cfg.chartJudul.replace('Total Poin ', '')}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Jumlah Kejadian" value={stats.totalKejadian} hint="record pada periode" tone="slate" />
          <StatCard label="Siswa Terlibat" value={stats.totalSiswa} hint="siswa unik" tone="indigo" />
          <StatCard label="Total Poin" value={stats.totalPoin} hint="akumulasi periode" tone={cfg.tone} />
          <StatCard
            label={cfg.kpiKategoriLabel}
            value={stats.kategoriTeratas ? stats.kategoriTeratas.jumlah : 0}
            hint={stats.kategoriTeratas ? stats.kategoriTeratas.nama : 'Belum ada data'}
            tone="slate"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
        <div className="mb-2 text-sm font-semibold text-slate-600">
          Tren {cfg.chartJudul} ({PERIODE_LABEL[periode]})
        </div>
        <div className="h-64 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.tren} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="poin" name="Poin" stroke={cfg.warna} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="text-sm font-semibold text-slate-600">Perbandingan per Kelas</div>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetric(m.key)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  metric === m.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.perKelas} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="nama_kelas" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey={metric} name={METRICS.find((m) => m.key === metric)?.label} fill={cfg.warna} radius={[3, 3, 0, 0]}>
                <LabelList dataKey={metric} position="top" style={{ fontSize: 10, fill: '#64748b' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
        <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
          <ListOrdered className="w-4 h-4" style={{ color: cfg.warna }} /> {cfg.topJudul}
        </h3>
        {stats.top.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Belum ada data pada periode dan filter ini</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left font-semibold px-3 py-2">{cfg.topKodeLabel}</th>
                  <th className="text-left font-semibold px-3 py-2">Deskripsi</th>
                  <th className="text-center font-semibold px-3 py-2">Poin Standar</th>
                  <th className="text-center font-semibold px-3 py-2">Kejadian</th>
                  <th className="text-center font-semibold px-3 py-2">Total Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.top.map((t) => (
                  <tr key={t.kode} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">{t.kode}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-[320px] truncate">{t.deskripsi || '-'}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{t.poinStandar}</td>
                    <td className="px-3 py-2 text-center font-semibold text-slate-800">{t.kejadian}</td>
                    <td className="px-3 py-2 text-center font-semibold" style={{ color: cfg.warna }}>{t.totalPoin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}