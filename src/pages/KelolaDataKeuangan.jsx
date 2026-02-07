import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { 
  Settings, Plus, Edit2, Trash2, Tags, Layers, Wallet, 
  CreditCard, Users, UserCheck
} from "lucide-react";

export default function KelolaDataKeuangan() {
  const [activeTab, setActiveTab] = useState('kategori');
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [formType, setFormType] = useState('');
  const queryClient = useQueryClient();

  // Default data untuk ditampilkan jika database kosong
  const defaultKategori = [
    { nama: 'SPP', jenis: 'Pemasukan' },
    { nama: 'BOS', jenis: 'Pemasukan' },
    { nama: 'BOSP', jenis: 'Pemasukan' },
    { nama: 'Donasi', jenis: 'Pemasukan' },
    { nama: 'Gaji', jenis: 'Pengeluaran' },
    { nama: 'Operasional', jenis: 'Pengeluaran' },
    { nama: 'Sarpras', jenis: 'Pengeluaran' },
    { nama: 'Listrik', jenis: 'Pengeluaran' },
    { nama: 'Air', jenis: 'Pengeluaran' },
    { nama: 'Internet', jenis: 'Pengeluaran' },
    { nama: 'Kegiatan', jenis: 'Semua' },
    { nama: 'ATK', jenis: 'Pengeluaran' },
    { nama: 'Kasbon', jenis: 'Pengeluaran' },
    { nama: 'Ujian', jenis: 'Pemasukan' },
    { nama: 'Daftar Ulang', jenis: 'Pemasukan' },
    { nama: 'Kelulusan', jenis: 'Pemasukan' },
    { nama: 'Lainnya', jenis: 'Semua' }
  ];

  const defaultTipeTransaksi = [
    { nama: 'SPP/Bulanan', jenis: 'Siswa' },
    { nama: 'Ujian Sekolah', jenis: 'Siswa' },
    { nama: 'Daftar Ulang', jenis: 'Siswa' },
    { nama: 'Kelulusan', jenis: 'Siswa' },
    { nama: 'Gaji Pokok', jenis: 'Pegawai' },
    { nama: 'Tunjangan', jenis: 'Pegawai' },
    { nama: 'Kasbon Pegawai', jenis: 'Pegawai' },
    { nama: 'Belanja Harian', jenis: 'Umum' },
    { nama: 'Belanja Bulanan', jenis: 'Umum' },
    { nama: 'Belanja Tahunan', jenis: 'Umum' },
    { nama: 'Kegiatan', jenis: 'Umum' },
    { nama: 'BOSP', jenis: 'Umum' },
    { nama: 'Donasi', jenis: 'Umum' },
    { nama: 'Transaksi Khusus', jenis: 'Umum' },
    { nama: 'Lainnya', jenis: 'Umum' }
  ];

  const defaultSumberDana = [
    { nama: 'Kas Sekolah', keterangan: 'Kas utama sekolah' },
    { nama: 'Bank BRI', keterangan: 'Rekening Bank BRI' },
    { nama: 'Bank BJB', keterangan: 'Rekening Bank BJB' },
    { nama: 'Dana BOS', keterangan: 'Dana Bantuan Operasional Sekolah' },
    { nama: 'Dana Komite', keterangan: 'Dana dari Komite Sekolah' },
    { nama: 'Yayasan', keterangan: 'Dana dari Yayasan' }
  ];

  // Queries
  const { data: kategoriList = [] } = useQuery({
    queryKey: ['kategori-transaksi'],
    queryFn: () => base44.entities.KategoriTransaksi.list('nama'),
  });

  const { data: tipeTransaksiList = [] } = useQuery({
    queryKey: ['tipe-transaksi'],
    queryFn: () => base44.entities.TipeTransaksi.list('nama'),
  });

  const { data: sumberDanaList = [] } = useQuery({
    queryKey: ['sumber-dana'],
    queryFn: () => base44.entities.SumberDana.list('nama'),
  });

  // Auto-populate default data jika kosong
  React.useEffect(() => {
    const populateDefaults = async () => {
      if (kategoriList.length === 0) {
        for (const item of defaultKategori) {
          await base44.entities.KategoriTransaksi.create(item);
        }
        queryClient.invalidateQueries({ queryKey: ['kategori-transaksi'] });
      }
      if (tipeTransaksiList.length === 0) {
        for (const item of defaultTipeTransaksi) {
          await base44.entities.TipeTransaksi.create(item);
        }
        queryClient.invalidateQueries({ queryKey: ['tipe-transaksi'] });
      }
      if (sumberDanaList.length === 0) {
        for (const item of defaultSumberDana) {
          await base44.entities.SumberDana.create(item);
        }
        queryClient.invalidateQueries({ queryKey: ['sumber-dana'] });
      }
    };
    populateDefaults();
  }, [kategoriList.length, tipeTransaksiList.length, sumberDanaList.length]);

  const { data: tarifIuranList = [] } = useQuery({
    queryKey: ['tarif-iuran'],
    queryFn: () => base44.entities.TarifIuran.list('nama'),
  });

  const { data: biayaKhususList = [] } = useQuery({
    queryKey: ['biaya-khusus'],
    queryFn: () => base44.entities.BiayaKhusus.list('nama_siswa'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  // Form states
  const [kategoriForm, setKategoriForm] = useState({ nama: '', jenis: 'Semua' });
  const [tipeForm, setTipeForm] = useState({ nama: '', jenis: 'Umum' });
  const [sumberForm, setSumberForm] = useState({ nama: '', keterangan: '' });
  const [tarifForm, setTarifForm] = useState({ nama: '', nominal: '', periode: 'Bulanan', tahun_ajaran: '', status: 'Aktif' });
  const [biayaKhususForm, setBiayaKhususForm] = useState({ 
    siswa_id: '', nama_siswa: '', nama_kelas: '', 
    tarif_iuran_id: '', nama_iuran: '', 
    nominal_khusus: '', kategori: 'Yatim', keterangan: '' 
  });

  // Mutations
  const createKategoriMutation = useMutation({
    mutationFn: (data) => base44.entities.KategoriTransaksi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kategori-transaksi'] }); resetForm(); },
  });

  const updateKategoriMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KategoriTransaksi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kategori-transaksi'] }); resetForm(); },
  });

  const deleteKategoriMutation = useMutation({
    mutationFn: (id) => base44.entities.KategoriTransaksi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kategori-transaksi'] }),
  });

  const createTipeMutation = useMutation({
    mutationFn: (data) => base44.entities.TipeTransaksi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tipe-transaksi'] }); resetForm(); },
  });

  const updateTipeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TipeTransaksi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tipe-transaksi'] }); resetForm(); },
  });

  const deleteTipeMutation = useMutation({
    mutationFn: (id) => base44.entities.TipeTransaksi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tipe-transaksi'] }),
  });

  const createSumberMutation = useMutation({
    mutationFn: (data) => base44.entities.SumberDana.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sumber-dana'] }); resetForm(); },
  });

  const updateSumberMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SumberDana.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sumber-dana'] }); resetForm(); },
  });

  const deleteSumberMutation = useMutation({
    mutationFn: (id) => base44.entities.SumberDana.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sumber-dana'] }),
  });

  const createTarifMutation = useMutation({
    mutationFn: (data) => base44.entities.TarifIuran.create({ ...data, nominal: Number(data.nominal) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tarif-iuran'] }); resetForm(); },
  });

  const updateTarifMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TarifIuran.update(id, { ...data, nominal: Number(data.nominal) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tarif-iuran'] }); resetForm(); },
  });

  const deleteTarifMutation = useMutation({
    mutationFn: (id) => base44.entities.TarifIuran.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarif-iuran'] }),
  });

  const createBiayaKhususMutation = useMutation({
    mutationFn: (data) => base44.entities.BiayaKhusus.create({ ...data, nominal_khusus: Number(data.nominal_khusus) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['biaya-khusus'] }); resetForm(); },
  });

  const updateBiayaKhususMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BiayaKhusus.update(id, { ...data, nominal_khusus: Number(data.nominal_khusus) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['biaya-khusus'] }); resetForm(); },
  });

  const deleteBiayaKhususMutation = useMutation({
    mutationFn: (id) => base44.entities.BiayaKhusus.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['biaya-khusus'] }),
  });

  const resetForm = () => {
    setKategoriForm({ nama: '', jenis: 'Semua' });
    setTipeForm({ nama: '', jenis: 'Umum' });
    setSumberForm({ nama: '', keterangan: '' });
    setTarifForm({ nama: '', nominal: '', periode: 'Bulanan', tahun_ajaran: '', status: 'Aktif' });
    setBiayaKhususForm({ siswa_id: '', nama_siswa: '', nama_kelas: '', tarif_iuran_id: '', nama_iuran: '', nominal_khusus: '', kategori: 'Yatim', keterangan: '' });
    setEditingData(null);
    setIsOpen(false);
    setFormType('');
  };

  const openAddForm = (type) => {
    setFormType(type);
    setEditingData(null);
    setIsOpen(true);
  };

  const handleEdit = (type, data) => {
    setFormType(type);
    setEditingData(data);
    if (type === 'kategori') setKategoriForm(data);
    else if (type === 'tipe') setTipeForm(data);
    else if (type === 'sumber') setSumberForm(data);
    else if (type === 'tarif') setTarifForm(data);
    else if (type === 'biaya-khusus') setBiayaKhususForm(data);
    setIsOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formType === 'kategori') {
      editingData ? updateKategoriMutation.mutate({ id: editingData.id, data: kategoriForm }) : createKategoriMutation.mutate(kategoriForm);
    } else if (formType === 'tipe') {
      editingData ? updateTipeMutation.mutate({ id: editingData.id, data: tipeForm }) : createTipeMutation.mutate(tipeForm);
    } else if (formType === 'sumber') {
      editingData ? updateSumberMutation.mutate({ id: editingData.id, data: sumberForm }) : createSumberMutation.mutate(sumberForm);
    } else if (formType === 'tarif') {
      editingData ? updateTarifMutation.mutate({ id: editingData.id, data: tarifForm }) : createTarifMutation.mutate(tarifForm);
    } else if (formType === 'biaya-khusus') {
      editingData ? updateBiayaKhususMutation.mutate({ id: editingData.id, data: biayaKhususForm }) : createBiayaKhususMutation.mutate(biayaKhususForm);
    }
  };

  const handleSiswaChange = (siswaId) => {
    const siswa = siswaList.find(s => s.id === siswaId);
    if (siswa) {
      setBiayaKhususForm(prev => ({ ...prev, siswa_id: siswa.id, nama_siswa: siswa.nama, nama_kelas: siswa.nama_kelas }));
    }
  };

  const handleTarifChange = (tarifId) => {
    const tarif = tarifIuranList.find(t => t.id === tarifId);
    if (tarif) {
      setBiayaKhususForm(prev => ({ ...prev, tarif_iuran_id: tarif.id, nama_iuran: tarif.nama }));
    }
  };

  const formatRupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

  // Columns
  const kategoriColumns = [
    { key: 'nama', label: 'Nama Kategori' },
    { key: 'jenis', label: 'Jenis', render: (row) => <Badge variant="outline">{row.jenis}</Badge> },
    {
      key: 'aksi', label: 'Aksi', sortable: false, filterable: false,
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit('kategori', row)}><Edit2 className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteKategoriMutation.mutate(row.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      )
    }
  ];

  const tipeColumns = [
    { key: 'nama', label: 'Nama Tipe' },
    { key: 'jenis', label: 'Untuk', render: (row) => <Badge className={row.jenis === 'Siswa' ? 'bg-blue-100 text-blue-700' : row.jenis === 'Pegawai' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}>{row.jenis}</Badge> },
    {
      key: 'aksi', label: 'Aksi', sortable: false, filterable: false,
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit('tipe', row)}><Edit2 className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteTipeMutation.mutate(row.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      )
    }
  ];

  const sumberColumns = [
    { key: 'nama', label: 'Nama Sumber Dana' },
    { key: 'keterangan', label: 'Keterangan', render: (row) => row.keterangan || '-' },
    {
      key: 'aksi', label: 'Aksi', sortable: false, filterable: false,
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit('sumber', row)}><Edit2 className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteSumberMutation.mutate(row.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      )
    }
  ];

  const tarifColumns = [
    { key: 'nama', label: 'Nama Iuran' },
    { key: 'nominal', label: 'Nominal', render: (row) => <span className="font-medium text-teal-600">{formatRupiah(row.nominal)}</span> },
    { key: 'periode', label: 'Periode', render: (row) => <Badge variant="outline">{row.periode}</Badge> },
    { key: 'tahun_ajaran', label: 'Tahun Ajaran', render: (row) => row.tahun_ajaran || '-' },
    { key: 'status', label: 'Status', render: (row) => <Badge className={row.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{row.status}</Badge> },
    {
      key: 'aksi', label: 'Aksi', sortable: false, filterable: false,
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit('tarif', row)}><Edit2 className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteTarifMutation.mutate(row.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      )
    }
  ];

  const biayaKhususColumns = [
    { key: 'nama_siswa', label: 'Siswa' },
    { key: 'nama_kelas', label: 'Kelas' },
    { key: 'nama_iuran', label: 'Iuran' },
    { key: 'nominal_khusus', label: 'Nominal Khusus', render: (row) => <span className="font-medium text-amber-600">{formatRupiah(row.nominal_khusus)}</span> },
    { key: 'kategori', label: 'Kategori', render: (row) => <Badge className="bg-pink-100 text-pink-700">{row.kategori}</Badge> },
    {
      key: 'aksi', label: 'Aksi', sortable: false, filterable: false,
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit('biaya-khusus', row)}><Edit2 className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteBiayaKhususMutation.mutate(row.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Settings className="w-8 h-8 text-purple-500" />
            Kelola Data Keuangan
          </h1>
          <p className="text-slate-500 mt-1">Atur kategori, tipe transaksi, sumber dana, dan tarif iuran</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="kategori" className="flex items-center gap-1"><Tags className="w-3 h-3" /> Kategori</TabsTrigger>
            <TabsTrigger value="tipe" className="flex items-center gap-1"><Layers className="w-3 h-3" /> Tipe Transaksi</TabsTrigger>
            <TabsTrigger value="sumber" className="flex items-center gap-1"><Wallet className="w-3 h-3" /> Sumber Dana</TabsTrigger>
            <TabsTrigger value="tarif" className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Tarif Iuran</TabsTrigger>
            <TabsTrigger value="biaya-khusus" className="flex items-center gap-1"><Users className="w-3 h-3" /> Biaya Khusus</TabsTrigger>
          </TabsList>

          {/* Kategori */}
          <TabsContent value="kategori">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Daftar Kategori Transaksi</CardTitle>
                <Button onClick={() => openAddForm('kategori')} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Kategori
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable columns={kategoriColumns} data={kategoriList} pageSize={10} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tipe */}
          <TabsContent value="tipe">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Daftar Tipe Transaksi</CardTitle>
                <Button onClick={() => openAddForm('tipe')} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Tipe
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable columns={tipeColumns} data={tipeTransaksiList} pageSize={10} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sumber Dana */}
          <TabsContent value="sumber">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Daftar Sumber Dana</CardTitle>
                <Button onClick={() => openAddForm('sumber')} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Sumber
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable columns={sumberColumns} data={sumberDanaList} pageSize={10} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tarif Iuran */}
          <TabsContent value="tarif">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Daftar Tarif Iuran (SPP, Ujian, dll)</CardTitle>
                <Button onClick={() => openAddForm('tarif')} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Tarif
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable columns={tarifColumns} data={tarifIuranList} pageSize={10} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Biaya Khusus */}
          <TabsContent value="biaya-khusus">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Biaya Khusus Siswa (Yatim, Kurang Mampu, dll)</CardTitle>
                <Button onClick={() => openAddForm('biaya-khusus')} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Biaya Khusus
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable columns={biayaKhususColumns} data={biayaKhususList} pageSize={10} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog Form */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingData ? 'Edit' : 'Tambah'} {formType === 'kategori' ? 'Kategori' : formType === 'tipe' ? 'Tipe Transaksi' : formType === 'sumber' ? 'Sumber Dana' : formType === 'tarif' ? 'Tarif Iuran' : 'Biaya Khusus'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formType === 'kategori' && (
                <>
                  <div><Label>Nama Kategori</Label><Input value={kategoriForm.nama} onChange={(e) => setKategoriForm({...kategoriForm, nama: e.target.value})} required /></div>
                  <div>
                    <Label>Jenis Transaksi</Label>
                    <Select value={kategoriForm.jenis} onValueChange={(v) => setKategoriForm({...kategoriForm, jenis: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pemasukan">Pemasukan</SelectItem>
                        <SelectItem value="Pengeluaran">Pengeluaran</SelectItem>
                        <SelectItem value="Semua">Semua</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {formType === 'tipe' && (
                <>
                  <div><Label>Nama Tipe</Label><Input value={tipeForm.nama} onChange={(e) => setTipeForm({...tipeForm, nama: e.target.value})} required /></div>
                  <div>
                    <Label>Untuk</Label>
                    <Select value={tipeForm.jenis} onValueChange={(v) => setTipeForm({...tipeForm, jenis: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Siswa">Transaksi Siswa</SelectItem>
                        <SelectItem value="Pegawai">Transaksi Pegawai</SelectItem>
                        <SelectItem value="Umum">Umum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {formType === 'sumber' && (
                <>
                  <div><Label>Nama Sumber Dana</Label><Input value={sumberForm.nama} onChange={(e) => setSumberForm({...sumberForm, nama: e.target.value})} required /></div>
                  <div><Label>Keterangan</Label><Input value={sumberForm.keterangan} onChange={(e) => setSumberForm({...sumberForm, keterangan: e.target.value})} /></div>
                </>
              )}

              {formType === 'tarif' && (
                <>
                  <div><Label>Nama Iuran</Label><Input value={tarifForm.nama} onChange={(e) => setTarifForm({...tarifForm, nama: e.target.value})} placeholder="SPP, Ujian Sekolah, dll" required /></div>
                  <div><Label>Nominal (Rp)</Label><Input type="number" value={tarifForm.nominal} onChange={(e) => setTarifForm({...tarifForm, nominal: e.target.value})} required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Periode</Label>
                      <Select value={tarifForm.periode} onValueChange={(v) => setTarifForm({...tarifForm, periode: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bulanan">Bulanan</SelectItem>
                          <SelectItem value="Semester">Semester</SelectItem>
                          <SelectItem value="Tahunan">Tahunan</SelectItem>
                          <SelectItem value="Sekali">Sekali Bayar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Tahun Ajaran</Label><Input value={tarifForm.tahun_ajaran} onChange={(e) => setTarifForm({...tarifForm, tahun_ajaran: e.target.value})} placeholder="2024/2025" /></div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={tarifForm.status} onValueChange={(v) => setTarifForm({...tarifForm, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aktif">Aktif</SelectItem>
                        <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {formType === 'biaya-khusus' && (
                <>
                  <div>
                    <Label>Pilih Siswa</Label>
                    <Select value={biayaKhususForm.siswa_id} onValueChange={handleSiswaChange}>
                      <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
                      <SelectContent>
                        {siswaList.map(s => <SelectItem key={s.id} value={s.id}>{s.nama} - {s.nama_kelas}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Pilih Iuran</Label>
                    <Select value={biayaKhususForm.tarif_iuran_id} onValueChange={handleTarifChange}>
                      <SelectTrigger><SelectValue placeholder="Pilih iuran" /></SelectTrigger>
                      <SelectContent>
                        {tarifIuranList.map(t => <SelectItem key={t.id} value={t.id}>{t.nama} - {formatRupiah(t.nominal)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Nominal Khusus (Rp)</Label><Input type="number" value={biayaKhususForm.nominal_khusus} onChange={(e) => setBiayaKhususForm({...biayaKhususForm, nominal_khusus: e.target.value})} required /></div>
                  <div>
                    <Label>Kategori Keringanan</Label>
                    <Select value={biayaKhususForm.kategori} onValueChange={(v) => setBiayaKhususForm({...biayaKhususForm, kategori: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yatim">Yatim</SelectItem>
                        <SelectItem value="Piatu">Piatu</SelectItem>
                        <SelectItem value="Yatim Piatu">Yatim Piatu</SelectItem>
                        <SelectItem value="Kurang Mampu">Kurang Mampu</SelectItem>
                        <SelectItem value="Prestasi">Prestasi</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Keterangan</Label><Input value={biayaKhususForm.keterangan} onChange={(e) => setBiayaKhususForm({...biayaKhususForm, keterangan: e.target.value})} /></div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">{editingData ? 'Simpan' : 'Tambah'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}