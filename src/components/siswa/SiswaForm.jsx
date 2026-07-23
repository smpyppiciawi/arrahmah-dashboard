import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, X, Loader2 } from "lucide-react";
import RupiahInput from "@/components/ui/RupiahInput";
import MapPicker from "@/components/ui/MapPicker";

const PEKERJAAN_OPTIONS = [
  "Tidak Bekerja", "PNS", "TNI/Polri", "Karyawan Swasta", "Wiraswasta",
  "Pedagang", "Petani", "Nelayan", "Buruh", "Guru",
  "Ibu Rumah Tangga", "Pensiunan", "Sudah Meninggal", "Lainnya"
];

const DEFAULT_FORM = {
  nis: '', nisn: '', nama: '', jenis_kelamin: 'Laki-laki',
  kelas_id: '', nama_kelas: '', tanggal_lahir: '', alamat: '',
  nama_ortu: '', no_telp_ortu: '',
  nama_ibu_kandung: '', nama_ayah_kandung: '', nama_wali: '',
  kontak_list: [],
  pekerjaan_ayah: '', pekerjaan_ibu: '', pekerjaan_wali: '',
  koordinat: '',
  penghasilan_ayah: '', penghasilan_ibu: '', penghasilan_wali: '',
  status: 'Aktif'
};

export default function SiswaForm({ isOpen, onClose, editingData, kelasList }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (isOpen) {
      setFormData(editingData ? { ...DEFAULT_FORM, ...editingData, kontak_list: editingData.kontak_list || [] } : DEFAULT_FORM);
    }
  }, [isOpen, editingData]);

  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));

  const handleKelasChange = (kelasId) => {
    const kelas = kelasList.find(k => k.id === kelasId);
    if (kelas) setFormData(prev => ({ ...prev, kelas_id: kelasId, nama_kelas: kelas.nama_kelas }));
  };

  const addKontak = () => setFormData(prev => ({ ...prev, kontak_list: [...(prev.kontak_list || []), { no_telp: '', hubungan: 'Ibu' }] }));
  const updateKontak = (idx, field, val) => setFormData(prev => ({ ...prev, kontak_list: prev.kontak_list.map((k, i) => i === idx ? { ...k, [field]: val } : k) }));
  const removeKontak = (idx) => setFormData(prev => ({ ...prev, kontak_list: prev.kontak_list.filter((_, i) => i !== idx) }));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Siswa.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['siswa'] }); toast({ title: "Siswa ditambahkan" }); onClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Siswa.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['siswa'] }); toast({ title: "Data diperbarui" }); onClose(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      penghasilan_ayah: formData.penghasilan_ayah ? Number(formData.penghasilan_ayah) : undefined,
      penghasilan_ibu: formData.penghasilan_ibu ? Number(formData.penghasilan_ibu) : undefined,
      penghasilan_wali: formData.penghasilan_wali ? Number(formData.penghasilan_wali) : undefined,
    };
    if (editingData) updateMutation.mutate({ id: editingData.id, data: payload });
    else createMutation.mutate(payload);
  };

  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingData ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>NIS <span className="text-red-500">*</span></Label><Input value={formData.nis} onChange={(e) => set('nis', e.target.value)} required /></div>
            <div><Label>NISN</Label><Input value={formData.nisn} onChange={(e) => set('nisn', e.target.value)} placeholder="Nomor Induk Siswa Nasional" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Nama Lengkap <span className="text-red-500">*</span></Label><Input value={formData.nama} onChange={(e) => set('nama', e.target.value)} required /></div>
            <div>
              <Label>Jenis Kelamin</Label>
              <Select value={formData.jenis_kelamin} onValueChange={(v) => set('jenis_kelamin', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Kelas <span className="text-red-500">*</span></Label>
              <Select value={formData.kelas_id} onValueChange={handleKelasChange}>
                <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                <SelectContent>{kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tanggal Lahir</Label><Input type="date" value={formData.tanggal_lahir} onChange={(e) => set('tanggal_lahir', e.target.value)} /></div>
          </div>
          <div><Label>Alamat</Label><Input value={formData.alamat} onChange={(e) => set('alamat', e.target.value)} /></div>

          <div className="space-y-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
            <Label className="text-xs text-blue-700 uppercase tracking-wide font-semibold">Data Orang Tua / Wali</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label className="text-xs">Nama Ibu Kandung</Label><Input value={formData.nama_ibu_kandung} onChange={(e) => set('nama_ibu_kandung', e.target.value)} /></div>
              <div><Label className="text-xs">Nama Ayah Kandung</Label><Input value={formData.nama_ayah_kandung} onChange={(e) => set('nama_ayah_kandung', e.target.value)} /></div>
              <div><Label className="text-xs">Nama Wali (Opsional)</Label><Input value={formData.nama_wali} onChange={(e) => set('nama_wali', e.target.value)} /></div>
            </div>
          </div>

          <div className="space-y-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-emerald-700 uppercase tracking-wide font-semibold">Kontak HP/WA</Label>
              <Button type="button" size="sm" variant="outline" onClick={addKontak} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" /> Tambah</Button>
            </div>
            {(!formData.kontak_list || formData.kontak_list.length === 0) && <p className="text-xs text-slate-400">Belum ada kontak. Klik "Tambah" untuk menambah.</p>}
            {(formData.kontak_list || []).map((kontak, idx) => (
              <div key={idx} className="flex gap-2">
                <Input value={kontak.no_telp} onChange={(e) => updateKontak(idx, 'no_telp', e.target.value)} placeholder="08xxxxxxxxxx" className="flex-1" />
                <Select value={kontak.hubungan} onValueChange={(v) => updateKontak(idx, 'hubungan', v)}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Ibu">Ibu</SelectItem><SelectItem value="Ayah">Ayah</SelectItem><SelectItem value="Wali">Wali</SelectItem></SelectContent>
                </Select>
                <Button type="button" size="icon" variant="ghost" className="text-red-500" onClick={() => removeKontak(idx)}><X className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>

          <div className="space-y-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
            <Label className="text-xs text-amber-700 uppercase tracking-wide font-semibold">Pekerjaan & Penghasilan</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['pekerjaan_ayah', 'pekerjaan_ibu', 'pekerjaan_wali'].map((field, i) => (
                <div key={field}>
                  <Label className="text-xs">{['Pekerjaan Ayah', 'Pekerjaan Ibu', 'Pekerjaan Wali'][i]}</Label>
                  <Select value={formData[field] || ''} onValueChange={(v) => set(field, v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>{PEKERJAAN_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['penghasilan_ayah', 'penghasilan_ibu', 'penghasilan_wali'].map((field, i) => (
                <div key={field}>
                  <Label className="text-xs">{['Penghasilan Ayah/Bln', 'Penghasilan Ibu/Bln', 'Penghasilan Wali/Bln'][i]}</Label>
                  <RupiahInput value={formData[field]} onChange={(v) => set(field, v)} placeholder="0" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 p-3 bg-violet-50/50 rounded-lg border border-violet-100">
            <Label className="text-xs text-violet-700 uppercase tracking-wide font-semibold">Titik Koordinat Rumah</Label>
            <MapPicker value={formData.koordinat} onChange={(v) => set('koordinat', v)} />
          </div>

          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Aktif">Aktif</SelectItem><SelectItem value="Lulus">Lulus</SelectItem><SelectItem value="Pindah">Pindah</SelectItem><SelectItem value="Keluar">Keluar</SelectItem></SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>Batal</Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : editingData ? 'Simpan Perubahan' : 'Tambah Siswa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}