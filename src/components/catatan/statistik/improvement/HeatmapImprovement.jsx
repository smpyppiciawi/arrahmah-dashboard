import React, { useMemo, useState } from 'react';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth,
  parseISO, startOfMonth, startOfWeek,
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import KartuStatistik from '@/components/catatan/statistik/KartuStatistik';
import { todayWIB } from '@/lib/wib.js';

const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const LEGENDA = [
  { label: 'Rendah', cls: 'bg-emerald-100 border-emerald-100' },
  { label: 'Sedang', cls: 'bg-emerald-300 border-emerald-300' },
  { label: 'Tinggi', cls: 'bg-emerald-400 border-emerald-400' },
  { label: 'Tertinggi', cls: 'bg-emerald-600 border-emerald-600' },
  { label: 'Libur', cls: 'bg-slate-100 border-slate-200' },
];

export default function HeatmapImprovement({ perTanggal = [], tanggalMulai, tanggalAkhir, onPilih, hariLibur = new Set() }) {
  const bulanList = useMemo(() => {
    if (!tanggalMulai || !tanggalAkhir) return [];
    const out = [];
    let cur = startOfMonth(parseISO(tanggalMulai));
    const batas = startOfMonth(parseISO(tanggalAkhir));
    let guard = 0;
    while (cur <= batas && guard < 36) {
      out.push(cur);
      cur = addMonths(cur, 1);
      guard += 1;
    }
    return out;
  }, [tanggalMulai, tanggalAkhir]);

  const dataMap = useMemo(() => new Map(perTanggal.map((d) => [d.tanggal, d])), [perTanggal]);

  const [idx, setIdx] = useState(() => {
    const kunci = todayWIB().slice(0, 7);
    const i = bulanList.findIndex((b) => format(b, 'yyyy-MM') === kunci);
    return i >= 0 ? i : Math.max(bulanList.length - 1, 0);
  });
  const [hover, setHover] = useState(null);

  if (!bulanList.length) return null;
  const posisi = Math.min(idx, bulanList.length - 1);
  const bulan = bulanList[posisi];

  const hari = eachDayOfInterval({
    start: startOfWeek(startOfMonth(bulan), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(bulan), { weekStartsOn: 1 }),
  });

  const maks = Math.max(
    ...hari
      .filter((d) => isSameMonth(d, bulan))
      .map((d) => dataMap.get(format(d, 'yyyy-MM-dd'))?.kejadian || 0),
    0
  );

  const band = (n) => {
    if (!n) return 'bg-slate-50 border-slate-100 text-slate-300';
    const rasio = maks ? n / maks : 0;
    if (rasio > 0.75) return 'bg-emerald-600 border-emerald-600 text-white';
    if (rasio > 0.5) return 'bg-emerald-400 border-emerald-400 text-white';
    if (rasio > 0.25) return 'bg-emerald-300 border-emerald-300 text-emerald-900';
    return 'bg-emerald-100 border-emerald-100 text-emerald-700';
  };

  return (
    <KartuStatistik
      title="Intensitas Harian Improvement"
      icon={CalendarDays}
      sub="Jumlah kegiatan improvement per tanggal — klik tanggal untuk rincian"
      action={(
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIdx(Math.max(posisi - 1, 0))}
            disabled={posisi === 0}
            className="p-1 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-semibold text-slate-600 min-w-[74px] text-center">
            {format(bulan, 'MMM yyyy', { locale: idLocale })}
          </span>
          <button
            type="button"
            onClick={() => setIdx(Math.min(posisi + 1, bulanList.length - 1))}
            disabled={posisi === bulanList.length - 1}
            className="p-1 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    >
      <div className="grid grid-cols-7 gap-1">
        {HARI.map((h) => (
          <div key={h} className="text-center text-[10px] font-semibold text-slate-400 pb-1">{h}</div>
        ))}
        {hari.map((d) => {
          const kunci = format(d, 'yyyy-MM-dd');
          const info = dataMap.get(kunci);
          const dalamBulan = isSameMonth(d, bulan);
          const dalamFilter = kunci >= tanggalMulai && kunci <= tanggalAkhir;
          if (!dalamBulan || !dalamFilter) {
            return <div key={kunci} className="aspect-square rounded-md" />;
          }
          const kejadian = info?.kejadian || 0;
          const poin = info?.poin || 0;
          const libur = hariLibur.has(kunci);
          return (
            <button
              key={kunci}
              type="button"
              onMouseEnter={() => setHover({ tanggal: d, kejadian, poin })}
              onFocus={() => setHover({ tanggal: d, kejadian, poin })}
              onClick={() => info && onPilih && onPilih(kunci)}
              className={`aspect-square rounded-md border flex items-center justify-center text-[10px] font-semibold transition-transform hover:scale-[1.06] ${
                libur ? 'bg-slate-100 border-slate-200 text-slate-400' : band(kejadian)
              }`}
              title={`${format(d, 'EEE, dd MMM', { locale: idLocale })} · ${kejadian} kejadian · ${poin} poin${libur ? ' · Libur' : ''}`}
            >
              {format(d, 'd')}
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 min-h-[28px] flex items-center">
        {hover
          ? <span><span className="font-semibold text-slate-700">{format(hover.tanggal, 'EEE, dd MMM', { locale: idLocale })}</span>{` · ${hover.kejadian} kejadian · ${hover.poin} poin`}</span>
          : <span className="text-slate-400">Arahkan kursor ke tanggal untuk melihat jumlah kejadian dan total poin</span>}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        {LEGENDA.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1 text-[10px] text-slate-400">
            <span className={`w-2.5 h-2.5 rounded-sm border ${l.cls}`} />
            {l.label}
          </span>
        ))}
      </div>
    </KartuStatistik>
  );
}