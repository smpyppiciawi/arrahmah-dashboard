import React from 'react';

const ACCENTS = {
  slate:   { card: 'bg-slate-100',   bar: 'bg-slate-400',   text: 'text-slate-700',   sub: 'text-slate-500' },
  emerald: { card: 'bg-emerald-50', bar: 'bg-emerald-500', text: 'text-emerald-700', sub: 'text-emerald-500' },
  red:     { card: 'bg-red-50',     bar: 'bg-red-500',     text: 'text-red-700',     sub: 'text-red-500' },
  amber:   { card: 'bg-amber-50',   bar: 'bg-amber-500',   text: 'text-amber-700',   sub: 'text-amber-500' },
  blue:    { card: 'bg-blue-50',    bar: 'bg-blue-500',    text: 'text-blue-700',    sub: 'text-blue-500' },
  indigo:  { card: 'bg-indigo-50',  bar: 'bg-indigo-500',  text: 'text-indigo-700',  sub: 'text-indigo-500' },
  purple:  { card: 'bg-purple-50',  bar: 'bg-purple-500',  text: 'text-purple-700',  sub: 'text-purple-500' },
  sky:     { card: 'bg-sky-50',     bar: 'bg-sky-500',     text: 'text-sky-700',     sub: 'text-sky-500' },
  orange:  { card: 'bg-orange-50',  bar: 'bg-orange-500',  text: 'text-orange-700',  sub: 'text-orange-500' },
};

// Kartu ringkasan angka — scroll horizontal di mobile (pola Menu Nilai)
export default function SummaryScroll({ items = [] }) {
  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
      {items.map((it, i) => {
        const a = ACCENTS[it.accent] || ACCENTS.slate;
        return (
          <div key={i} className={`relative overflow-hidden flex-none min-w-[104px] rounded-2xl ${a.card} p-3 pl-4`}>
            <div className={`absolute left-0 top-0 h-full w-1 ${a.bar}`} />
            <p className={`text-xl font-bold leading-none ${a.text}`}>{it.value}</p>
            <p className={`text-[11px] font-medium mt-1.5 ${a.sub}`}>{it.label}</p>
          </div>
        );
      })}
    </div>
  );
}