import React from 'react';

export default function KartuStatistik({ title, icon: Icon, sub, action, children, className = '' }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            {Icon && <Icon className="w-4 h-4 text-slate-400" />}
            {title}
          </h3>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}