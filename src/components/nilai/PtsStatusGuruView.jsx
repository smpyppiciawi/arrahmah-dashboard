import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';

/**
 * Tampilan Status Penilaian Per Guru: kartu per guru berisi nama, ringkasan progres
 * keseluruhan, dan daftar tugas ngajar (mapel + kelas dari Pembelajaran) dengan
 * progres input nilai PTS per tugas.
 */
const warnaBar = (persen) => (persen === 100 ? 'bg-emerald-500' : persen >= 50 ? 'bg-amber-500' : 'bg-red-400');

export default function PtsStatusGuruView({ rows, onDetail, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => (
          <Card key={i} className="border-slate-200 shadow-sm animate-pulse">
            <CardContent className="p-4 h-32" />
          </Card>
        ))}
      </div>
    );
  }
  if (!rows.length) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-medium">Tidak ada guru pengampu</p>
          <p className="text-slate-400 text-sm mt-1">Belum ada data Pembelajaran (tugas ngajar) sesuai filter.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {rows.map(g => {
        const tuntas = g.tugas.filter(t => t.persen === 100).length;
        return (
          <Card key={g.guru_id} className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-800 text-sm truncate">{g.nama_guru}</p>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">{tuntas}/{g.tugas.length} tugas lengkap</span>
              </div>
              <div className="flex items-center gap-2.5 mt-2">
                <div className="h-1.5 flex-1 min-w-[80px] bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${warnaBar(g.persen)} rounded-full transition-all`} style={{ width: `${g.persen}%` }} />
                </div>
                <span className="text-xs text-slate-600 whitespace-nowrap tabular-nums">
                  <span className="font-bold text-slate-700">{g.dinilai}/{g.total}</span> nilai ({g.persen}%)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3">
                {g.tugas.map(t => (
                  <button
                    key={`${t.mapel}__${t.kelas_id}`}
                    type="button"
                    onClick={() => onDetail(t)}
                    className="text-left w-full border border-slate-100 bg-slate-50/60 rounded-lg px-2 py-1.5 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] text-slate-700 truncate flex-1">{t.mapel}</span>
                      <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">{t.nama_kelas}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${warnaBar(t.persen)} rounded-full`} style={{ width: `${t.persen}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap tabular-nums">{t.dinilai}/{t.total}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}