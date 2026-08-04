import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { UserCheck, BookOpen, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AktivitasHariIni({ absensiPegawaiList, jadwalPelajaranList, guruList, isDark = true }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDayName = format(new Date(), 'EEEE', { locale: idLocale });

  const c = isDark ? {
    card: 'bg-slate-800/50 border border-slate-700',
    text: 'text-slate-100', textMuted: 'text-slate-400', head: 'text-slate-400',
    item: 'bg-slate-700/50 hover:bg-slate-700/70', badgeHadir: 'bg-emerald-500/20 text-emerald-300',
    badgeTerlambat: 'bg-amber-500/20 text-amber-300',
  } : {
    card: 'bg-white border border-slate-200/80 shadow-sm',
    text: 'text-slate-800', textMuted: 'text-slate-500', head: 'text-slate-500',
    item: 'bg-slate-50 hover:bg-slate-100', badgeHadir: 'bg-emerald-100 text-emerald-700',
    badgeTerlambat: 'bg-amber-100 text-amber-700',
  };

  const pegawaiHadir = useMemo(() =>
    absensiPegawaiList
      .filter(a => a.tanggal === todayStr && (a.status === 'Hadir' || a.status === 'Terlambat'))
      .sort((a, b) => (a.nama_pegawai || '').localeCompare(b.nama_pegawai || '')),
    [absensiPegawaiList, todayStr]);

  const jadwalHariIni = useMemo(() =>
    jadwalPelajaranList
      .filter(j => j.hari === todayDayName)
      .sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || '')),
    [jadwalPelajaranList, todayDayName]);

  const jadwalByKelas = useMemo(() => {
    const map = {};
    jadwalHariIni.forEach(j => {
      if (!map[j.nama_kelas]) map[j.nama_kelas] = [];
      map[j.nama_kelas].push(j);
    });
    return map;
  }, [jadwalHariIni]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
      {/* Pegawai Hadir Hari Ini */}
      <div className={`rounded-2xl ${c.card} p-3 md:p-4`}>
        <h3 className={`${c.text} font-bold text-sm mb-3 flex items-center gap-2`}>
          <UserCheck className="w-4 h-4 text-emerald-500" /> Pegawai Hadir Hari Ini ({todayDayName})
          <Badge className="bg-emerald-500/20 text-emerald-400 ml-auto">{pegawaiHadir.length}</Badge>
        </h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {pegawaiHadir.length === 0 ? (
            <p className={`${c.textMuted} text-xs text-center py-8`}>Belum ada data kehadiran pegawai hari ini</p>
          ) : pegawaiHadir.map((p, i) => (
            <div key={i} className={`flex items-center justify-between p-2.5 rounded-xl ${c.item} transition-colors`}>
              <div className="min-w-0">
                <p className={`${c.text} text-sm font-medium truncate`}>{p.nama_pegawai}</p>
                <p className={`${c.textMuted} text-xs truncate`}>{p.jabatan || '-'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <Badge className={p.status === 'Terlambat' ? c.badgeTerlambat : c.badgeHadir}>{p.status}</Badge>
                {p.jam_masuk && <p className={`${c.textMuted} text-[10px] mt-1 flex items-center justify-end gap-0.5`}><Clock className="w-2.5 h-2.5" />{p.jam_masuk}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Jadwal Mengajar Hari Ini */}
      <div className={`rounded-2xl ${c.card} p-3 md:p-4`}>
        <h3 className={`${c.text} font-bold text-sm mb-3 flex items-center gap-2`}>
          <BookOpen className="w-4 h-4 text-indigo-500" /> Jadwal Mengajar Hari Ini ({todayDayName})
          <Badge className="bg-indigo-500/20 text-indigo-400 ml-auto">{jadwalHariIni.length}</Badge>
        </h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {jadwalHariIni.length === 0 ? (
            <p className={`${c.textMuted} text-xs text-center py-8`}>Tidak ada jadwal pelajaran hari ini</p>
          ) : Object.entries(jadwalByKelas).sort().map(([kelas, items]) => (
            <div key={kelas}>
              <p className={`${c.head} text-[10px] font-bold uppercase tracking-wide mb-1 flex items-center gap-1`}>
                <MapPin className="w-3 h-3" /> {kelas}
              </p>
              <div className="space-y-1 mb-2">
                {items.map((j, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${c.item} transition-colors`}>
                    <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                      {(j.jam_mulai || '').substring(0, 5)}-{(j.jam_selesai || '').substring(0, 5)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`${c.text} text-xs font-medium truncate`}>{j.mapel}</p>
                      <p className={`${c.textMuted} text-[10px] truncate`}>{j.nama_guru || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}