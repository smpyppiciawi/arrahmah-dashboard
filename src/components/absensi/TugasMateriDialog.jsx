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
import { BookOpen, Plus, Trash2 } from "lucide-react";

const HARI_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const emptyRow = () => ({ kelas_tujuan: '', keterangan_tugas: '' });

export default function TugasMateriDialog({ open, onClose, izin, currentGuru }) {
  const { user: currentUser } = useAuth();
  const { activeAcademicYear } = useActiveAcademicYear();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userRole = currentUser?.role || 'guru';

  const [tanggal, setTanggal] = useState(izin?.tanggal || format(new Date(), 'yyyy-MM-dd'));
  const [guruId, setGuruId] = useState(izin?.guru_id || currentGuru?.id || '');
  const [rows, setRows] = useState([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTanggal(izin?.tanggal || format(new Date(), 'yyyy-MM-dd'));
      setGuruId(izin?.guru_id || currentGuru?.id || '');
      setRows([emptyRow()]);
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

  const selectedGuru = userRole === 'guru' ? currentGuru : guruList.find(g => g.id === guruId);

  const updateRow = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!guruId) { toast({ title: 'Nama guru wajib', variant: 'destructive' }); return; }
    const validRows = rows.filter(r => r.kelas_tujuan && r.keterangan_tugas.trim());
    if (validRows.length === 0) {
      toast({ title: 'Tambahkan minimal 1 tugas', description: 'Pilih kelas tujuan dan isi keterangan tugas.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = validRows.map(r => {
        const jadwal = jadwalList.find(j => j.nama_kelas === r.kelas_tujuan);
        return {
          izin_pegawai_id: izin?.id || '',
          tanggal,
          hari,
          guru_id: guruId,
          nama_guru: selectedGuru?.nama || izin?.nama_pegawai || '',
          nip: selectedGuru?.nip || izin?.nip || '',
          jabatan: selectedGuru?.jabatan || izin?.jabatan || '',
          keterangan_izin: izin?.keterangan || '',
          jenis_izin: izin?.jenis || '',
          mapel: jadwal?.mapel || '',
          kelas_tujuan: r.kelas_tujuan,
          kelas_id: jadwal?.kelas_id || '',
          jam_ke: jadwal?.jam_ke ?? null,
          keterangan_tugas: r.keterangan_tugas.trim(),
          pengaju_id: currentUser?.id || '',
          pengaju_nama: currentUser?.full_name || '',
          status_verifikasi: 'Belum Diverifikasi',
          tahun_ajaran: activeAcademicYear || '',
        };
      });
      await base44.entities.TugasMateri.bulkCreate(payload);
      toast({ title: `${payload.length} tugas materi tersimpan`, description: 'Menunggu verifikasi petugas piket.' });
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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

          {kelasOptions.length === 0 && guruId && (
            <p className="text-xs text-amber-600">Tidak ada jadwal pelajaran untuk guru ini pada hari {hari}.</p>
          )}

          {/* Daftar Tugas */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-500">Daftar Tugas ({rows.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow} className="h-7 text-xs gap-1" disabled={kelasOptions.length === 0}>
                <Plus className="w-3.5 h-3.5" /> Tambah Tugas
              </Button>
            </div>
            {rows.map((row, idx) => {
              const jadwal = jadwalList.find(j => j.nama_kelas === row.kelas_tujuan);
              return (
                <div key={idx} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">TUGAS #{idx + 1}</span>
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600" title="Hapus tugas ini">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-500 mb-1 block">Kelas Tujuan</Label>
                    <Select value={row.kelas_tujuan} onValueChange={(v) => updateRow(idx, 'kelas_tujuan', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih kelas tujuan" /></SelectTrigger>
                      <SelectContent>
                        {kelasOptions.map(j => (
                          <SelectItem key={j.kelas_id} value={j.nama_kelas}>
                            {j.nama_kelas}{j.mapel ? ` · ${j.mapel}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {jadwal?.mapel && (
                    <div>
                      <Label className="text-[11px] text-slate-500 mb-1 block">Mata Pelajaran</Label>
                      <Input value={jadwal.mapel} readOnly className="bg-white text-sm h-8" />
                    </div>
                  )}
                  <div>
                    <Label className="text-[11px] text-slate-500 mb-1 block">Keterangan Tugas</Label>
                    <Textarea value={row.keterangan_tugas} onChange={(e) => updateRow(idx, 'keterangan_tugas', e.target.value)} rows={2} placeholder="Instruksi tugas / materi" className="text-sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? 'Menyimpan...' : `Simpan ${rows.filter(r => r.kelas_tujuan && r.keterangan_tugas.trim()).length} Tugas`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}