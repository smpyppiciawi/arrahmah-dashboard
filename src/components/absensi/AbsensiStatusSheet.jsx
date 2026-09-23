import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Check, CheckCircle, AlertCircle, FileText, UserX, Clock, Sun } from 'lucide-react';

const STATUS_CONFIG = {
  'Hadir':     { icon: CheckCircle, active: 'bg-emerald-500 text-white shadow-md shadow-emerald-200',  inactive: 'bg-slate-100 text-slate-400' },
  'Sakit':     { icon: AlertCircle,  active: 'bg-amber-500 text-white shadow-md shadow-amber-200',       inactive: 'bg-slate-100 text-slate-400' },
  'Izin':      { icon: FileText,     active: 'bg-blue-500 text-white shadow-md shadow-blue-200',         inactive: 'bg-slate-100 text-slate-400' },
  'Alfa':      { icon: UserX,        active: 'bg-red-500 text-white shadow-md shadow-red-200',           inactive: 'bg-slate-100 text-slate-400' },
  'Terlambat': { icon: Clock,        active: 'bg-orange-500 text-white shadow-md shadow-orange-200',     inactive: 'bg-slate-100 text-slate-400' },
};

const getInitials = (name) => String(name || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

// Bottom Sheet — ubah status kehadiran cepat per siswa
export default function AbsensiStatusSheet({ siswa, data = {}, open, onOpenChange, canEdit, isLibur, onStatus, onField }) {
  if (!siswa) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-5 pb-8 pt-2">
          <DrawerHeader className="p-0">
            <div className="flex justify-between items-center">
              <DrawerTitle className="text-lg font-bold text-slate-800">Absensi Siswa</DrawerTitle>
              <button onClick={() => onOpenChange(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          </DrawerHeader>

          {/* Info Siswa */}
          <div className="flex items-center gap-4 mt-5 mb-6">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xl border border-emerald-50 shadow-sm flex-shrink-0">
              {getInitials(siswa.nama)}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-slate-900 truncate">{siswa.nama}</h3>
              <p className="text-sm text-slate-500 mt-0.5 font-mono">NIS: {siswa.nis}</p>
            </div>
          </div>

          {isLibur ? (
            <div className="flex items-center justify-center gap-2 py-8 bg-indigo-50 rounded-2xl text-indigo-600 font-semibold text-sm">
              <Sun className="w-5 h-5" /> Hari Libur — tercatat Libur
            </div>
          ) : (
            <>
              {/* Status kehadiran */}
              <p className="text-sm font-semibold text-slate-700 mb-3">Status Kehadiran</p>
              <div className="grid grid-cols-3 gap-2.5 mb-6">
                {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                  const isActive = (data.status || 'Hadir') === status;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={status}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => onStatus && onStatus(siswa.id, status)}
                      className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl text-xs font-semibold transition-all active:scale-95 ${isActive ? cfg.active : cfg.inactive}`}
                    >
                      <Icon className="w-5 h-5" />
                      {status}
                    </button>
                  );
                })}
              </div>

              {/* Jam masuk & keterangan */}
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Jam Masuk</label>
                  <Input
                    type="time"
                    value={data.jam_masuk || ''}
                    onChange={(e) => onField && onField(siswa.id, 'jam_masuk', e.target.value)}
                    disabled={!canEdit}
                    className="h-11 rounded-xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Keterangan</label>
                  <Input
                    placeholder="Contoh: demam, acara keluarga..."
                    value={data.keterangan || ''}
                    onChange={(e) => onField && onField(siswa.id, 'keterangan', e.target.value)}
                    disabled={!canEdit}
                    className="h-11 rounded-xl bg-slate-50"
                  />
                </div>
              </div>
            </>
          )}

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base shadow-[0_4px_12px_rgba(5,150,105,0.3)] active:scale-[0.98] transition-transform gap-2"
          >
            <Check className="w-5 h-5" /> Selesai
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}