import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { LogIn } from "lucide-react";

export default function KembaliMasukDialog({ siswaKeluar, kelasList, onClose }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedKelasId, setSelectedKelasId] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const kelas = kelasList.find(k => k.id === selectedKelasId);
      const kelasName = kelas ? kelas.nama_kelas : '';
      if (siswaKeluar.siswa_id) {
        await base44.entities.Siswa.update(siswaKeluar.siswa_id, {
          status: 'Aktif', kelas_id: selectedKelasId, nama_kelas: kelasName,
        });
      } else {
        await base44.entities.Siswa.create({
          nis: siswaKeluar.nis, nama: siswaKeluar.nama, jenis_kelamin: siswaKeluar.jenis_kelamin,
          kelas_id: selectedKelasId, nama_kelas: kelasName, status: 'Aktif',
        });
      }
      await base44.entities.SiswaKeluar.delete(siswaKeluar.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      queryClient.invalidateQueries({ queryKey: ['siswaKeluar'] });
      toast({ title: 'Berhasil', description: `${siswaKeluar.nama} telah kembali masuk sebagai siswa aktif.` });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedKelasId) { toast({ title: 'Pilih kelas terlebih dahulu', variant: 'destructive' }); return; }
    mutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="w-5 h-5 text-emerald-500" /> Kembali Masuk Siswa
          </DialogTitle>
        </DialogHeader>
        <div className="mb-3 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm font-semibold text-slate-700">{siswaKeluar.nama}</p>
          <p className="text-xs text-slate-500">NIS: {siswaKeluar.nis} • Kelas Sebelumnya: {siswaKeluar.nama_kelas}</p>
          <p className="text-xs text-orange-500 mt-1">Keluar: {siswaKeluar.kategori} ({siswaKeluar.tanggal_keluar})</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Pilih Kelas Kembali</Label>
            <Select value={selectedKelasId} onValueChange={setSelectedKelasId}>
              <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
              <SelectContent>
                {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={mutation.isPending}>
              {mutation.isPending ? 'Memproses...' : 'Kembalikan Siswa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}