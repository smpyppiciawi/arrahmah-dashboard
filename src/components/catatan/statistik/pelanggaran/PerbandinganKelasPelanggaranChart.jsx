import React, { useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Building2 } from 'lucide-react';
import KartuStatistik from '@/components/catatan/statistik/KartuStatistik';
import { METRIK_KELAS, WARNA_POIN } from '@/lib/pelanggaranStatUtils';

export default function PerbandinganKelasPelanggaranChart({ data = [], metric = 'poin', onMetric, onPilih }) {
  const [sembunyi, setSembunyi] = useState(false);
  const label = METRIK_KELAS.find((m) => m.key === metric)?.label || 'Total Poin';

  return (
    <KartuStatistik
      title="Perbandingan per Kelas"
      icon={Building2}
      sub="Klik batang untuk rincian kelas dan menerapkan filter"
      action={onMetric ? (
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {METRIK_KELAS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onMetric(m.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                metric === m.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      ) : null}
    >
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-16">Belum ada data kelas pada periode ini</p>
      ) : (
        <div className="h-64 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 18, right: 10, left: -12, bottom: 0 }}
              onClick={(e) => {
                const nama = e?.activeLabel;
                if (nama && onPilih) onPilih(nama);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="nama_kelas" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={48} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                content={({ active, payload, label: kelas }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload;
                  return (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-md px-2.5 py-2 text-[11px]">
                      <p className="font-semibold text-slate-700">{kelas}</p>
                      <p className="text-rose-600">Total poin: {row.poin}</p>
                      <p className="text-amber-600">Kejadian: {row.kejadian}</p>
                      <p className="text-slate-600">Rata-rata/siswa aktif: {row.rata}</p>
                      <p className="text-slate-400">Siswa aktif: {row.siswaAktif} · terlibat: {row.siswa}</p>
                    </div>
                  );
                }}
              />
              <Legend
                onClick={() => setSembunyi((v) => !v)}
                wrapperStyle={{ fontSize: 11, paddingTop: 4, cursor: 'pointer' }}
                formatter={() => <span style={{ opacity: sembunyi ? 0.35 : 1 }}>{label}</span>}
              />
              <Bar
                dataKey={metric}
                name={label}
                fill={WARNA_POIN}
                radius={[3, 3, 0, 0]}
                maxBarSize={26}
                hide={sembunyi}
              >
                <LabelList dataKey={metric} position="top" style={{ fontSize: 9, fill: '#64748b' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </KartuStatistik>
  );
}