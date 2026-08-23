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
import { Search, TrendingDown, Lock } from "lucide-react";
import { getMingguKey } from '@/lib/dapodikConstants';

export default function ImprovementFormDialog({ open, onOpenChange, siswaList, guruList, currentUser, improvementList, kegiatanList, pengaturan, editing, tahunAjaran, prefillSiswa }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
    kegiatan_pembinaan_id: '', kegiatan_pembinaan_nama: '', kategori: 'Perilaku',
    uraian: '', poin_pengurangan: 0, sesuai_penetapan: false,
    limit_mingguan: 30, limit_universal_applied: true, minggu_key: '',
    validator_id: '', validator_nama: '', tahun_ajaran: '', catatan: '', status: 'Aktif'
  });
  const [openSiswaSearch, setOpenSiswaSearch] = useState(false);
  const [searchSiswa, setSearchSiswa] = useState('');
  const [openKegiatanSearch, setOpenKegiatanSearch] = useState(false);
  const [searchKegiatan, setSearchKegiatan] = useState('');

  const isGuru = currentUser?.role === 'guru';
  const limitUniversalAktif = pengaturan?.limit_universal_aktif ?? true;
  const limitUniversal = pengaturan?.limit_mingguan_universal ?? 30;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setFormData({ ...formData, ...editing });
    } else {
      const f = {
        tanggal: new Date().toISOString().split('T')[0],
        siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
        kegiatan_pembinaan_id: '', kegiatan_pembinaan_nama: '', kategori: 'Perilaku',
        uraian: '', poin_pengurangan: 0, sesuai_penetapan: false,
        limit_mingguan: limitUniversalAktif ? limitUniversal : 30, limit_universal_applied: limitUniversalAktif,
        minggu_key: '', validator_id: '', validator_nama: '', tahun_ajaran: tahunAjaran || '', catatan: '', status: 'Aktif'
      };
      if (currentUser) { f.validator_id = currentUser.id; f.validator_nama = currentUser.full_name; }
      if (prefillSiswa) { f.siswa_id = prefillSiswa.id; f.nis = prefillSiswa.nis; f.nama_siswa = prefillSiswa.nama; f.kelas_id = prefillSiswa.kelas_id; f.nama_kelas = prefillSiswa.nama_kelas; }
      setFormData(f);
    }
  }, [open, editing, currentUser, tahunAjaran, prefillSiswa, limitUniversalAktif, limitUniversal]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Improvement.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['improvement'] }); handleClose(); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Improvement.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['improvement'] }); handleClose(); }
  });

  const handleClose = () => {
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
      kegiatan_pembinaan_id: '', kegiatan_pembinaan_nama: '', kategori: 'Perilaku',
      uraian: '', poin_pengurangan: 0, sesuai_penetapan: false,
      limit_mingguan: 30, limit_universal_applied: true, minggu_key: '',
      validator_id: '', validator_nama: '', tahun_ajaran: '', catatan: '', status: 'Aktif'
    });
    setOpenSiswaSearch(false); setSearchSiswa(''); setOpenKegiatanSearch(false); setSearchKegiatan('');
    onOpenChange(false);
  };

  const activeSiswa = useMemo(() => (siswaList || []).filter(s => s.status === 'Aktif'), [siswaList]);
  const filteredSiswa = useMemo(() => {
    if (!searchSiswa) return activeSiswa.sort((a, b) => a.nama.localeCompare(b.nama));
    const q = searchSiswa.toLowerCase();
    return activeSiswa.filter(s => s.nama?.toLowerCase().includes(q) || s.nis?.toLowerCase().includes(q) || s.nama_kelas?.toLowerCase().includes(q)).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [activeSiswa, searchSiswa]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.siswa_id) { toast({ title: "Pilih siswa terlebih dahulu", variant: "destructive" }); return; }
    if (!formData.kegiatan_pembinaan_id) { toast({ title: "Pilih kegiatan pembinaan", variant: "destructive" }); return; }
    if (!formData.validator_id) { toast({ title: "Pilih validator", variant: "destructive" }); return; }
    const minggu_key = getMingguKey(new Date(formData.tanggal));
    const used = (improvementList || [])
      .filter(i => i.siswa_id === formData.siswa_id && i.minggu_key === minggu_key && i.status === 'Aktif' && i.id !== editing?.id)
      .reduce((s, i) => s + (Number(i.poin_pengurangan) || 0), 0);
    const poin = Number(formData.poin_pengurangan) || 0;
    const limit = Number(formData.limit_mingguan) || 0;
    if (used + poin > limit) {
      toast({ title: "Limit mingguan terlampaui", description: `Terpakai ${used} + ${poin} = ${used + poin} poin melebihi limit ${limit}/minggu`, variant: "destructive" });
      return;
    }
    const payload = { ...formData, poin_pengurangan: poin, limit_mingguan: limit, minggu_key, limit_universal_applied: limitUniversalAktif };
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

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Batal</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">{editing ? 'Simpan' : 'Tambah Improvement'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}