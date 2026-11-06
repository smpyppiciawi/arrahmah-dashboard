import React, { useEffect, useMemo, useState } from 'react';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, parseISO, startOfMonth, startOfWeek,
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// Ramp intensitas ketidakhadiran (Izin + Sakit + Alfa) per hari
const LEVELS = [
  { min: 10, cls: 'bg-rose-600 border-rose-600 text-white' },
  { min: 6, cls: 'bg-rose-400 border-rose-400 text-white' },
  { min: 3, cls: 'bg-rose-200 border-rose-200 text-rose-900' },
  { min: 1, cls: 'bg-rose-100 border-rose-100 text-rose-700' },
  { min: 0, cls: 'bg-slate-50 border-slate-200 text-slate-400' },
];
const levelClass = (total) => (LEVELS.find((l) => total >= l.min) || LEVELS[LEVELS.length - 1]).cls;

const LEGENDA = [
  { label: '0', cls: 'bg-slate-50 border-slate-200' },
  { label: '1–2', cls: 'bg-rose-100 border-rose-100' },
  { label: '3–5', cls: 'bg-rose-200 border-rose-200' },
  { label: '6–9', cls: 'bg-rose-400 border-rose-400' },
  { label: '10+', cls: 'bg-rose-600 border-rose-600' },
];

export default function HeatmapKehadiran({ absensiUnik = [], tanggalMulai, tanggalAkhir, onSelectDate }) {
  const bulanAwal = useMemo(() => startOfMonth(parseISO(tanggalMulai)), [tanggalMulai]);
  const bulanAkhir = useMemo(() => startOfMonth(parseISO(tanggalAkhir)), [tanggalAkhir]);
  const [bulan, setBulan] = useState(bulanAwal);

  // Heatmap selalu mengikuti periode filter
  useEffect(() => { setBulan(bulanAwal); }, [bulanAwal]);

  const perTanggal = useMemo(() => {
    const map = new Map();
    absensiUnik.forEach((a) => {
      if (!a.tanggal) return;
      if (!map.has(a.tanggal)) map.set(a.tanggal, { Izin: 0, Sakit: 0, Alfa: 0, total: 0 });
      const row = map.get(a.tanggal);
      if (row[a.status] !== undefined) row[a.status] += 1;
      row.total += 1;
    });
    return map;
  }, [absensiUnik]);

  const cells = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(bulan), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(bulan), { weekStartsOn: 1 }),
  }), [bulan]);

  const hariTerburuk = useMemo(() => {
    let best = null;
    perTanggal.forEach((v, k) => {
      if (k < tanggalMulai || k > tanggalAkhir) return;
      if (!best || v.total > best.total) best = { tanggal: k, ...v };
    });
    return best && best.total > 0 ? best : null;
  }, [perTanggal, tanggalMulai, tanggalAkhir]);

  const bisaMundur = bulan > bulanAwal;
  const bisaMaju = bulan < bulanAkhir;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Flame className="w-4 h-4 text-rose-500" /> Kalender Heatmap Ketidakhadiran
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Klik tanggal untuk melihat rincian siswa pada hari tersebut</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            disabled={!bisaMundur}
            onClick={() => setBulan(addMonths(bulan, -1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-semibold text-slate-700 w-32 text-center">
            {format(bulan, 'MMMM yyyy', { locale: idLocale })}
          </span>
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            disabled={!bisaMaju}
            onClick={() => setBulan(addMonths(bulan, 1))}
          >
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
          const aktif = dalamBulan && dalamRentang;
          const data = perTanggal.get(key);
          const total = data?.total || 0;
          return (
            <button
              key={key}
              type="button"
              disabled={!aktif}
              onClick={() => onSelectDate(key)}
              title={data
                ? `${format(day, 'd MMM yyyy', { locale: idLocale })} · Izin ${data.Izin} · Sakit ${data.Sakit} · Alfa ${data.Alfa}`
                : format(day, 'd MMM yyyy', { locale: idLocale })}
              className={`relative rounded-lg border h-12 md:h-14 p-1.5 text-left transition-all ${
                aktif ? `${levelClass(total)} hover:ring-2 hover:ring-rose-300 hover:scale-[1.04]` : 'bg-white border-slate-100 text-slate-300'
              } ${dalamBulan ? '' : 'opacity-40'}`}
            >
              <span className="text-[10px] font-semibold leading-none">{format(day, 'd')}</span>
              {total > 0 && (
                <span className="absolute bottom-1.5 right-1.5 text-sm font-bold leading-none">{total}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 mr-1">Intensitas:</span>
          {LEGENDA.map((l) => (
            <span key={l.label} className="flex items-center gap-1">
              <span className={`w-3.5 h-3.5 rounded border ${l.cls}`} />
              <span className="text-[10px] text-slate-500">{l.label}</span>
            </span>
          ))}
        </div>
        {hariTerburuk && (
          <button
            type="button"
            onClick={() => onSelectDate(hariTerburuk.tanggal)}
            className="text-[11px] text-slate-500 hover:text-rose-600 transition-colors"
          >
            Terbanyak: <b className="text-slate-700">{format(parseISO(hariTerburuk.tanggal), 'd MMM', { locale: idLocale })}</b> · {hariTerburuk.total} kejadian
          </button>
        )}
      </div>
    </div>
  );
}