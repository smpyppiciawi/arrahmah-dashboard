import React from 'react';
import { Check } from "lucide-react";

const BULAN_SPP = [
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'
];

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function SppChecklist({ tarifNominal, paidMonths = [], gratisMonths = [], selectedMonths = [], onToggleMonth, tahunAjaran }) {
  return (
    <div className="p-4 bg-blue-50 rounded-lg space-y-3 border border-blue-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Ceklis Bulan SPP</p>
          {tahunAjaran && (
            <p className="text-xs text-blue-500">Tahun Pelajaran {tahunAjaran}</p>
          )}
        </div>
        <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-md">
          {formatRupiah(tarifNominal)}/bln
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {BULAN_SPP.map((bulan, idx) => {
          const isPaid = paidMonths.includes(bulan);
          const isGratis = gratisMonths.includes(bulan);
          const isDisabled = isPaid || isGratis;
          const isSelected = selectedMonths.includes(bulan);
          return (
            <div
              key={bulan}
              onClick={() => !isDisabled && onToggleMonth(bulan)}
              className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                isGratis
                  ? 'bg-teal-50 border-teal-200 cursor-not-allowed'
                  : isPaid
                  ? 'bg-emerald-50 border-emerald-200 cursor-not-allowed'
                  : isSelected
                  ? 'bg-blue-500 border-blue-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 hover:border-blue-400'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                isGratis
                  ? 'bg-teal-500 border-teal-500'
                  : isPaid
                  ? 'bg-emerald-500 border-emerald-500'
                  : isSelected
                  ? 'bg-white border-white'
                  : 'border-slate-300'
              }`}>
                {(isGratis || isPaid || isSelected) && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className={isGratis ? 'text-teal-700 line-through' : isPaid ? 'text-emerald-700 line-through' : isSelected ? 'text-white font-medium' : 'text-slate-700'}>
                {bulan}
              </span>
              {isGratis && (
                <span className="ml-auto text-[9px] text-teal-600 font-bold">GRATIS</span>
              )}
              {isPaid && !isGratis && (
                <span className="ml-auto text-[9px] text-emerald-500 font-bold">LUNAS</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-sm font-medium pt-2 border-t border-blue-100">
        <span className="text-slate-600">
          {gratisMonths.length > 0 && <span className="text-teal-600 mr-2">{gratisMonths.length} bulan GRATIS</span>}
          {paidMonths.length > 0 && <span className="text-emerald-600 mr-2">{paidMonths.length} bulan sudah dibayar</span>}
          {selectedMonths.length} bulan baru dipilih
        </span>
        <span className="text-blue-700 font-bold">{formatRupiah(tarifNominal * selectedMonths.length)}</span>
      </div>
    </div>
  );
}