import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ScanFace, MapPin, Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import FaceRecognition from '@/components/absensi/FaceRecognition';
import { validateGeofence } from '@/lib/geoUtils';

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function AbsensiMandiriDialog({ open, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDay = HARI_ID[new Date().getDay()];

  // Cari data pegawai berdasarkan email/nama user login
  const { data: guruList = [] } = useQuery({
    queryKey: ['guru-list-mandiri'],
    queryFn: () => base44.entities.Guru.list('-updated_date', 500),
    enabled: open,
  });

  const myGuru = useMemo(() => {
    if (!currentUser) return null;
    const byEmail = guruList.find((g) => g.email && currentUser.email && g.email.toLowerCase() === currentUser.email.toLowerCase());
    if (byEmail) return byEmail;
    const byName = guruList.find((g) => g.nama && currentUser.full_name && g.nama.toLowerCase() === currentUser.full_name.toLowerCase());
    return byName || null;
  }, [guruList, currentUser]);

  const { data: jadwalMasuk = [] } = useQuery({
    queryKey: ['jadwal-absensi-masuk-mandiri'],
    queryFn: () => base44.entities.JadwalAbsensi.filter({ jenis: 'Masuk', aktif: true }),
  });
  const { data: jadwalPulang = [] } = useQuery({
    queryKey: ['jadwal-absensi-pulang-mandiri'],
    queryFn: () => base44.entities.JadwalAbsensi.filter({ jenis: 'Pulang', aktif: true }),
  });
  const { data: existingToday = [] } = useQuery({
    queryKey: ['absensi-mandiri-today', myGuru?.id, today],
    queryFn: () => (myGuru ? base44.entities.AbsensiPegawai.filter({ guru_id: myGuru.id, tanggal: today }) : []),
    enabled: !!myGuru && open,
  });

  const [geoState, setGeoState] = useState(null); // null | 'checking' | {ok,distance,...}
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const findJadwal = (list) => (list || []).find((j) =>
    (j.person_type === 'Pegawai' || j.person_type === 'Semua') &&
    Array.isArray(j.hari) && j.hari.includes(todayDay)
  );

  const addMinutesToHHMM = (hhmm, mins) => {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + (Number(mins) || 0);
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const getLateThreshold = () => {
    const match = findJadwal(jadwalMasuk);
    if (match && match.jam) return addMinutesToHHMM(match.jam, match.toleransi_menit);
    return '07:30';
  };
  const isToleransiAktif = () => {
    const match = findJadwal(jadwalMasuk);
    return match ? match.toleransi_aktif !== false : true;
  };
  const getPulangJam = () => {
    const match = findJadwal(jadwalPulang);
    return match && match.jam ? match.jam : null;
  };

  const handleCheckLocation = async () => {
    setGeoState('checking');
    try {
      const result = await validateGeofence();
      setGeoState(result);
      if (!result.ok && result.reason !== 'no_profile' && result.reason !== 'invalid_coord') {
        toast({ title: 'Di luar radius sekolah', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      setGeoState({ ok: false, message: e.message });
      toast({ title: 'Gagal cek lokasi', description: e.message, variant: 'destructive' });
    }
  };

  const geoOk = geoState && geoState.ok;
  const geoBypassed = geoState && (geoState.reason === 'no_profile' || geoState.reason === 'invalid_coord');

  const handleMatch = async (cardId) => {
    // cardId dari FaceRecognition: FACE-<person_id>
    if (!myGuru) return;
    setSubmitting(true);
    try {
      const now = format(new Date(), 'HH:mm');
      const lateThreshold = getLateThreshold();
      const pulangJam = getPulangJam();
      const isPulangTime = pulangJam && now >= pulangJam;

      if (existingToday.length > 0 && existingToday[0].jam_keluar) {
        toast({ title: 'Sudah absen pulang hari ini' });
        setDone(true);
        return;
      }

      if (isPulangTime) {
        if (existingToday.length > 0) {
          await base44.entities.AbsensiPegawai.update(existingToday[0].id, { jam_keluar: now, status: 'Pulang' });
        } else {
          await base44.entities.AbsensiPegawai.create({
            tanggal: today, guru_id: myGuru.id, nip: myGuru.nuptk,
            nama_pegawai: myGuru.nama, jabatan: myGuru.jabatan,
            jam_keluar: now, status: 'Pulang', metode: 'FaceRecognition',
          });
        }
        toast({ title: 'Absensi pulang tercatat', description: `${myGuru.nama} — Pulang — ${now}` });
      } else {
        if (existingToday.length > 0) {
          toast({ title: 'Sudah absen masuk hari ini', description: `Jam: ${existingToday[0].jam_masuk}` });
          setDone(true);
          return;
        }
        const isLate = isToleransiAktif() ? now > lateThreshold : false;
        const status = isLate ? 'Terlambat' : 'Hadir';
        await base44.entities.AbsensiPegawai.create({
          tanggal: today, guru_id: myGuru.id, nip: myGuru.nuptk,
          nama_pegawai: myGuru.nama, jabatan: myGuru.jabatan,
          jam_masuk: now, status, metode: 'FaceRecognition',
        });
        toast({ title: 'Absensi masuk tercatat', description: `${myGuru.nama} — ${status} — ${now}` });
      }
      queryClient.invalidateQueries({ queryKey: ['absensi-pegawai-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['absensi-mandiri-today'] });
      setDone(true);
    } catch (e) {
      toast({ title: 'Gagal mencatat absensi', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setGeoState(null);
    setSubmitting(false);
    setDone(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanFace className="w-5 h-5 text-indigo-600" /> Absensi Mandiri Pegawai</DialogTitle>
          <DialogDescription>Verifikasi wajah & geofence lokasi sekolah</DialogDescription>
        </DialogHeader>

        {!myGuru ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700">
                <p className="font-medium">Data pegawai tidak ditemukan</p>
                <p className="text-xs mt-1">Akun Anda belum ditautkan ke data Pegawai. Hubungi Administrator untuk mencocokkan email/nama.</p>
              </div>
            </CardContent>
          </Card>
        ) : done ? (
          <div className="text-center py-6">
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">Absensi selesai</p>
            <Button className="mt-4" variant="outline" onClick={handleClose}>Tutup</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info pegawai */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <ScanFace className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{myGuru.nama}</p>
                <p className="text-xs text-slate-500">{myGuru.jabatan} · NUPTK: {myGuru.nuptk || '-'}</p>
              </div>
              {existingToday.length > 0 && (
                <Badge className={existingToday[0].status === 'Hadir' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}>
                  {existingToday[0].status}
                </Badge>
              )}
            </div>

            {/* Step 1: Geofence */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-500" /> 1. Cek Lokasi</p>
                {geoOk && !geoBypassed && <Badge className="bg-emerald-100 text-emerald-700 gap-1"><CheckCircle className="w-3 h-3" /> {geoState.distance}m</Badge>}
                {geoState && !geoOk && !geoBypassed && <Badge className="bg-red-100 text-red-700 gap-1"><XCircle className="w-3 h-3" /> {geoState.distance}m</Badge>}
              </div>
              {geoState === 'checking' ? (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-sm text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> Mengecek lokasi GPS...
                </div>
              ) : !geoState ? (
                <Button variant="outline" className="w-full" onClick={handleCheckLocation}>
                  <MapPin className="w-4 h-4 mr-2" /> Cek Lokasi Sekarang
                </Button>
              ) : (
                <div className={`p-3 rounded-xl text-sm ${geoOk ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'} flex items-start gap-2`}>
                  {geoOk ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="text-xs">{geoState.message}</p>
                    {!geoBypassed && (
                      <Button variant="ghost" size="sm" className="h-7 mt-1 px-2 text-xs" onClick={handleCheckLocation}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Cek ulang
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Face Recognition */}
            <div className={(!geoOk && !geoBypassed) ? 'opacity-50 pointer-events-none' : ''}>
              <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-2"><ScanFace className="w-4 h-4 text-indigo-500" /> 2. Verifikasi Wajah</p>
              <FaceRecognition mode="scan" personType="Pegawai" onMatch={handleMatch} disabled={submitting || (!geoOk && !geoBypassed)} />
            </div>

            <Button variant="ghost" className="w-full" onClick={handleClose}>Batal</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}