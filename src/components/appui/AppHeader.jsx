import React from 'react';

const TINTS = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-600',
  sky: 'bg-sky-600',
  indigo: 'bg-indigo-600',
  purple: 'bg-purple-600',
  amber: 'bg-amber-500',
};

// Header app-style: ikon bulat + judul + subjudul (pola Menu Nilai)
export default function AppHeader({ icon: Icon, tint = 'blue', title, subtitle, right }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-11 h-11 ${TINTS[tint] || TINTS.blue} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-900/10`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-slate-500 text-xs md:text-sm mt-0.5 truncate">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2 flex-shrink-0">{right}</div>}
    </div>
  );
}