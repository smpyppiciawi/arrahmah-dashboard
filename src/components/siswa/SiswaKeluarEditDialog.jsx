import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Edit2, Loader2 } from "lucide-react";

export default function SiswaKeluarEditDialog({ siswaKeluar, onClose }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    kategori: 'Pindah',
    kategori_manual: '',
    tanggal_keluar: '',
    alasan: '',
    nama_sekolah_tujuan: '',
    npsn_sekolah_tujuan: '',
    tahun_ajaran: '',
  });

  useEffect(() => {
    if (siswaKeluar) {
      setFormData({
        kategori: siswaKeluar.kategori || 'Pindah',
        kategori_manual: siswaKeluar.kategori_manual || '',
        tanggal_keluar: siswaKeluar.tanggal_keluar || '',
        alasan: siswaKeluar.alasan || '',
        nama_sekolah_tujuan: siswaKeluar.nama_sekolah_tujuan || '',
        npsn_sekolah_tujuan: siswaKeluar.npsn_sekolah_tujuan || '',
        tahun_ajaran: siswaKeluar.tahun_ajaran || '',
      });
    }
  }, [siswaKeluar]);

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.SiswaKeluar.update(siswaKeluar.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswaKeluar'] });
      toast({ title: 'Data diperbarui', description: 'Data siswa keluar berhasil diperbarui.' });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      kategori: formData.kategori,
      kategori_manual: formData.kategori === 'Lainnya' ? formData.kategori_manual : '',
      tanggal_keluar: formData.tanggal_keluar,
      alasan: formData.alasan,
      nama_sekolah_tujuan: formData.kategori === 'Pindah' ? formData.nama_sekolah_tujuan : '',
      npsn_sekolah_tujuan: formData.kategori === 'Pindah' ? formData.npsn_sekolah_tujuan : '',
      tahun_ajaran: formData.tahun_ajaran,
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-blue-500" /> Edit Data Siswa Keluar
          </DialogTitle>
        </DialogHeader>
        <div className="mb-3 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm font-semibold text-slate-700">{siswaKeluar?.nama}</p>
          <p className="text-xs text-slate-500">NIS: {siswaKeluar?.nis} • Kelas: {siswaKeluar?.nama_kelas}</p>
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
              <Input value={formData.kategori_manual} onChange={(e) => setFormData({ ...formData, kategori_manual: e.target.value })} required />
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
                <Input value={formData.nama_sekolah_tujuan} onChange={(e) => setFormData({ ...formData, nama_sekolah_tujuan: e.target.value })} />
              </div>
              <div>
                <Label>NPSN Sekolah Tujuan</Label>
                <Input value={formData.npsn_sekolah_tujuan} onChange={(e) => setFormData({ ...formData, npsn_sekolah_tujuan: e.target.value })} />
              </div>
            </div>
          )}
          <div>
            <Label>Tahun Ajaran</Label>
            <Input value={formData.tahun_ajaran} onChange={(e) => setFormData({ ...formData, tahun_ajaran: e.target.value })} placeholder="Contoh: 2025/2026" />
          </div>
          <div>
            <Label>Alasan</Label>
            <Textarea value={formData.alasan} onChange={(e) => setFormData({ ...formData, alasan: e.target.value })} rows={3} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}