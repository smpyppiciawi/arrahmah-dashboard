import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function JadwalDialog({ open, onOpenChange, kelas }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState({ hari: 'Senin', jam_mulai: '', jam_selesai: '', mapel: '', guru_id: '', nama_guru: '' });
  const queryClient = useQueryClient();

  const { data: jadwalList = [] } = useQuery({
    queryKey: ['jadwal', kelas?.id],
    queryFn: () => base44.entities.JadwalPelajaran.filter({ kelas_id: kelas?.id }),
    enabled: !!kelas?.id && open,
  });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: mapelList = [] } = useQuery({
    queryKey: ['mapel'],
    queryFn: () => base44.entities.Mapel.list('nama'),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.JadwalPelajaran.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jadwal', kelas?.id] });
      setIsFormOpen(false);
      setFormData({ hari: 'Senin', jam_mulai: '', jam_selesai: '', mapel: '', guru_id: '', nama_guru: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JadwalPelajaran.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jadwal', kelas?.id] });
      setDeleteConfirmOpen(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      kelas_id: kelas.id,
      nama_kelas: kelas.nama_kelas,
      ...formData,
    });
  };

  const handleGuruChange = (guruId) => {
    const guru = guruList.find(g => g.id === guruId);
    setFormData({ ...formData, guru_id: guruId, nama_guru: guru?.nama || '' });
  };

  return (
    <>
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Hapus Jadwal"
        description="Hapus jadwal pelajaran ini?"
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-500" />
              Jadwal Pelajaran — {kelas?.nama_kelas}
            </DialogTitle>
          </DialogHeader>

          {/* Jadwal per hari */}
          <div className="space-y-3 max-h-[45vh] overflow-y-auto">
            {HARI.map(hari => {
              const jadwalHari = jadwalList
                .filter(j => j.hari === hari)
                .sort((a, b) => a.jam_mulai?.localeCompare(b.jam_mulai));
              return (
                <div key={hari}>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">{hari}</p>
                  {jadwalHari.length === 0 ? (
                    <p className="text-xs text-slate-300 pl-2">Tidak ada jadwal</p>
                  ) : (
                    <div className="space-y-1">
                      {jadwalHari.map(j => (
                        <div key={j.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border text-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 w-24">{j.jam_mulai} – {j.jam_selesai}</span>
                            <span className="font-medium text-slate-800">{j.mapel}</span>
                            {j.nama_guru && <span className="text-xs text-slate-500 hidden sm:inline">({j.nama_guru})</span>}
                          </div>
                          <Button size="sm" variant="ghost" className="text-red-500"
                            onClick={() => { setDeleteId(j.id); setDeleteConfirmOpen(true); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Form */}
          {isFormOpen ? (
            <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Hari</Label>
                  <Select value={formData.hari} onValueChange={(v) => setFormData({ ...formData, hari: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HARI.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mata Pelajaran</Label>
                  <Select value={formData.mapel} onValueChange={(v) => setFormData({ ...formData, mapel: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                    <SelectContent>
                      {mapelList.map(m => <SelectItem key={m.id} value={m.nama}>{m.nama}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jam Mulai</Label>
                  <Input type="time" value={formData.jam_mulai} onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })} required />
                </div>
                <div>
                  <Label>Jam Selesai</Label>
                  <Input type="time" value={formData.jam_selesai} onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label>Guru (Opsional)</Label>
                <Select value={formData.guru_id} onValueChange={handleGuruChange}>
                  <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
                  <SelectContent>
                    {guruList.map(g => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Batal</Button>
                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={!formData.mapel || !formData.jam_mulai}>Simpan</Button>
              </div>
            </form>
          ) : (
            <Button onClick={() => setIsFormOpen(true)} className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Tambah Jadwal
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}