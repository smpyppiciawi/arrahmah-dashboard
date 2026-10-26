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
import { Switch } from "@/components/ui/switch";
import { Search, TrendingDown, Lock, ImagePlus, X, Loader2, Check } from "lucide-react";
import { compressImage } from '@/lib/imageCompress';
import { getMingguKey } from '@/lib/dapodikConstants';
import { recomputeRaporForSiswa } from '@/lib/raporStatus';

const HARI_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const getHariFromTanggal = (tgl) => { try { return HARI_ID[new Date(tgl + 'T00:00:00').getDay()]; } catch { return ''; } };

export default function ImprovementFormDialog({ open, onOpenChange, siswaList, guruList, currentUser, improvementList, kegiatanList, pengaturan, editing, tahunAjaran, prefillSiswa, jadwalPiketList }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
    kegiatan_pembinaan_id: '', kegiatan_pembinaan_nama: '', kategori: 'Perilaku',
    uraian: '', poin_pengurangan: 0, sesuai_penetapan: false,
    limit_mingguan: 30, limit_universal_applied: true, minggu_key: '',
    validator_id: '', validator_nama: '', tahun_ajaran: '', catatan: '', status: 'Aktif', foto_urls: []
  });
  const [openSiswaSearch, setOpenSiswaSearch] = useState(false);
  const [searchSiswa, setSearchSiswa] = useState('');
  const [openKegiatanSearch, setOpenKegiatanSearch] = useState(false);
  const [searchKegiatan, setSearchKegiatan] = useState('');
  const [uploadingFoto, setUploadingFoto] = useState(false);
  // Pencatatan Kolektif: satu improvement yang sama dicatat untuk banyak siswa dalam 1 kelas
  const [kolektif, setKolektif] = useState(false);
  const [selectedSiswaIds, setSelectedSiswaIds] = useState([]);
  const [filterKelas, setFilterKelas] = useState('');

  const isGuru = currentUser?.role === 'guru';
  const limitUniversalAktif = pengaturan?.limit_universal_aktif ?? true;
  const limitUniversal = pengaturan?.limit_mingguan_universal ?? 30;

  // Validator = Petugas Piket hari ini (dari Jadwal Piket)
  const myGuru = useMemo(() => (guruList || []).find(g => g.email && g.email === currentUser?.email), [guruList, currentUser]);
  const hariForm = getHariFromTanggal(formData.tanggal);
  const piketHari = useMemo(() => (jadwalPiketList || []).find(j => j.hari === hariForm && j.aktif !== false), [jadwalPiketList, hariForm]);
  const piketOptions = useMemo(() => piketHari?.petugas || [], [piketHari]);

  useEffect(() => {
    if (!open || editing || !piketOptions.length) return;
    if (formData.validator_id && piketOptions.some(p => p.guru_id === formData.validator_id)) return;
    const match = piketOptions.find(p => p.guru_id === myGuru?.id) || piketOptions.find(p => p.nama_pegawai === currentUser?.full_name);
    if (match) setFormData(f => ({ ...f, validator_id: match.guru_id, validator_nama: match.nama_pegawai }));
  }, [open, editing, piketOptions, myGuru, currentUser]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setFormData({ ...formData, ...editing, foto_urls: editing.foto_urls || [] });
    } else {
      const f = {
        tanggal: new Date().toISOString().split('T')[0],
        siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
        kegiatan_pembinaan_id: '', kegiatan_pembinaan_nama: '', kategori: 'Perilaku',
        uraian: '', poin_pengurangan: 0, sesuai_penetapan: false,
        limit_mingguan: limitUniversalAktif ? limitUniversal : 30, limit_universal_applied: limitUniversalAktif,
        minggu_key: '', validator_id: '', validator_nama: '', tahun_ajaran: tahunAjaran || '', catatan: '', status: 'Aktif', foto_urls: []
      };
      if (prefillSiswa) { f.siswa_id = prefillSiswa.id; f.nis = prefillSiswa.nis; f.nama_siswa = prefillSiswa.nama; f.kelas_id = prefillSiswa.kelas_id; f.nama_kelas = prefillSiswa.nama_kelas; }
      setKolektif(false); setSelectedSiswaIds([]);
      setFormData(f);
    }
  }, [open, editing, currentUser, tahunAjaran, prefillSiswa, limitUniversalAktif, limitUniversal]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Improvement.create(data),
    onSuccess: (_d, vars) => {
      if (vars?.siswa_id) { recomputeRaporForSiswa(vars.siswa_id).catch(() => {}); }
      queryClient.invalidateQueries({ queryKey: ['improvement'] });
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      handleClose();
    }
  });
  const createManyMutation = useMutation({
    mutationFn: (rows) => base44.entities.Improvement.bulkCreate(rows),
    onSuccess: (_d, rows) => {
      rows.forEach(r => { if (r.siswa_id) recomputeRaporForSiswa(r.siswa_id).catch(() => {}); });
      queryClient.invalidateQueries({ queryKey: ['improvement'] });
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      toast({ title: 'Improvement kolektif tersimpan', description: `${rows.length} siswa tercatat dengan improvement yang sama.` });
      handleClose();
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Improvement.update(id, data),
    onSuccess: (_d, vars) => {
      const sid = vars?.data?.siswa_id;
      if (sid) { recomputeRaporForSiswa(sid).catch(() => {}); }
      queryClient.invalidateQueries({ queryKey: ['improvement'] });
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      handleClose();
    }
  });

  const handleClose = () => {
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
      kegiatan_pembinaan_id: '', kegiatan_pembinaan_nama: '', kategori: 'Perilaku',
      uraian: '', poin_pengurangan: 0, sesuai_penetapan: false,
      limit_mingguan: 30, limit_universal_applied: true, minggu_key: '',
      validator_id: '', validator_nama: '', tahun_ajaran: '', catatan: '', status: 'Aktif', foto_urls: []
    });
    setOpenSiswaSearch(false); setSearchSiswa(''); setOpenKegiatanSearch(false); setSearchKegiatan('');
    setKolektif(false); setSelectedSiswaIds([]);
    onOpenChange(false);
  };

  const activeSiswa = useMemo(() => (siswaList || []).filter(s => s.status === 'Aktif'), [siswaList]);
  const kelasOpsi = useMemo(() => {
    const map = new Map();
    activeSiswa.forEach(s => { if (s.kelas_id) map.set(s.kelas_id, s.nama_kelas || ''); });
    return [...map.entries()].map(([id, nama]) => ({ id, nama })).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [activeSiswa]);
  const siswaKelas = useMemo(() => {
    if (!filterKelas) return [];
    return activeSiswa.filter(s => s.kelas_id === filterKelas).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [activeSiswa, filterKelas]);
  const filteredSiswa = useMemo(() => {
    const byKelas = filterKelas ? activeSiswa.filter(s => s.kelas_id === filterKelas) : activeSiswa;
    if (!searchSiswa) return [...byKelas].sort((a, b) => a.nama.localeCompare(b.nama));
    const q = searchSiswa.toLowerCase();
    return byKelas.filter(s => s.nama?.toLowerCase().includes(q) || s.nis?.toLowerCase().includes(q) || s.nama_kelas?.toLowerCase().includes(q)).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [activeSiswa, searchSiswa, filterKelas]);

  const aktifKegiatan = useMemo(() => (kegiatanList || []).filter(k => k.aktif !== false), [kegiatanList]);
  const filteredKegiatan = useMemo(() => {
    if (!searchKegiatan) return aktifKegiatan;
    const s = searchKegiatan.toLowerCase();
    return aktifKegiatan.filter(k => k.kegiatan?.toLowerCase().includes(s));
  }, [aktifKegiatan, searchKegiatan]);

  const handleSelectSiswa = (siswa) => {
    setFormData(f => ({ ...f, siswa_id: siswa.id, nis: siswa.nis, nama_siswa: siswa.nama, kelas_id: siswa.kelas_id, nama_kelas: siswa.nama_kelas }));
    setOpenSiswaSearch(false); setSearchSiswa('');
  };

  const handleSelectKegiatan = (keg) => {
    const poin = keg.sesuai_penetapan ? 0 : (keg.poin_default || 0);
    setFormData(f => ({
      ...f,
      kegiatan_pembinaan_id: keg.id,
      kegiatan_pembinaan_nama: keg.kegiatan,
      sesuai_penetapan: keg.sesuai_penetapan || false,
      poin_pengurangan: poin,
      uraian: f.uraian || keg.kegiatan
    }));
    setOpenKegiatanSearch(false); setSearchKegiatan('');
  };

  const handleValidatorChange = (guruId) => {
    const g = guruList.find(x => x.id === guruId);
    if (g) setFormData(f => ({ ...f, validator_id: g.id, validator_nama: g.nama }));
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
    e.preventDefault();
    if (!formData.kegiatan_pembinaan_id) { toast({ title: "Pilih kegiatan pembinaan", variant: "destructive" }); return; }
    if (!formData.validator_id) { toast({ title: "Pilih validator", variant: "destructive" }); return; }
    const minggu_key = getMingguKey(new Date(formData.tanggal));
    const poin = Number(formData.poin_pengurangan) || 0;
    const limit = Number(formData.limit_mingguan) || 0;
    const used = (siswaId) => (improvementList || [])
      .filter(i => i.siswa_id === siswaId && i.minggu_key === minggu_key && i.status === 'Aktif' && i.id !== editing?.id)
      .reduce((s, i) => s + (Number(i.poin_pengurangan) || 0), 0);
    const payload = { ...formData, poin_pengurangan: poin, limit_mingguan: limit, minggu_key, limit_universal_applied: limitUniversalAktif };

    // Kolektif: satu improvement dicatat untuk semua siswa terpilih di kelas
    if (kolektif && !editing) {
      if (!filterKelas) { toast({ title: "Pilih kelas untuk pencatatan kolektif", variant: "destructive" }); return; }
      if (!selectedSiswaIds.length) { toast({ title: "Centang siswa yang mengikuti improvement", variant: "destructive" }); return; }
      const terpilih = siswaKelas.filter(s => selectedSiswaIds.includes(s.id));
      const lewat = terpilih.filter(s => used(s.id) + poin > limit);
      if (lewat.length) {
        toast({
          title: "Limit mingguan terlampaui",
          description: `${lewat.length} siswa sudah mencapai limit ${limit}/minggu (${lewat.slice(0, 3).map(s => s.nama).join(', ')}${lewat.length > 3 ? '…' : ''}).`,
          variant: "destructive"
        });
        return;
      }
      createManyMutation.mutate(terpilih.map(s => ({
        ...payload,
        siswa_id: s.id, nis: s.nis, nama_siswa: s.nama,
        kelas_id: s.kelas_id, nama_kelas: s.nama_kelas,
      })));
      return;
    }

    if (!formData.siswa_id) { toast({ title: "Pilih siswa terlebih dahulu", variant: "destructive" }); return; }
    const usedPoin = used(formData.siswa_id);
    if (usedPoin + poin > limit) {
      toast({ title: "Limit mingguan terlampaui", description: `Terpakai ${usedPoin} + ${poin} = ${usedPoin + poin} poin melebihi limit ${limit}/minggu`, variant: "destructive" });
      return;
    }
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-emerald-700 flex items-center gap-2">
            <TrendingDown className="w-5 h-5" /> {editing ? 'Edit Improvement' : 'Tambah Improvement'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tanggal</Label>
            <Input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} required />
          </div>

          {/* Pilih Kelas + saklar Pencatatan Kolektif (sejajar) */}
          {!editing && (
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0">
                <Label>Pilih Kelas <span className="text-xs text-slate-400">(opsional — untuk memfilter siswa)</span></Label>
                <Select
                  value={filterKelas || 'all'}
                  onValueChange={(v) => { setFilterKelas(v === 'all' ? '' : v); setSelectedSiswaIds([]); }}
                >
                  <SelectTrigger><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {kelasOpsi.map(k => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pb-2 shrink-0">
                <Switch
                  id="kolektif-improvement"
                  checked={kolektif}
                  onCheckedChange={(v) => { setKolektif(v); setSelectedSiswaIds([]); }}
                />
                <Label htmlFor="kolektif-improvement" className="text-xs font-medium cursor-pointer whitespace-nowrap">Kolektif</Label>
              </div>
            </div>
          )}
          {kolektif && !editing && !filterKelas && (
            <p className="text-xs text-amber-600 -mt-2">Pilih kelas dulu untuk menampilkan daftar siswa kolektif.</p>
          )}

          {/* Mode kolektif: ceklis banyak siswa 1 kelas. Mode biasa: cari 1 siswa */}
          {kolektif && !editing ? (
            <div>
              <Label>Daftar Siswa Kelas <span className="text-xs text-slate-400">(centang siswa yang mengikuti)</span></Label>
              <div className="mt-1 border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                {siswaKelas.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-slate-400 text-center">Pilih kelas terlebih dahulu untuk menampilkan daftar siswa.</p>
                ) : siswaKelas.map(s => {
                  const on = selectedSiswaIds.includes(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSelectedSiswaIds(p => on ? p.filter(x => x !== s.id) : [...p, s.id])}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white'}`}>
                        {on && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className="flex-1 min-w-0 text-sm text-slate-700 truncate">{s.nama}</span>
                      <Badge variant="outline" className="text-[10px]">{s.nis}</Badge>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-slate-500">{selectedSiswaIds.length} siswa dipilih</p>
                {siswaKelas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSiswaIds(selectedSiswaIds.length === siswaKelas.length ? [] : siswaKelas.map(s => s.id))}
                    className="text-xs font-medium text-emerald-700 hover:underline"
                  >
                    {selectedSiswaIds.length === siswaKelas.length ? 'Batal pilih semua' : 'Pilih semua'}
                  </button>
                )}
              </div>
            </div>
          ) : (
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
          )}

          {/* Cari Kegiatan Pembinaan */}
          <div>
            <Label>Kegiatan Pembinaan (dari database Sheet 3)</Label>
            <Popover open={openKegiatanSearch} onOpenChange={setOpenKegiatanSearch}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Search className="w-4 h-4 mr-2 text-slate-400" />
                  {formData.kegiatan_pembinaan_nama ? formData.kegiatan_pembinaan_nama : "Ketik untuk mencari kegiatan pembinaan..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cari kegiatan pembinaan..." value={searchKegiatan} onValueChange={setSearchKegiatan} />
                  <CommandList className="max-h-72">
                    <CommandEmpty>Tidak ditemukan</CommandEmpty>
                    <CommandGroup heading={`Kegiatan Pembinaan (${filteredKegiatan.length})`}>
                      {filteredKegiatan.map(k => (
                        <CommandItem key={k.id} value={k.kegiatan} onSelect={() => handleSelectKegiatan(k)} className="cursor-pointer">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm">{k.kegiatan}</span>
                            <Badge className={k.sesuai_penetapan ? 'bg-amber-100 text-amber-700 text-xs' : 'bg-emerald-100 text-emerald-700 text-xs'}>
                              {k.sesuai_penetapan ? 'Sesuai Penetapan' : `${k.ip} IP`}
                            </Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Poin Pengurangan */}
          <div>
            <Label>
              Poin Pengurangan
              {formData.sesuai_penetapan && <span className="text-xs text-amber-600 ml-2">(Sesuai Penetapan — default 0, dapat disesuaikan)</span>}
            </Label>
            <Input type="number" min="0" value={formData.poin_pengurangan} onChange={(e) => setFormData({ ...formData, poin_pengurangan: e.target.value })} required />
          </div>

          {/* Limit Mingguan — auto if universal ON, manual if OFF */}
          <div>
            <Label>
              Limit Mingguan
              {limitUniversalAktif ? (
                <span className="text-xs text-slate-400 ml-2 flex items-center"><Lock className="w-3 h-3 inline mr-1" />Universal (otomatis)</span>
              ) : (
                <span className="text-xs text-slate-400 ml-2">(manual — atur per record)</span>
              )}
            </Label>
            <Input
              type="number" min="1"
              value={formData.limit_mingguan}
              onChange={(e) => setFormData({ ...formData, limit_mingguan: e.target.value })}
              disabled={limitUniversalAktif}
              className={limitUniversalAktif ? 'bg-slate-100' : ''}
              required
            />
          </div>

          {/* Uraian */}
          <div>
            <Label>Uraian <span className="text-xs text-slate-400">(opsional)</span></Label>
            <Textarea value={formData.uraian} onChange={(e) => setFormData({ ...formData, uraian: e.target.value })} rows={2} placeholder="Auto dari kegiatan, dapat ditambah" />
          </div>

          {/* Validator */}
          <div>
            <Label>Validator</Label>
            {isGuru && currentUser ? (
              <Input value={currentUser.full_name} readOnly className="bg-slate-100" />
            ) : (
              <Select value={formData.validator_id} onValueChange={handleValidatorChange}>
                <SelectTrigger><SelectValue placeholder="Pilih Validator" /></SelectTrigger>
                <SelectContent>
                  {guruList.map(g => <SelectItem key={g.id} value={g.id}>{g.nama} — {g.jabatan || 'Guru'}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label>Catatan (opsional)</Label>
            <Textarea value={formData.catatan} onChange={(e) => setFormData({ ...formData, catatan: e.target.value })} rows={2} />
          </div>

          {/* Foto Bukti (bisa lebih dari 1 — otomatis dikompresi agar jelas namun ringan) */}
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
              <label className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${uploadingFoto ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'}`}>
                {uploadingFoto ? <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFotoChange} disabled={uploadingFoto} />
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Batal</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending || createManyMutation.isPending}>
              {editing ? 'Simpan' : kolektif ? `Catat untuk ${selectedSiswaIds.length} Siswa` : 'Tambah Improvement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}