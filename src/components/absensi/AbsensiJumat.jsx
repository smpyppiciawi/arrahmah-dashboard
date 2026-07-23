import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, AlertTriangle, CheckCircle, UserX, Moon } from "lucide-react";

function getNextFriday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day <= 5 ? 5 - day : 7 - day + 5;
  if (diff > 0) d.setDate(d.getDate() + diff);
  return d;
}

export default function AbsensiJumat() {
  const [selectedDate, setSelectedDate] = useState(format(getNextFriday(), 'yyyy-MM-dd'));
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupKelas, setPopupKelas] = useState('');
  const queryClient = useQueryClient();

  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });
  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-jumat', popupKelas],
    queryFn: () => popupKelas ? base44.entities.Siswa.filter({ kelas_id: popupKelas, status: 'Aktif' }, 'nama') : [],
    enabled: !!popupKelas,
  });
  const { data: existingJumat = [] } = useQuery({
    queryKey: ['jumat-absensi', selectedDate, popupKelas],
    queryFn: () => popupKelas ? base44.entities.Absensi.filter({ tanggal: selectedDate, kelas_id: popupKelas, jenis_absensi: 'Jumat' }) : [],
    enabled: !!popupKelas,
  });
  const { data: allJumatAbsensi = [] } = useQuery({
    queryKey: ['jumat-all', selectedDate],
    queryFn: () => base44.entities.Absensi.filter({ tanggal: selectedDate, jenis_absensi: 'Jumat' }),
  });
  const { data: allKehadiranAbsensi = [] } = useQuery({
    queryKey: ['kehadiran-all-jumat', selectedDate],
    queryFn: () => base44.entities.Absensi.filter({ tanggal: selectedDate }),
  });

  const kehadiranAbsensi = allKehadiranAbsensi.filter(a => a.jenis_absensi !== 'Jumat');
  const hadirSekolahIds = kehadiranAbsensi.filter(a => a.status === 'Hadir').map(a => a.siswa_id);
  const jumatAlfaIds = allJumatAbsensi.filter(a => a.status === 'Alfa').map(a => a.siswa_id);
  const anomalyIds = jumatAlfaIds.filter(id => hadirSekolahIds.includes(id));
  const anomalyStudents = allJumatAbsensi.filter(a => anomalyIds.includes(a.siswa_id));
  const jumatTidakHadir = allJumatAbsensi.filter(a => a.status === 'Alfa');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Absensi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['jumat-absensi'] }); queryClient.invalidateQueries({ queryKey: ['jumat-all'] }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Absensi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['jumat-absensi'] }); queryClient.invalidateQueries({ queryKey: ['jumat-all'] }); },
  });

  const getJumatRecord = (siswaId) => existingJumat.find(a => a.siswa_id === siswaId);

  const handleToggle = async (siswa) => {
    const existing = getJumatRecord(siswa.id);
    const kelas = kelasList.find(k => k.id === popupKelas);
    if (existing) {
      await deleteMutation.mutateAsync(existing.id);
    } else {
      await createMutation.mutateAsync({
        tanggal: selectedDate, siswa_id: siswa.id, nis: siswa.nis, nama_siswa: siswa.nama,
        kelas_id: popupKelas, nama_kelas: kelas?.nama_kelas || '', status: 'Alfa', jenis_absensi: 'Jumat',
        keterangan: siswa.jenis_kelamin === 'Laki-laki' ? 'Tidak ikut Jumatan' : 'Tidak ikut Keputrian',
      });
    }
  };

  const maleStudents = siswaList.filter(s => s.jenis_kelamin === 'Laki-laki');
  const femaleStudents = siswaList.filter(s => s.jenis_kelamin === 'Perempuan');

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <Label className="text-xs text-slate-500 font-medium mb-1 block">Tanggal Jumat</Label>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9" />
          </div>
          <Button onClick={() => setPopupOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Users className="w-4 h-4" /> Input Absen Jumat
          </Button>
        </CardContent>
      </Card>

      {anomalyStudents.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Hadir Sekolah tapi Tidak Ikut Jumat/Keputrian ({anomalyStudents.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {anomalyStudents.map(a => (
                <div key={a.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  <UserX className="w-3 h-3 text-amber-500" />
                  <span className="text-sm font-medium text-slate-700">{a.nama_siswa}</span>
                  <Badge className="text-xs bg-slate-100 text-slate-600">{a.nama_kelas}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {jumatTidakHadir.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Moon className="w-4 h-4 text-indigo-500" /> Tidak Ikut Jumat/Keputrian — {format(new Date(selectedDate), 'd MMMM yyyy', { locale: idLocale })}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {jumatTidakHadir.map(a => (
                <div key={a.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div><p className="text-sm font-medium text-slate-700">{a.nama_siswa}</p><p className="text-xs text-slate-400">{a.nama_kelas} • {a.keterangan || 'Tidak hadir'}</p></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-emerald-500" /> Absensi Jumat — {format(new Date(selectedDate), 'd MMMM yyyy', { locale: idLocale })}</DialogTitle></DialogHeader>
          <div className="mb-4">
            <Label className="text-xs">Pilih Kelas</Label>
            <Select value={popupKelas} onValueChange={setPopupKelas}><SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger><SelectContent>{kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}</SelectContent></Select>
          </div>

          {popupKelas && siswaList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded-lg"><span className="text-sm font-semibold text-blue-700">Absen Jumatan</span><Badge className="bg-blue-100 text-blue-700 text-xs">{maleStudents.length} siswa</Badge></div>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {maleStudents.map(siswa => {
                    const isTidakHadir = !!getJumatRecord(siswa.id);
                    return (
                      <label key={siswa.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={!isTidakHadir} onChange={() => handleToggle(siswa)} className="w-4 h-4 rounded" />
                        <span className={`text-sm ${isTidakHadir ? 'text-red-500 line-through' : 'text-slate-700'}`}>{siswa.nama}</span>
                        {isTidakHadir && <Badge className="text-xs bg-red-100 text-red-600">Tidak Hadir</Badge>}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2 p-2 bg-pink-50 rounded-lg"><span className="text-sm font-semibold text-pink-700">Absen Keputrian</span><Badge className="bg-pink-100 text-pink-700 text-xs">{femaleStudents.length} siswa</Badge></div>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {femaleStudents.map(siswa => {
                    const isTidakHadir = !!getJumatRecord(siswa.id);
                    return (
                      <label key={siswa.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={!isTidakHadir} onChange={() => handleToggle(siswa)} className="w-4 h-4 rounded" />
                        <span className={`text-sm ${isTidakHadir ? 'text-red-500 line-through' : 'text-slate-700'}`}>{siswa.nama}</span>
                        {isTidakHadir && <Badge className="text-xs bg-red-100 text-red-600">Tidak Hadir</Badge>}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : popupKelas ? <p className="text-center py-8 text-slate-400">Tidak ada siswa di kelas ini</p> : <p className="text-center py-8 text-slate-400">Pilih kelas untuk memulai absensi</p>}
          <p className="text-xs text-slate-400 mt-2">Centang = Hadir (default). Klik untuk tandai Tidak Hadir. Data tersimpan otomatis.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}