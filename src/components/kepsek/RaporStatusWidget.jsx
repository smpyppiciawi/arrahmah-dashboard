import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getRaporStatus } from '@/lib/raporStatus';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export default function RaporStatusWidget({ siswaList, isDark }) {
  const [open, setOpen] = useState(null);

  const grouped = useMemo(() => {
    const g = { kuning: [], merah: [], hitam: [] };
    (siswaList || []).filter(s => s.status === 'Aktif').forEach(s => {
      const st = getRaporStatus(s, 0);
      if (st.level !== 'normal') g[st.level].push({ ...s, _status: st });
    });
    return g;
  }, [siswaList]);

  const items = [
    { key: 'kuning', label: 'Kuning', count: grouped.kuning.length, dot: 'bg-yellow-400', text: isDark ? 'text-yellow-300' : 'text-yellow-700', desc: 'Poin bersih ≥ 300 (berlaku 40 hari)' },
    { key: 'merah', label: 'Merah', count: grouped.merah.length, dot: 'bg-red-500', text: isDark ? 'text-red-300' : 'text-red-700', desc: 'Poin bersih ≥ 600 (berlaku 120 hari)' },
    { key: 'hitam', label: 'Hitam', count: grouped.hitam.length, dot: 'bg-slate-900', text: isDark ? 'text-slate-200' : 'text-slate-800', desc: 'Poin bersih ≥ 1000 (permanen)' },
  ];

  const activeList = open ? grouped[open] : [];
  const activeItem = items.find(i => i.key === open);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {items.map(it => (
          <button key={it.key} onClick={() => setOpen(it.key)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${isDark ? 'bg-slate-700/40 border-slate-600 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
            <span className={`w-2 h-2 rounded-full ${it.dot}`} />
            <span className={it.text}>{it.count}</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{it.label}</span>
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500" /> {activeItem?.label} ({activeList.length})</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 -mt-2 mb-3">{activeItem?.desc}. Status aktif berdasarkan masa berlaku penetapan.</p>
          {activeList.length === 0 ? (
            <div className="text-center py-10 text-slate-400"><AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />Tidak ada siswa berstatus ini.</div>
          ) : (
            <div className="space-y-2">
              {activeList.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{s.nama}</p>
                    <p className="text-xs text-slate-500">{s.nama_kelas} · NIS {s.nis}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {s._status.sisaHari != null ? <span>Sisa {s._status.sisaHari} hari</span> : <span className="text-red-600">Permanen</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}