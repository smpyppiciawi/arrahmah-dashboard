import React, { useMemo, useState } from 'react';
import {
  Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChartHorizontal } from 'lucide-react';
import KartuStatistik from './KartuStatistik';
import { bulatPct, formatPct } from '@/lib/kehadiranUtils';

const URUTAN = [
  { key: 'desc', label: 'Tertinggi' },
  { key: 'asc', label: 'Terendah' },
  { key: 'nama', label: 'Nama' },
];

const warna = (pct) => {
  if (pct >= 95) return '#059669';
  if (pct >= 90) return '#10b981';
  if (pct >= 85) return '#f59e0b';
  return '#ef4444';
};

export default function PerbandinganKelasChart({ rows = [] }) {
  const [urut, setUrut] = useState('desc');

  const data = useMemo(() => {
    const copy = [...rows];
    if (urut === 'nama') return copy.sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas, 'id'));
    return copy.sort((a, b) => (urut === 'asc' ? a.pct - b.pct : b.pct - a.pct));
  }, [rows, urut]);

  return (
    <KartuStatistik
      title="Persentase Kehadiran per Kelas"
      icon={BarChartHorizontal}
      sub="Hadir dibandingkan kesempatan hadir siswa aktif × hari efektif"
      action={
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {URUTAN.map((u) => (
            <button
              key={u.key}
              type="button"
              onClick={() => setUrut(u.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                urut === u.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      }
    >
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 py-10 text-center">Belum ada data kelas pada filter ini</p>
      ) : (
        <div style={{ height: Math.max(200, data.length * 26) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data} margin={{ top: 4, right: 46, left: 0, bottom: 0 }} barCategoryGap={4}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="nama_kelas" width={42} tick={{ fontSize: 10 }} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}
                formatter={(value, name, props) => [
                  `${formatPct(props.payload.pct)} · ${props.payload.tidakHadir} ketidakhadiran`,
                  'Kehadiran',
                ]}
              />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={14}>
                <LabelList
                  dataKey="pct"
                  position="right"
                  formatter={(v) => `${bulatPct(v)}%`}
                  style={{ fontSize: 10, fill: '#475569' }}
                />
                {data.map((r) => (
                  <Cell key={r.nama_kelas} fill={warna(r.pct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </KartuStatistik>
  );
}