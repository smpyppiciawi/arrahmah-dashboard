import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const tanggalPendek = (tgl) => (tgl ? format(parseISO(tgl), 'dd MMM yyyy', { locale: idLocale }) : '-');

export default function RiwayatImprovementDialog({ siswa, records = [], onClose }) {
  const riwayat = useMemo(() => {
    if (!siswa) return [];
    const key = siswa.siswa_id || siswa.nama;
    return records
      .filter((r) => (r.siswa_id || r.nama_siswa) === key)
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
  }, [siswa, records]);

  return (
    <Dialog open={!!siswa} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{siswa?.nama || 'Riwayat Improvement'}</DialogTitle>
          <DialogDescription>{siswa?.nama_kelas || '-'} · riwayat improvement pada periode terpilih</DialogDescription>
        </DialogHeader>

        {siswa && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 p-2 text-center">
                <p className="text-base font-bold leading-none text-emerald-600">{siswa.poin}</p>
                <p className="text-[10px] text-slate-400 mt-1">Total Poin</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-2 text-center">
                <p className="text-base font-bold leading-none text-slate-800">{siswa.kejadian}</p>
                <p className="text-[10px] text-slate-400 mt-1">Kegiatan</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-2 text-center flex flex-col items-center justify-center">
                <p className="text-[10px] font-semibold text-emerald-700 leading-tight line-clamp-2 text-center">
                  {siswa.dominan || '-'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Jenis Dominan</p>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
              {riwayat.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Tidak ada catatan improvement</p>
              ) : riwayat.map((r, i) => (
                <div key={r.id || `${r.tanggal}-${i}`} className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 w-24 shrink-0">{tanggalPendek(r.tanggal)}</span>
                    <span className="text-[11px] text-slate-700 flex-1 min-w-0 truncate">
                      {r.kegiatan_pembinaan_nama || r.uraian || '-'}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 tabular-nums shrink-0">
                      {r.poin_pengurangan || 0}
                    </span>
                  </div>
                  {(r.kategori || r.catatan) && (
                    <p className="text-[10px] text-slate-400 truncate pl-[104px]">
                      {[r.kategori, r.catatan].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}