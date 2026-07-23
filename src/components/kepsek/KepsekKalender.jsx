import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CalendarDays, Mail, Clock } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const KATEGORI_COLOR = {
  'Hari Libur Nasional': { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
  'Libur Sekolah': { bg: 'bg-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-400' },
  'Ujian': { bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
  'Kegiatan Sekolah': { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
  'Penerimaan Rapor': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  'Kegiatan Kesiswaan': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', dot: 'bg-cyan-400' },
  'Lainnya': { bg: 'bg-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-400' },
};

export default function KepsekKalender({ events, onEmail, today, isDark = true }) {
  const c = isDark ? {
    container: 'bg-slate-800/50 backdrop-blur border border-slate-700',
    text: 'text-slate-100', textMuted: 'text-slate-400', textSubtle: 'text-slate-500',
    border: 'border-slate-700/50',
  } : {
    container: 'bg-white border border-slate-200 shadow-sm',
    text: 'text-slate-800', textMuted: 'text-slate-500', textSubtle: 'text-slate-400',
    border: 'border-slate-200',
  };

  const todayDate = new Date();
  const next7Days = new Date();
  next7Days.setDate(next7Days.getDate() + 7);

  const upcoming = events
    .filter(ev => { const evDate = parseISO(ev.tanggal_mulai); return evDate >= todayDate && evDate <= next7Days; })
    .sort((a, b) => a.tanggal_mulai.localeCompare(b.tanggal_mulai));

  const h2Events = upcoming.filter(ev => differenceInCalendarDays(parseISO(ev.tanggal_mulai), todayDate) === 2);

  return (
    <div className={`rounded-2xl ${c.container} p-3 md:p-4 h-full`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`${c.text} font-bold text-sm flex items-center gap-2`}>
          <CalendarDays className="w-4 h-4 text-indigo-400" /> Kalender Akademik
        </h3>
        {h2Events.length > 0 && (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full animate-pulse">
            H-2: {h2Events.length} Kegiatan
          </span>
        )}
      </div>

      {h2Events.length > 0 && (
        <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
          <p className="text-amber-400 text-xs font-bold mb-1">⚡ Notifikasi H-2</p>
          {h2Events.map((ev, i) => (
            <p key={i} className={`${c.textMuted} text-xs`}>{ev.judul} — {format(parseISO(ev.tanggal_mulai), 'EEEE, d MMM', { locale: idLocale })}</p>
          ))}
          <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs text-amber-400 hover:bg-amber-500/20 gap-1 p-0"
            onClick={() => {
              const body = h2Events.map(e => `Kegiatan: ${e.judul}\nTanggal: ${format(parseISO(e.tanggal_mulai), 'd MMMM yyyy', { locale: idLocale })}\nKategori: ${e.kategori}${e.keterangan ? `\nKeterangan: ${e.keterangan}` : ''}`).join('\n\n');
              onEmail('Notifikasi H-2: Kegiatan Sekolah Lusa', `Pengingat: Besok lusa ada kegiatan sekolah:\n\n${body}`);
            }}>
            <Mail className="w-3 h-3" /> Kirim Notifikasi Email
          </Button>
        </div>
      )}

      <div className="space-y-2 max-h-[250px] md:max-h-[350px] overflow-y-auto pr-1">
        {upcoming.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className={`w-8 h-8 ${c.textSubtle} mx-auto mb-2`} />
            <p className={`${c.textMuted} text-xs`}>Tidak ada kegiatan dalam 7 hari ke depan</p>
          </div>
        ) : (
          upcoming.map((ev, idx) => {
            const days = differenceInCalendarDays(parseISO(ev.tanggal_mulai), todayDate);
            const kat = KATEGORI_COLOR[ev.kategori] || KATEGORI_COLOR['Lainnya'];
            return (
              <motion.div key={idx} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className={`rounded-xl ${kat.bg} border ${c.border} p-3 flex items-start gap-3`}>
                <div className="flex flex-col items-center justify-center min-w-[45px]">
                  <span className={`text-2xl font-bold ${kat.text}`}>{format(parseISO(ev.tanggal_mulai), 'd')}</span>
                  <span className={`text-[10px] ${kat.text} uppercase`}>{format(parseISO(ev.tanggal_mulai), 'MMM', { locale: idLocale })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`${c.text} text-sm font-medium truncate`}>{ev.judul}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${kat.bg} ${kat.text} font-medium`}>{ev.kategori}</span>
                    <span className={`${c.textMuted} text-[10px] flex items-center gap-0.5`}>
                      <Clock className="w-2.5 h-2.5" /> {days === 0 ? 'Hari ini' : days === 1 ? 'Besok' : `H-${days}`}
                    </span>
                  </div>
                  {ev.keterangan && <p className={`${c.textSubtle} text-[10px] mt-1 truncate`}>{ev.keterangan}</p>}
                </div>
                <div className={`w-2 h-2 rounded-full ${kat.dot} mt-1 flex-shrink-0`} />
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}