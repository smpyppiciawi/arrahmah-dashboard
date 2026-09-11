import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isSameMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const KATEGORI_COLOR = {
  'Hari Libur Nasional': 'bg-red-100 text-red-700',
  'Libur Sekolah': 'bg-orange-100 text-orange-700',
  'Ujian': 'bg-purple-100 text-purple-700',
  'Kegiatan Sekolah': 'bg-blue-100 text-blue-700',
  'Penerimaan Rapor': 'bg-emerald-100 text-emerald-700',
  'Kegiatan Kesiswaan': 'bg-cyan-100 text-cyan-700',
  'Lainnya': 'bg-slate-100 text-slate-700',
};

export default function KalenderDashboardTab() {
  const [month, setMonth] = useState(new Date());
  const { data: events = [] } = useQuery({ queryKey: ['kalender'], queryFn: () => base44.entities.KalenderAkademik.list('-tanggal_mulai') });
  const monthEvents = useMemo(() => (events || []).filter(e => { try { return isSameMonth(parseISO(e.tanggal_mulai), month); } catch { return false; } }).sort((a, b) => a.tanggal_mulai.localeCompare(b.tanggal_mulai)), [events, month]);

  const prev = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const next = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const isCurrentMonth = isSameMonth(month, new Date());

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Kalender Akademik</h3>
            {!isCurrentMonth && <Badge className="bg-slate-100 text-slate-600">Bulan lain (lihat saja)</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={prev}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-xs font-medium text-slate-700 w-32 text-center">{format(month, 'MMMM yyyy', { locale: idLocale })}</span>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={next}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-2">Menampilkan kegiatan bulan aktif. Geser bulan untuk melihat kegiatan lain (hanya lihat, tidak dapat menambah).</p>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {monthEvents.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">Tidak ada kegiatan pada bulan ini</p>
          ) : monthEvents.map(ev => (
            <div key={ev.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <div className="flex flex-col items-center justify-center min-w-[42px]">
                <span className="text-lg font-bold text-slate-800">{format(parseISO(ev.tanggal_mulai), 'd')}</span>
                <span className="text-[10px] text-slate-500 uppercase">{format(parseISO(ev.tanggal_mulai), 'MMM', { locale: idLocale })}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{ev.judul}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-[10px] ${KATEGORI_COLOR[ev.kategori] || KATEGORI_COLOR['Lainnya']}`}>{ev.kategori || 'Lainnya'}</Badge>
                </div>
                {ev.keterangan && <p className="text-[10px] text-slate-500 mt-1">{ev.keterangan}</p>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}