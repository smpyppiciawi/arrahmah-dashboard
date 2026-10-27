import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BULAN, HARI_FILTER } from '@/lib/agendaUtils';
import { CalendarRange } from 'lucide-react';

const MINGGU = [1, 2, 3, 4];

export default function AgendaPeriodeFilter({ periode, onBulanChange, onMingguChange, onHariChange }) {
  const tahunIni = new Date().getFullYear();
  const daftarTahun = [tahunIni - 2, tahunIni - 1, tahunIni, tahunIni + 1, tahunIni + 2];
  if (!daftarTahun.includes(periode.tahun)) daftarTahun.push(periode.tahun);
  daftarTahun.sort();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-500">
        <CalendarRange className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">Periode Jadwal</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select
          value={String(periode.bulan)}
          onValueChange={(v) => onBulanChange(Number(v), periode.tahun)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Bulan" />
          </SelectTrigger>
          <SelectContent>
            {BULAN.map((nama, i) => (
              <SelectItem key={nama} value={String(i + 1)}>{nama}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(periode.tahun)}
          onValueChange={(v) => onBulanChange(periode.bulan, Number(v))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tahun" />
          </SelectTrigger>
          <SelectContent>
            {daftarTahun.map((th) => (
              <SelectItem key={th} value={String(th)}>{th}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Pilih Minggu</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MINGGU.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMingguChange(m)}
              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                periode.minggu === m
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              Minggu {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Pilih Hari</p>
        <div className="grid grid-cols-5 gap-1.5">
          {HARI_FILTER.map((hari) => (
            <button
              key={hari}
              type="button"
              onClick={() => onHariChange(hari)}
              className={`rounded-lg border px-1 py-2 text-xs font-semibold transition ${
                periode.hari === hari
                  ? 'border-indigo-200 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              {hari.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}