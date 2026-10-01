import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { Search, AlertTriangle, Lock, Info, ImagePlus, X, Loader2 } from "lucide-react";
import { compressImage } from '@/lib/imageCompress';
import { recomputeRaporForSiswa, isPendingPoin } from '@/lib/raporStatus';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const HARI_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const getHariFromTanggal = (tgl) => { try { return HARI_ID[new Date(tgl + 'T00:00:00').getDay()]; } catch { return ''; } };

export default function PelanggaranImprovementFormDialog({ open, onOpenChange, siswaList, kelasList, guruList, currentUser, kodePelanggaranList, editing, tahunAjaran, prefillSiswa, jadwalPiketList, pelanggaranImprovementExisting }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
    kode_pelanggaran_id: '', kategori_utama: '', kode: '', uraian_pelanggaran: '',
    rincian: '', tindak_lanjut: '', poin_min: 0, poin_max: 0, poin: 0,
    pelapor_id: '', pelapor_nama: '', pencatat_id: '', pencatat_nama: '', tahun_ajaran: tahunAjaran || '', status: 'Proses', foto_urls: []
  });
  const [openSiswaSearch, setOpenSiswaSearch] = useState(false);
  const [pelaporFocused, setPelaporFocused] = useState(false);
  const [searchSiswa, setSearchSiswa] = useState('');
  const [openKodeSearch, setOpenKodeSearch] = useState(false);
  const [searchKode, setSearchKode] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  // Rincian acuan otomatis dari DB (ditampilkan sebagai placeholder, bukan nilai)
  const [rincianHint, setRincianHint] = useState('');
  const [showDupConfirm, setShowDupConfirm] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  const isGuru = currentUser?.role === 'guru';

  // Pencatat = Petugas Piket hari ini (dari Jadwal Piket)
  const myGuru = useMemo(() => (guruList || []).find(g => g.email && g.email === currentUser?.email), [guruList, currentUser]);
  const hariForm = getHariFromTanggal(formData.tanggal);
  const piketHari = useMemo(() => (jadwalPiketList || []).find(j => j.hari === hariForm && j.aktif !== false), [jadwalPiketList, hariForm]);
  const piketOptions = useMemo(() => piketHari?.petugas || [], [piketHari]);

  // Default PENCATAT otomatis ke user login bila dia termasuk petugas piket hari itu
  useEffect(() => {
    if (!open || editing || !piketOptions.length) return;
    if (formData.pencatat_id && piketOptions.some(p => p.guru_id === formData.pencatat_id)) return;
    const match = piketOptions.find(p => p.guru_id === myGuru?.id) || piketOptions.find(p => p.nama_pegawai === currentUser?.full_name);
    if (match) setFormData(f => ({ ...f, pencatat_id: match.guru_id, pencatat_nama: match.nama_pegawai }));
  }, [open, editing, piketOptions, myGuru, currentUser]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      // Record lama (sebelum ada field pencatat): nilai pelapor_nama lama = pencatat piket
      const pencatat = editing.pencatat_nama
        ? { pencatat_id: editing.pencatat_id || '', pencatat_nama: editing.pencatat_nama }
        : { pencatat_id: editing.pelapor_id || '', pencatat_nama: editing.pelapor_nama || '' };
      setFormData({ ...formData, ...editing, ...pencatat, pelapor_id: editing.pencatat_nama ? (editing.pelapor_id || '') : '', pelapor_nama: editing.pencatat_nama ? (editing.pelapor_nama || '') : '', foto_urls: editing.foto_urls || [] });
      setRincianHint(editing.rincian || '');
    } else {
      const f = {
        tanggal: new Date().toISOString().split('T')[0],
        siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
        kode_pelanggaran_id: '', kategori_utama: '', kode: '', uraian_pelanggaran: '',
        rincian: '', tindak_lanjut: '', poin_min: 0, poin_max: 0, poin: 0,
        pelapor_id: '', pelapor_nama: '', pencatat_id: '', pencatat_nama: '', tahun_ajaran: tahunAjaran || '', status: 'Proses', foto_urls: []
      };
      if (prefillSiswa) { f.siswa_id = prefillSiswa.id; f.nis = prefillSiswa.nis; f.nama_siswa = prefillSiswa.nama; f.kelas_id = prefillSiswa.kelas_id; f.nama_kelas = prefillSiswa.nama_kelas; }
      setRincianHint('');
      setFormData(f);
    }
  }, [open, editing, currentUser, tahunAjaran, prefillSiswa]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PelanggaranImprovement.create(data),
    onSuccess: (_d, vars) => {
      if (vars?.siswa_id) { recomputeRaporForSiswa(vars.siswa_id).catch(() => {}); }
      queryClient.invalidateQueries({ queryKey: ['pelanggaran-improvement'] });
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      // Notifikasi Pelanggaran Berulang: siswa tercatat dengan kode yang sama >= 3x (termasuk record ini)
      if (!editing && vars?.siswa_id && vars?.kode) {
        const count = (pelanggaranImprovementExisting || []).filter(r => r.siswa_id === vars.siswa_id && r.kode === vars.kode && r.status !== 'Dibatalkan').length + 1;
        if (count >= 3) {
          toast({
            title: "⚠️ Pelanggaran Berulang",
            description: `${vars.nama_siswa} (${vars.nama_kelas}) kini tercatat [${vars.kode}] sebanyak ${count}x. Mohon perhatian & tindak lanjut Wali Kelas.`,
            duration: 8000,
          });
        }
      }
      handleClose();
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PelanggaranImprovement.update(id, data),
    onSuccess: (_d, vars) => {
      const sid = vars?.data?.siswa_id || vars?.id;
      if (sid) { recomputeRaporForSiswa(sid).catch(() => {}); }
      queryClient.invalidateQueries({ queryKey: ['pelanggaran-improvement'] });
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      handleClose();
    }
  });

  const handleClose = () => {
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
      kode_pelanggaran_id: '', kategori_utama: '', kode: '', uraian_pelanggaran: '',
      rincian: '', tindak_lanjut: '', poin_min: 0, poin_max: 0, poin: 0,
      pelapor_id: '', pelapor_nama: '', pencatat_id: '', pencatat_nama: '', tahun_ajaran: '', status: 'Proses', foto_urls: []
    });
    setOpenSiswaSearch(false); setSearchSiswa(''); setOpenKodeSearch(false); setSearchKode('');
    setRincianHint('');
    onOpenChange(false);
  };

  const filteredSiswa = useMemo(() => {
    const aktif = (siswaList || []).filter(s => s.status === 'Aktif');
    const byKelas = filterKelas ? aktif.filter(s => s.kelas_id === filterKelas) : aktif;
    return byKelas.sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaList, filterKelas]);

  const filteredKode = useMemo(() => {
    const aktif = (kodePelanggaranList || []).filter(k => k.aktif !== false);
    if (!searchKode) return aktif;
    const s = searchKode.toLowerCase();
    return aktif.filter(k => k.kode?.toLowerCase().includes(s) || k.uraian?.toLowerCase().includes(s) || k.kategori_utama?.toLowerCase().includes(s));
  }, [kodePelanggaranList, searchKode]);

  const handleSelectSiswa = (siswa) => {
    setFormData(f => ({ ...f, siswa_id: siswa.id, nis: siswa.nis, nama_siswa: siswa.nama, kelas_id: siswa.kelas_id, nama_kelas: siswa.nama_kelas }));
    setOpenSiswaSearch(false); setSearchSiswa('');
  };

  const handleSelectKode = (kode) => {
    setFormData(f => ({
      ...f,
      kode_pelanggaran_id: kode.id,
      kategori_utama: kode.kategori_utama,
      kode: kode.kode,
      uraian_pelanggaran: kode.uraian,
      rincian: '',
      tindak_lanjut: kode.tindak_lanjut || '',
      poin_min: kode.poin_min || 0,
      poin_max: kode.poin_max || 0,
      poin: kode.poin_min || 0
    }));
    setRincianHint(kode.rincian || '');
    setOpenKodeSearch(false); setSearchKode('');
  };

  // Bebas mengetik tanpa peringatan — validasi rentang hanya muncul saat keluar dari kolom (blur)
  const handlePoinChange = (val) => {
    setFormData(f => ({ ...f, poin: val === '' ? '' : (Number(val) || 0) }));
  };

  const validasiPoin = () => {
    const p = formData.poin === '' ? null : Number(formData.poin);
    if (p === null) return true;
    if (formData.poin_min && p < formData.poin_min) {
      toast({ title: `Poin di bawah minimum (${formData.poin_min})`, description: 'Nilai dipertahankan agar bisa langsung dikoreksi.', variant: "destructive" });
      return false;
    }
    if (formData.poin_max && p > formData.poin_max) {
      toast({ title: `Poin di atas maksimum (${formData.poin_max})`, description: 'Nilai dipertahankan agar bisa langsung dikoreksi.', variant: "destructive" });
      return false;
    }
    return true;
  };

  const handlePencatatChange = (gid) => {
    const p = piketOptions.find(x => x.guru_id === gid);
    if (p) { setFormData({ ...formData, pencatat_id: p.guru_id, pencatat_nama: p.nama_pegawai }); return; }
    const g = guruList.find(x => x.id === gid);
    if (g) setFormData({ ...formData, pencatat_id: g.id, pencatat_nama: g.nama });
  };

  // Saran nama pegawai untuk isian Pelapor (diketik manual, dropdown muncul saat fokus)
  const pelaporSuggestions = useMemo(() => {
    const q = (formData.pelapor_nama || '').toLowerCase().trim();
    if (!q) return (guruList || []).filter(g => g.status !== 'Keluar').slice(0, 8);
    return (guruList || [])
      .filter(g => g.nama?.toLowerCase().includes(q))
      .sort((a, b) => a.nama.toLowerCase().indexOf(q) - b.nama.toLowerCase().indexOf(q))
      .slice(0, 8);
  }, [guruList, formData.pelapor_nama]);

  const buildPayload = () => {
    const finalStatus = isPendingPoin(formData.poin) ? 'Pending' : (formData.status || 'Proses');
    return { ...formData, status: finalStatus, rincian: formData.rincian?.trim() ? formData.rincian : rincianHint };
  };

  const isDuplicate = () => {
    if (editing) return false;
    // Kriteria ganda: siswa + tanggal + kode sama (apapun kodenya, meski uraian/rincian diedit).
    return (pelanggaranImprovementExisting || []).some(r =>
      r.tanggal === formData.tanggal &&
      r.siswa_id === formData.siswa_id &&
      r.kode === formData.kode
    );
  };

  const doCreate = (payload) => {
    if (isPendingPoin(formData.poin)) {
      toast({ title: "Pelanggaran berstatus Pending", description: "Poin ≥ 100 menunggu Approval sebelum terakumulasi." });
    }
    createMutation.mutate(payload);
  };

  const handleFotoChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploadingFoto(true);
    try {
      const urls = [];
      for (const f of files) {
        // Kompresi otomatis: maks 1600px, JPEG 75% — tetap jelas saat dicetak/dilihat, ringan diunggah
        const compressed = await compressImage(f);
        const res = await base44.integrations.Core.UploadPublicFile({ file: compressed });
        if (res?.file_url) urls.push(res.file_url);
      }
      setFormData(prev => ({ ...prev, foto_urls: [...(prev.foto_urls || []), ...urls] }));
    } catch (err) {
      toast({ title: 'Gagal mengunggah foto', description: err?.message || 'Terjadi kesalahan', variant: 'destructive' });
    } finally {
      setUploadingFoto(false);
    }
  };

  const removeFoto = (idx) => setFormData(prev => ({ ...prev, foto_urls: (prev.foto_urls || []).filter((_, i) => i !== idx) }));

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!formData.siswa_id) { toast({ title: "Pilih siswa terlebih dahulu", variant: "destructive" }); return; }
    if (!formData.kode_pelanggaran_id) { toast({ title: "Pilih kode pelanggaran", variant: "destructive" }); return; }
    if (!formData.pencatat_id && !formData.pencatat_nama) { toast({ title: "Pilih pencatat", variant: "destructive" }); return; }
    if (!validasiPoin()) return;
    const payload = buildPayload();
    if (editing) { updateMutation.mutate({ id: editing.id, data: payload }); return; }
    if (isDuplicate()) { setPendingPayload(payload); setShowDupConfirm(true); return; }
    doCreate(payload);
  };

  const handleDupConfirm = () => {
    setShowDupConfirm(false);
    if (pendingPayload) doCreate(pendingPayload);
    setPendingPayload(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> {editing ? 'Edit Pelanggaran' : 'Tambah Pelanggaran'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tanggal</Label>
            <Input
              type="date"
              value={formData.tanggal}
              onChange={(e) => {
                const newTanggal = e.target.value;
                const newHari = getHariFromTanggal(newTanggal);
                const newPiket = (jadwalPiketList || []).find(j => j.hari === newHari && j.aktif !== false)?.petugas || [];
                setFormData(f => {
                  if (newPiket.length && !newPiket.some(p => p.guru_id === f.pencatat_id)) {
                    const match = newPiket.find(p => p.guru_id === myGuru?.id) || newPiket.find(p => p.nama_pegawai === currentUser?.full_name);
                    return { ...f, tanggal: newTanggal, pencatat_id: match?.guru_id || '', pencatat_nama: match?.nama_pegawai || '' };
                  }
                  return { ...f, tanggal: newTanggal };
                });
              }}
              required
            />
            {hariForm && <p className="text-xs text-slate-500 mt-1">Hari: {hariForm}</p>}
          </div>

          {/* Filter Kelas (opsional) */}
          <div>
            <Label>Pilih Kelas <span className="text-xs text-slate-400">(opsional — untuk memfilter siswa)</span></Label>
            <Select value={filterKelas || 'all'} onValueChange={(v) => setFilterKelas(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Cari Nama/Kelas */}
          <div>
            <Label>Cari Nama Siswa / Kelas</Label>
            <Popover open={openSiswaSearch} onOpenChange={setOpenSiswaSearch}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Search className="w-4 h-4 mr-2 text-slate-400" />
                  {formData.nama_siswa ? `${formData.nama_siswa} — ${formData.nama_kelas}` : "Ketik nama siswa atau kelas..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cari nama / NIS / kelas..." value={searchSiswa} onValueChange={setSearchSiswa} />
                  <CommandList className="max-h-72">
                    <CommandEmpty>Tidak ditemukan</CommandEmpty>
                    <CommandGroup heading={`Siswa Aktif (${filteredSiswa.length})`}>
                      {filteredSiswa.map(s => (
                        <CommandItem key={s.id} value={`${s.nama} ${s.nis} ${s.nama_kelas}`} onSelect={() => handleSelectSiswa(s)} className="cursor-pointer">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{s.nama}</span>
                            <Badge variant="outline" className="text-xs">{s.nama_kelas}</Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Cari Pelanggaran */}
          <div>
            <Label>Cari Pelanggaran</Label>
            <Popover open={openKodeSearch} onOpenChange={setOpenKodeSearch}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Search className="w-4 h-4 mr-2 text-slate-400" />
                  {formData.kode ? `[${formData.kode}] ${formData.uraian_pelanggaran?.substring(0, 40)}...` : "Ketik keyword pelanggaran..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[520px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cari kode / uraian / kategori..." value={searchKode} onValueChange={setSearchKode} />
                  <CommandList className="max-h-80">
                    <CommandEmpty>Tidak ditemukan</CommandEmpty>
                    <CommandGroup heading={`Daftar Pelanggaran (${filteredKode.length})`}>
                      {filteredKode.map(k => (
                        <CommandItem key={k.id} value={`${k.kode} ${k.uraian} ${k.kategori_utama}`} onSelect={() => handleSelectKode(k)} className="cursor-pointer py-2">
                          <div className="flex items-start justify-between w-full gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded">{k.kode}</span>
                                <Badge variant="outline" className="text-[10px]">{k.kategori_utama}</Badge>
                              </div>
                              <p className="text-sm text-slate-600 mt-1 line-clamp-1">{k.uraian}</p>
                            </div>
                            <Badge className="bg-slate-700 text-white shrink-0 text-xs">{k.poin_min}{k.poin_max > k.poin_min ? `–${k.poin_max}` : ''} poin</Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Kategori Utama (auto, read-only) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kategori Utama <Lock className="w-3 h-3 inline ml-1 text-slate-400" /></Label>
              <Input value={formData.kategori_utama} readOnly className="bg-slate-100" placeholder="Otomatis dari kode pelanggaran" />
            </div>
            <div>
              <Label>Tindak Lanjut <Lock className="w-3 h-3 inline ml-1 text-slate-400" /></Label>
              <Input value={formData.tindak_lanjut} readOnly className="bg-slate-100" placeholder="Otomatis dari kode pelanggaran" />
            </div>
          </div>

          {/* Uraian (auto, editable) */}
          <div>
            <Label>Uraian Pelanggaran <span className="text-xs text-slate-400">(dapat diedit/tambah)</span></Label>
            <Textarea value={formData.uraian_pelanggaran} onChange={(e) => setFormData({ ...formData, uraian_pelanggaran: e.target.value })} required />
          </div>

          {/* Rincian (acuan otomatis sebagai placeholder, dapat diisi manual) */}
          <div>
            <Label>Rincian <span className="text-xs text-slate-400">(acuan otomatis, dapat diedit sesuai keadaan)</span></Label>
            <Textarea
              value={formData.rincian}
              onChange={(e) => setFormData({ ...formData, rincian: e.target.value })}
              rows={2}
              placeholder={rincianHint || "Ketik rincian pelanggaran sesuai keadaan..."}
            />
          </div>

          {/* Foto Bukti (bisa lebih dari 1 — otomatis dikompresi) */}
          <div>
            <Label>Foto Bukti <span className="text-xs text-slate-400">(opsional, bisa lebih dari 1)</span></Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {(formData.foto_urls || []).map((url, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                  <img src={url} alt={`foto-${idx + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeFoto(idx)} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600" title="Hapus foto">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${uploadingFoto ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-red-400 hover:bg-red-50'}`}>
                {uploadingFoto ? <Loader2 className="w-5 h-5 animate-spin text-red-500" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFotoChange} disabled={uploadingFoto} />
              </label>
            </div>
          </div>

          {/* Poin (default min, within range) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Poin <span className="text-xs text-slate-400">(default min, rentang {formData.poin_min}–{formData.poin_max})</span></Label>
              <Input type="number" inputMode="numeric" value={formData.poin} onChange={(e) => handlePoinChange(e.target.value)} onBlur={validasiPoin} required />
              <p className="text-xs text-slate-500 mt-1">Min: {formData.poin_min} · Max: {formData.poin_max}</p>
            </div>
            <div>
              <Label>Status {isPendingPoin(formData.poin) && <span className="text-xs text-amber-600">(otomatis Pending)</span>}</Label>
              {isPendingPoin(formData.poin) ? (
                <Input value="Pending" readOnly className="bg-amber-50 text-amber-700 font-medium" />
              ) : (
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Proses">Proses</SelectItem>
                    <SelectItem value="Selesai">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {isPendingPoin(formData.poin) && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Poin ≥ 100 otomatis berstatus <b>Pending</b> dan belum terakumulasi ke Poin Bersih. Poin akan terakumulasi setelah disetujui melalui fitur <b>Approval Poin</b>.</span>
            </div>
          )}

          {/* Pelapor — ketik manual, dropdown saran nama pegawai muncul saat kolom diklik */}
          <div className="relative">
            <Label>Pelapor <span className="text-xs text-slate-400">(ketik manual — klik kolom untuk saran nama pegawai)</span></Label>
            <Input
              value={formData.pelapor_nama}
              onChange={(e) => setFormData({ ...formData, pelapor_nama: e.target.value, pelapor_id: '' })}
              onFocus={() => setPelaporFocused(true)}
              onBlur={() => setTimeout(() => setPelaporFocused(false), 150)}
              placeholder="Ketik nama pelapor..."
              autoComplete="off"
            />
            {pelaporFocused && pelaporSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {pelaporSuggestions.map(g => (
                  <button
                    type="button"
                    key={g.id}
                    onMouseDown={() => { setFormData(f => ({ ...f, pelapor_nama: g.nama, pelapor_id: g.id })); setPelaporFocused(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                  >
                    {g.nama}
                  </button>
                ))}
              </div>
            )}
            {formData.pelapor_id && <p className="text-xs text-slate-500 mt-1">Pelapor terdata sebagai pegawai ✓</p>}
          </div>

          {/* Pencatat (Petugas Piket hari itu) */}
          <div>
            <Label>Pencatat {piketOptions.length > 0 ? <span className="text-xs text-slate-400">(Petugas Piket {hariForm})</span> : <span className="text-xs text-amber-600">(Belum ada Jadwal Piket)</span>}</Label>
            {isGuru && currentUser && piketOptions.length > 0 && piketOptions.some(p => p.guru_id === myGuru?.id) ? (
              <Input value={currentUser.full_name} readOnly className="bg-slate-100" />
            ) : (
              <Select value={formData.pencatat_id} onValueChange={handlePencatatChange}>
                <SelectTrigger><SelectValue placeholder={piketOptions.length ? "Pilih Pencatat (Petugas Piket)" : "Pilih Guru/Pegawai"} /></SelectTrigger>
                <SelectContent>
                  {piketOptions.length > 0
                    ? piketOptions.map(p => <SelectItem key={p.guru_id} value={p.guru_id}>{p.nama_pegawai}{p.nip ? ` — ${p.nip}` : ''}</SelectItem>)
                    : guruList.map(g => <SelectItem key={g.id} value={g.id}>{g.nama} — {g.jabatan || 'Guru'}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {piketOptions.length === 0 && <p className="text-xs text-amber-600 mt-1">Belum ada Jadwal Piket untuk hari {hariForm || 'ini'}. Menggunakan daftar Guru/Pegawai.</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Batal</Button>
            <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">{editing ? 'Simpan' : 'Tambah Pelanggaran'}</Button>
          </div>
        </form>

        <AlertDialog open={showDupConfirm} onOpenChange={setShowDupConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Isian Ganda Terdeteksi</AlertDialogTitle>
              <AlertDialogDescription>
                Terdeteksi record pelanggaran dengan Tanggal, Siswa, dan Kode yang sama sudah tercatat sebelumnya. Apakah benar data ini tetap akan disimpan?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setShowDupConfirm(false); setPendingPayload(null); }}>Tidak</AlertDialogCancel>
              <AlertDialogAction onClick={handleDupConfirm} className="bg-red-600 hover:bg-red-700">Ya, tetap input</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}