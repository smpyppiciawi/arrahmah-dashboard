import React from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';

const NADA = {
  baik: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  buruk: 'text-rose-600 bg-rose-50 border-rose-200',
  stabil: 'text-slate-500 bg-slate-50 border-slate-200',
};

const IKON = { Naik: ArrowUpRight, Turun: ArrowDownRight, Stabil: ArrowRight };

// Indikator arah tren (dari garis MA) + toggle tampilkan/sembunyikan garis MA
export default function KontrolTrenMA({
  arah = 'Stabil', perubahan = 0, jendela = 0,
  tampil = true, onToggle, warna = '#8b5cf6', naikBaik = false,
}) {
  const Icon = IKON[arah] || ArrowRight;
  const nada = arah === 'Stabil' ? NADA.stabil : (arah === 'Naik') === naikBaik ? NADA.baik : NADA.buruk;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold ${nada}`}>
        <Icon className="w-3.5 h-3.5" />
        {arah}
        <span className="font-normal opacity-70 tabular-nums">
          {perubahan > 0 ? '+' : ''}{perubahan}%
        </span>
      </span>

      <button
        type="button"
        onClick={onToggle}
        title="Tampilkan / sembunyikan garis Moving Average"
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
          tampil
            ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-600'
        }`}
      >
        <span className="w-4 border-t-2 border-dashed" style={{ borderColor: tampil ? warna : '#cbd5e1' }} />
        MA{jendela ? ` ${jendela}` : ''}
      </button>
    </div>
  );
}