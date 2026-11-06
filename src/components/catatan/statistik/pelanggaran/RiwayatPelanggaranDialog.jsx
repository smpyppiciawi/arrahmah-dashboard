import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { RAPOR_BADGE_CLASS, RAPOR_LEVEL_NAMA } from '@/lib/raporStatus';

const tanggalPendek = (tgl) => (tgl ? format(parseISO(tgl), 'dd MMM yyyy', { locale: idLocale }) : '-');

export default function RiwayatPelanggaranDialog({ siswa, records = [], onClose }) {
  const riwayat = useMemo(() => {
    if (!siswa) return [];
    const key = siswa.siswa_id || siswa.nama;
    return records
      .filter((r) => (r.siswa_id || r.nama_siswa) === key)
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
  }, [siswa, records]);

  const level = siswa?.status?.level || 'normal';

  return (
    <Dialog open={!!siswa} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{siswa?.nama || 'Riwayat Pelanggaran'}</DialogTitle>
          <DialogDescription>{siswa?.nama_kelas || '-'} · riwayat pelanggaran pada periode terpilih</DialogDescription>
        </DialogHeader>

        {siswa && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 p-2 text-center">
                <p className="text-base font-bold leading-none text-rose-600">{siswa.poin}</p>
                <p className="text-[10px] text-slate-400 mt-1">Total Poin</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-2 text-center">
                <p className="text-base font-bold leading-none text-slate-800">{siswa.kejadian}</p>
                <p className="text-[10px] text-slate-400 mt-1">Kejadian</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-2 text-center flex flex-col items-center justify-center">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${RAPOR_BADGE_CLASS[level]}`}>
                  {RAPOR_LEVEL_NAMA[level]}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Status Rapor</p>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
              {riwayat.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Tidak ada catatan pelanggaran</p>
              ) : riwayat.map((r, i) => (
                <div key={r.id || `${r.tanggal}-${i}`} className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 w-24 shrink-0">{tanggalPendek(r.tanggal)}</span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">{r.kode || '-'}</span>
                    <span className="text-[11px] text-slate-700 flex-1 min-w-0 truncate">{r.uraian_pelanggaran || '-'}</span>
                    <span className="text-[11px] font-bold text-rose-600 tabular-nums shrink-0">{r.poin}</span>
                  </div>
                  {(r.kategori_utama || r.tindak_lanjut) && (
                    <p className="text-[10px] text-slate-400 truncate pl-[104px]">
                      {[r.kategori_utama, r.tindak_lanjut].filter(Boolean).join(' · ')}
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