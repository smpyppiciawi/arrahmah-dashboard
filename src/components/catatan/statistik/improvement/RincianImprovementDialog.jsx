import React from 'react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { bulat1 } from '@/lib/improvementStatUtils';

const tanggalPendek = (tgl) => (tgl ? format(parseISO(tgl), 'dd MMM', { locale: idLocale }) : '-');

export default function RincianImprovementDialog({ rincian, onClose }) {
  const rows = rincian?.rows || [];
  const totalPoin = bulat1(rows.reduce((s, r) => s + (Number(r.poin_pengurangan) || 0), 0));

  return (
    <Dialog open={!!rincian} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">{rincian?.judul || 'Rincian Improvement'}</DialogTitle>
          <DialogDescription>{rincian?.sub || ''}</DialogDescription>
        </DialogHeader>

        {(rincian?.aksi || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {rincian.aksi.map((a) => (
              <Button
                key={a.label}
                type="button"
                size="sm"
                onClick={a.onClick}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {a.label}
              </Button>
            ))}
          </div>
        )}

        <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
          {rows.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Tidak ada rincian pada pilihan ini</p>
          ) : rows.map((r, i) => (
            <div key={r.id || `${r.tanggal}-${r.siswa_id || r.nama_siswa}-${i}`} className="px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 w-14 shrink-0">{tanggalPendek(r.tanggal)}</span>
                <span className="text-xs font-medium text-slate-700 flex-1 min-w-0 truncate">
                  {r.nama_siswa || '-'}
                  <span className="text-slate-400 font-normal"> · {r.nama_kelas || '-'}</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-600 tabular-nums w-10 text-right shrink-0">
                  {r.poin_pengurangan || 0}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate pl-16">
                {r.kegiatan_pembinaan_nama || r.uraian || '-'}
              </p>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-500">
          {rows.length} kegiatan · total {totalPoin} poin
        </p>
      </DialogContent>
    </Dialog>
  );
}