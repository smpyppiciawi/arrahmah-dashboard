import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";

export default function PembelajaranDialog({ open, onOpenChange, kelas }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState({ mapel: '', guru_id: '', nama_guru: '' });
  const queryClient = useQueryClient();

  const { data: pembelajaranList = [] } = useQuery({
    queryKey: ['pembelajaran', kelas?.id],
    queryFn: () => base44.entities.Pembelajaran.filter({ kelas_id: kelas?.id }),
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
    mutationFn: (data) => base44.entities.Pembelajaran.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pembelajaran', kelas?.id] });
      setIsFormOpen(false);
      setFormData({ mapel: '', guru_id: '', nama_guru: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pembelajaran.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pembelajaran', kelas?.id] });
      setDeleteConfirmOpen(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      kelas_id: kelas.id,
      nama_kelas: kelas.nama_kelas,
      mapel: formData.mapel,
      guru_id: formData.guru_id,
      nama_guru: formData.nama_guru,
      tahun_ajaran: kelas.tahun_ajaran || '',
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
        title="Hapus Pembelajaran"
        description="Hapus pemetaan guru mapel ini?"
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              Pembelajaran — {kelas?.nama_kelas}
            </DialogTitle>
          </DialogHeader>

          {/* List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {pembelajaranList.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada pemetaan pembelajaran</p>
            )}
            {pembelajaranList.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.mapel}</p>
                  <p className="text-xs text-slate-500">{p.nama_guru}</p>
                </div>
                <Button
                  size="sm" variant="ghost" className="text-red-500"
                  onClick={() => { setDeleteId(p.id); setDeleteConfirmOpen(true); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add Form */}
          {isFormOpen ? (
            <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t">
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
                <Label>Guru Pengampu</Label>
                <Select value={formData.guru_id} onValueChange={handleGuruChange}>
                  <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
                  <SelectContent>
                    {guruList.filter(g => g.status !== 'Keluar' && g.jabatan === 'Guru Mata Pelajaran').map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Batal</Button>
                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={!formData.mapel || !formData.guru_id}>Simpan</Button>
              </div>
            </form>
          ) : (
            <Button onClick={() => setIsFormOpen(true)} className="w-full bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" /> Tambah Pemetaan
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}