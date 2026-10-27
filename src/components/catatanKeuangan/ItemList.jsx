import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from 'lucide-react';
import { formatRupiah, hitungRingkasan } from '@/lib/catatanKeuanganUtils';

const BAGIAN = [
  { jenis: 'Pemasukan', judul: 'Pemasukan', warna: 'text-emerald-700', garis: 'border-emerald-100' },
  { jenis: 'Pengeluaran', judul: 'Pengeluaran', warna: 'text-rose-700', garis: 'border-rose-100' },
];

export default function ItemList({ items = [], onEdit, onHapus }) {
  const ringkasan = hitungRingkasan(items);

  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-500">Belum ada item pada periode ini</p>
        <p className="text-xs text-slate-400 mt-1">Pilih tanggal dan jenis, lalu tambahkan item pemasukan atau pengeluaran.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {BAGIAN.map(({ jenis, judul, warna, garis }) => {
        const rows = items
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.jenis === jenis);
        const total = jenis === 'Pemasukan' ? ringkasan.pemasukan : ringkasan.pengeluaran;

        return (
          <div key={jenis}>
            <div className={`flex items-center justify-between border-b pb-1.5 ${garis}`}>
              <p className={`text-xs font-bold uppercase tracking-wide ${warna}`}>{judul}</p>
              <p className={`text-xs font-semibold ${warna}`}>{formatRupiah(total)}</p>
            </div>
            {rows.length === 0 ? (
              <p className="py-3 text-xs text-slate-400">Belum ada {judul.toLowerCase()}.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map(({ item, index }) => (
                  <div key={`${item.tanggal}-${index}`} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">{item.nama_item}</p>
                      <p className="text-[11px] text-slate-400">{item.tanggal || '-'}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-semibold ${warna}`}>{formatRupiah(item.nominal)}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-indigo-600" onClick={() => onEdit(index)} title="Ubah item">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600" onClick={() => onHapus(index)} title="Hapus item">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}