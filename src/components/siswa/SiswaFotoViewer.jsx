import React from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { User, X } from "lucide-react";
import { getFotoAktif } from '@/lib/fotoSiswa';

export default function SiswaFotoViewer({ siswa, onClose }) {
  if (!siswa) return null;
  const foto = getFotoAktif(siswa);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-slate-900 border-slate-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <DialogTitle className="text-white text-sm font-semibold">
            {siswa.nama}
            <span className="block text-[11px] font-normal text-slate-400">NIS {siswa.nis || '-'} · {siswa.nama_kelas || '-'}</span>
          </DialogTitle>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" title="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-center bg-black">
          {foto ? (
            <img src={foto} alt={siswa.nama} className="max-h-[75vh] w-auto object-contain" />
          ) : (
            <div className="py-24 text-slate-500 text-center">
              <User className="w-16 h-16 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Foto belum tersedia</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}