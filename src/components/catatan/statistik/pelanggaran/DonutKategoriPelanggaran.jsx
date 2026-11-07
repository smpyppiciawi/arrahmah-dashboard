import React, { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import KartuStatistik from '@/components/catatan/statistik/KartuStatistik';
import { PALET_KATEGORI, bulat1 } from '@/lib/pelanggaranStatUtils';

export default function DonutKategoriPelanggaran({ data = [], totalKejadian = 0, onPilih }) {
  const [sembunyi, setSembunyi] = useState([]);
  const nonaktif = (nama) => sembunyi.includes(nama);
  const warna = (nama) => PALET_KATEGORI[Math.max(data.findIndex((d) => d.nama === nama), 0) % PALET_KATEGORI.length];

  // Kategori yang disembunyikan dikeluarkan dari irisan — pie menyesuaikan ukuran
  const tampil = data.filter((d) => !nonaktif(d.nama));
  const totalTampil = tampil.reduce((s, d) => s + d.kejadian, 0);

  const toggle = (nama) => {
    if (!nama) return;
    setSembunyi((prev) => (prev.includes(nama) ? prev.filter((n) => n !== nama) : [...prev, nama]));
  };

  return (
    <KartuStatistik
      title="Distribusi Kategori"
      icon={PieIcon}
      sub="Klik irisan untuk rincian · klik legenda untuk sembunyikan/tampilkan"
    >
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-16">Belum ada kategori pada periode ini</p>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800 leading-none tabular-nums">{totalTampil}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 mt-1">
              Total Kejadian
              {sembunyi.length > 0 && <span className="normal-case tracking-normal"> · dari {totalKejadian}</span>}
            </p>
          </div>

          <div className="h-56 w-56 max-w-full sm:h-60 sm:w-60">
            {tampil.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-slate-400 text-center px-4">
                  Semua kategori disembunyikan — klik legenda untuk menampilkan
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tampil}
                    dataKey="kejadian"
                    nameKey="nama"
                    innerRadius="60%"
                    outerRadius="94%"
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
                      const pct = totalTampil ? (row.kejadian / totalTampil) * 100 : 0;
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-md px-2.5 py-2 text-[11px]">
                          <p className="font-semibold text-slate-700">{row.nama}</p>
                          <p className="text-rose-600">{row.kejadian} kejadian</p>
                          <p className="text-slate-500">{bulat1(pct)}% · {row.poin} poin</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 w-full">
            {data.map((d) => (
              <button
                key={d.nama}
                type="button"
                onClick={() => toggle(d.nama)}
                title={d.nama}
                className={`flex items-center gap-1.5 min-w-0 rounded-md px-1 py-0.5 text-left hover:bg-slate-50 transition-opacity ${
                  nonaktif(d.nama) ? 'opacity-45' : ''
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: nonaktif(d.nama) ? '#cbd5e1' : warna(d.nama) }}
                />
                <span className="text-[10px] text-slate-600 truncate flex-1">{d.nama}</span>
                <span className="text-[10px] font-semibold text-slate-700 tabular-nums shrink-0">{d.kejadian}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </KartuStatistik>
  );
}