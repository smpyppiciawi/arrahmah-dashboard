import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, X, Camera, Image as ImageIcon, CheckCircle2, Search } from "lucide-react";
import RupiahInput from "@/components/ui/RupiahInput";
import MapPicker from "@/components/ui/MapPicker";

function ToggleButton({ value, options, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(value === opt ? '' : opt)}
          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${value === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function MultiToggleButton({ value = [], options, onChange }) {
  const toggle = (opt) => onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${value.includes(opt) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function PhotoField({ label, value, onChange, uploading, onUpload, fileName }) {
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [value]);
  return (
    <div>
      <Label className="text-xs mb-1.5 block">{label}</Label>
      {value && !imgError ? (
        <div className="space-y-1.5">
          <a href={value} target="_blank" rel="noopener noreferrer" className="relative block w-full group">
            <img src={value} alt={label} className="h-28 w-full object-cover rounded-lg border" onError={() => setImgError(true)} />
            <span className="absolute inset-0 rounded-lg flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition pointer-events-none">
              <span className="opacity-0 group-hover:opacity-100 text-white text-[11px] font-medium bg-black/60 px-2 py-1 rounded">Buka full</span>
            </span>
            <button type="button" onClick={(e) => { e.preventDefault(); onChange(''); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow"><X className="w-3 h-3" /></button>
          </a>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 rounded px-2 py-1">
            <CheckCircle2 className="w-3 h-3 shrink-0" /> <span className="truncate">{fileName || 'Foto terunggah'}</span>
          </div>
          <div className="flex gap-1.5">
            <label className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-lg py-1.5 hover:bg-blue-100 transition">
              <Camera className="w-3.5 h-3.5" /> Kamera
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} disabled={uploading} />
            </label>
            <label className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-lg py-1.5 hover:bg-slate-100 transition">
              <ImageIcon className="w-3.5 h-3.5" /> Galeri
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} disabled={uploading} />
            </label>
          </div>
        </div>
      ) : value && imgError ? (
        <div className="space-y-1.5">
          <a href={value} target="_blank" rel="noopener noreferrer" className="block h-28 w-full rounded-lg border border-amber-200 bg-amber-50 flex flex-col items-center justify-center gap-1 text-amber-600">
            <ImageIcon className="w-6 h-6" />
            <span className="text-[11px] font-medium">Pratinjau gagal · Buka file</span>
          </a>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 rounded px-2 py-1">
            <CheckCircle2 className="w-3 h-3 shrink-0" /> <span className="truncate">{fileName || 'Foto terunggah'}</span>
          </div>
          <button type="button" onClick={() => onChange('')} className="w-full text-xs text-red-600 border border-red-200 bg-red-50 rounded-lg py-1.5 hover:bg-red-100">Hapus Foto</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          <label className="flex flex-col items-center justify-center gap-1 cursor-pointer border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition h-28 bg-blue-50/40">
            <Camera className="w-5 h-5 text-blue-500" />
            <span className="text-xs text-blue-600 font-medium">{uploading ? 'Mengunggah...' : 'Ambil Foto'}</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} disabled={uploading} />
          </label>
          <label className="flex flex-col items-center justify-center gap-1 cursor-pointer border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-50 transition h-28">
            <ImageIcon className="w-5 h-5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">{uploading ? 'Mengunggah...' : 'Dari Galeri'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} disabled={uploading} />
          </label>
        </div>
      )}
    </div>
  );
}

const DEFAULT_FORM = {
  siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
  tanggal_homevisit: new Date().toISOString().split('T')[0],
  tinggal_dengan: '', keadaan_orang_tua: '', pekerjaan_orang_tua: '',
  status_tempat_tinggal: '', keadaan_lingkungan: [], keadaan_rumah: '',
  kendaraan: '', kendaraan_jenis: [], kendaraan_roda2_unit: '', kendaraan_roda4_unit: '',
  transportasi_sekolah: [],
  siswa_mengaji: '', tempat_mengaji: '',
  orang_tua_merokok: '', perokok: '',
  koordinat_rumah: '',
  punya_hp_pribadi: '', frekuensi_cek_hp: '', foto_hp_url: '',
  ada_wifi: '', merk_internet: '', jaringan_internet: '',
  pembiayaan_sekolah: '', penghasilan_orang_tua: '',
  penghasilan_tambahan: '', keterangan_penghasilan_tambahan: '',
  periode_uang_jajan: '', nominal_uang_jajan: '',
  foto_rumah_dalam: '', foto_rumah_luar: '', foto_bersama: '',
  catatan_tambahan: '',
};

export default function HomeVisitForm({ isOpen, onClose, editingData, siswaList, kelasList, currentUser, activeAcademicYear, addPending, waliKelasIds = [] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [filterKelas, setFilterKelas] = useState('');
  const [siswaSearch, setSiswaSearch] = useState('');
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [showCatatanPopup, setShowCatatanPopup] = useState(false);
  const [fotoNames, setFotoNames] = useState({});
  const [mapMounted, setMapMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(editingData ? { ...DEFAULT_FORM, ...editingData } : { ...DEFAULT_FORM, tanggal_homevisit: new Date().toISOString().split('T')[0] });
      // Auto-select first wali kelas class
      const defaultKelas = editingData?.kelas_id || (waliKelasIds.length > 0 ? waliKelasIds[0] : '');
      setFilterKelas(defaultKelas);
      setSiswaSearch('');
    }
  }, [isOpen, editingData]);

  // Tunda mount peta hingga animasi buka Dialog selesai agar ukuran container
  // sudah final (mencegah Leaflet render hanya 1 tile / cramped).
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setMapMounted(true), 300);
      return () => clearTimeout(t);
    }
    setMapMounted(false);
  }, [isOpen]);

  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));
  const filteredSiswa = useMemo(() => {
    let list = filterKelas ? siswaList.filter(s => s.kelas_id === filterKelas) : siswaList;
    if (siswaSearch) list = list.filter(s => s.nama.toLowerCase().includes(siswaSearch.toLowerCase()) || s.nis?.includes(siswaSearch));
    return list.sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaList, filterKelas, siswaSearch]);

  const handleSiswaSelect = (siswaId) => {
    const siswa = siswaList.find(s => s.id === siswaId);
    if (siswa) setFormData(prev => ({
      ...prev, siswa_id: siswa.id, nis: siswa.nis, nama_siswa: siswa.nama, kelas_id: siswa.kelas_id, nama_kelas: siswa.nama_kelas,
      koordinat_rumah: prev.koordinat_rumah || siswa.koordinat || '',
    }));
  };

  const handleChangeSiswa = () => {
    setFormData(prev => ({ ...prev, siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '' }));
    setSiswaSearch('');
  };

  // Sync koordinat_rumah → Siswa.koordinat (bidirectional integration)
  const syncKoordinatToSiswa = () => {
    if (formData.siswa_id && formData.koordinat_rumah) {
      const siswa = siswaList.find(s => s.id === formData.siswa_id);
      if (siswa && siswa.koordinat !== formData.koordinat_rumah) {
        base44.entities.Siswa.update(formData.siswa_id, { koordinat: formData.koordinat_rumah })
          .then(() => queryClient.invalidateQueries({ queryKey: ['siswa'] }))
          .catch(() => {});
      }
    }
  };

  const handleFotoUpload = async (file, field) => {
    if (!file) return;
    setUploadingFoto(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      try {
        const driveRes = await base44.functions.invoke('uploadToGoogleDrive', { file_url: result.file_url, filename: `homevisit_${field}_${Date.now()}.jpg` });
        set(field, driveRes.data.file_url || result.file_url);
      } catch {
        set(field, result.file_url);
      }
      setFotoNames(prev => ({ ...prev, [field]: file.name }));
    } catch { toast({ title: "Gagal upload foto", variant: "destructive" }); }
    finally { setUploadingFoto(false); }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HomeVisit.create(data),
    onSuccess: () => { syncKoordinatToSiswa(); queryClient.invalidateQueries({ queryKey: ['homeVisit'] }); toast({ title: "Data home visit tersimpan" }); onClose(); },
    onError: (error, variables) => {
      if (addPending && (!navigator.onLine || error?.message?.includes('network') || error?.message?.includes('fetch'))) {
        addPending(variables);
        toast({ title: "Data tersimpan offline", description: "Akan tersinkron saat ada koneksi" });
        onClose();
      } else {
        toast({ title: "Gagal menyimpan data", variant: "destructive" });
      }
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HomeVisit.update(id, data),
    onSuccess: () => { syncKoordinatToSiswa(); queryClient.invalidateQueries({ queryKey: ['homeVisit'] }); toast({ title: "Data diperbarui" }); onClose(); },
  });

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!filterKelas) { toast({ title: "Pilih kelas terlebih dahulu", variant: "destructive" }); return; }
    if (!formData.siswa_id || !formData.nama_siswa) { toast({ title: "Pilih siswa terlebih dahulu", variant: "destructive" }); return; }
    if (!formData.tanggal_homevisit) { toast({ title: "Tanggal home visit wajib diisi", variant: "destructive" }); return; }
    const payload = {
      ...formData,
      guru_id: currentUser?.id || '', nama_guru: currentUser?.full_name || '', tahun_ajaran: activeAcademicYear || '',
      penghasilan_orang_tua: formData.penghasilan_orang_tua ? Number(formData.penghasilan_orang_tua) : undefined,
      nominal_uang_jajan: formData.nominal_uang_jajan ? Number(formData.nominal_uang_jajan) : undefined,
      kendaraan_roda2_unit: formData.kendaraan_roda2_unit ? Number(formData.kendaraan_roda2_unit) : undefined,
      kendaraan_roda4_unit: formData.kendaraan_roda4_unit ? Number(formData.kendaraan_roda4_unit) : undefined,
    };
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: payload });
    } else if (!navigator.onLine && addPending) {
      addPending(payload);
      toast({ title: "Data tersimpan offline", description: "Akan tersinkron saat ada koneksi" });
      onClose();
    } else {
      createMutation.mutate(payload);
    }
    setShowCatatanPopup(false);
  };

  const submitting = createMutation.isPending || updateMutation.isPending;
  const showKendaraanDetail = formData.kendaraan === 'Ada' || formData.kendaraan === 'Pribeli/Angsuran';
  const photoFields = [
    { field: 'foto_rumah_dalam', label: 'Foto Rumah Tampak Dalam' },
    { field: 'foto_rumah_luar', label: 'Foto Rumah Tampak Luar' },
    { field: 'foto_bersama', label: 'Foto Bersama Orang Tua/Siswa' },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingData ? 'Edit Home Visit' : 'Home Visit Baru'}</DialogTitle></DialogHeader>
          <form className="space-y-4">
            <div className="space-y-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
              <Label className="text-xs text-blue-700 uppercase tracking-wide font-semibold">Data Siswa</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Pilih Kelas <span className="text-red-500">*</span></Label>
                  <Select value={filterKelas} onValueChange={setFilterKelas}>
                    <SelectTrigger><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                    <SelectContent>{kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Cari & Pilih Siswa <span className="text-red-500">*</span></Label>
                  {formData.siswa_id ? (
                    <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-blue-800 truncate">✓ {formData.nama_siswa}</p>
                        <p className="text-xs text-blue-600">{formData.nis} · {formData.nama_kelas}</p>
                      </div>
                      <button type="button" onClick={handleChangeSiswa} className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-100 shrink-0">Ganti</button>
                    </div>
                  ) : (
                    <>
                      <div className="relative mb-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md outline-none focus:ring-1 focus:ring-blue-400" placeholder="Cari nama/NIS..." value={siswaSearch} onChange={e => setSiswaSearch(e.target.value)} />
                      </div>
                      <div className="max-h-36 overflow-y-auto border rounded-md bg-white">
                        {filteredSiswa.slice(0, 40).map(s => (
                          <button key={s.id} type="button" onClick={() => handleSiswaSelect(s.id)} className={`w-full flex items-center justify-between px-3 py-1.5 text-sm border-b border-slate-50 hover:bg-blue-50 text-left ${formData.siswa_id === s.id ? 'bg-blue-100 font-semibold' : ''}`}>
                            <span>{s.nama}</span><span className="text-xs text-slate-400">{s.nis}</span>
                          </button>
                        ))}
                        {filteredSiswa.length === 0 && <p className="text-center text-xs text-slate-400 py-3">Tidak ditemukan</p>}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div><Label className="text-xs">Tanggal Home Visit <span className="text-red-500">*</span></Label><Input type="date" value={formData.tanggal_homevisit} onChange={(e) => set('tanggal_homevisit', e.target.value)} required /></div>
            </div>

            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
              <Label className="text-xs text-slate-700 uppercase tracking-wide font-semibold">Kondisi Keluarga</Label>
              <div><Label className="text-xs mb-1.5 block">Tinggal Dengan Siapa?</Label><Select value={formData.tinggal_dengan || ''} onValueChange={(v) => set('tinggal_dengan', v)}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{["Orang Tua Kandung/Sambung","Kakek/Nenek","Saudara Kandung","Bibi/Paman","Panti"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs mb-1.5 block">Keadaan Orang Tua?</Label><Select value={formData.keadaan_orang_tua || ''} onValueChange={(v) => set('keadaan_orang_tua', v)}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{["Lengkap","Pisah/Cerai","Yatim/Piatu/Yatim Piatu"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs mb-1.5 block">Pekerjaan Orang Tua</Label><Input value={formData.pekerjaan_orang_tua} onChange={(e) => set('pekerjaan_orang_tua', e.target.value)} placeholder="Pekerjaan orang tua/wali" /></div>
              <div><Label className="text-xs mb-1.5 block">Status Tempat Tinggal?</Label><Select value={formData.status_tempat_tinggal || ''} onValueChange={(v) => set('status_tempat_tinggal', v)}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{["Milik Pribadi","Bukan Milik","Sewa/Kontrak","Rumah Bersama"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
            </div>

            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
              <Label className="text-xs text-slate-700 uppercase tracking-wide font-semibold">Lingkungan & Rumah</Label>
              <div><Label className="text-xs mb-1.5 block">Keadaan Lingkungan Rumah?</Label><MultiToggleButton value={formData.keadaan_lingkungan} options={["Pesantren","Padat Penduduk","Kawasan Industri","Perkebunan"]} onChange={(v) => set('keadaan_lingkungan', v)} /></div>
              <div><Label className="text-xs mb-1.5 block">Keadaan Rumah?</Label><ToggleButton value={formData.keadaan_rumah} options={["Layak Huni","Tidak Layak Huni"]} onChange={(v) => set('keadaan_rumah', v)} /></div>
            </div>

            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
              <Label className="text-xs text-slate-700 uppercase tracking-wide font-semibold">Kendaraan & Transportasi</Label>
              <div><Label className="text-xs mb-1.5 block">Apakah memiliki Kendaraan?</Label><ToggleButton value={formData.kendaraan} options={["Ada","Pribeli/Angsuran","Tidak"]} onChange={(v) => set('kendaraan', v)} /></div>
              {showKendaraanDetail && (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                  <div><Label className="text-xs mb-1.5 block">Jenis Kendaraan</Label><MultiToggleButton value={formData.kendaraan_jenis} options={["Roda 2","Roda 4"]} onChange={(v) => set('kendaraan_jenis', v)} /></div>
                  {formData.kendaraan_jenis.includes("Roda 2") && <div><Label className="text-xs">Jumlah Unit Roda 2</Label><Input type="number" min="0" value={formData.kendaraan_roda2_unit} onChange={(e) => set('kendaraan_roda2_unit', e.target.value)} className="max-w-32" /></div>}
                  {formData.kendaraan_jenis.includes("Roda 4") && <div><Label className="text-xs">Jumlah Unit Roda 4</Label><Input type="number" min="0" value={formData.kendaraan_roda4_unit} onChange={(e) => set('kendaraan_roda4_unit', e.target.value)} className="max-w-32" /></div>}
                </div>
              )}
              <div><Label className="text-xs mb-1.5 block">Berangkat ke Sekolah menggunakan? (pilih satu atau lebih)</Label><MultiToggleButton value={formData.transportasi_sekolah} options={["Motor Pribadi","Mobil Pribadi","Jalan Kaki","Sepeda","Ojek/Ojol","Angkot","Mini Bus/Bus/Omprengan"]} onChange={(v) => set('transportasi_sekolah', v)} /></div>
            </div>

            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
              <Label className="text-xs text-slate-700 uppercase tracking-wide font-semibold">Kegiatan Siswa</Label>
              <div><Label className="text-xs mb-1.5 block">Siswa mengaji?</Label><ToggleButton value={formData.siswa_mengaji} options={["Mengaji","Tidak"]} onChange={(v) => set('siswa_mengaji', v)} /></div>
              {formData.siswa_mengaji === 'Mengaji' && <div><Label className="text-xs mb-1.5 block">Tempat Mengaji</Label><ToggleButton value={formData.tempat_mengaji} options={["Rumah","Madrasah"]} onChange={(v) => set('tempat_mengaji', v)} /></div>}
              <div><Label className="text-xs mb-1.5 block">Orang Tua Merokok?</Label><ToggleButton value={formData.orang_tua_merokok} options={["Ya","Tidak"]} onChange={(v) => set('orang_tua_merokok', v)} /></div>
              {formData.orang_tua_merokok === 'Ya' && <div><Label className="text-xs mb-1.5 block">Siapa yang Merokok?</Label><ToggleButton value={formData.perokok} options={["Ayah","Ibu","Keduanya"]} onChange={(v) => set('perokok', v)} /></div>}
            </div>

            <div className="space-y-2 p-3 bg-violet-50/50 rounded-lg border border-violet-100 isolate">
              <Label className="text-xs text-violet-700 uppercase tracking-wide font-semibold">Titik Koordinat Rumah Siswa <span className="text-violet-400 normal-case font-normal">(otomatis tersimpan ke Profil Siswa)</span></Label>
              {mapMounted ? (
                <MapPicker value={formData.koordinat_rumah} onChange={(v) => set('koordinat_rumah', v)} />
              ) : (
                <div className="h-[320px] rounded-lg border border-violet-200 bg-violet-50/40 flex items-center justify-center text-xs text-violet-400">Memuat peta…</div>
              )}
            </div>

            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
              <Label className="text-xs text-slate-700 uppercase tracking-wide font-semibold">HP & Internet</Label>
              <div><Label className="text-xs mb-1.5 block">Siswa mempunyai HP Pribadi?</Label><ToggleButton value={formData.punya_hp_pribadi} options={["Ya","Tidak"]} onChange={(v) => set('punya_hp_pribadi', v)} /></div>
              {formData.punya_hp_pribadi === 'Ya' && (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                  <div><Label className="text-xs mb-1.5 block">Seberapa sering Bapak/Ibu memeriksanya?</Label><ToggleButton value={formData.frekuensi_cek_hp} options={["Sangat Sering","Jarang","Tidak Pernah"]} onChange={(v) => set('frekuensi_cek_hp', v)} /></div>
                  <PhotoField label="Foto Merk/Tipe HP" value={formData.foto_hp_url} onChange={(v) => set('foto_hp_url', v)} uploading={uploadingFoto} onUpload={(file) => handleFotoUpload(file, 'foto_hp_url')} fileName={fotoNames.foto_hp_url} />
                </div>
              )}
              <div><Label className="text-xs mb-1.5 block">Di rumah terdapat Wifi?</Label><ToggleButton value={formData.ada_wifi} options={["Ya","Tidak"]} onChange={(v) => set('ada_wifi', v)} /></div>
              {formData.ada_wifi === 'Ya' && <div><Label className="text-xs">Merk Internet</Label><Input value={formData.merk_internet} onChange={(e) => set('merk_internet', e.target.value)} placeholder="Contoh: Indihome, Biznet" /></div>}
              {formData.ada_wifi === 'Tidak' && <div><Label className="text-xs mb-1.5 block">Jaringan Internet</Label><Select value={formData.jaringan_internet || ''} onValueChange={(v) => set('jaringan_internet', v)}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{["Telkomsel","Indosat/Tri","XL/Axis","Smartfren","Lainnya"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>}
            </div>

            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
              <Label className="text-xs text-slate-700 uppercase tracking-wide font-semibold">Pembiayaan & Penghasilan</Label>
              <div><Label className="text-xs mb-1.5 block">Pembiayaan Sekolah</Label><Select value={formData.pembiayaan_sekolah || ''} onValueChange={(v) => set('pembiayaan_sekolah', v)}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{["Orang Tua","Wali Siswa","Donatur","Beasiswa Sekolah"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Penghasilan/Pemasukan Orang Tua per Bulan</Label><RupiahInput value={formData.penghasilan_orang_tua} onChange={(v) => set('penghasilan_orang_tua', v)} placeholder="0" /></div>
              <div><Label className="text-xs mb-1.5 block">Penghasilan/Pemasukan Tambahan?</Label><ToggleButton value={formData.penghasilan_tambahan} options={["Ada","Tidak"]} onChange={(v) => set('penghasilan_tambahan', v)} /></div>
              {formData.penghasilan_tambahan === 'Ada' && <div><Label className="text-xs">Keterangan Penghasilan Tambahan</Label><Textarea value={formData.keterangan_penghasilan_tambahan} onChange={(e) => set('keterangan_penghasilan_tambahan', e.target.value)} placeholder="Sumber penghasilan tambahan" rows={2} /></div>}
            </div>

            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
              <Label className="text-xs text-slate-700 uppercase tracking-wide font-semibold">Uang Jajan Siswa</Label>
              <div><Label className="text-xs mb-1.5 block">Periode Uang Jajan</Label><ToggleButton value={formData.periode_uang_jajan} options={["Hari","Minggu","Bulan"]} onChange={(v) => set('periode_uang_jajan', v)} /></div>
              {formData.periode_uang_jajan && <div><Label className="text-xs">Nominal Uang Jajan</Label><RupiahInput value={formData.nominal_uang_jajan} onChange={(v) => set('nominal_uang_jajan', v)} placeholder="0" /></div>}
            </div>

            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
              <Label className="text-xs text-slate-700 uppercase tracking-wide font-semibold">Foto Dokumentasi</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {photoFields.map(item => (
                  <PhotoField key={item.field} label={item.label} value={formData[item.field]} onChange={(v) => set(item.field, v)} uploading={uploadingFoto} onUpload={(file) => handleFotoUpload(file, item.field)} fileName={fotoNames[item.field]} />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>Batal</Button>
              <Button type="button" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => setShowCatatanPopup(true)} disabled={submitting}>
                {editingData ? 'Lanjut' : 'Selesai'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCatatanPopup} onOpenChange={setShowCatatanPopup}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Catatan Khusus</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Apakah ada catatan khusus untuk home visit ini?</p>
          <Textarea value={formData.catatan_tambahan} onChange={(e) => set('catatan_tambahan', e.target.value)} placeholder="Catatan khusus (opsional)..." rows={3} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCatatanPopup(false)}>Kembali</Button>
            <Button type="button" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => handleSubmit()} disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}