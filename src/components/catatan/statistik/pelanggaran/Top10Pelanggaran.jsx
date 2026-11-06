import React from 'react';
import {
  Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ListOrdered } from 'lucide-react';
import KartuStatistik from '@/components/catatan/statistik/KartuStatistik';
import { WARNA_POIN } from '@/lib/pelanggaranStatUtils';

export default function Top10Pelanggaran({ data = [], onPilih }) {
  const tinggi = Math.max(data.length * 26, 90);

  return (
    <KartuStatistik
      title="Top 10 Pelanggaran"
      icon={ListOrdered}
      sub="Diurutkan berdasarkan frekuensi kejadian — klik untuk rincian"
    >
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-16">Belum ada data pelanggaran pada periode ini</p>
      ) : (
        <>
          <div style={{ height: tinggi }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 2, right: 26, left: 4, bottom: 2 }}
                onClick={(e) => {
                  const kode = e?.activeLabel;
                  const item = data.find((d) => d.kode === kode);
                  if (item && onPilih) onPilih(item);
                }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="kode" width={52} tick={{ fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-md px-2.5 py-2 text-[11px] max-w-[240px]">
                        <p className="font-semibold text-slate-700">{row.kode}</p>
                        <p className="text-slate-500 leading-snug">{row.deskripsi || '-'}</p>
                        <p className="text-rose-600 mt-1">Kejadian: {row.kejadian} · Total poin: {row.totalPoin}</p>
                        <p className="text-slate-400">Poin standar: {row.poinStandar}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="kejadian" fill={WARNA_POIN} radius={[0, 4, 4, 0]} barSize={12}>
                  <LabelList dataKey="kejadian" position="right" style={{ fontSize: 10, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
            <div className="grid grid-cols-[1fr_64px_64px_68px] items-center gap-2 bg-slate-50 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kode &amp; Uraian</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-center">Standar</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-center">Kejadian</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-center">Total Poin</span>
            </div>
            <div className="divide-y divide-slate-100">
              {data.map((t) => (
                <button
                  key={t.kode}
                  type="button"
                  onClick={() => onPilih && onPilih(t)}
                  className="w-full grid grid-cols-[1fr_64px_64px_68px] items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-700 font-mono">{t.kode}</p>
                    <p className="text-[10px] text-slate-400 truncate">{t.deskripsi || '-'}</p>
                  </div>
                  <span className="text-center text-[11px] text-slate-500 tabular-nums">{t.poinStandar}</span>
                  <span className="text-center text-[11px] font-semibold text-slate-800 tabular-nums">{t.kejadian}</span>
                  <span className="text-center text-[11px] font-bold text-rose-600 tabular-nums">{t.totalPoin}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </KartuStatistik>
  );
}