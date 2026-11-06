import React, { useState } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import KartuStatistik from '@/components/catatan/statistik/KartuStatistik';
import KontrolTrenMA from '@/components/catatan/statistik/KontrolTrenMA';
import { PERIODE_TREN, WARNA_MA, WARNA_POIN } from '@/lib/pelanggaranStatUtils';

function Pilihan({ value, onChange, items }) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
      {items.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onChange(m.key)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
            value === m.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

export default function TrenPelanggaranChart({
  data = [], periode = 'harian', onPeriode, onPilih,
  trenArah = 'Stabil', trenPerubahan = 0, maJendela = 0,
}) {
  const [sembunyi, setSembunyi] = useState(false);
  const [tampilMA, setTampilMA] = useState(true);
  const kosong = !data.some((d) => d.poin > 0 || d.kejadian > 0);
  const adaMA = maJendela > 0 && data.some((d) => d.ma !== null && d.ma !== undefined);

  return (
    <KartuStatistik
      title="Tren Poin Pelanggaran"
      icon={TrendingUp}
      sub="Total poin per periode + Moving Average adaptif — klik titik untuk melihat rincian"
      action={onPeriode ? <Pilihan value={periode} onChange={onPeriode} items={PERIODE_TREN} /> : null}
    >
      {kosong ? (
        <p className="text-xs text-slate-400 text-center py-16">Belum ada pelanggaran pada periode dan filter ini</p>
      ) : (
        <div>
          {adaMA && (
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <p className="text-[10px] text-slate-400">MA {maJendela} titik data berisi input · garis putus-putus</p>
              <KontrolTrenMA
                arah={trenArah}
                perubahan={trenPerubahan}
                jendela={maJendela}
                tampil={tampilMA}
                onToggle={() => setTampilMA((v) => !v)}
                warna={WARNA_MA}
                naikBaik={false}
              />
            </div>
          )}

          <div className="h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                onClick={(e) => {
                  const row = e?.activePayload?.[0]?.payload;
                  if (row && onPilih) onPilih(row);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={16} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-md px-2.5 py-2 text-[11px]">
                        <p className="font-semibold text-slate-700">{row.label}</p>
                        <p className="text-rose-600">Poin: {row.poin}</p>
                        <p className="text-amber-600">Kejadian: {row.kejadian}</p>
                        {row.ma !== null && row.ma !== undefined && (
                          <p className="text-violet-600">MA {maJendela}: {row.ma}</p>
                        )}
                        <p className="text-slate-400 mt-0.5">Klik untuk rincian</p>
                      </div>
                    );
                  }}
                />
                <Legend
                  onClick={() => setSembunyi((v) => !v)}
                  wrapperStyle={{ fontSize: 11, paddingTop: 4, cursor: 'pointer' }}
                  formatter={() => <span style={{ opacity: sembunyi ? 0.35 : 1 }}>Total Poin</span>}
                />
                <Line
                  type="monotone"
                  dataKey="poin"
                  name="Total Poin"
                  stroke={WARNA_POIN}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  hide={sembunyi}
                />
                {adaMA && (
                  <Line
                    type="monotone"
                    dataKey="ma"
                    name={`MA ${maJendela}`}
                    stroke={WARNA_MA}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 4 }}
                    legendType="none"
                    connectNulls
                    hide={!tampilMA}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </KartuStatistik>
  );
}