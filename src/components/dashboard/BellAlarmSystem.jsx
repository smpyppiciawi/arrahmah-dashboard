import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Plus, Trash2, Volume2, VolumeX, Play, Calendar } from "lucide-react";

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function getDayName() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date().getDay()];
}

export default function BellAlarmSystem() {
  const [now, setNow] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef(null);
  const lastRungRef = useRef({});
  const queryClient = useQueryClient();

  const [newSchedule, setNewSchedule] = useState({
    hari: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
    jam: '',
    label: '',
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: bellSchedules = [] } = useQuery({
    queryKey: ['jadwal-bel'],
    queryFn: () => base44.entities.JadwalBel.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.JadwalBel.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jadwal-bel'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JadwalBel.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jadwal-bel'] }),
  });

  const toggleAktifMutation = useMutation({
    mutationFn: ({ id, aktif }) => base44.entities.JadwalBel.update(id, { aktif }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jadwal-bel'] }),
  });

  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const playBell = () => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let ring = 0; ring < 3; ring++) {
      const start = t + ring * 0.35;
      [1000, 1500].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.25 / (i + 1), start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      });
    }
  };

  // Bell checking logic
  useEffect(() => {
    if (!soundEnabled || bellSchedules.length === 0) return;
    const checkBell = () => {
      const current = new Date();
      const dayName = getDayName();
      const currentHM = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;

      bellSchedules.forEach(schedule => {
        if (!schedule.aktif || !schedule.hari?.includes(dayName)) return;
        const [h, m] = schedule.jam.split(':').map(Number);
        const schedDate = new Date();
        schedDate.setHours(h, m, 0, 0);
        const preDate = new Date(schedDate.getTime() - 5 * 60 * 1000);
        const preHM = `${String(preDate.getHours()).padStart(2, '0')}:${String(preDate.getMinutes()).padStart(2, '0')}`;

        const keyPre = `${schedule.id}-pre-${currentHM}`;
        const keyOn = `${schedule.id}-on-${currentHM}`;

        if (currentHM === preHM && !lastRungRef.current[keyPre]) {
          lastRungRef.current[keyPre] = true;
          playBell();
        }
        if (currentHM === schedule.jam && !lastRungRef.current[keyOn]) {
          lastRungRef.current[keyOn] = true;
          playBell();
        }
      });

      // Clean old keys
      Object.keys(lastRungRef.current).forEach(key => {
        if (!key.includes(currentHM)) delete lastRungRef.current[key];
      });
    };
    const timer = setInterval(checkBell, 1000);
    return () => clearInterval(timer);
  }, [soundEnabled, bellSchedules]);

  const handleToggleHari = (hari) => {
    setNewSchedule(prev => ({
      ...prev,
      hari: prev.hari.includes(hari) ? prev.hari.filter(h => h !== hari) : [...prev.hari, hari],
    }));
  };

  const handleAddSchedule = (e) => {
    e.preventDefault();
    if (newSchedule.hari.length === 0 || !newSchedule.jam) return;
    createMutation.mutate({
      hari: newSchedule.hari,
      jam: newSchedule.jam,
      label: newSchedule.label || 'Bel',
      aktif: true,
    });
    setNewSchedule({ hari: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'], jam: '', label: '' });
  };

  const clockTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const dateString = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            if (!soundEnabled) ensureAudioContext();
          }}
          title={soundEnabled ? 'Matikan Suara Bel' : 'Aktifkan Suara Bel'}
          className={soundEnabled ? 'border-blue-200 text-blue-600' : 'border-slate-200 text-slate-400'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => { setSettingsOpen(true); ensureAudioContext(); }}
          title="Pengaturan Bel"
          className="border-amber-200 text-amber-600 relative"
        >
          <Bell className="w-4 h-4" />
          {bellSchedules.filter(s => s.aktif).length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
              {bellSchedules.filter(s => s.aktif).length}
            </span>
          )}
        </Button>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm shadow-sm">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="font-mono font-bold text-slate-800 tabular-nums text-base">{clockTime}</span>
          <span className="text-slate-500 hidden md:inline">{dateString}</span>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Pengaturan Bel Sekolah
            </DialogTitle>
          </DialogHeader>

          {/* Test Bell */}
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div>
              <p className="text-sm font-medium text-amber-800">Tes Suara Bel</p>
              <p className="text-xs text-amber-600">Pastikan volume perangkat menyala</p>
            </div>
            <Button size="sm" onClick={playBell} className="bg-amber-500 hover:bg-amber-600">
              <Play className="w-4 h-4 mr-1" /> Tes Bel
            </Button>
          </div>

          {/* Add New Schedule */}
          <form onSubmit={handleAddSchedule} className="space-y-3 p-4 border rounded-lg">
            <Label className="text-sm font-semibold">Tambah Jadwal Bel Baru</Label>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Hari</Label>
              <div className="flex flex-wrap gap-1.5">
                {HARI_LIST.map(hari => (
                  <button
                    key={hari}
                    type="button"
                    onClick={() => handleToggleHari(hari)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      newSchedule.hari.includes(hari)
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    {hari.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Jam Bel</Label>
                <Input
                  type="time"
                  value={newSchedule.jam}
                  onChange={(e) => setNewSchedule({ ...newSchedule, jam: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Keterangan</Label>
                <Input
                  value={newSchedule.label}
                  onChange={(e) => setNewSchedule({ ...newSchedule, label: e.target.value })}
                  placeholder="Mis: Jam Masuk"
                />
              </div>
            </div>
            <Button type="submit" size="sm" className="w-full bg-amber-500 hover:bg-amber-600" disabled={createMutation.isPending}>
              <Plus className="w-4 h-4 mr-1" /> Tambah
            </Button>
          </form>

          {/* Existing Schedules */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Jadwal Bel Aktif</Label>
            {bellSchedules.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">Belum ada jadwal bel</div>
            ) : (
              bellSchedules.sort((a, b) => (a.jam || '').localeCompare(b.jam || '')).map(sched => (
                <div key={sched.id} className={`flex items-center justify-between p-3 rounded-lg border ${sched.aktif ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="font-mono font-bold text-slate-800 text-lg">{sched.jam}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{sched.label || 'Bel'}</p>
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {sched.hari?.map(h => <Badge key={h} variant="secondary" className="text-[9px] py-0 px-1">{h.slice(0, 3)}</Badge>)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleAktifMutation.mutate({ id: sched.id, aktif: !sched.aktif })}
                      className={`w-9 h-5 rounded-full relative transition-all ${sched.aktif ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${sched.aktif ? 'left-4' : 'left-0.5'}`} />
                    </button>
                    <Button size="sm" variant="ghost" className="text-red-500 h-8 w-8 p-0" onClick={() => deleteMutation.mutate(sched.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              ℹ️ Bel akan berbunyi <b>2 kali</b>: 5 menit sebelum jadwal (peringatan) dan tepat pada waktunya.
              Suara bel otomatis aktif selama Dashboard terbuka.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}