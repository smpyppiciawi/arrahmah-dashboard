import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';

export default function ApprovalPoinWidget({ count, isDark, onClick }) {
  const hasPending = count > 0;
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl p-4 text-left transition-all hover:scale-[1.01] hover:shadow-lg ${hasPending ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30' : isDark ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-slate-200 shadow-sm'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${hasPending ? 'bg-white/20' : isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
            <Clock className={`w-5 h-5 ${hasPending ? 'text-white' : isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${hasPending ? 'text-white' : isDark ? 'text-slate-100' : 'text-slate-800'}`}>{count}</p>
            <p className={`text-xs ${hasPending ? 'text-white/80' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>Approval Poin Pending</p>
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 ${hasPending ? 'text-white/80' : isDark ? 'text-slate-500' : 'text-slate-400'}`} />
      </div>
      {hasPending && <p className="text-xs text-white/80 mt-2">Poin ≥ 100 menunggu persetujuan Anda</p>}
    </button>
  );
}