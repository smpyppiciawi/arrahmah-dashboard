import React from 'react';

const TONES = {
  slate: 'border-slate-200 text-slate-800',
  rose: 'border-rose-200 bg-rose-50/40 text-rose-600',
  amber: 'border-amber-200 bg-amber-50/40 text-amber-600',
  blue: 'border-blue-200 bg-blue-50/40 text-blue-600',
  emerald: 'border-emerald-200 bg-emerald-50/40 text-emerald-600',
  indigo: 'border-indigo-200 bg-indigo-50/40 text-indigo-600',
};

export default function StatCard({ label, value, hint, tone = 'slate' }) {
  return (
    <div className={`rounded-xl border p-3 md:p-4 text-center ${TONES[tone] || TONES.slate}`}>
      <p className="text-[11px] font-medium text-slate-500 leading-tight">{label}</p>
      <p className="text-xl md:text-2xl font-bold mt-1 leading-none">{value}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-1 leading-tight">{hint}</p>}
    </div>
  );
}