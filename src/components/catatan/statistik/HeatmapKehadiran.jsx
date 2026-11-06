import React, { useEffect, useMemo, useState } from 'react';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, parseISO, startOfMonth, startOfWeek,
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bulatPct, formatPct, labelTanggal } from '@/lib/kehadiranUtils';

const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// Ramp persentase kehadiran (makin hijau makin tinggi)
const bandPct = (pct) => {
  if (pct >= 98) return 'bg-emerald-600 border-emerald-600 text-white';
  if (pct >= 95) return 'bg-emerald-500 border-emerald-500 text-white';
  if (pct >= 90) return 'bg-emerald-200 border-emerald-200 text-emerald-900';
  if (pct >= 80) return 'bg-amber-200 border-amber-200 text-amber-900';
  return 'bg-rose-300 border-rose-300 text-rose-900';
};

const LEGENDA = [
  { label: '<80', cls: 'bg-rose-300 border-rose-300' },
  { label: '80–89', cls: 'bg-amber-200 border-amber-200' },
  { label: '90–94', cls: 'bg-emerald-200 border-emerald-200' },
  { label: '95–97', cls: 'bg-emerald-500 border-emerald-500' },
  { label: '≥98', cls: 'bg-emerald-600 border-emerald-600' },
  { label: 'Libur', cls: 'bg-slate-100 border-slate-200' },
];

export default function HeatmapKehadiran({
  perTanggal = new Map(), hariEfektif = new Set(), hariLibur = new Set(),
  tanggalMulai, tanggalAkhir, siswaAktif = 0, onSelectDate,
}) {
  const bulanAwal = useMemo(() => startOfMonth(parseISO(tanggalMulai)), [tanggalMulai]);
  const bulanAkhir = useMemo(() => startOfMonth(parseISO(tanggalAkhir)), [tanggalAkhir]);
  const [bulan, setBulan] = useState(bulanAwal);

  // Heatmap selalu mengikuti periode filter
  useEffect(() => { setBulan(bulanAwal); }, [bulanAwal]);

  const cells = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(bulan), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(bulan), { weekStartsOn: 1 }),
  }), [bulan]);

  const bisaMundur = bulan > bulanAwal;
  const bisaMaju = bulan < bulanAkhir;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 md:p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <CalendarDays className="w-4 h-4 text-emerald-600" /> Kalender Heatmap Kehadiran
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Persentase kehadiran per tanggal efektif · klik tanggal untuk melihat rincian siswa
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={!bisaMundur}
            onClick={() => setBulan(addMonths(bulan, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-semibold text-slate-700 w-32 text-center">
            {format(bulan, 'MMMM yyyy', { locale: idLocale })}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={!bisaMaju}
            onClick={() => setBulan(addMonths(bulan, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-1.5">
        {HARI.map((h) => (
          <div key={h} className="text-[10px] font-semibold text-slate-400 text-center py-1">{h}</div>
        ))}
        {cells.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dalamBulan = isSameMonth(day, bulan);
          const dalamRentang = key >= tanggalMulai && key <= tanggalAkhir;
          const tampil = dalamBulan && dalamRentang;
          const libur = hariLibur.has(key);
          const efektif = hariEfektif.has(key);
          const data = efektif ? perTanggal.get(key) : null;

          const cls = !tampil
            ? 'bg-white border-slate-100 text-slate-300'
            : libur
              ? 'bg-slate-100 border-slate-200 text-slate-400'
              : data
                ? `${bandPct(data.pct)} hover:ring-2 hover:ring-emerald-300 hover:scale-[1.04]`
                : 'bg-slate-50 border-slate-200 text-slate-300';

          return (
            <button
              key={key}
              type="button"
              disabled={!data}
              onClick={() => onSelectDate(key)}
              title={
                !tampil
                  ? format(day, 'd MMM yyyy', { locale: idLocale })
                  : libur
                    ? `${format(day, 'd MMM yyyy', { locale: idLocale })} · Libur`
                    : data
                      ? `${labelTanggal(key)} · ${formatPct(data.pct)} hadir (${data.Hadir}/${siswaAktif}) · Sakit ${data.Sakit} · Izin ${data.Izin} · Alfa ${data.Alfa}`
                      : `${format(day, 'd MMM yyyy', { locale: idLocale })} · belum ada entri absensi`
              }
              className={`relative rounded-lg border h-12 md:h-16 p-1.5 text-left transition-all ${cls}`}
            >
              <span className="text-[10px] font-semibold leading-none">{format(day, 'd')}</span>
              {tampil && libur && (
                <span className="absolute bottom-1 left-1.5 text-[9px] leading-none">Libur</span>
              )}
              {data && (
                <span className="absolute bottom-1 right-1.5 text-[11px] font-bold leading-none tabular-nums">
                  {bulatPct(data.pct)}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
        <span className="text-[10px] text-slate-400 mr-1">Kehadiran:</span>
        {LEGENDA.map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span className={`w-3.5 h-3.5 rounded border ${l.cls}`} />
            <span className="text-[10px] text-slate-500">{l.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}