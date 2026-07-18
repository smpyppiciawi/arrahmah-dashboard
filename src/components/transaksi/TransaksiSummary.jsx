import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function TransaksiSummary({ totalPemasukan, totalPengeluaran, saldo }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="border-0 shadow-sm bg-emerald-50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-600 font-medium">Total Pemasukan</p>
              <p className="text-2xl font-bold text-emerald-700">{formatRupiah(totalPemasukan)}</p>
            </div>
            <div className="p-3 bg-emerald-500 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm bg-red-50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-red-700">{formatRupiah(totalPengeluaran)}</p>
            </div>
            <div className="p-3 bg-red-500 rounded-xl">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className={`border-0 shadow-sm ${saldo >= 0 ? 'bg-teal-50' : 'bg-amber-50'}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${saldo >= 0 ? 'text-teal-600' : 'text-amber-600'}`}>Saldo</p>
              <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-teal-700' : 'text-amber-700'}`}>{formatRupiah(saldo)}</p>
            </div>
            <div className={`p-3 rounded-xl ${saldo >= 0 ? 'bg-teal-500' : 'bg-amber-500'}`}>
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}