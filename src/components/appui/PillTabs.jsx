import React from 'react';

const ACTIVE_BG = {
  blue: 'bg-blue-600',
  emerald: 'bg-emerald-500',
  purple: 'bg-purple-600',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  sky: 'bg-sky-600',
  indigo: 'bg-indigo-600',
};

// Bar tab pill — scroll horizontal di mobile, tanpa scroll horizontal
export default function PillTabs({ tabs, activeKey, onChange, tint = 'blue', className }) {
  const active = ACTIVE_BG[tint] || ACTIVE_BG.blue;
  return (
    <div className={`flex gap-2 overflow-x-auto no-scrollbar ${className || ''}`}>
      {tabs.map(t => {
        const isActive = activeKey === t.key;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-none transition-all ${
              isActive
                ? `${active} text-white shadow-md`
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}