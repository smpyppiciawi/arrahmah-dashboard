import React, { useState } from 'react';
import { BookMarked, CheckCircle, X } from 'lucide-react';
import { formatDateID } from '@/lib/sppUtils';

export default function HapalanProgressCard({ hapalanProgress }) {
  const [showDetail, setShowDetail] = useState(false);
  if (!hapalanProgress || hapalanProgress.total === 0) return null;

  const { persen, selesai, total, items } = hapalanProgress;
  const colorClass = persen >= 75 ? 'bg-emerald-500' : persen >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const badgeClass = persen >= 75 ? 'bg-emerald-100 text-emerald-700' : persen >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

  const surahList = items.filter(i => i.jenis === 'Surah');
  const doaList = items.filter(i => i.jenis === 'Doa');

  return (
    <>
      <div className="px-4 mb-4">
        <button
          onClick={() => setShowDetail(true)}
          className="w-full bg-white rounded-2xl shadow-sm p-4 text-left active:scale-[0.98] transition"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-700 font-bold text-sm flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-green-500" /> Progres Hapalan
            </p>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeClass}`}>
              {persen}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${colorClass}`}
                style={{ width: `${persen}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{selesai}/{total} surah &amp; doa</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">Ketuk untuk melihat detail</p>
        </button>
      </div>

      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDetail(false)}>
          <div className="bg-white w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-3 border-b border-slate-100 z-10">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <BookMarked className="w-5 h-5 text-green-500" /> Detail Hapalan
                </h3>
                <p className="text-xs text-slate-400">{selesai} dari {total} selesai · {persen}%</p>
              </div>
              <button onClick={() => setShowDetail(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {surahList.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Surah</p>
                <div className="space-y-1.5">
                  {surahList.map((item, idx) => (
                    <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-xl ${item.sudah_hapal ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.sudah_hapal ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        {item.sudah_hapal ? <CheckCircle className="w-4 h-4 text-white" /> : <span className="text-xs font-bold text-slate-400">{item.urutan || idx + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${item.sudah_hapal ? 'text-emerald-700' : 'text-slate-600'}`}>{item.nama}</p>
                        {item.sudah_hapal && item.tanggal_setor && <p className="text-[10px] text-emerald-500">Setor {formatDateID(item.tanggal_setor)}</p>}
                      </div>
                      {item.sudah_hapal ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">SELESAI</span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">BELUM</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {doaList.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Doa</p>
                <div className="space-y-1.5">
                  {doaList.map((item, idx) => (
                    <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-xl ${item.sudah_hapal ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.sudah_hapal ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        {item.sudah_hapal ? <CheckCircle className="w-4 h-4 text-white" /> : <span className="text-xs">📘</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${item.sudah_hapal ? 'text-emerald-700' : 'text-slate-600'}`}>{item.nama}</p>
                        {item.sudah_hapal && item.tanggal_setor && <p className="text-[10px] text-emerald-500">Setor {formatDateID(item.tanggal_setor)}</p>}
                      </div>
                      {item.sudah_hapal ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">SELESAI</span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">BELUM</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}