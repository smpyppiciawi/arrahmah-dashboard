import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, SlidersHorizontal } from 'lucide-react';
import { HARI_FILTER, BULAN } from '@/lib/agendaUtils';

export default function AgendaFilters({ value, onChange, tahunAjaranOptions = [] }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3 text-slate-500">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Cari &amp; Filter Daftar Agenda</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cari kelas, mapel, materi, atau guru..."
              value={value.q}
              onChange={(e) => set({ q: e.target.value })}
              className="pl-9"
            />
          </div>

          <Select value={value.hari} onValueChange={(v) => set({ hari: v })}>
            <SelectTrigger><SelectValue placeholder="Hari" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Hari</SelectItem>
              {HARI_FILTER.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={value.minggu} onValueChange={(v) => set({ minggu: v })}>
            <SelectTrigger><SelectValue placeholder="Minggu" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Minggu</SelectItem>
              {[1, 2, 3, 4].map((m) => <SelectItem key={m} value={String(m)}>Minggu ke-{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={value.bulan} onValueChange={(v) => set({ bulan: v })}>
            <SelectTrigger><SelectValue placeholder="Bulan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {BULAN.map((b, i) => <SelectItem key={b} value={String(i + 1)}>{b}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={value.tahunAjaran} onValueChange={(v) => set({ tahunAjaran: v })}>
            <SelectTrigger><SelectValue placeholder="Tahun Ajaran" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun Ajaran</SelectItem>
              {tahunAjaranOptions.map((ta) => <SelectItem key={ta} value={ta}>{ta}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}