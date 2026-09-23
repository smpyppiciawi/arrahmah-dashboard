import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft } from 'lucide-react';
import { formatDateID } from '@/lib/sppUtils';

const formatRupiah = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

/**
 * Popup detail saldo Iuran Muka satu siswa: ringkasan total (setoran, diterapkan,
 * sisa), daftar alokasi per iuran/TA tujuan beserta riwayat penerapan, dan tombol
 * aksi "Terapkan sebagai Pembayaran" per alokasi.
 */
export default function IuranMukaDetailDialog({ isOpen, onClose, group, onTerapkan }) {
  if (!group) return null;

  const statusBadge = (m) => {
    if (m.sisa <= 0) return <Badge className="bg-emerald-100 text-emerald-700">Selesai</Badge>;
    if ((m.nominal_diterapkan || 0) > 0) return <Badge className="bg-amber-100 text-amber-700">Sebagian Diterapkan</Badge>;
    return <Badge className="bg-blue-100 text-blue-700">Menunggu Penerapan</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Saldo Iuran Muka — {group.nama_siswa}</DialogTitle>
          <p className="text-xs text-slate-400">{group.nis || '-'} · {group.nama_kelas || '-'}</p>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-lg bg-slate-50">
            <p className="text-[10px] text-slate-400 uppercase">Total Setoran</p>
            <p className="text-sm font-bold text-slate-700 mt-0.5">{formatRupiah(group.totalSetoran)}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50">
            <p className="text-[10px] text-emerald-500 uppercase">Diterapkan</p>
            <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatRupiah(group.totalDiterapkan)}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-50">
            <p className="text-[10px] text-purple-500 uppercase">Sisa Saldo</p>
            <p className="text-sm font-bold text-purple-700 mt-0.5">{formatRupiah(group.totalSaldo)}</p>
          </div>
        </div>

        <div className="space-y-3">
          {group.records.map(m => (
            <div key={m.id} className="border border-slate-100 rounded-xl p-3 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {m.nama_iuran} <span className="font-normal text-slate-400">· TP {m.tahun_ajaran_tujuan || '-'}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Setoran {formatDateID(m.tanggal_setoran)}{m.pencatat ? ` · dicatat ${m.pencatat}` : ''}
                  </p>
                </div>
                {statusBadge(m)}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-50">
                  <p className="text-[10px] text-slate-400 uppercase">Setoran</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{formatRupiah(m.nominal)}</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50">
                  <p className="text-[10px] text-emerald-500 uppercase">Diterapkan</p>
                  <p className="text-xs font-bold text-emerald-700 mt-0.5">{formatRupiah(m.nominal_diterapkan)}</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-50">
                  <p className="text-[10px] text-purple-500 uppercase">Sisa Saldo</p>
                  <p className="text-xs font-bold text-purple-700 mt-0.5">{formatRupiah(m.sisa)}</p>
                </div>
              </div>

              {(m.penerapan || []).length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Riwayat Penerapan</p>
                  {m.penerapan.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-600 truncate">
                        {formatDateID(p.tanggal)} · {p.uraian}{p.pic ? ` · PIC ${p.pic}` : ''}
                      </span>
                      <span className="font-bold text-emerald-600 shrink-0">{formatRupiah(p.nominal)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={m.sisa <= 0}
                  onClick={() => onTerapkan(m)}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Terapkan sebagai Pembayaran
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}