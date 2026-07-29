import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

export default function LiveClock({ className = '', compact = false }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs shadow-sm ${className}`}>
        <Clock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <span className="font-mono font-semibold text-white tabular-nums">{timeStr}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 shadow-sm ${className}`}>
      <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <span>{dateStr}</span>
      <span className="text-slate-300">|</span>
      <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0" />
      <span className="font-mono font-semibold text-slate-800 tabular-nums">{timeStr}</span>
    </div>
  );
}