import React, { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import KartuStatistik from './KartuStatistik';
import { WARNA_KEHADIRAN, formatPct } from '@/lib/kehadiranUtils';

export default function DonutStatusKehadiran({ distribusi = [], pctKehadiran = 0 }) {
  const data = useMemo(() => distribusi.filter((d) => d.value > 0), [distribusi]);
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  return (
    <KartuStatistik title="Distribusi Status" icon={PieIcon} sub="Total siswa-hari pada periode terpilih">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={WARNA_KEHADIRAN[d.name]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}
                formatter={(value, name) => [
                  `${Number(value).toLocaleString('id-ID')} (${formatPct(total ? (value / total) * 100 : 0)})`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-lg font-bold text-slate-800 leading-none">{formatPct(pctKehadiran)}</p>
            <p className="text-[10px] text-slate-400 mt-1">kehadiran</p>
          </div>
        </div>

        <div className="w-full space-y-1.5">
          {distribusi.map((d) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: WARNA_KEHADIRAN[d.name] }} />
              <span className="text-slate-600 flex-1">{d.name}</span>
              <span className="font-semibold text-slate-800 tabular-nums">{Number(d.value).toLocaleString('id-ID')}</span>
              <span className="text-slate-400 tabular-nums w-12 text-right">{formatPct(total ? (d.value / total) * 100 : 0)}</span>
            </div>
          ))}
        </div>
      </div>
    </KartuStatistik>
  );
}