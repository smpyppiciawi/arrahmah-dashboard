import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getRaporStatus } from '@/lib/raporStatus';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export default function RaporStatusWidget({ siswaList }) {
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
    { key: 'kuning', label: 'Rapor Kuning', count: grouped.kuning.length, color: 'from-yellow-400 to-amber-500', desc: 'Poin bersih ≥ 300 (berlaku 40 hari)' },
    { key: 'merah', label: 'Rapor Merah', count: grouped.merah.length, color: 'from-red-500 to-rose-600', desc: 'Poin bersih ≥ 600 (berlaku 120 hari)' },
    { key: 'hitam', label: 'Rapor Hitam', count: grouped.hitam.length, color: 'from-slate-800 to-black', desc: 'Poin bersih ≥ 1000 (permanen)' },
  ];

  const activeList = open ? grouped[open] : [];
  const activeItem = items.find(i => i.key === open);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {items.map(it => (
          <button key={it.key} onClick={() => setOpen(it.key)} className={`rounded-2xl p-3 md:p-4 text-left bg-gradient-to-br ${it.color} text-white shadow-lg transition-all hover:scale-[1.02]`}>
            <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 opacity-80 mb-1.5" />
            <p className="text-xl md:text-2xl font-bold">{it.count}</p>
            <p className="text-[10px] md:text-xs opacity-90">{it.label}</p>
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