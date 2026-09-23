import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const JENIS_BADGE = {
  'Tamu Dinas': 'bg-blue-100 text-blue-700',
  'Tamu Orang Tua/Wali': 'bg-emerald-100 text-emerald-700',
  'Tamu Yayasan': 'bg-violet-100 text-violet-700',
  'Tamu Sekolah Lain': 'bg-amber-100 text-amber-700',
  'Tamu Umum': 'bg-slate-100 text-slate-700',
};

// Daftar kunjungan tamu — kartu app style dengan pagination bulat
export default function BukuTamuCardList({ data = [], showTanggal = false, onOpen, pageSize = 8 }) {
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
        <p className="text-slate-500 text-sm font-medium">Belum ada tamu pada rentang ini</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end mb-1">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kunjungan ({data.length})</span>
        <span className="text-xs text-slate-500">Hal {page}/{totalPages}</span>
      </div>

      {rows.map(t => {
        const selesai = (t.status || 'Berkunjung') === 'Selesai';
        const nama = t.jenis_tamu === 'Tamu Orang Tua/Wali' ? (t.nama_ortu_wali || '-') : (t.nama_lengkap || '-');
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpen && onOpen(t)}
            className="w-full text-left bg-white rounded-2xl shadow-sm border border-slate-100 p-4 active:bg-slate-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">{nama}</p>
                {t.jenis_tamu === 'Tamu Orang Tua/Wali' && t.nama_siswa && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">Anak: {t.nama_siswa} ({t.nama_kelas || '-'})</p>
                )}
              </div>
              <Badge className={`text-[10px] flex-none ${selesai ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {selesai ? 'Selesai' : 'Berkunjung'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <Badge className={`text-[10px] ${JENIS_BADGE[t.jenis_tamu] || 'bg-slate-100 text-slate-600'}`}>{t.jenis_tamu}</Badge>
              {showTanggal && (
                <span className="text-[10px] text-slate-400 ml-auto">{format(parseISO(t.tanggal), 'd MMM yyyy', { locale: idLocale })}</span>
              )}
            </div>
            {t.keperluan && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{t.keperluan}</p>}
          </button>
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
          <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-sky-600/20">
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