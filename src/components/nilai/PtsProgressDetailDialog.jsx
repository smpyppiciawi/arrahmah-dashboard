import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle } from 'lucide-react';

/**
 * Detail progres input nilai PTS satu mapel di satu kelas:
 * daftar seluruh siswa kelas dengan status sudah dinilai (nilai) / belum diinput.
 */
export default function PtsProgressDetailDialog({ open, onOpenChange, detail }) {
  const siswa = detail?.siswa || [];
  const sudah = siswa.filter(s => s.nilai != null).length;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{detail?.mapel ? `${detail.mapel} — ${detail.nama_kelas}` : 'Detail Progres'}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-700">{sudah}/{detail?.total || siswa.length}</span>
          <span className="text-slate-500">siswa sudah dinilai</span>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
            {detail?.total ? Math.round(sudah / detail.total * 100) : 0}%
          </span>
        </div>
        <div className="flex-1 overflow-y-auto mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100">
          {siswa.map(s => (
            <div key={s.siswa_id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{s.nama}</p>
                <p className="text-xs text-slate-400">NIS {s.nis || '-'}</p>
              </div>
              {s.nilai != null ? (
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5" /> {s.nilai}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-200">
                  <XCircle className="w-3.5 h-3.5" /> Belum
                </span>
              )}
            </div>
          ))}
          {siswa.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">Tidak ada siswa aktif di kelas ini.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}