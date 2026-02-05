import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, AlertCircle, Check, Calendar, Search, Filter } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { format, addDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function PelanggaranTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [openPelanggaranSearch, setOpenPelanggaranSearch] = useState(false);
  const [searchPelanggaran, setSearchPelanggaran] = useState('');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
    jenis_pelanggaran: 'Ringan', kategori: 'Keterlambatan', uraian: '',
    kode_pelanggaran: '',
    poin: 5, sanksi: '', durasi_sanksi: 0, satuan_durasi: 'Hari',
    progress_sanksi: [], pelapor_id: '', pelapor: '', status: 'Proses'
  });

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: pelanggaranList = [] } = useQuery({
    queryKey: ['pelanggaran'],
    queryFn: () => base44.entities.Pelanggaran.list('-tanggal'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
  });

  const { data: kodePelanggaranList = [] } = useQuery({
    queryKey: ['kode-pelanggaran'],
    queryFn: () => base44.entities.KodePelanggaran.list('kode'),
  });

  // Filter pelanggaran berdasarkan tanggal
  const filteredPelanggaranList = useMemo(() => {
    return pelanggaranList.filter(p => {
      if (filterDateFrom && p.tanggal < filterDateFrom) return false;
      if (filterDateTo && p.tanggal > filterDateTo) return false;
      return true;
    });
  }, [pelanggaranList, filterDateFrom, filterDateTo]);

  // Search kode pelanggaran - cari berdasarkan kode atau uraian
  const filteredKodePelanggaran = useMemo(() => {
    if (!searchPelanggaran) return kodePelanggaranList;
    const search = searchPelanggaran.toLowerCase().trim();
    return kodePelanggaranList.filter(k => 
      k.kode?.toLowerCase().includes(search) || 
      k.uraian?.toLowerCase().includes(search) ||
      k.tingkatan?.toLowerCase().includes(search)
    );
  }, [kodePelanggaranList, searchPelanggaran]);

  // Filter siswa berdasarkan kelas yang dipilih, urut abjad
  const filteredSiswa = useMemo(() => {
    if (!selectedKelas) return [];
    return siswaList
      .filter(s => s.kelas_id === selectedKelas)
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaList, selectedKelas]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pelanggaran.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pelanggaran'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pelanggaran.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pelanggaran'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pelanggaran.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pelanggaran'] }),
  });

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
      jenis_pelanggaran: 'Ringan', kategori: 'Keterlambatan', uraian: '',
      kode_pelanggaran: '',
      poin: 5, sanksi: '', durasi_sanksi: 0, satuan_durasi: 'Hari',
      progress_sanksi: [], pelapor_id: '', pelapor: '', status: 'Proses'
    });
    setSelectedKelas('');
    setSearchPelanggaran('');
    setEditing(null);
    setIsOpen(false);
  };

  // Handle pilih kode pelanggaran
  const handleSelectKodePelanggaran = (kode) => {
    const selected = kodePelanggaranList.find(k => k.kode === kode);
    if (selected) {
      setFormData({
        ...formData,
        kode_pelanggaran: selected.kode,
        uraian: selected.uraian,
        jenis_pelanggaran: selected.tingkatan,
        poin: selected.poin
      });
      setOpenPelanggaranSearch(false);
      setSearchPelanggaran('');
    }
  };

  // Generate progress sanksi berdasarkan durasi
  const generateProgressSanksi = (durasi, satuan, startDate) => {
    const totalDays = satuan === 'Bulan' ? durasi * 30 : durasi;
    const progress = [];
    for (let i = 1; i <= totalDays; i++) {
      const date = addDays(new Date(startDate), i - 1);
      progress.push({
        hari_ke: i,
        tanggal: format(date, 'yyyy-MM-dd'),
        selesai: false
      });
    }
    return progress;
  };

  const handleDurasiChange = (durasi) => {
    const numDurasi = Number(durasi) || 0;
    const progress = generateProgressSanksi(numDurasi, formData.satuan_durasi, formData.tanggal);
    setFormData({
      ...formData,
      durasi_sanksi: numDurasi,
      progress_sanksi: progress
    });
  };

  const handleSatuanChange = (satuan) => {
    const progress = generateProgressSanksi(formData.durasi_sanksi, satuan, formData.tanggal);
    setFormData({
      ...formData,
      satuan_durasi: satuan,
      progress_sanksi: progress
    });
  };

  const handleProgressCheck = (index, checked) => {
    const newProgress = formData.progress_sanksi ? [...formData.progress_sanksi] : [];
    if (newProgress[index]) {
      newProgress[index] = { ...newProgress[index], selesai: Boolean(checked) };
      setFormData({ ...formData, progress_sanksi: newProgress });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setSelectedKelas(item.kelas_id);
    setFormData(item);
    setIsOpen(true);
  };

  const handleKelasChange = (kelasId) => {
    setSelectedKelas(kelasId);
    setFormData({
      ...formData,
      siswa_id: '', nis: '', nama_siswa: '', kelas_id: kelasId,
      nama_kelas: kelasList.find(k => k.id === kelasId)?.nama_kelas || ''
    });
  };

  const handleSiswaChange = (siswaId) => {
    const siswa = siswaList.find(s => s.id === siswaId);
    if (siswa) {
      setFormData({
        ...formData,
        siswa_id: siswa.id,
        nis: siswa.nis,
        nama_siswa: siswa.nama,
        kelas_id: siswa.kelas_id,
        nama_kelas: siswa.nama_kelas
      });
    }
  };

  const handlePelaporChange = (guruId) => {
    const guru = guruList.find(g => g.id === guruId);
    if (guru) {
      setFormData({
        ...formData,
        pelapor_id: guru.id,
        pelapor: guru.nama
      });
    }
  };

  const totalPoinBySiswa = {};
  pelanggaranList.forEach(item => {
    if (item.siswa_id) {
      totalPoinBySiswa[item.siswa_id] = (totalPoinBySiswa[item.siswa_id] || 0) + (item.poin || 0);
    }
  });

  const pelanggaranColumns = [
    { key: 'tanggal', label: 'Tanggal' },
    { 
      key: 'nama_siswa', 
      label: 'Siswa',
      render: (row) => (
        <div>
          {row.nama_siswa}
          {totalPoinBySiswa[row.siswa_id] >= 100 && (
            <Badge className="ml-2 bg-red-100 text-red-700">⚠ {totalPoinBySiswa[row.siswa_id]} poin</Badge>
          )}
        </div>
      )
    },
    { key: 'nama_kelas', label: 'Kelas', render: (row) => <Badge variant="secondary" className="bg-blue-100 text-blue-700">{row.nama_kelas}</Badge> },
    { 
      key: 'kategori', 
      label: 'Kategori',
      render: (row) => (
        <Badge className={
          row.jenis_pelanggaran === 'Berat' ? 'bg-red-100 text-red-700' :
          row.jenis_pelanggaran === 'Sedang' ? 'bg-orange-100 text-orange-700' :
          'bg-yellow-100 text-yellow-700'
        }>
          {row.kategori}
        </Badge>
      )
    },
    { key: 'sanksi', label: 'Sanksi', render: (row) => <span className="max-w-xs truncate block">{row.sanksi || '-'}</span> },
    { 
      key: 'durasi_sanksi', 
      label: 'Durasi',
      render: (row) => row.durasi_sanksi ? `${row.durasi_sanksi} ${row.satuan_durasi || 'Hari'}` : '-'
    },
    { 
      key: 'progress', 
      label: 'Progress',
      render: (row) => {
        if (!row.progress_sanksi || row.progress_sanksi.length === 0) return '-';
        const completed = row.progress_sanksi.filter(p => p.selesai).length;
        const total = row.progress_sanksi.length;
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${(completed / total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{completed}/{total}</span>
          </div>
        );
      }
    },
    { key: 'poin', label: 'Poin', render: (row) => <Badge className="bg-slate-100 text-slate-700">{row.poin} poin</Badge> },
    { key: 'status', label: 'Status', render: (row) => <Badge className={row.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{row.status}</Badge> },
    {
      key: 'aksi',
      label: 'Aksi',
      sortable: false,
      filterable: false,
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteMutation.mutate(row.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                Data Pelanggaran Siswa
              </CardTitle>
            </div>
            <Button onClick={() => setIsOpen(true)} className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" /> Tambah Pelanggaran
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">Filter Tanggal:</span>
            <Input 
              type="date" 
              value={filterDateFrom} 
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-40"
              placeholder="Dari"
            />
            <span className="text-slate-400">s/d</span>
            <Input 
              type="date" 
              value={filterDateTo} 
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-40"
              placeholder="Sampai"
            />
            {(filterDateFrom || filterDateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}>
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Data Pelanggaran Siswa</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={pelanggaranColumns} data={filteredPelanggaranList} pageSize={5} />
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Pelanggaran' : 'Tambah Pelanggaran Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal</Label>
                <Input type="date" value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} required />
              </div>
              <div>
                <Label>Pilih Kelas</Label>
                <Select value={selectedKelas} onValueChange={handleKelasChange}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kelas Dulu" /></SelectTrigger>
                  <SelectContent>
                    {kelasList.map(kelas => (
                      <SelectItem key={kelas.id} value={kelas.id}>
                        {kelas.nama_kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Pilih Siswa</Label>
              <Select value={formData.siswa_id} onValueChange={handleSiswaChange} disabled={!selectedKelas}>
                <SelectTrigger><SelectValue placeholder={selectedKelas ? "Pilih Siswa" : "Pilih kelas terlebih dahulu"} /></SelectTrigger>
                <SelectContent>
                  {filteredSiswa.map(siswa => (
                    <SelectItem key={siswa.id} value={siswa.id}>
                      {siswa.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cari Pelanggaran */}
            <div>
              <Label>Cari Pelanggaran</Label>
              <Popover open={openPelanggaranSearch} onOpenChange={setOpenPelanggaranSearch}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Search className="w-4 h-4 mr-2 text-slate-400" />
                    {formData.kode_pelanggaran 
                      ? `[${formData.kode_pelanggaran}] ${formData.uraian?.substring(0, 40)}...` 
                      : "Ketik untuk mencari pelanggaran..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Cari kode atau uraian pelanggaran..." 
                      value={searchPelanggaran}
                      onValueChange={setSearchPelanggaran}
                    />
                    <CommandList className="max-h-80">
                      <CommandEmpty>Tidak ditemukan. Coba kata kunci lain.</CommandEmpty>
                      <CommandGroup heading={`Daftar Pelanggaran (${filteredKodePelanggaran.length} hasil)`}>
                        {filteredKodePelanggaran.map(kode => (
                          <CommandItem 
                            key={kode.id} 
                            value={`${kode.kode} ${kode.uraian} ${kode.tingkatan}`}
                            onSelect={() => handleSelectKodePelanggaran(kode.kode)}
                            className="cursor-pointer py-2"
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded shrink-0">{kode.kode}</span>
                                  <Badge className={
                                    kode.tingkatan === 'Sangat Berat' ? 'bg-red-600 text-white text-[10px]' :
                                    kode.tingkatan === 'Berat' ? 'bg-red-100 text-red-700 text-[10px]' :
                                    kode.tingkatan === 'Sedang' ? 'bg-orange-100 text-orange-700 text-[10px]' :
                                    kode.tingkatan === 'Ringan' ? 'bg-yellow-100 text-yellow-700 text-[10px]' :
                                    kode.tingkatan === 'Sangat Ringan' ? 'bg-green-100 text-green-700 text-[10px]' :
                                    'bg-purple-100 text-purple-700 text-[10px]'
                                  }>
                                    {kode.tingkatan}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{kode.uraian}</p>
                              </div>
                              <Badge className="bg-slate-700 text-white shrink-0">
                                {kode.poin} poin
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jenis/Tingkat Pelanggaran</Label>
                <Input 
                  value={formData.jenis_pelanggaran} 
                  readOnly 
                  className="bg-slate-50"
                  placeholder="Otomatis dari kode pelanggaran"
                />
              </div>
              <div>
                <Label>Kategori</Label>
                <Select value={formData.kategori} onValueChange={(v) => setFormData({...formData, kategori: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Keterlambatan">Keterlambatan</SelectItem>
                    <SelectItem value="Pakaian/Atribut">Pakaian/Atribut</SelectItem>
                    <SelectItem value="Sikap/Perilaku">Sikap/Perilaku</SelectItem>
                    <SelectItem value="Akademik">Akademik</SelectItem>
                    <SelectItem value="Absensi">Absensi</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Uraian Pelanggaran</Label>
              <Textarea value={formData.uraian} onChange={(e) => setFormData({...formData, uraian: e.target.value})} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Poin</Label>
                <Input type="number" value={formData.poin} onChange={(e) => setFormData({...formData, poin: parseInt(e.target.value)})} required readOnly className="bg-slate-50" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Proses">Proses</SelectItem>
                    <SelectItem value="Selesai">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Sanksi</Label>
              <Input 
                value={formData.sanksi} 
                onChange={(e) => setFormData({...formData, sanksi: e.target.value})} 
                placeholder="Masukkan sanksi yang diberikan"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Durasi Sanksi</Label>
                <Input 
                  type="number" 
                  min="0"
                  value={formData.durasi_sanksi} 
                  onChange={(e) => handleDurasiChange(e.target.value)}
                  placeholder="Angka"
                />
              </div>
              <div>
                <Label>Satuan Durasi</Label>
                <Select value={formData.satuan_durasi} onValueChange={handleSatuanChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hari">Hari</SelectItem>
                    <SelectItem value="Bulan">Bulan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dynamic Checkbox Progress Sanksi */}
            {formData.progress_sanksi && Array.isArray(formData.progress_sanksi) && formData.progress_sanksi.length > 0 && (
              <div className="border rounded-lg p-4 bg-slate-50">
                <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4" />
                  Monitoring Progress Sanksi ({formData.progress_sanksi.filter(p => p && p.selesai).length}/{formData.progress_sanksi.length} hari selesai)
                </Label>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2 max-h-48 overflow-y-auto">
                  {formData.progress_sanksi.map((item, index) => {
                    if (!item || !item.tanggal) return null;
                    const isSelesai = Boolean(item.selesai);
                    return (
                      <div 
                        key={index} 
                        className={`flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer ${
                          isSelesai ? 'bg-emerald-100 border-emerald-300' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleProgressCheck(index, !isSelesai);
                        }}
                      >
                        <Checkbox 
                          checked={isSelesai}
                          onCheckedChange={(checked) => handleProgressCheck(index, checked)}
                          className="mb-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-xs font-medium">Hari {item.hari_ke}</span>
                        <span className="text-[10px] text-slate-400">
                          {format(new Date(item.tanggal), 'dd/MM')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <Label>Pelapor (Guru/Pegawai)</Label>
              <Select value={formData.pelapor_id} onValueChange={handlePelaporChange}>
                <SelectTrigger><SelectValue placeholder="Pilih Guru Pelapor" /></SelectTrigger>
                <SelectContent>
                  {guruList.map(guru => (
                    <SelectItem key={guru.id} value={guru.id}>
                      {guru.nama} - {guru.jabatan || 'Guru'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">
                {editing ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}