import React, { useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Building2 } from 'lucide-react';
import KartuStatistik from '@/components/catatan/statistik/KartuStatistik';
import { WARNA_KEJADIAN, WARNA_POIN } from '@/lib/improvementStatUtils';

export default function PerbandinganKelasImprovementChart({ data = [], onPilih }) {
  const [sembunyi, setSembunyi] = useState([]);
  const aktif = (key) => !sembunyi.includes(key);
  const toggle = (key) => {
    if (!key) return;
    setSembunyi((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <KartuStatistik
      title="Perbandingan Improvement per Kelas"
      icon={Building2}
      sub="Klik legenda untuk menampilkan total poin, kegiatan, atau keduanya · klik batang untuk rincian kelas"
    >
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-16">Belum ada data kelas pada periode ini</p>
      ) : (
        <div className="h-64 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 18, right: 4, left: -12, bottom: 0 }}
              onClick={(e) => {
                const nama = e?.activeLabel;
                if (nama && onPilih) onPilih(nama);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="nama_kelas" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={48} />
              <YAxis yAxisId="poin" tick={{ fontSize: 10 }} />
              <YAxis
                yAxisId="kejadian"
                orientation="right"
                width={26}
                tick={{ fontSize: 9, fill: WARNA_KEJADIAN }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                content={({ active, payload, label: kelas }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload;
                  return (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-md px-2.5 py-2 text-[11px]">
                      <p className="font-semibold text-slate-700">{kelas}</p>
                      <p className="text-emerald-600">Total poin: {row.poin}</p>
                      <p className="text-sky-600">Kegiatan: {row.kejadian}</p>
                      <p className="text-slate-600">Rata-rata/siswa aktif: {row.rata}</p>
                      <p className="text-slate-400">Siswa aktif: {row.siswaAktif} · terlibat: {row.siswa}</p>
                    </div>
                  );
                }}
              />
              <Legend
                payload={[
                  { value: 'Total Poin', dataKey: 'poin', color: WARNA_POIN, type: 'square' },
                  { value: 'Kegiatan', dataKey: 'kejadian', color: WARNA_KEJADIAN, type: 'square' },
                ]}
                onClick={(e) => toggle(e?.dataKey)}
                wrapperStyle={{ fontSize: 11, paddingTop: 4, cursor: 'pointer' }}
                formatter={(value, entry) => <span style={{ opacity: aktif(entry?.dataKey) ? 1 : 0.35 }}>{value}</span>}
              />
              <Bar
                yAxisId="poin"
                dataKey="poin"
                name="Total Poin"
                fill={WARNA_POIN}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
                hide={!aktif('poin')}
              >
                <LabelList dataKey="poin" position="top" style={{ fontSize: 9, fill: '#64748b' }} />
              </Bar>
              <Bar
                yAxisId="kejadian"
                dataKey="kejadian"
                name="Kegiatan"
                fill={WARNA_KEJADIAN}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
                hide={!aktif('kejadian')}
              >
                <LabelList dataKey="kejadian" position="top" style={{ fontSize: 9, fill: '#64748b' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </KartuStatistik>
  );
}