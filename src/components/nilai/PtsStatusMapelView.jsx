import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';

/**
 * Tampilan Data Status Penilaian Mapel (progres input nilai PTS guru per kelas).
 * Grid kartu mini 2 kolom (6 kiri 6 kanan) — semua mapel terlihat sekali lihat.
 * Saat Seluruh Kelas dipilih, kartu dikelompokkan per kelas dengan susunan grid yang sama.
 */
const warnaBar = (persen) => (persen === 100 ? 'bg-emerald-500' : persen >= 50 ? 'bg-amber-500' : 'bg-red-400');

function KartuMapel({ r, onDetail }) {
  const selesai = r.persen === 100;
  return (
    <button
      type="button"
      onClick={() => onDetail(r)}
      className="text-left w-full bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-slate-800 text-xs truncate">{r.mapel}</p>
        {selesai && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">Lengkap</span>
        )}
      </div>
      <p className="text-[11px] text-slate-500 truncate mt-0.5">
        {r.nama_kelas || '-'} • Guru: {r.guru || '—'}
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        <div className="h-1.5 flex-1 min-w-[50px] bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${warnaBar(r.persen)} rounded-full transition-all`} style={{ width: `${r.persen}%` }} />
        </div>
        <span className="text-[10px] text-slate-600 whitespace-nowrap tabular-nums font-bold">{r.dinilai}/{r.total}</span>
      </div>
    </button>
  );
}

export default function PtsStatusMapelView({ rows, groupByKelas, onDetail, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {[0, 1, 2, 3].map(i => (
          <Card key={i} className="border-slate-200 shadow-sm animate-pulse">
            <CardContent className="p-2.5 h-16" />
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
  if (groupByKelas) {
    const groups = [];
    rows.forEach(r => {
      let g = groups.find(x => x.nama_kelas === r.nama_kelas);
      if (!g) { g = { nama_kelas: r.nama_kelas, items: [] }; groups.push(g); }
      g.items.push(r);
    });
    groups.sort((a, b) => (a.nama_kelas || '').localeCompare(b.nama_kelas || ''));
    return (
      <div className="space-y-4">
        {groups.map(g => {
          const total = g.items.reduce((a, r) => a + r.total, 0);
          const dinilai = g.items.reduce((a, r) => a + r.dinilai, 0);
          const persen = total ? Math.round(dinilai / total * 100) : 0;
          return (
            <div key={g.nama_kelas || '-'}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-slate-700">{g.nama_kelas || '-'}</span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{dinilai}/{total} nilai • {persen}%</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {g.items.map(r => <KartuMapel key={`${r.mapel}__${r.kelas_id}`} r={r} onDetail={onDetail} />)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {rows.map(r => <KartuMapel key={`${r.mapel}__${r.kelas_id}`} r={r} onDetail={onDetail} />)}
    </div>
  );
}