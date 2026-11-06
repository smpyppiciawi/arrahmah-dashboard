import React from 'react';
import { History, Users } from 'lucide-react';
import KartuStatistik from '@/components/catatan/statistik/KartuStatistik';

export default function TabelSiswaImprovement({ rows = [], onRiwayat }) {
  return (
    <KartuStatistik
      title="Monitoring Siswa"
      icon={Users}
      sub="Siswa dengan poin improvement tertinggi pada periode dan filter terpilih"
    >
      <div className="grid grid-cols-[1fr_52px_78px] items-center gap-2 px-2 pb-1.5 border-b border-slate-100">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Siswa &amp; Jenis Dominan</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-center">Poin</span>
        <span />
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-8">Tidak ada siswa terlibat pada periode ini</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {rows.map((r) => (
            <div
              key={`${r.siswa_id || r.nama}-${r.nama_kelas}`}
              className="grid grid-cols-[1fr_52px_78px] items-center gap-2 px-2 py-1.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 truncate">{r.nama}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {r.nama_kelas} · {r.kejadian} kegiatan · terakhir {r.terakhir || '-'}
                </p>
                <p className="text-[10px] text-emerald-600 truncate" title={r.dominan}>{r.dominan}</p>
              </div>
              <span className="text-center text-xs font-bold text-emerald-600 tabular-nums">{r.poin}</span>
              <button
                type="button"
                onClick={() => onRiwayat(r)}
                className="h-7 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 text-[11px] text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
              >
                <History className="w-3.5 h-3.5" /> Riwayat
              </button>
            </div>
          ))}
        </div>
      )}
    </KartuStatistik>
  );
}