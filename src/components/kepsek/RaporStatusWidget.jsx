import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getRaporStatus } from '@/lib/raporStatus';
import { ShieldAlert, AlertTriangle, ChevronRight, ArrowLeft, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const STATUS_BADGE = {
  Pending: 'bg-amber-100 text-amber-700',
  Proses: 'bg-blue-100 text-blue-700',
  Selesai: 'bg-emerald-100 text-emerald-700',
};

export default function RaporStatusWidget({ siswaList, pelanggaranImpList = [], isDark }) {
  const [open, setOpen] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

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
  const selected = activeList.find(s => s.id === selectedId) || null;

  // Rincian pelanggaran siswa terpilih (Sistem Poin Baru)
  const pelanggaranSiswa = useMemo(() => {
    if (!selected) return [];
    return (pelanggaranImpList || [])
      .filter(p => p.siswa_id === selected.id && p.status !== 'Dibatalkan')
      .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  }, [selected, pelanggaranImpList]);
  const poinAktif = pelanggaranSiswa
    .filter(p => p.status === 'Proses' || p.status === 'Selesai')
    .reduce((s, p) => s + (p.poin || 0), 0);
  const pendingCount = pelanggaranSiswa.filter(p => p.status === 'Pending').length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {items.map(it => (
          <button key={it.key} onClick={() => { setOpen(it.key); setSelectedId(null); }} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${isDark ? 'bg-slate-700/40 border-slate-600 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
            <span className={`w-2 h-2 rounded-full ${it.dot}`} />
            <span className={it.text}>{it.count}</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{it.label}</span>
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => { if (!o) { setOpen(null); setSelectedId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Status Rapor {activeItem?.label} ({activeList.length})
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 -mt-2 mb-3">
            {activeItem?.desc}. Status aktif berdasarkan masa berlaku penetapan. Klik siswa untuk melihat rincian pelanggarannya.
          </p>
          {activeList.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />Tidak ada siswa berstatus ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Daftar siswa */}
              <div className={`space-y-2 md:max-h-[55vh] md:overflow-y-auto md:pr-1 ${selectedId ? 'hidden md:block' : ''}`}>
                {activeList.map(s => (
                  <button key={s.id} onClick={() => setSelectedId(s.id)}
                    className={`w-full text-left flex items-center justify-between rounded-lg border p-3 transition-colors ${selectedId === s.id ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{s.nama}</p>
                      <p className="text-xs text-slate-500">{s.nama_kelas} · NIS {s.nis}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right text-xs text-slate-500">
                        {s._status.sisaHari != null ? <span>Sisa {s._status.sisaHari} hari</span> : <span className="text-red-600">Permanen</span>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Tray rincian pelanggaran (di samping pada layar lebar) */}
              <div className={`rounded-xl border p-3 md:max-h-[55vh] md:overflow-y-auto ${selectedId ? 'border-slate-200' : 'border-dashed border-slate-200'}`}>
                {selectedId && (
                  <button onClick={() => setSelectedId(null)} className="md:hidden mb-2 text-xs text-slate-500 flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke daftar siswa
                  </button>
                )}
                {!selected ? (
                  <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-slate-400 py-10 text-center">
                    <ClipboardList className="w-8 h-8 mb-2 text-slate-300" />
                    <p className="text-xs">Klik siswa untuk melihat rincian pelanggarannya</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{selected.nama}</p>
                      <p className="text-xs text-slate-500">{selected.nama_kelas} · NIS {selected.nis}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        <Badge className="bg-red-100 text-red-700 text-[10px]">{poinAktif} poin aktif</Badge>
                        {pendingCount > 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px]">{pendingCount} pending approval</Badge>}
                        <Badge className="bg-slate-100 text-slate-600 text-[10px]">{pelanggaranSiswa.length} catatan</Badge>
                      </div>
                    </div>
                    {pelanggaranSiswa.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Tidak ada catatan pelanggaran aktif</p>
                    ) : pelanggaranSiswa.map(p => (
                      <div key={p.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className="bg-slate-700 text-white font-mono text-[10px]">{p.kode}</Badge>
                          <span className="text-[10px] text-slate-400">{p.tanggal ? format(parseISO(p.tanggal), 'd MMM yyyy', { locale: idLocale }) : '-'}</span>
                          <Badge className={`text-[10px] ${STATUS_BADGE[p.status] || 'bg-slate-100 text-slate-500'}`}>{p.status}</Badge>
                          <Badge className="bg-red-100 text-red-700 text-[10px] ml-auto">{p.poin} poin</Badge>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{p.uraian_pelanggaran}</p>
                        {p.rincian && <p className="text-[10px] text-slate-400 mt-0.5">{p.rincian}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}