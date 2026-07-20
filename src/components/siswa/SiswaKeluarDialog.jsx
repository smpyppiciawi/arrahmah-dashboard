import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { LogOut } from "lucide-react";

export default function SiswaKeluarDialog({ siswa, onClose }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeAcademicYear } = useActiveAcademicYear();
  const [formData, setFormData] = useState({
    kategori: 'Pindah',
    kategori_manual: '',
    tanggal_keluar: new Date().toISOString().split('T')[0],
    alasan: '',
    nama_sekolah_tujuan: '',
    npsn_sekolah_tujuan: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await base44.entities.SiswaKeluar.create({
        siswa_id: siswa.id,
        nis: siswa.nis,
        nama: siswa.nama,
        jenis_kelamin: siswa.jenis_kelamin,
        nama_kelas: siswa.nama_kelas,
        kategori: formData.kategori,
        kategori_manual: formData.kategori === 'Lainnya' ? formData.kategori_manual : '',
        tanggal_keluar: formData.tanggal_keluar,
        alasan: formData.alasan,
        nama_sekolah_tujuan: formData.kategori === 'Pindah' ? formData.nama_sekolah_tujuan : '',
        npsn_sekolah_tujuan: formData.kategori === 'Pindah' ? formData.npsn_sekolah_tujuan : '',
        tahun_ajaran: activeAcademicYear || '',
      });
      await base44.entities.Siswa.update(siswa.id, { status: 'Keluar' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      queryClient.invalidateQueries({ queryKey: ['siswaKeluar'] });
      toast({ title: 'Berhasil', description: `${siswa.nama} telah dikeluarkan dari daftar siswa aktif.` });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5 text-orange-500" /> Keluarkan Siswa
          </DialogTitle>
        </DialogHeader>
        <div className="mb-3 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm font-semibold text-slate-700">{siswa.nama}</p>
          <p className="text-xs text-slate-500">NIS: {siswa.nis} • Kelas: {siswa.nama_kelas}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Kategori</Label>
            <Select value={formData.kategori} onValueChange={(v) => setFormData({ ...formData, kategori: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pindah">Pindah</SelectItem>
                <SelectItem value="Meninggal Dunia">Meninggal Dunia</SelectItem>
                <SelectItem value="Mengundurkan Diri">Mengundurkan Diri</SelectItem>
                <SelectItem value="Lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.kategori === 'Lainnya' && (
            <div>
              <Label>Kategori (Manual)</Label>
              <Input value={formData.kategori_manual} onChange={(e) => setFormData({ ...formData, kategori_manual: e.target.value })} placeholder="Masukkan kategori" required />
            </div>
          )}
          <div>
            <Label>Tanggal Keluar</Label>
            <Input type="date" value={formData.tanggal_keluar} onChange={(e) => setFormData({ ...formData, tanggal_keluar: e.target.value })} required />
          </div>
          {formData.kategori === 'Pindah' && (
            <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
              <div>
                <Label>Nama Sekolah Tujuan</Label>
                <Input value={formData.nama_sekolah_tujuan} onChange={(e) => setFormData({ ...formData, nama_sekolah_tujuan: e.target.value })} placeholder="Nama sekolah tujuan" required />
              </div>
              <div>
                <Label>NPSN Sekolah Tujuan</Label>
                <Input value={formData.npsn_sekolah_tujuan} onChange={(e) => setFormData({ ...formData, npsn_sekolah_tujuan: e.target.value })} placeholder="NPSN sekolah tujuan" />
              </div>
            </div>
          )}
          <div>
            <Label>Alasan</Label>
            <Textarea value={formData.alasan} onChange={(e) => setFormData({ ...formData, alasan: e.target.value })} placeholder="Alasan siswa keluar" rows={3} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700" disabled={mutation.isPending}>
              {mutation.isPending ? 'Memproses...' : 'Simpan & Keluarkan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}