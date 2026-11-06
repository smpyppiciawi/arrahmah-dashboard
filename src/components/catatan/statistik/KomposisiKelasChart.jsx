import React, { useState } from 'react';
import {
  Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Layers } from 'lucide-react';
import KartuStatistik from './KartuStatistik';
import { STATUS_KEHADIRAN, WARNA_KEHADIRAN, formatPct } from '@/lib/kehadiranUtils';

const KUNCI_PCT = { Hadir: 'pct', Sakit: 'pctSakit', Izin: 'pctIzin', Alfa: 'pctAlfa' };
const KUNCI_JUMLAH = { Hadir: 'hadir', Sakit: 'Sakit', Izin: 'Izin', Alfa: 'Alfa' };

export default function KomposisiKelasChart({ rows = [] }) {
  const [sembunyi, setSembunyi] = useState([]);
  const toggle = (entry) => {
    const key = entry?.dataKey || entry?.value;
    if (!key) return;
    setSembunyi((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <KartuStatistik
      title="Komposisi Kehadiran per Kelas"
      icon={Layers}
      sub="Proporsi Hadir, Sakit, Izin, dan Alfa dari 100% kesempatan hadir tiap kelas"
    >
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 py-10 text-center">Belum ada data kelas pada filter ini</p>
      ) : (
        <div style={{ height: Math.max(200, rows.length * 26) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={rows} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barCategoryGap={4}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="nama_kelas" width={42} tick={{ fontSize: 10 }} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}
                formatter={(value, name, props) => [
                  `${formatPct(value)} · ${props.payload[KUNCI_JUMLAH[name]] || 0} siswa-hari`,
                  name,
                ]}
              />
              <Legend
                onClick={toggle}
                wrapperStyle={{ fontSize: 11, paddingTop: 6, cursor: 'pointer' }}
                formatter={(value) => (
                  <span style={{ opacity: sembunyi.includes(KUNCI_PCT[value]) ? 0.35 : 1 }}>{value}</span>
                )}
              />
              {STATUS_KEHADIRAN.map((s) => (
                <Bar
                  key={s}
                  dataKey={KUNCI_PCT[s]}
                  name={s}
                  stackId="a"
                  fill={WARNA_KEHADIRAN[s]}
                  barSize={16}
                  hide={sembunyi.includes(KUNCI_PCT[s])}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {rows.length > 0 && (
        <p className="text-[10px] text-slate-400 mt-2">
          Nilai Alfa rata-rata: {formatPct(rows.reduce((s, r) => s + r.pctAlfa, 0) / rows.length)}
        </p>
      )}
    </KartuStatistik>
  );
}