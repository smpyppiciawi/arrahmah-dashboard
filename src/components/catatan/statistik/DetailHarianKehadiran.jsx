import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { CalendarX2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const STATUS_CLASS = {
  Izin: 'bg-amber-100 text-amber-700',
  Sakit: 'bg-blue-100 text-blue-700',
  Alfa: 'bg-red-100 text-red-700',
};

export default function DetailHarianKehadiran({ tanggal, rows = [], onClose }) {
  const ringkasan = useMemo(() => {
    const perStatus = { Izin: 0, Sakit: 0, Alfa: 0 };
    rows.forEach((r) => { if (perStatus[r.status] !== undefined) perStatus[r.status] += 1; });
    const perKelas = new Map();
    rows.forEach((r) => {
      const k = r.nama_kelas || '-';
      perKelas.set(k, (perKelas.get(k) || 0) + 1);
    });
    return {
      perStatus,
      perKelas: Array.from(perKelas.entries()).sort((a, b) => a[0].localeCompare(b[0], 'id')),
    };
  }, [rows]);

  const terurut = useMemo(() => [...rows].sort(
    (a, b) => (a.nama_kelas || '').localeCompare(b.nama_kelas || '', 'id')
      || (a.nama_siswa || '').localeCompare(b.nama_siswa || '', 'id')
  ), [rows]);

  return (
    <Dialog open={!!tanggal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Kehadiran {tanggal ? format(parseISO(tanggal), 'EEEE, d MMMM yyyy', { locale: idLocale }) : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {['Izin', 'Sakit', 'Alfa'].map((s) => (
            <div key={s} className="rounded-xl border border-slate-200 p-2 text-center">
              <p className="text-[10px] text-slate-500">{s}</p>
              <p className="text-lg font-bold text-slate-800">{ringkasan.perStatus[s]}</p>
            </div>
          ))}
        </div>

        {ringkasan.perKelas.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-medium">Per kelas:</span>
            {ringkasan.perKelas.map(([kelas, jumlah]) => (
              <Badge key={kelas} variant="outline" className="bg-white text-[10px]">{kelas}: {jumlah}</Badge>
            ))}
          </div>
        )}

        <div className="mt-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Rincian Siswa ({terurut.length})
          </h4>
          {terurut.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-8 text-slate-400">
              <CalendarX2 className="w-6 h-6" />
              <p className="text-xs">Tidak ada catatan ketidakhadiran pada tanggal ini</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
              {terurut.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.nama_siswa}</p>
                    <p className="text-[10px] text-slate-400">
                      {r.nis || '-'} · {r.nama_kelas || '-'}{r.jenis_absensi === 'Jumat' ? ' · Absensi Jumat' : ''}
                    </p>
                  </div>
                  <Badge className={`${STATUS_CLASS[r.status] || 'bg-slate-100 text-slate-600'} text-[10px] shrink-0`}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}