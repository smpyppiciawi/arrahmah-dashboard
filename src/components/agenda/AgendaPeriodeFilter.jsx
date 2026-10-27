import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BULAN, HARI_FILTER } from '@/lib/agendaUtils';
import { CalendarRange, CalendarDays } from 'lucide-react';

const MINGGU = [1, 2, 3, 4];

export default function AgendaPeriodeFilter({ periode, onBulanChange, onMingguChange, onHariChange }) {
  const tahunIni = new Date().getFullYear();
  const daftarTahun = [tahunIni - 2, tahunIni - 1, tahunIni, tahunIni + 1, tahunIni + 2];
  if (!daftarTahun.includes(periode.tahun)) daftarTahun.push(periode.tahun);
  daftarTahun.sort();

  // Rentang tanggal tiap minggu mengikuti bulan yang dipilih
  const jumlahHari = new Date(periode.tahun, periode.bulan, 0).getDate();
  const singkatBulan = BULAN[periode.bulan - 1].slice(0, 3);
  const opsiMinggu = MINGGU.map((m) => {
    const awal = (m - 1) * 7 + 1;
    const akhir = m === 4 ? jumlahHari : Math.min(m * 7, jumlahHari);
    return { m, awal, akhir, kosong: awal > jumlahHari };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500">
          <CalendarRange className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Periode Jadwal</span>
        </div>
        <span className="text-[11px] font-medium text-indigo-500">
          {singkatBulan} {periode.tahun}
        </span>
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

      <Select
        value={String(periode.minggu)}
        onValueChange={(v) => onMingguChange(Number(v))}
      >
        <SelectTrigger className="rounded-xl border-slate-200 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <SelectValue placeholder="Pilih Minggu" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {opsiMinggu.map(({ m, awal, akhir, kosong }) => (
            <SelectItem key={m} value={String(m)} disabled={kosong}>
              <span className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Minggu {m}</span>
                <span className="text-xs text-slate-400">
                  {kosong ? 'tidak tersedia' : `${awal}–${akhir} ${singkatBulan}`}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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