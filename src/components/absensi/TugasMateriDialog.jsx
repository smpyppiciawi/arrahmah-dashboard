import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/lib/AuthContext';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen } from "lucide-react";

const HARI_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function TugasMateriDialog({ open, onClose, izin, currentGuru }) {
  const { user: currentUser } = useAuth();
  const { activeAcademicYear } = useActiveAcademicYear();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userRole = currentUser?.role || 'guru';

  const [tanggal, setTanggal] = useState(izin?.tanggal || format(new Date(), 'yyyy-MM-dd'));
  const [guruId, setGuruId] = useState(izin?.guru_id || currentGuru?.id || '');
  const [kelasTujuan, setKelasTujuan] = useState('');
  const [keteranganTugas, setKeteranganTugas] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTanggal(izin?.tanggal || format(new Date(), 'yyyy-MM-dd'));
      setGuruId(izin?.guru_id || currentGuru?.id || '');
      setKelasTujuan('');
      setKeteranganTugas('');
    }
  }, [open, izin, currentGuru]);

  const hari = useMemo(() => {
    try { return HARI_NAMES[new Date(tanggal + 'T00:00:00').getDay()]; } catch { return ''; }
  }, [tanggal]);

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.filter({ status: 'Aktif' }),
    enabled: open && userRole !== 'guru',
  });

  const { data: jadwalList = [] } = useQuery({
    queryKey: ['jadwal-pelajaran-tugas', guruId, hari],
    queryFn: () => base44.entities.JadwalPelajaran.filter({ guru_id: guruId, hari }),
    enabled: open && !!guruId && !!hari,
  });

  const kelasOptions = useMemo(() => {
    const seen = new Map();
    jadwalList.forEach(j => {
      if (j.kelas_id && !seen.has(j.kelas_id)) seen.set(j.kelas_id, j);
    });
    return Array.from(seen.values());
  }, [jadwalList]);

  const selectedJadwal = jadwalList.find(j => j.nama_kelas === kelasTujuan);
  const selectedGuru = userRole === 'guru' ? currentGuru : guruList.find(g => g.id === guruId);

  const handleSubmit = async () => {
    if (!guruId) { toast({ title: 'Nama guru wajib', variant: 'destructive' }); return; }
    if (!kelasTujuan) { toast({ title: 'Pilih kelas tujuan', variant: 'destructive' }); return; }
    if (!keteranganTugas.trim()) { toast({ title: 'Keterangan tugas wajib', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      await base44.entities.TugasMateri.create({
        izin_pegawai_id: izin?.id || '',
        tanggal,
        hari,
        guru_id: guruId,
        nama_guru: selectedGuru?.nama || izin?.nama_pegawai || '',
        nip: selectedGuru?.nip || izin?.nip || '',
        jabatan: selectedGuru?.jabatan || izin?.jabatan || '',
        keterangan_izin: izin?.keterangan || '',
        jenis_izin: izin?.jenis || '',
        mapel: selectedJadwal?.mapel || '',
        kelas_tujuan: kelasTujuan,
        kelas_id: selectedJadwal?.kelas_id || '',
        jam_ke: selectedJadwal?.jam_ke ?? null,
        keterangan_tugas: keteranganTugas.trim(),
        pengaju_id: currentUser?.id || '',
        pengaju_nama: currentUser?.full_name || '',
        status_verifikasi: 'Belum Diverifikasi',
        tahun_ajaran: activeAcademicYear || '',
      });
      toast({ title: 'Tugas materi tersimpan', description: 'Menunggu verifikasi petugas piket.' });
      queryClient.invalidateQueries({ queryKey: ['tugas-materi-saya'] });
      queryClient.invalidateQueries({ queryKey: ['tugas-materi'] });
      onClose();
    } catch (err) {
      toast({ title: 'Gagal menyimpan', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-emerald-500" /> Ajukan Tugas Materi
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Tanggal</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Hari</Label>
              <Input value={hari} readOnly className="bg-slate-50" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Nama Guru</Label>
            {userRole === 'guru' ? (
              <Input value={currentGuru?.nama || izin?.nama_pegawai || ''} readOnly className="bg-slate-50" />
            ) : (
              <Select value={guruId} onValueChange={setGuruId}>
                <SelectTrigger><SelectValue placeholder="Pilih guru" /></SelectTrigger>
                <SelectContent>
                  {guruList.map(g => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Kelas Tujuan</Label>
            {kelasOptions.length === 0 ? (
              <p className="text-xs text-amber-600 py-1">Tidak ada jadwal pelajaran untuk guru ini pada hari {hari}.</p>
            ) : (
              <Select value={kelasTujuan} onValueChange={setKelasTujuan}>
                <SelectTrigger><SelectValue placeholder="Pilih kelas tujuan" /></SelectTrigger>
                <SelectContent>
                  {kelasOptions.map(j => (
                    <SelectItem key={j.kelas_id} value={j.nama_kelas}>
                      {j.nama_kelas}{j.mapel ? ` · ${j.mapel}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {selectedJadwal?.mapel && (
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Mata Pelajaran</Label>
              <Input value={selectedJadwal.mapel} readOnly className="bg-slate-50" />
            </div>
          )}
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Keterangan Tugas</Label>
            <Textarea value={keteranganTugas} onChange={(e) => setKeteranganTugas(e.target.value)} rows={3} placeholder="Instruksi tugas / materi untuk kelas tujuan" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? 'Menyimpan...' : 'Simpan Tugas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}