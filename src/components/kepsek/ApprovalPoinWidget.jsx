import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ApprovalPoinWidget({ count, isDark, onClick }) {
  const hasPending = count > 0;
  return (
    <button onClick={onClick} className={`w-full rounded-2xl p-3 md:p-4 text-left transition-all hover:shadow-md ${isDark ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-slate-200 shadow-sm'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700/50' : 'bg-amber-50'}`}>
            <Clock className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          </div>
          <div>
            <p className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{count}</p>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Approval Poin Pending</p>
          </div>
        </div>
        {hasPending ? <Badge className="bg-amber-100 text-amber-700">Lihat</Badge> : <ChevronRight className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />}
      </div>
    </button>
  );
}