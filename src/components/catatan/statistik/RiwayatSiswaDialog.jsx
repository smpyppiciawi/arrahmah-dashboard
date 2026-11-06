import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { labelTanggal, formatPct } from '@/lib/kehadiranUtils';

const BADGE = {
  Sakit: 'bg-blue-50 text-blue-700 border-blue-200',
  Izin: 'bg-amber-50 text-amber-700 border-amber-200',
  Alfa: 'bg-red-50 text-red-700 border-red-200',
};

export default function RiwayatSiswaDialog({ siswa, absensi = [], jumlahHari = 0, onClose }) {
  const records = useMemo(() => {
    if (!siswa) return [];
    return absensi
      .filter((a) => (a.siswa_id || a.nama_siswa) === (siswa.siswa_id || siswa.nama))
      .sort((a, b) => (a.tanggal > b.tanggal ? -1 : 1));
  }, [siswa, absensi]);

  return (
    <Dialog open={!!siswa} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{siswa?.nama || 'Riwayat Kehadiran'}</DialogTitle>
          <DialogDescription>
            {siswa?.nama_kelas || '-'} · {jumlahHari} hari efektif pada periode terpilih
          </DialogDescription>
        </DialogHeader>

        {siswa && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Sakit', val: siswa.Sakit, cls: 'text-blue-600' },
                { label: 'Izin', val: siswa.Izin, cls: 'text-amber-600' },
                { label: 'Alfa', val: siswa.Alfa, cls: 'text-red-600' },
                { label: '% Hadir', val: formatPct(siswa.pct), cls: 'text-emerald-600' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 p-2 text-center">
                  <p className={`text-base font-bold leading-none ${s.cls}`}>{s.val}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
              {records.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Tidak ada catatan ketidakhadiran</p>
              ) : records.map((r) => (
                <div key={`${r.id || `${r.tanggal}-${r.status}`}`} className="flex items-center gap-2 px-3 py-2">
                  <span className="text-xs text-slate-600 flex-1">{labelTanggal(r.tanggal)}</span>
                  {r.jenis_absensi && r.jenis_absensi !== 'Kehadiran' && (
                    <span className="text-[10px] text-slate-400">{r.jenis_absensi}</span>
                  )}
                  <Badge className={`text-[10px] border ${BADGE[r.status] || 'bg-slate-50 text-slate-600'}`}>
                    {r.status}
                  </Badge>
                  {r.keterangan && (
                    <span className="text-[10px] text-slate-400 truncate max-w-[40%]">{r.keterangan}</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}