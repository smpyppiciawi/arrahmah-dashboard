import React from 'react';
import { Badge } from '@/components/ui/badge';
import { UserRound, Phone, BookOpen, Briefcase } from 'lucide-react';

const badgeJabatan = (jabatan) =>
  jabatan === 'Kepala Sekolah' ? 'bg-purple-100 text-purple-700' :
  jabatan === 'Guru Mata Pelajaran' ? 'bg-blue-100 text-blue-700' :
  'bg-slate-100 text-slate-700';

const badgeStatus = (status) =>
  status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' :
  status === 'Cuti' ? 'bg-amber-100 text-amber-700' :
  'bg-slate-200 text-slate-600';

export default function GuruCard({ guru, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white border border-slate-200 rounded-2xl p-3 hover:shadow-md hover:border-violet-200 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-14 h-[72px] rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100">
          {guru.foto_url ? (
            <img src={guru.foto_url} alt={guru.nama} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <UserRound className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">{guru.nama}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {guru.jenis_kelamin || '-'} · NUPTK {guru.nuptk || '-'}
          </p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <Badge className={`${badgeJabatan(guru.jabatan)} text-[10px] border-0`}>{guru.jabatan || 'Guru Mata Pelajaran'}</Badge>
            <Badge className={`${badgeStatus(guru.status)} text-[10px] border-0`}>{guru.status || 'Aktif'}</Badge>
          </div>
        </div>
      </div>

      <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
        <p className="flex items-center gap-1.5 truncate">
          <BookOpen className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span className="truncate">{guru.mapel?.length ? guru.mapel.join(', ') : 'Mapel belum diisi'}</span>
        </p>
        <p className="flex items-center gap-1.5 truncate">
          <Briefcase className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span className="truncate">{guru.tugas_tambahan || 'Tanpa tugas tambahan'}</span>
        </p>
        <p className="flex items-center gap-1.5 truncate">
          <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span className="truncate">{guru.no_telp || '-'}</span>
        </p>
      </div>
    </button>
  );
}