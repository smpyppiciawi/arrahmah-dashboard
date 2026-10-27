import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from 'lucide-react';
import { BULAN_CATATAN } from '@/lib/catatanKeuanganUtils';

export default function PeriodeFilter({ bulan, tahun, onBulanChange, onTahunChange }) {
  const tahunIni = new Date().getFullYear();
  const daftarTahun = [tahunIni - 3, tahunIni - 2, tahunIni - 1, tahunIni, tahunIni + 1];
  if (!daftarTahun.includes(tahun)) daftarTahun.push(tahun);
  daftarTahun.sort();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <CalendarDays className="w-4 h-4" /> Periode
      </span>
      <div className="grid grid-cols-2 gap-2 sm:w-72">
        <Select value={String(bulan)} onValueChange={(v) => onBulanChange(Number(v))}>
          <SelectTrigger>
            <SelectValue placeholder="Bulan" />
          </SelectTrigger>
          <SelectContent>
            {BULAN_CATATAN.map((nama, i) => (
              <SelectItem key={nama} value={String(i + 1)}>{nama}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(tahun)} onValueChange={(v) => onTahunChange(Number(v))}>
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
    </div>
  );
}