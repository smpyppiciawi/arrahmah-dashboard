import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Trash2, Check, X, CircleCheck, CircleAlert } from 'lucide-react';

const getInitials = (name) => String(name || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

// Bottom Sheet — Detail & Aksi nilai siswa (edit nilai, hapus)
export default function NilaiEditSheet({ row, open, onOpenChange, onSave, onDelete }) {
  const [nilai, setNilai] = useState('');

  useEffect(() => { if (row) setNilai(row.nilai ?? ''); }, [row]);
  if (!row) return null;

  const kkm = row.kkm || 75;
  const numNilai = Number(nilai);
  const isTuntas = nilai !== '' && !isNaN(numNilai) && numNilai >= kkm;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-5 pb-8 pt-2">
          <DrawerHeader className="p-0">
            <div className="flex justify-between items-center">
              <DrawerTitle className="text-lg font-bold text-slate-800">Detail & Aksi</DrawerTitle>
              <button onClick={() => onOpenChange(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          </DrawerHeader>

          {/* Info Siswa */}
          <div className="flex items-center gap-4 mt-5 mb-5">
            <div className="w-14 h-14 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center font-bold text-xl border border-amber-100 shadow-sm flex-shrink-0">
              {getInitials(row.nama_siswa)}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-slate-900 truncate">{row.nama_siswa}</h3>
              <p className="text-sm text-slate-500 mt-0.5 font-mono">NIS: {row.nis}</p>
            </div>
          </div>

          {/* Tag Konteks */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium">{row.nama_kelas}</span>
            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium">{row.mapel}</span>
            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium">{row.jenis_penilaian}</span>
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
              isTuntas ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              {isTuntas ? <CircleCheck className="w-3.5 h-3.5" /> : <CircleAlert className="w-3.5 h-3.5" />}
              {isTuntas ? 'Tuntas' : 'Belum Tuntas'}
            </span>
          </div>

          {/* Input Nilai */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3 text-center">Nilai Saat Ini (KKM {kkm})</label>
            <div className="flex justify-center">
              <input
                type="number" min="0" max="100" value={nilai}
                onChange={(e) => setNilai(e.target.value)}
                className="w-40 bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-3xl font-bold text-center text-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Aksi */}
          <div className="flex gap-3">
            <button
              onClick={() => onDelete(row)}
              title="Hapus Data"
              className="flex-none w-14 h-14 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <Button
              onClick={() => onSave(nilai)}
              className="flex-1 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-base shadow-[0_4px_12px_rgba(245,158,11,0.3)] active:scale-[0.98] transition-transform gap-2"
            >
              <Check className="w-5 h-5" /> Simpan
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}