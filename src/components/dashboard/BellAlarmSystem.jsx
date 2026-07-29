import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Plus, Trash2, Volume2, VolumeX, Play, AlertCircle, X } from "lucide-react";

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function getDayName() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date().getDay()];
}

export default function BellAlarmSystem({ floating = false }) {
  const [now, setNow] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeAlarm, setActiveAlarm] = useState(null);
  const audioCtxRef = useRef(null);
  const triggeredRef = useRef(new Set());
  const alarmLoopRef = useRef(null);
  const alarmAutoStopRef = useRef(null);
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

  // Play a burst of bell sound for `duration` seconds at max volume
  const playBellBurst = (duration = 3) => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const startTime = ctx.currentTime;
    const toneDuration = 0.12;
    const gap = 0.04;
    const cycle = toneDuration + gap;
    const numCycles = Math.floor(duration / cycle);

    for (let i = 0; i < numCycles; i++) {
      const t = startTime + i * cycle;
      [1200, 1800].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.7, t + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.001, t + toneDuration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + toneDuration);
      });
    }
  };

  // Start the continuous alarm loop: 3s sound, 1s silence, repeat
  const startAlarmLoop = () => {
    stopAlarmLoop();
    const loop = () => {
      playBellBurst(3);
      alarmLoopRef.current = setTimeout(loop, 4000); // 3s ring + 1s silence
    };
    loop();
  };

  // Stop the alarm sound loop
  const stopAlarmLoop = () => {
    if (alarmLoopRef.current) {
      clearTimeout(alarmLoopRef.current);
      alarmLoopRef.current = null;
    }
    if (alarmAutoStopRef.current) {
      clearTimeout(alarmAutoStopRef.current);
      alarmAutoStopRef.current = null;
    }
  };

  // Start an alarm (pre or on-time)
  const startAlarm = (schedule, type) => {
    setActiveAlarm({ schedule, type, startTime: Date.now() });
    ensureAudioContext();
    startAlarmLoop();
    // Auto-stop after 5 minutes
    alarmAutoStopRef.current = setTimeout(() => {
      stopAlarm();
    }, 5 * 60 * 1000);
  };

  // Stop the alarm completely
  const stopAlarm = () => {
    stopAlarmLoop();
    setActiveAlarm(null);
  };

  // Bell checking logic - runs every second
  useEffect(() => {
    if (!soundEnabled || bellSchedules.length === 0) return;

    const checkBell = () => {
      const current = new Date();
      const dayName = getDayName();
      const currentHM = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;
      const dateStr = current.toDateString();

      bellSchedules.forEach(schedule => {
        if (!schedule.aktif || !schedule.hari?.includes(dayName)) return;

        const [h, m] = schedule.jam.split(':').map(Number);
        const schedDate = new Date();
        schedDate.setHours(h, m, 0, 0);

        // Pre-alarm: 3 minutes before
        const preDate = new Date(schedDate.getTime() - 3 * 60 * 1000);
        const preHM = `${String(preDate.getHours()).padStart(2, '0')}:${String(preDate.getMinutes()).padStart(2, '0')}`;
        const preKey = `${schedule.id}-pre-${dateStr}`;
        const onKey = `${schedule.id}-on-${dateStr}`;

        // Pre-alarm trigger (3 min before)
        if (currentHM === preHM && !triggeredRef.current.has(preKey)) {
          triggeredRef.current.add(preKey);
          startAlarm(schedule, 'pre');
        }

        // On-time trigger
        if (currentHM === schedule.jam && !triggeredRef.current.has(onKey)) {
          triggeredRef.current.add(onKey);
          startAlarm(schedule, 'on');
        }
      });

      // Clean old triggered keys (keep only today's)
      const todayStr = dateStr;
      triggeredRef.current.forEach(key => {
        if (!key.endsWith(todayStr)) triggeredRef.current.delete(key);
      });
    };

    const timer = setInterval(checkBell, 1000);
    return () => clearInterval(timer);
  }, [soundEnabled, bellSchedules]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAlarmLoop();
  }, []);

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
      <div className={floating
        ? "fixed bottom-20 lg:bottom-4 right-4 z-40 flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-slate-200 p-1.5"
        : "flex items-center gap-2"}>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            if (!soundEnabled) ensureAudioContext();
          }}
          title={soundEnabled ? 'Matikan Sistem Bel' : 'Aktifkan Sistem Bel'}
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
        {!floating && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm shadow-sm">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="font-mono font-bold text-slate-800 tabular-nums text-base">{clockTime}</span>
            <span className="text-slate-500 hidden md:inline">{dateString}</span>
          </div>
        )}
      </div>

      {/* Alarm Popup Overlay */}
      {activeAlarm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(220, 38, 38, 0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div className="bg-white rounded-2xl p-8 max-w-md w-[90%] shadow-2xl border-4 border-red-500">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-10 h-10 text-red-500 animate-bounce" />
              </div>
              {activeAlarm.type === 'pre' ? (
                <>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 rounded-full mb-3">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-700 uppercase">Peringatan</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">{activeAlarm.schedule.label || 'Bel'}</h2>
                  <p className="text-sm text-amber-600 mt-1">⚠ 3 menit lagi!</p>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 rounded-full mb-3">
                    <Bell className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-bold text-red-700 uppercase">Waktunya!</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">{activeAlarm.schedule.label || 'Bel'}</h2>
                </>
              )}
              <p className="text-4xl font-mono font-bold text-red-600 mt-3 mb-2">{activeAlarm.schedule.jam}</p>
              <p className="text-xs text-slate-400 mb-4">
                Alarm berhenti otomatis dalam 5 menit
              </p>
              <Button
                onClick={stopAlarm}
                size="lg"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg h-12"
              >
                <X className="w-5 h-5 mr-2" /> Matikan Alarm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Dialog */}
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
            <Button size="sm" onClick={() => { playBellBurst(3); }} className="bg-amber-500 hover:bg-amber-600">
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
              ℹ️ Bel berbunyi <b>2 kali</b>: 3 menit sebelum jadwal (popup peringatan) dan tepat pada waktunya.
              Alarm berbunyi berulang (3 detik nyaring, jeda 1 detik) dan berhenti otomatis setelah 5 menit atau bisa dimatikan manual.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}