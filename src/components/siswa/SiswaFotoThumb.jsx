import React from 'react';
import { User } from 'lucide-react';
import { getFotoAktif } from '@/lib/fotoSiswa';

// Avatar foto siswa ringkas — dipakai daftar/laporan agar siswa mudah dikenali.
export default function SiswaFotoThumb({ siswa, className = 'w-9 h-12', rounded = 'rounded-lg', alt }) {
  const foto = getFotoAktif(siswa);
  return (
    <span className={`${className} ${rounded} overflow-hidden bg-slate-100 flex items-center justify-center shrink-0`}>
      {foto ? (
        <img src={foto} alt={alt || siswa?.nama || 'Foto siswa'} className="w-full h-full object-cover" />
      ) : (
        <User className="w-4 h-4 text-slate-300" />
      )}
    </span>
  );
}