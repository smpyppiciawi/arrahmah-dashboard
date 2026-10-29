import React from 'react';
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Hash } from "lucide-react";
import { getFotoAktif } from '@/lib/fotoSiswa';
import { formatAlamatLengkap } from '@/lib/dapodikConstants';
import SiswaKontakRow from '@/components/siswa/SiswaKontakRow';

const kelasColor = (namaKelas) => (
  namaKelas?.startsWith('7') ? 'bg-blue-100 text-blue-700' :
  namaKelas?.startsWith('8') ? 'bg-purple-100 text-purple-700' :
  'bg-emerald-100 text-emerald-700'
);

const statusColor = (status) => (
  status === 'Aktif' ? 'bg-emerald-500/90 text-white' :
  status === 'Lulus' ? 'bg-blue-500/90 text-white' :
  'bg-slate-500/90 text-white'
);

export default function SiswaCard({ siswa, onClick, onPilihKontak, aktifkanKontak, kompak = false }) {
  const foto = getFotoAktif(siswa);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(siswa)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(siswa); }}
      className="group text-left rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden flex flex-col cursor-pointer"
    >
      <div className={`relative bg-slate-100 overflow-hidden ${kompak ? 'h-24 sm:h-28' : 'aspect-[3/4]'}`}>
        {foto ? (
          <img
            src={foto}
            alt={siswa.nama}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <User className={kompak ? 'w-7 h-7' : 'w-10 h-10'} />
            <span className="text-[10px] mt-1">Tanpa foto</span>
          </div>
        )}
        <span className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur ${statusColor(siswa.status)}`}>
          {siswa.status || 'Aktif'}
        </span>
      </div>

      <div className="p-3 space-y-1.5 flex-1">
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
          <Hash className="w-3 h-3" /> {siswa.nis || 'Tanpa NIS'}
        </div>
        <p className="text-sm font-bold text-slate-800 truncate leading-tight" title={siswa.nama}>{siswa.nama}</p>

        <div className="flex items-center gap-1.5">
          <Badge className={`${kelasColor(siswa.nama_kelas)} text-[10px]`}>{siswa.nama_kelas || '-'}</Badge>
          <span className="text-[10px] text-slate-500">{siswa.jenis_kelamin || '-'}</span>
        </div>

        <p className="flex items-start gap-1 text-[11px] text-slate-500 leading-snug">
          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
          <span className="line-clamp-2">{formatAlamatLengkap(siswa) || 'Alamat belum diisi'}</span>
        </p>

        <div className="pt-1">
          <SiswaKontakRow
            siswa={siswa}
            onPilih={(phone) => onPilihKontak?.(siswa, phone)}
            aktifkan={aktifkanKontak}
          />
        </div>
      </div>
    </div>
  );
}