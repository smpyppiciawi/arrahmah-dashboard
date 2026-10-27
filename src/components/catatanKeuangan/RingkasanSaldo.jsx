import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import { formatRupiah } from '@/lib/catatanKeuanganUtils';

const KARTU = [
  { key: 'pemasukan', label: 'Total Pemasukan', icon: ArrowUpCircle, tone: 'text-emerald-600 bg-emerald-50', nilai: 'text-emerald-700' },
  { key: 'pengeluaran', label: 'Total Pengeluaran', icon: ArrowDownCircle, tone: 'text-rose-600 bg-rose-50', nilai: 'text-rose-700' },
  { key: 'saldo', label: 'Sisa Saldo', icon: Wallet, tone: 'text-indigo-600 bg-indigo-50', nilai: 'text-indigo-700' },
];

export default function RingkasanSaldo({ ringkasan }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {KARTU.map(({ key, label, icon: Icon, tone, nilai }) => (
        <Card key={key} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="w-4 h-4" />
              </span>
              <p className="text-xs font-medium text-slate-500">{label}</p>
            </div>
            <p className={`mt-2 text-lg font-bold ${nilai}`}>{formatRupiah(ringkasan[key])}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}