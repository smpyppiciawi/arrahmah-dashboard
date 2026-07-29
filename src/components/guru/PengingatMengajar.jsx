import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Bell, BookOpen, Building, Clock, Zap } from 'lucide-react';

const PengingatMengajarContext = createContext({ enabled: true, toggle: () => {} });

export function PengingatMengajarProvider({ children }) {
  const { user } = useAuth();
  const isGuru = user?.role === 'guru';
  const [enabled, setEnabled] = useState(() => localStorage.getItem('pengingat_mengajar') !== 'false');

  const toggle = () => setEnabled(prev => {
    const next = !prev;
    localStorage.setItem('pengingat_mengajar', String(next));
    return next;
  });

  return (
    <PengingatMengajarContext.Provider value={{ enabled, toggle }}>
      {children}
      {isGuru && <PengingatMengajarPopup enabled={enabled} />}
    </PengingatMengajarContext.Provider>
  );
}

export const usePengingatMengajar = () => useContext(PengingatMengajarContext);

const pad = (n) => String(n).padStart(2, '0');
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function PengingatMengajarPopup({ enabled }) {
  const { user } = useAuth();
  const [activeReminder, setActiveReminder] = useState(null);
  const triggeredRef = useRef(new Set());

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
    staleTime: 5 * 60 * 1000,
  });
  const guruData = guruList.find(g => g.email === user?.email);

  const { data: jadwalList = [] } = useQuery({
    queryKey: ['jadwal-mengajar', guruData?.id],
    queryFn: () => base44.entities.JadwalPelajaran.filter({ guru_id: guruData.id }),
    enabled: !!guruData?.id,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!enabled || !guruData || jadwalList.length === 0) return;
    const timer = setInterval(() => {
      const now = new Date();
      const dayName = DAY_NAMES[now.getDay()];
      const curHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const dateStr = now.toDateString();
      jadwalList.forEach(j => {
        if (j.hari !== dayName || !j.jam_mulai) return;
        const [h, m] = j.jam_mulai.split(':').map(Number);
        const remind = new Date();
        remind.setHours(h, m - 5, 0, 0);
        const remindHM = `${pad(remind.getHours())}:${pad(remind.getMinutes())}`;
        const key = `${j.id}-${dateStr}`;
        if (curHM === remindHM && !triggeredRef.current.has(key)) {
          triggeredRef.current.add(key);
          setActiveReminder(j);
        }
      });
      triggeredRef.current.forEach(k => { if (!k.endsWith(dateStr)) triggeredRef.current.delete(k); });
    }, 1000);
    return () => clearInterval(timer);
  }, [enabled, guruData, jadwalList]);

  if (!activeReminder) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-emerald-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border-4 border-emerald-500 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bell className="w-10 h-10 text-emerald-500 animate-bounce" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 rounded-full mb-3">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700 uppercase">Pengingat Mengajar</span>
        </div>
        <p className="text-sm text-emerald-600 font-medium">⚠ 5 menit lagi waktunya mengajar!</p>
        <p className="text-4xl font-mono font-bold text-emerald-600 mt-3 mb-4">{activeReminder.jam_mulai}</p>
        <div className="space-y-2 mb-5 text-left bg-emerald-50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-sm text-slate-600">Mapel:</span>
            <span className="font-semibold text-slate-800 text-sm">{activeReminder.mapel || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-sm text-slate-600">Kelas:</span>
            <span className="font-semibold text-slate-800 text-sm">{activeReminder.nama_kelas || '-'}</span>
          </div>
        </div>
        <Button onClick={() => setActiveReminder(null)} size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg h-12">
          <Zap className="w-5 h-5 mr-2" /> Gaskeuun
        </Button>
      </div>
    </div>
  );
}