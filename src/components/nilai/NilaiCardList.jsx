import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

const getInitials = (name) => String(name || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

// Daftar nilai siswa — kartu app style dengan pagination bulat
export default function NilaiCardList({ data = [], canEdit, onEdit, pageSize = 10 }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  useEffect(() => { setPage(1); }, [data.length]);
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);

  const start = (page - 1) * pageSize;
  const rows = data.slice(start, start + pageSize);

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm font-medium">Tidak ada data nilai</p>
        <p className="text-slate-400 text-xs mt-1">Coba ubah kata kunci atau filter</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end mb-1">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Daftar Siswa ({data.length})</span>
        <span className="text-xs text-slate-500">Hal {page}/{totalPages}</span>
      </div>

      {rows.map(row => {
        const tuntas = row.status_ketuntasan === 'Tuntas';
        return (
          <div
            key={row.id}
            onClick={() => canEdit && onEdit && onEdit(row)}
            className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-colors ${canEdit ? 'cursor-pointer active:bg-slate-50' : ''}`}
          >
            <div className="p-4 flex items-center gap-3">
              {/* Avatar / Inisial */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold flex-none border-2 ${
                tuntas ? 'bg-emerald-100 text-emerald-700 border-emerald-50' : 'bg-red-100 text-red-600 border-red-50'
              }`}>
                {getInitials(row.nama_siswa)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-slate-900 text-sm truncate pr-2">{row.nama_siswa}</h3>
                  <span className={`text-lg font-bold leading-none flex-shrink-0 ${tuntas ? 'text-emerald-600' : 'text-red-600'}`}>
                    {row.nilai}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 mb-1.5 font-mono">{row.nis}</p>

                {/* Tag & Status */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{row.nama_kelas}</span>
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{row.mapel}</span>
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{row.jenis_penilaian}</span>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ml-auto ${
                    tuntas ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {row.status_ketuntasan}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Pagination bulat */}
      {totalPages > 1 && (
        <div className="pt-2 pb-4 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-10 h-10 rounded-full border border-slate-300 bg-white flex items-center justify-center text-slate-500 disabled:opacity-40 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-amber-500/20">
            {page}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-10 h-10 rounded-full border border-slate-300 bg-white flex items-center justify-center text-slate-500 disabled:opacity-40 shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}