import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { printSiswaStatement } from '@/lib/tunggakanPrint';

const formatRupiah = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

const badgeCls = (st) => st === 'Lunas'
  ? 'bg-emerald-100 text-emerald-700'
  : st === 'Cicilan' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

/**
 * Popup Detail Data Siswa pada tab Tunggakan (Laporan Keuangan):
 * ringkasan Total Dibayar / Sisa Bayar, detail per jenis iuran
 * (sudah bayar, sisa, status), dan aksi Cetak Data per siswa.
 */
export default function TunggakanDetailDialog({ isOpen, onClose, row, taLabel }) {
  if (!row) return null;
  const items = row.status_items || [];

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap pr-6">
            {row.nama}
            <Badge className={badgeCls(row.status_keuangan)}>{row.status_keuangan}</Badge>
          </DialogTitle>
          <p className="text-xs text-slate-400">NIS {row.nis || '-'} · {row.nama_kelas || '-'} · TA {taLabel || '-'}</p>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-lg bg-emerald-50">
            <p className="text-[10px] text-emerald-500 uppercase font-medium">Total Dibayar</p>
            <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatRupiah(row.total_dibayar)}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50">
            <p className="text-[10px] text-amber-500 uppercase font-medium">Sisa (Jatuh Tempo)</p>
            <p className="text-sm font-bold text-amber-700 mt-0.5">{formatRupiah(row.sisa_jatuh_tempo)}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-red-50">
            <p className="text-[10px] text-red-500 uppercase font-medium">Sisa Bayar (Setahun)</p>
            <p className="text-sm font-bold text-red-700 mt-0.5">{formatRupiah(row.sisa_setahun)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-600">Detail per Jenis Iuran</p>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-slate-400 text-center">Tidak ada item iuran</p>
            ) : items.map(it => (
              <div key={it.key} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {it.nama}{it.gratis ? ' (Gratis)' : ''}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {it.periode || '-'}{it.detail ? ` · ${it.detail}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-500">
                    Dibayar <span className="font-semibold text-emerald-600">{formatRupiah(it.dibayar)}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Sisa <span className={`font-semibold ${it.sisa_setahun > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(it.sisa_setahun)}</span>
                  </p>
                </div>
                <Badge className={`${badgeCls(it.status)} shrink-0`}>{it.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => printSiswaStatement(row, taLabel)}>
            <Printer className="w-4 h-4 mr-1" /> Cetak Data Siswa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}