import React from 'react';
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { formatDateID } from '@/lib/sppUtils';

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function SiswaRiwayat({ riwayat }) {
  if (!riwayat || riwayat.length === 0) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg text-center text-sm text-slate-400 border border-slate-100">
        <History className="w-4 h-4 mx-auto mb-1 opacity-50" />
        Belum ada riwayat pembayaran
      </div>
    );
  }

  return (
    <div className="p-3 bg-slate-50 rounded-lg space-y-2 border border-slate-100">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <History className="w-3.5 h-3.5" />
        Riwayat Pembayaran Terakhir ({riwayat.length})
      </div>
      {riwayat.map(t => (
        <div
          key={t.id}
          className="flex items-center justify-between text-sm py-1.5 border-b border-slate-200 last:border-0"
        >
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-medium text-slate-700 truncate">
              {t.tipe_transaksi || t.uraian || '-'}
            </span>
            <span className="text-xs text-slate-400">
              {formatDateID(t.tanggal)}
              {t.bulan_dibayar?.length > 0 && ` · ${t.bulan_dibayar.join(', ')}`}
            </span>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            <span className={`font-medium text-sm ${t.jenis === 'Pemasukan' ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatRupiah(t.jumlah)}
            </span>
            <div>
              <Badge
                variant="outline"
                className={`text-[10px] ml-1 ${
                  t.status_bayar === 'Lunas'
                    ? 'border-emerald-300 text-emerald-600'
                    : 'border-amber-300 text-amber-600'
                }`}
              >
                {t.status_bayar || 'Lunas'}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}