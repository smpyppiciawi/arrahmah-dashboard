import React from 'react';
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, CalendarDays } from 'lucide-react';

export default function AgendaFilters({ value, onChange, tanggal, onTanggalChange }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-slate-500">
        <SlidersHorizontal className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">Cari &amp; Filter Jadwal Mengajar</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari kelas, mapel, atau guru..."
            value={value.q}
            onChange={(e) => set({ q: e.target.value })}
            className="pl-9"
          />
        </div>

        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            type="date"
            value={tanggal}
            onChange={(e) => onTanggalChange(e.target.value)}
            className="pl-9"
            title="Tanggal jadwal mengajar"
          />
        </div>
      </div>
    </div>
  );
}