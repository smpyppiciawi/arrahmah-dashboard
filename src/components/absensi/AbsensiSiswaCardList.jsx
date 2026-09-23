import React from 'react';
import { Clock, FileText } from 'lucide-react';

const getInitials = (name) => String(name || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

export const STATUS_STYLE = {
  Hadir:     { avatar: 'bg-emerald-100 text-emerald-700 border-emerald-50', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  Sakit:     { avatar: 'bg-amber-100 text-amber-700 border-amber-50',       badge: 'bg-amber-50 text-amber-700 border border-amber-100' },
  Izin:      { avatar: 'bg-blue-100 text-blue-700 border-blue-50',          badge: 'bg-blue-50 text-blue-700 border border-blue-100' },
  Alfa:      { avatar: 'bg-red-100 text-red-600 border-red-50',             badge: 'bg-red-50 text-red-600 border border-red-100' },
  Terlambat: { avatar: 'bg-orange-100 text-orange-700 border-orange-50',    badge: 'bg-orange-50 text-orange-700 border border-orange-100' },
  Libur:     { avatar: 'bg-indigo-100 text-indigo-700 border-indigo-50',    badge: 'bg-indigo-50 text-indigo-700 border border-indigo-100' },
};

// Daftar siswa absensi — kartu app style (tanpa pagination, satu kelas)
export default function AbsensiSiswaCardList({ siswaList = [], absensiData = {}, onOpen }) {
  if (siswaList.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {siswaList.map((siswa, index) => {
        const data = absensiData[siswa.id] || {};
        const st = STATUS_STYLE[data.status] || STATUS_STYLE.Hadir;
        return (
          <button
            key={siswa.id}
            type="button"
            onClick={() => onOpen && onOpen(siswa)}
            className="w-full text-left bg-white rounded-2xl shadow-sm border border-slate-100 p-3.5 active:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Avatar / Inisial */}
              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold flex-none border-2 ${st.avatar}`}>
                {getInitials(siswa.nama)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">
                    <span className="text-slate-300 font-normal mr-1.5 text-xs">{index + 1}.</span>{siswa.nama}
                  </h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold flex-none ${st.badge}`}>
                    {data.status || 'Hadir'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono truncate">{siswa.nis}</p>
                <div className="flex items-center gap-3 mt-1">
                  {data.jam_masuk && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><Clock className="w-3 h-3" />{data.jam_masuk}</span>
                  )}
                  {data.keterangan && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 truncate max-w-[60%]"><FileText className="w-3 h-3 flex-none" />{data.keterangan}</span>
                  )}
                  {data.existing_id && <span className="text-[10px] text-emerald-500 ml-auto">✓ tersimpan</span>}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}