import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, X, Loader2, UserPlus, LogIn } from "lucide-react";
import { format } from "date-fns";
import MapPicker from "@/components/ui/MapPicker";
import { useActiveAcademicYear } from "@/context/ActiveAcademicYearContext";
import { PENDIDIKAN_OPTIONS, PEKERJAAN_OPTIONS, PENGHASILAN_OPTIONS, AGAMA_OPTIONS } from "@/lib/dapodikConstants";

const REGISTRASI_OPTIONS = ['Siswa Baru', 'Naik Kelas', 'Mengulang'];
const autoRegistrasi = (tingkat) => (tingkat === '7' ? 'Siswa Baru' : 'Naik Kelas');

const DEFAULT_MUTASI = () => ({
  nama: '', tahun_ajaran: '', tanggal_masuk: format(new Date(), 'yyyy-MM-dd'),
  nama_sekolah_asal: '', npsn_sekolah_asal: '', kelas_tujuan_id: '', alasan: ''
});

const DEFAULT_FORM = {
  nis: '', nisn: '', registrasi: '', nama: '', jenis_kelamin: 'Laki-laki',
  kelas_id: '', nama_kelas: '', tempat_lahir: '', tanggal_lahir: '', nik: '', agama: 'Islam',
  alamat: '', rt: '', rw: '', kelurahan: '', kecamatan: '',
  nama_ayah_kandung: '', nama_ibu_kandung: '', nama_wali: '',
  tahun_lahir_ayah: '', pendidikan_ayah: '', pekerjaan_ayah: '', penghasilan_ayah: '', nik_ayah: '',
  tahun_lahir_ibu: '', pendidikan_ibu: '', pekerjaan_ibu: '', penghasilan_ibu: '', nik_ibu: '',
  tahun_lahir_wali: '', pendidikan_wali: '', pekerjaan_wali: '', penghasilan_wali: '', nik_wali: '',
  kontak_list: [],
  penerima_kip: 'Tidak',
  koordinat: '',
  status: 'Aktif'
};

const ORTU_SECTIONS = [
  { key: 'ayah', label: 'Ayah', namaField: 'nama_ayah_kandung', color: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
  { key: 'ibu', label: 'Ibu', namaField: 'nama_ibu_kandung', color: 'bg-pink-50 border-pink-100', text: 'text-pink-700' },
  { key: 'wali', label: 'Wali', namaField: 'nama_wali', color: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
];

export default function SiswaForm({ isOpen, onClose, editingData, kelasList }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeAcademicYear } = useActiveAcademicYear();
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [mode, setMode] = useState('normal'); // 'normal' | 'mutasi'
  const [mutasiStep, setMutasiStep] = useState(1); // 1: data mutasi awal, 2: data siswa lengkap
  const [mutasiData, setMutasiData] = useState(DEFAULT_MUTASI);

  useEffect(() => {
    if (isOpen) {
      setFormData(editingData ? { ...DEFAULT_FORM, ...editingData, kontak_list: editingData.kontak_list || [] } : DEFAULT_FORM);
      setMode('normal');
      setMutasiStep(1);
      setMutasiData(DEFAULT_MUTASI());
    }
  }, [isOpen, editingData]);

  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));
  const setMutasi = (field, val) => setMutasiData(prev => ({ ...prev, [field]: val }));

  // Opsi tahun ajaran: tahun ajaran aktif + 5 tahun sebelumnya
  const taOptions = React.useMemo(() => {
    const ta = activeAcademicYear || '';
    const m = ta.match(/^(\d{4})\/(\d{4})$/);
    if (!m) return ta ? [ta] : [];
    const a = parseInt(m[1], 10);
    return Array.from({ length: 6 }, (_, i) => `${a - i}/${a + 1 - i}`);
  }, [activeAcademicYear]);

  const handleKelasChange = (kelasId) => {
    const kelas = kelasList.find(k => k.id === kelasId);
    if (kelas) setFormData(prev => ({
      ...prev, kelas_id: kelasId, nama_kelas: kelas.nama_kelas,
      registrasi: autoRegistrasi(kelas.tingkat || kelas.nama_kelas?.[0])
    }));
  };

  const addKontak = () => setFormData(prev => ({ ...prev, kontak_list: [...(prev.kontak_list || []), { no_telp: '', hubungan: 'Ibu' }] }));
  const updateKontak = (idx, field, val) => setFormData(prev => ({ ...prev, kontak_list: prev.kontak_list.map((k, i) => i === idx ? { ...k, [field]: val } : k) }));
  const removeKontak = (idx) => setFormData(prev => ({ ...prev, kontak_list: prev.kontak_list.filter((_, i) => i !== idx) }));

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const siswa = await base44.entities.Siswa.create(data);
      if (mode === 'mutasi') {
        await base44.entities.SiswaMasuk.create({
          siswa_id: siswa.id,
          nisn: data.nisn || '',
          nama: mutasiData.nama || data.nama,
          jenis_kelamin: data.jenis_kelamin || '',
          kelas_tujuan: data.nama_kelas || '',
          tahun_ajaran: mutasiData.tahun_ajaran || activeAcademicYear || '',
          tanggal_masuk: mutasiData.tanggal_masuk || format(new Date(), 'yyyy-MM-dd'),
          nama_sekolah_asal: mutasiData.nama_sekolah_asal || '',
          npsn_sekolah_asal: mutasiData.npsn_sekolah_asal || '',
          alasan_pindah: mutasiData.alasan || '',
        });
      }
      return siswa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      queryClient.invalidateQueries({ queryKey: ['siswaMasuk'] });
      toast({ title: mode === 'mutasi' ? 'Siswa Mutasi Masuk ditambahkan' : 'Siswa ditambahkan' });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Siswa.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['siswa'] }); toast({ title: "Data diperbarui" }); onClose(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingData) updateMutation.mutate({ id: editingData.id, data: formData });
    else createMutation.mutate(formData);
  };

  // Step 1 Mutasi Masuk → lanjut ke form data siswa
  const proceedMutasi = (e) => {
    e.preventDefault();
    if (!mutasiData.nama.trim() || !mutasiData.kelas_tujuan_id) {
      toast({ title: 'Lengkapi Nama Siswa dan Kelas Tujuan', variant: 'destructive' });
      return;
    }
    const kelas = kelasList.find(k => k.id === mutasiData.kelas_tujuan_id);
    setFormData(prev => ({
      ...prev,
      nama: mutasiData.nama,
      kelas_id: mutasiData.kelas_tujuan_id,
      nama_kelas: kelas?.nama_kelas || '',
      registrasi: autoRegistrasi(kelas?.tingkat || kelas?.nama_kelas?.[0])
    }));
    setMutasiStep(2);
  };

  const submitting = createMutation.isPending || updateMutation.isPending;
  const isMutasiAwal = !editingData && mode === 'mutasi' && mutasiStep === 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingData ? 'Edit Data Siswa'
              : isMutasiAwal ? 'Mutasi Masuk — Data Awal'
              : mode === 'mutasi' ? 'Mutasi Masuk — Data Siswa'
              : 'Tambah Siswa Baru'}
          </DialogTitle>
        </DialogHeader>

        {/* Pilihan jenis siswa (hanya saat tambah) */}
        {!editingData && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === 'normal' ? 'default' : 'outline'}
              className={mode === 'normal' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              onClick={() => setMode('normal')}
            >
              <UserPlus className="w-4 h-4 mr-2" /> Tambah Siswa
            </Button>
            <Button
              type="button"
              variant={mode === 'mutasi' ? 'default' : 'outline'}
              className={mode === 'mutasi' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              onClick={() => { setMode('mutasi'); setMutasiStep(1); }}
            >
              <LogIn className="w-4 h-4 mr-2" /> Mutasi Masuk
            </Button>
          </div>
        )}

        {isMutasiAwal ? (
          /* ===== Form awal Mutasi Masuk ===== */
          <form onSubmit={proceedMutasi} className="space-y-4">
            <div className="space-y-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
              <Label className="text-xs text-amber-700 uppercase tracking-wide font-semibold">Data Mutasi Masuk</Label>
              <div>
                <Label className="text-xs">Nama Siswa <span className="text-red-500">*</span></Label>
                <Input value={mutasiData.nama} onChange={(e) => setMutasi('nama', e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tahun Ajaran</Label>
                  <Select value={mutasiData.tahun_ajaran || activeAcademicYear || undefined} onValueChange={(v) => setMutasi('tahun_ajaran', v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih Tahun Ajaran" /></SelectTrigger>
                    <SelectContent>
                      {taOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tanggal Masuk</Label>
                  <Input type="date" value={mutasiData.tanggal_masuk} onChange={(e) => setMutasi('tanggal_masuk', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nama Sekolah Asal</Label>
                  <Input value={mutasiData.nama_sekolah_asal} onChange={(e) => setMutasi('nama_sekolah_asal', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">NPSN Sekolah Asal</Label>
                  <Input value={mutasiData.npsn_sekolah_asal} onChange={(e) => setMutasi('npsn_sekolah_asal', e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Kelas Tujuan <span className="text-red-500">*</span></Label>
                <Select value={mutasiData.kelas_tujuan_id} onValueChange={(v) => setMutasi('kelas_tujuan_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                  <SelectContent>{kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Alasan Pindah</Label>
                <Input value={mutasiData.alasan} onChange={(e) => setMutasi('alasan', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Simpan &amp; Lanjutkan</Button>
            </div>
          </form>
        ) : (
          /* ===== Form data siswa (normal / lanjutan mutasi) ===== */
          <>
            {mode === 'mutasi' && !editingData && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <LogIn className="w-4 h-4 flex-shrink-0" />
                <span><b>{mutasiData.nama}</b> → {formData.nama_kelas}{mutasiData.nama_sekolah_asal ? ` (asal: ${mutasiData.nama_sekolah_asal})` : ''}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Data Diri */}
              <div className="space-y-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <Label className="text-xs text-blue-700 uppercase tracking-wide font-semibold">Data Diri</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label className="text-xs">NIS <span className="text-red-500">*</span></Label><Input value={formData.nis} onChange={(e) => set('nis', e.target.value)} required /></div>
                  <div><Label className="text-xs">NISN</Label><Input value={formData.nisn} onChange={(e) => set('nisn', e.target.value)} /></div>
                  <div>
                    <Label className="text-xs">Registrasi</Label>
                    <Select value={formData.registrasi || undefined} onValueChange={(v) => set('registrasi', v)}>
                      <SelectTrigger><SelectValue placeholder="Auto dari Kelas" /></SelectTrigger>
                      <SelectContent>{REGISTRASI_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label className="text-xs">Nama Lengkap <span className="text-red-500">*</span></Label><Input value={formData.nama} onChange={(e) => set('nama', e.target.value)} required /></div>
                  <div><Label className="text-xs">Jenis Kelamin</Label>
                    <Select value={formData.jenis_kelamin} onValueChange={(v) => set('jenis_kelamin', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label className="text-xs">Kelas <span className="text-red-500">*</span></Label>
                    <Select value={formData.kelas_id} onValueChange={handleKelasChange}>
                      <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                      <SelectContent>{kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Tempat Lahir</Label><Input value={formData.tempat_lahir} onChange={(e) => set('tempat_lahir', e.target.value)} /></div>
                  <div><Label className="text-xs">Tanggal Lahir</Label><Input type="date" value={formData.tanggal_lahir} onChange={(e) => set('tanggal_lahir', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label className="text-xs">NIK</Label><Input value={formData.nik} onChange={(e) => set('nik', e.target.value)} /></div>
                  <div><Label className="text-xs">Agama</Label>
                    <Select value={formData.agama} onValueChange={(v) => set('agama', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{AGAMA_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Alamat */}
              <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Label className="text-xs text-slate-700 uppercase tracking-wide font-semibold">Alamat</Label>
                <div><Label className="text-xs">Alamat (Jalan)</Label><Input value={formData.alamat} onChange={(e) => set('alamat', e.target.value)} /></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><Label className="text-xs">RT</Label><Input value={formData.rt} onChange={(e) => set('rt', e.target.value)} /></div>
                  <div><Label className="text-xs">RW</Label><Input value={formData.rw} onChange={(e) => set('rw', e.target.value)} /></div>
                  <div><Label className="text-xs">Kelurahan</Label><Input value={formData.kelurahan} onChange={(e) => set('kelurahan', e.target.value)} /></div>
                  <div><Label className="text-xs">Kecamatan</Label><Input value={formData.kecamatan} onChange={(e) => set('kecamatan', e.target.value)} /></div>
                </div>
              </div>

              {/* Data Orang Tua/Wali */}
              {ORTU_SECTIONS.map((section) => (
                <div key={section.key} className={`space-y-3 p-3 rounded-lg border ${section.color}`}>
                  <Label className={`text-xs uppercase tracking-wide font-semibold ${section.text}`}>{`Data ${section.label}`}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label className="text-xs">Nama {section.label}</Label><Input value={formData[section.namaField] || ''} onChange={(e) => set(section.namaField, e.target.value)} /></div>
                    <div><Label className="text-xs">Tahun Lahir</Label><Input value={formData[`tahun_lahir_${section.key}`] || ''} onChange={(e) => set(`tahun_lahir_${section.key}`, e.target.value)} placeholder="Contoh: 1985" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><Label className="text-xs">Pendidikan</Label>
                      <Select value={formData[`pendidikan_${section.key}`] || ''} onValueChange={(v) => set(`pendidikan_${section.key}`, v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>{PENDIDIKAN_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Pekerjaan</Label>
                      <Select value={formData[`pekerjaan_${section.key}`] || ''} onValueChange={(v) => set(`pekerjaan_${section.key}`, v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>{PEKERJAAN_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Penghasilan</Label>
                      <Select value={formData[`penghasilan_${section.key}`] || ''} onValueChange={(v) => set(`penghasilan_${section.key}`, v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>{PENGHASILAN_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label className="text-xs">NIK {section.label}</Label><Input value={formData[`nik_${section.key}`] || ''} onChange={(e) => set(`nik_${section.key}`, e.target.value)} /></div>
                </div>
              ))}

              {/* Kontak WA */}
              <div className="space-y-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-emerald-700 uppercase tracking-wide font-semibold">Kontak HP/WA</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addKontak} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" /> Tambah</Button>
                </div>
                {(!formData.kontak_list || formData.kontak_list.length === 0) && <p className="text-xs text-slate-400">Belum ada kontak.</p>}
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

              {/* Koordinat & Lainnya */}
              <div className="space-y-2 p-3 bg-violet-50/50 rounded-lg border border-violet-100">
                <Label className="text-xs text-violet-700 uppercase tracking-wide font-semibold">Lainnya</Label>
                <MapPicker value={formData.koordinat} onChange={(v) => set('koordinat', v)} />
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Penerima KIP</Label>
                    <Select value={formData.penerima_kip} onValueChange={(v) => set('penerima_kip', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Tidak">Tidak</SelectItem><SelectItem value="Ya">Ya</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => set('status', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Aktif">Aktif</SelectItem><SelectItem value="Lulus">Lulus</SelectItem><SelectItem value="Pindah">Pindah</SelectItem><SelectItem value="Keluar">Keluar</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>Batal</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : editingData ? 'Simpan Perubahan' : 'Tambah Siswa'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}