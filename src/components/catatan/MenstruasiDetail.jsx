import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Heart, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, parseISO, isSameDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const HARI_LABEL = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function MenstruasiDetail({ siswa, onClose }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Objek siswa dari daftar rekap memakai siswa_id (bukan id) — wajib ditangani agar riwayat termuat
  const siswaId = siswa?.siswa_id || siswa?.id;

  useEffect(() => {
    if (!siswaId) return;
    setLoading(true);
    base44.entities.Menstruasi.filter({ siswa_id: siswaId })
      .then(data => { setRecords(data || []); setLoading(false); })
      .catch(() => setLoading(false));

    const unsubscribe = base44.entities.Menstruasi.subscribe((event) => {
      if (event.data?.siswa_id === siswaId) {
        base44.entities.Menstruasi.filter({ siswa_id: siswaId }).then(d => setRecords(d || []));
      }
    });
    return unsubscribe;
  }, [siswaId]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOfWeek = getDay(startOfMonth(currentMonth));

  const haidDatesInMonth = useMemo(() => {
    return records
      .map(r => parseISO(r.tanggal))
      .filter(d => d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear());
  }, [records, currentMonth]);

  const isHaidDay = (day) => haidDatesInMonth.some(d => isSameDay(d, day));

  // Compute menstrual periods (consecutive days)
  const periods = useMemo(() => {
    if (haidDatesInMonth.length === 0) return [];
    const sorted = [...haidDatesInMonth].sort((a, b) => a - b);
    const groups = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        groups[groups.length - 1].push(curr);
      } else {
        groups.push([curr]);
      }
    }
    return groups.map(g => ({
      start: g[0],
      end: g[g.length - 1],
      duration: g.length,
    }));
  }, [haidDatesInMonth]);

  const totalHaidDays = haidDatesInMonth.length;
  const hasLongPeriod = periods.some(p => p.duration > 8);
  const hasShortPeriod = periods.some(p => p.duration < 3);
  const healthStatus = totalHaidDays === 0 ? null : (hasLongPeriod ? 'perlu_perhatian' : 'normal');

  // Riwayat pencatatan seluruh bulan (tanggal unik, terbaru lebih dulu)
  const riwayat = useMemo(() => {
    const seen = new Set();
    return [...records]
      .filter(r => r.tanggal)
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : 0))
      .filter(r => {
        if (seen.has(r.tanggal)) return false;
        seen.add(r.tanggal);
        return true;
      });
  }, [records]);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Riwayat Menstruasi
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 bg-pink-50 rounded-lg mb-4">
          <p className="font-semibold text-slate-700">{siswa?.nama_siswa || siswa?.nama}</p>
          <p className="text-xs text-slate-500">NIS: {siswa?.nis || '-'} • Kelas: {siswa?.nama_kelas || '-'}</p>
        </div>

        {/* Health Status Badge */}
        {healthStatus && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            healthStatus === 'normal' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {healthStatus === 'normal' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <div>
              <p className="font-semibold text-sm">
                {healthStatus === 'normal' ? 'Menstruasi Normal' : 'Perlu Perhatian'}
              </p>
              <p className="text-xs">
                {healthStatus === 'normal'
                  ? 'Durasi menstruasi 3-8 hari (dalam rentang normal)'
                  : 'Durasi menstruasi melebihi 8 hari — disarankan konsultasi'}
              </p>
            </div>
          </div>
        )}

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-slate-700">
            {format(currentMonth, 'MMMM yyyy', { locale: idLocale })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {HARI_LABEL.map(h => (
            <div key={h} className="text-center text-xs font-medium text-slate-400 py-1">{h}</div>
          ))}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {monthDays.map(day => {
            const haid = isHaidDay(day);
            const today = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`aspect-square flex items-center justify-center rounded-lg text-sm ${
                  haid
                    ? 'bg-pink-500 text-white font-semibold shadow-sm shadow-pink-200'
                    : today
                    ? 'ring-1 ring-pink-300 text-pink-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 bg-pink-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-pink-600">{totalHaidDays}</p>
              <p className="text-xs text-slate-500">Total Hari Haid</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-purple-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{periods.length}</p>
              <p className="text-xs text-slate-500">Periode</p>
            </CardContent>
          </Card>
        </div>

        {/* Period Details */}
        {periods.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Detail Periode</p>
            {periods.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">
                  {format(p.start, 'd MMM', { locale: idLocale })}
                  {p.duration > 1 && ` - ${format(p.end, 'd MMM', { locale: idLocale })}`}
                </div>
                <Badge className={p.duration > 8 ? 'bg-amber-100 text-amber-700' : p.duration >= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                  {p.duration} hari
                </Badge>
              </div>
            ))}
          </div>
        )}

        {totalHaidDays === 0 && !loading && (
          <p className="text-center text-slate-400 text-sm">
            Tidak ada catatan menstruasi pada bulan ini
          </p>
        )}

        {/* Riwayat Pencatatan — seluruh catatan, lintas bulan */}
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Riwayat Pencatatan</p>
            <Badge className="bg-slate-100 text-slate-600 text-[10px]">{riwayat.length} catatan</Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuat riwayat...
            </div>
          ) : riwayat.length === 0 ? (
            <p className="text-center py-4 text-slate-400 text-sm">Belum ada catatan menstruasi</p>
          ) : (
            <div className="max-h-48 overflow-y-auto overscroll-contain divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {riwayat.map(r => (
                <div key={r.id || r.tanggal} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                    <Heart className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                    <span className="truncate">{format(parseISO(r.tanggal), 'EEEE, d MMMM yyyy', { locale: idLocale })}</span>
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">{r.nama_kelas || siswa?.nama_kelas || '-'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}