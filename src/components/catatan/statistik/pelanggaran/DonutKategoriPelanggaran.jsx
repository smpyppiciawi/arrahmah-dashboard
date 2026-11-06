import React, { useMemo, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import KartuStatistik from '@/components/catatan/statistik/KartuStatistik';
import { PALET_KATEGORI, bulat1 } from '@/lib/pelanggaranStatUtils';

export default function DonutKategoriPelanggaran({ data = [], totalKejadian = 0, onPilih }) {
  const [sembunyi, setSembunyi] = useState([]);
  const tampil = useMemo(() => data.filter((d) => !sembunyi.includes(d.nama)), [data, sembunyi]);
  const warna = (nama) => PALET_KATEGORI[Math.max(data.findIndex((d) => d.nama === nama), 0) % PALET_KATEGORI.length];

  const toggle = (entry) => {
    const nama = entry?.payload?.nama || entry?.value;
    if (!nama) return;
    setSembunyi((prev) => (prev.includes(nama) ? prev.filter((n) => n !== nama) : [...prev, nama]));
  };

  return (
    <KartuStatistik title="Distribusi Kategori" icon={PieIcon} sub="Klik irisan untuk rincian · klik legenda untuk sembunyikan">
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-16">Belum ada kategori pada periode ini</p>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="relative h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tampil}
                  dataKey="kejadian"
                  nameKey="nama"
                  innerRadius="62%"
                  outerRadius="92%"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {tampil.map((d) => (
                    <Cell
                      key={d.nama}
                      fill={warna(d.nama)}
                      className="cursor-pointer"
                      onClick={() => onPilih && onPilih(d.nama)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-md px-2.5 py-2 text-[11px]">
                        <p className="font-semibold text-slate-700">{row.nama}</p>
                        <p className="text-rose-600">{row.kejadian} kejadian</p>
                        <p className="text-slate-500">{bulat1(row.pct)}% · {row.poin} poin</p>
                      </div>
                    );
                  }}
                />
                <Legend
                  onClick={toggle}
                  wrapperStyle={{ fontSize: 10, cursor: 'pointer', paddingTop: 2 }}
                  formatter={(value) => (
                    <span style={{ opacity: sembunyi.includes(value) ? 0.35 : 1 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-slate-800 leading-none">{totalKejadian}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">kejadian</span>
            </div>
          </div>
        </div>
      )}
    </KartuStatistik>
  );
}