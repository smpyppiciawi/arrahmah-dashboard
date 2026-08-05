import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/lib/AuthContext';
import { BookOpen, CheckCircle, Clock, Pencil, Save, X, Plus, Trash2 } from "lucide-react";

const HARI_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function DetailTugasDialog({ open, onClose, izin, currentGuru }) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userRole = currentUser?.role || 'guru';

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ kelas_tujuan: '', keterangan_tugas: '' });
  const [saving, setSaving] = useState(false);

  const guruId = izin?.guru_id || currentGuru?.id || '';
  const tanggal = izin?.tanggal || '';
  const hari = useMemo(() => {
    try { return tanggal ? HARI_NAMES[new Date(tanggal + 'T00:00:00').getDay()] : ''; } catch { return ''; }
  }, [tanggal]);

  const { data: jadwalList = [] } = useQuery({
    queryKey: ['jadwal-pelajaran-tugas', guruId, hari],
    queryFn: () => base44.entities.JadwalPelajaran.filter({ guru_id: guruId, hari }),
    enabled: open && !!guruId && !!hari,
  });

  const kelasOptions = useMemo(() => {
    const seen = new Map();
    jadwalList.forEach(j => { if (j.kelas_id && !seen.has(j.kelas_id)) seen.set(j.kelas_id, j); });
    return Array.from(seen.values());
  }, [jadwalList]);

  const { data: tugasList = [], refetch } = useQuery({
    queryKey: ['tugas-materi-by-izin', izin?.id],
    queryFn: () => base44.entities.TugasMateri.filter({ izin_pegawai_id: izin?.id }),
    enabled: open && !!izin?.id,
  });

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditForm({ kelas_tujuan: t.kelas_tujuan, keterangan_tugas: t.keterangan_tugas });
  };
  const cancelEdit = () => { setEditingId(null); setEditForm({ kelas_tujuan: '', keterangan_tugas: '' }); };

  const saveEdit = async (tugasId) => {
    if (!editForm.kelas_tujuan || !editForm.keterangan_tugas.trim()) {
      toast({ title: 'Kelas dan keterangan wajib', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const jadwal = jadwalList.find(j => j.nama_kelas === editForm.kelas_tujuan);
      await base44.entities.TugasMateri.update(tugasId, {
        kelas_tujuan: editForm.kelas_tujuan,
        kelas_id: jadwal?.kelas_id || '',
        mapel: jadwal?.mapel || '',
        jam_ke: jadwal?.jam_ke ?? null,
        keterangan_tugas: editForm.keterangan_tugas.trim(),
      });
      toast({ title: 'Tugas diperbarui' });
      queryClient.invalidateQueries({ queryKey: ['tugas-materi-by-izin'] });
      queryClient.invalidateQueries({ queryKey: ['tugas-materi-saya'] });
      queryClient.invalidateQueries({ queryKey: ['tugas-materi'] });
      cancelEdit();
    } catch (err) {
      toast({ title: 'Gagal memperbarui', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteTugas = async (tugasId) => {
    if (!window.confirm('Hapus tugas ini?')) return;
    try {
      await base44.entities.TugasMateri.delete(tugasId);
      toast({ title: 'Tugas dihapus' });
      queryClient.invalidateQueries({ queryKey: ['tugas-materi-by-izin'] });
      queryClient.invalidateQueries({ queryKey: ['tugas-materi-saya'] });
      queryClient.invalidateQueries({ queryKey: ['tugas-materi'] });
    } catch (err) {
      toast({ title: 'Gagal menghapus', description: err.message, variant: 'destructive' });
    }
  };

  const editJadwal = jadwalList.find(j => j.nama_kelas === editForm.kelas_tujuan);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-emerald-500" /> Detail Tugas Materi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 text-xs text-slate-500">
          <p><span className="font-medium text-slate-700">{izin?.nama_pegawai || currentGuru?.nama}</span> · {izin?.jenis}</p>
          <p>{tanggal ? format(new Date(tanggal), 'd MMM yyyy') : ''} · {hari}</p>
        </div>

        <div className="space-y-2">
          {tugasList.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6">Belum ada tugas materi</p>
          ) : tugasList.map((t, idx) => {
            const isEditing = editingId === t.id;
            const verified = t.status_verifikasi === 'Sudah Diverifikasi';
            return (
              <div key={t.id} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">TUGAS #{idx + 1}</span>
                  <div className="flex items-center gap-1.5">
                    {verified ? (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle className="w-3 h-3 mr-1" /> Terverifikasi</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Clock className="w-3 h-3 mr-1" /> Menunggu Verifikasi</Badge>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[11px] text-slate-500 mb-1 block">Kelas Tujuan</Label>
                      <Select value={editForm.kelas_tujuan} onValueChange={(v) => setEditForm(f => ({ ...f, kelas_tujuan: v }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {kelasOptions.map(j => (
                            <SelectItem key={j.kelas_id} value={j.nama_kelas}>{j.nama_kelas}{j.mapel ? ` · ${j.mapel}` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {editJadwal?.mapel && (
                      <Input value={editJadwal.mapel} readOnly className="bg-white text-sm h-8" />
                    )}
                    <div>
                      <Label className="text-[11px] text-slate-500 mb-1 block">Keterangan Tugas</Label>
                      <Textarea value={editForm.keterangan_tugas} onChange={(e) => setEditForm(f => ({ ...f, keterangan_tugas: e.target.value }))} rows={2} className="text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(t.id)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs">
                        <Save className="w-3.5 h-3.5 mr-1" /> Simpan
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="h-7 text-xs">
                        <X className="w-3.5 h-3.5 mr-1" /> Batal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700">{t.kelas_tujuan}{t.mapel ? ` · ${t.mapel}` : ''}{t.jam_ke ? ` (Jam ${t.jam_ke})` : ''}</p>
                    <p className="text-xs text-slate-600">{t.keterangan_tugas}</p>
                    {!verified && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" onClick={() => startEdit(t)} className="h-7 text-xs">
                          <Pencil className="w-3 h-3 mr-1" /> Ubah
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteTugas(t.id)} className="h-7 text-xs text-red-600 hover:bg-red-50">
                          <Trash2 className="w-3 h-3 mr-1" /> Hapus
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}