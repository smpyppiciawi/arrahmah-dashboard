import React from 'react';

export const BATAS_BARIS = [10, 20, 30];

export default function PilihanBatasBaris({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
      {BATAS_BARIS.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
            value === n ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}