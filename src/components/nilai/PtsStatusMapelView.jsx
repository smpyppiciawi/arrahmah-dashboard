import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

/**
 * Tampilan Data Status Penilaian Mapel (progres input nilai PTS guru per kelas).
 * Presentational — data (sudah dicari/sortir/paginasi) dikirim dari PtsTab.
 */
export default function PtsStatusMapelView({ rows, onDetail, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3">
        {[0, 1, 2].map(i => (
          <Card key={i} className="border-slate-200 shadow-sm animate-pulse">
            <CardContent className="p-4 h-16" />
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
          <p className="text-slate-700 font-medium">Tidak ada data progres</p>
          <p className="text-slate-400 text-sm mt-1">Belum ada progres input nilai PTS sesuai filter.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3">
      {rows.map(r => {
        const selesai = r.persen === 100;
        const warna = selesai ? 'bg-emerald-500' : r.persen >= 50 ? 'bg-amber-500' : 'bg-red-400';
        return (
          <Card key={`${r.mapel}__${r.kelas_id}`} className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 text-sm truncate">{r.mapel}</p>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{r.nama_kelas || '-'}</span>
                    {selesai && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Lengkap</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 mt-2">
                    <div className="h-1.5 flex-1 min-w-[80px] bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${warna} rounded-full transition-all`} style={{ width: `${r.persen}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap tabular-nums">
                      <span className="font-bold text-slate-700">{r.dinilai}/{r.total}</span> siswa ({r.persen}%)
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-shrink-0" onClick={() => onDetail(r)}>
                  <Search className="w-4 h-4" /> Detail
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}