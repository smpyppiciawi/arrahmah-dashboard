import React, { useState } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import KartuStatistik from './KartuStatistik';
import { STATUS_KEHADIRAN, WARNA_KEHADIRAN } from '@/lib/kehadiranUtils';

export default function TrenKehadiranChart({ data = [], periode }) {
  const [sembunyi, setSembunyi] = useState([]);

  const toggle = (entry) => {
    const key = entry?.dataKey || entry?.value;
    if (!key) return;
    setSembunyi((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <KartuStatistik
      title="Tren Kehadiran"
      icon={TrendingUp}
      sub={`Per ${periode === 'harian' ? 'tanggal' : periode === 'mingguan' ? 'minggu' : 'bulan'} · klik legenda untuk menyembunyikan status`}
    >
      <div className="h-72 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={18} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
            <Legend
              onClick={toggle}
              wrapperStyle={{ cursor: 'pointer', fontSize: 11, paddingTop: 6 }}
              formatter={(value) => (
                <span style={{ opacity: sembunyi.includes(value) ? 0.35 : 1 }}>{value}</span>
              )}
            />
            {STATUS_KEHADIRAN.map((s) => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={WARNA_KEHADIRAN[s]}
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4 }}
                hide={sembunyi.includes(s)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </KartuStatistik>
  );
}