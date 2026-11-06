import React from 'react';
import { History, Users } from 'lucide-react';
import KartuStatistik from '@/components/catatan/statistik/KartuStatistik';
import { RAPOR_BADGE_CLASS, RAPOR_LEVEL_NAMA } from '@/lib/raporStatus';

export default function TabelSiswaPelanggaran({ rows = [], onRiwayat }) {
  return (
    <KartuStatistik
      title="Monitoring Siswa"
      icon={Users}
      sub="Siswa dengan poin pelanggaran tertinggi pada periode dan filter terpilih"
    >
      <div className="grid grid-cols-[1fr_44px_40px_86px_74px] items-center gap-2 px-2 pb-1.5 border-b border-slate-100">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Siswa</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-center">Poin</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-center">Kej.</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-center">Rapor</span>
        <span />
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-8">Tidak ada siswa terlibat pada periode ini</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {rows.map((r) => {
            const level = r.status?.level || 'normal';
            return (
              <div
                key={`${r.siswa_id || r.nama}-${r.nama_kelas}`}
                className="grid grid-cols-[1fr_44px_40px_86px_74px] items-center gap-2 px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{r.nama}</p>
                  <p className="text-[10px] text-slate-400">{r.nama_kelas} · terakhir {r.terakhir || '-'}</p>
                </div>
                <span className="text-center text-xs font-bold text-rose-600 tabular-nums">{r.poin}</span>
                <span className="text-center text-[11px] text-slate-500 tabular-nums">{r.kejadian}</span>
                <span className="flex justify-center">
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${RAPOR_BADGE_CLASS[level]}`}>
                    {RAPOR_LEVEL_NAMA[level]}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRiwayat(r)}
                  className="h-7 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 text-[11px] text-slate-600 hover:border-rose-300 hover:text-rose-700 transition-colors"
                >
                  <History className="w-3.5 h-3.5" /> Riwayat
                </button>
              </div>
            );
          })}
        </div>
      )}
    </KartuStatistik>
  );
}