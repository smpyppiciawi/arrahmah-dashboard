import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, Package, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const KATEGORI_OPTIONS = ['Mebel', 'Elektronik', 'ATK', 'Olahraga', 'Laboratorium', 'Perpustakaan', 'Kebersihan', 'Keamanan', 'Lainnya'];
const KONDISI_OPTIONS = ['Baik', 'Rusak Ringan', 'Rusak Berat'];
const SATUAN_OPTIONS = ['unit', 'set', 'pasang', 'box', 'roll', 'pack', 'lembar', 'batang'];

const EMPTY_FORM = {
  kode_barang: '', nama_barang: '', jenis: 'Sarana', kategori: 'Lainnya',
  sub_kategori: '', kondisi: 'Baik', lokasi: '', tanggal_pengadaan: '',
  sumber_dana: '', harga_satuan: '', jumlah: 1, satuan: 'unit',
  foto_url: '', keterangan: '', status: 'Aktif',
};

function generateKode() {
  return `SPR-${Date.now().toString().slice(-6)}`;
}

export default function SarprasForm({ open, onClose, editingItem, onSaved }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setFormData({ ...EMPTY_FORM, ...editingItem });
      } else {
        setFormData({ ...EMPTY_FORM, kode_barang: generateKode() });
      }
    }
  }, [editingItem, open]);

  const set = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('foto_url', file_url);
      toast({ title: 'Foto terunggah' });
    } catch (err) {
      toast({ title: 'Gagal upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.kode_barang || !formData.nama_barang) {
      toast({ title: 'Lengkapi data', description: 'Kode dan nama barang wajib diisi.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        harga_satuan: formData.harga_satuan ? Number(formData.harga_satuan) : undefined,
        jumlah: formData.jumlah ? Number(formData.jumlah) : 1,
      };
      if (editingItem) {
        await base44.entities.Sarpras.update(editingItem.id, payload);
        toast({ title: 'Diperbarui', description: `${formData.nama_barang} berhasil diperbarui.` });
      } else {
        await base44.entities.Sarpras.create(payload);
        toast({ title: 'Ditambahkan', description: `${formData.nama_barang} berhasil ditambahkan.` });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast({ title: 'Gagal menyimpan', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="w-5 h-5 text-teal-500" />
            {editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Kode Barang *</Label>
              <Input value={formData.kode_barang} onChange={(e) => set('kode_barang', e.target.value)} placeholder="SPR-000001" className="font-mono" />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => set('kode_barang', generateKode())}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Auto
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs">Nama Barang *</Label>
            <Input value={formData.nama_barang} onChange={(e) => set('nama_barang', e.target.value)} placeholder="Meja Belajar" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Jenis</Label>
              <Select value={formData.jenis} onValueChange={(v) => set('jenis', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sarana">Sarana</SelectItem>
                  <SelectItem value="Prasarana">Prasarana</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Kategori</Label>
              <Select value={formData.kategori} onValueChange={(v) => set('kategori', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Sub Kategori</Label>
              <Input value={formData.sub_kategori || ''} onChange={(e) => set('sub_kategori', e.target.value)} placeholder="Meja Lipat" />
            </div>
            <div>
              <Label className="text-xs">Kondisi</Label>
              <Select value={formData.kondisi} onValueChange={(v) => set('kondisi', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KONDISI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Lokasi</Label>
              <Input value={formData.lokasi || ''} onChange={(e) => set('lokasi', e.target.value)} placeholder="Ruang Kelas 7A" />
            </div>
            <div>
              <Label className="text-xs">Tanggal Pengadaan</Label>
              <Input type="date" value={formData.tanggal_pengadaan || ''} onChange={(e) => set('tanggal_pengadaan', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Sumber Dana</Label>
              <Input value={formData.sumber_dana || ''} onChange={(e) => set('sumber_dana', e.target.value)} placeholder="BOS" />
            </div>
            <div>
              <Label className="text-xs">Harga Satuan (Rp)</Label>
              <Input type="number" value={formData.harga_satuan || ''} onChange={(e) => set('harga_satuan', e.target.value)} placeholder="150000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Jumlah</Label>
              <Input type="number" value={formData.jumlah || ''} onChange={(e) => set('jumlah', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Satuan</Label>
              <Select value={formData.satuan} onValueChange={(v) => set('satuan', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SATUAN_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Foto Barang</Label>
            <div className="flex items-center gap-3">
              {formData.foto_url && <img src={formData.foto_url} alt="foto" className="w-16 h-16 object-cover rounded-lg border" />}
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('sarpras-foto-upload').click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                {formData.foto_url ? 'Ganti Foto' : 'Upload Foto'}
              </Button>
              <input type="file" accept="image/*" id="sarpras-foto-upload" className="hidden" onChange={handleUpload} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Keterangan</Label>
            <Textarea value={formData.keterangan || ''} onChange={(e) => set('keterangan', e.target.value)} placeholder="Catatan tambahan..." rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {editingItem ? 'Simpan Perubahan' : 'Tambah'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}