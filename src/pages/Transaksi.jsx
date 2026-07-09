import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { 
  Wallet, Plus, TrendingUp, TrendingDown, 
  Edit2, Trash2, ArrowUpRight, ArrowDownRight, Printer, 
  Users, UserCheck, Heart, Filter, Check, ChevronsUpDown, Search
} from "lucide-react";

export default function Transaksi() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentGuru, setCurrentGuru] = useState(null);
  const [activeTab, setActiveTab] = useState('semua');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [pegawaiSearchOpen, setPegawaiSearchOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      // Cari record Guru berdasarkan email untuk cek tugas_tambahan
      if (user?.email) {
        try {
          const gurus = await base44.entities.Guru.filter({ email: user.email });
          if (gurus.length > 0) setCurrentGuru(gurus[0]);
        } catch (e) {
          // Guru tidak ditemukan, bukan masalah
        }
      }
    };
    fetchUser();
  }, []);

  const userRole = currentUser?.role || 'guru';
  const isBendahara = (currentGuru?.tugas_tambahan || '').toLowerCase().includes('bendahara');
  const canEdit = ['admin', 'tu'].includes(userRole) || isBendahara;

  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jenis: 'Pemasukan',
    tipe_transaksi: '',
    kategori: '',
    uraian: '',
    jumlah: '',
    siswa_id: '',
    nis: '',
    nama_siswa: '',
    kelas: '',
    guru_id: '',
    nip_pegawai: '',
    nama_pegawai: '',
    jabatan_pegawai: '',
    sumber_rekening: '',
    pic: '',
    status_bayar: 'Lunas',
    rencana_belanja_id: ''
  });

  const [jenisTransaksi, setJenisTransaksi] = useState('umum'); // 'siswa', 'pegawai', 'donatur', 'umum'

  const { data: keuanganList = [] } = useQuery({
    queryKey: ['keuangan'],
    queryFn: () => base44.entities.Keuangan.list('-tanggal'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.filter({ status: 'Aktif' }),
  });

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

  const { data: tarifIuranList = [] } = useQuery({
    queryKey: ['tarif-iuran'],
    queryFn: () => base44.entities.TarifIuran.filter({ status: 'Aktif' }),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: rencanaList = [] } = useQuery({
    queryKey: ['rencana-belanja'],
    queryFn: () => base44.entities.RencanaBelanja.list('-created_date'),
  });

  // Siswa difilter berdasarkan kelas yang dipilih, diurutkan abjad
  const sortedSiswaList = useMemo(() => {
    const filtered = selectedKelasId
      ? siswaList.filter(s => s.kelas_id === selectedKelasId)
      : siswaList;
    return [...filtered].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [siswaList, selectedKelasId]);

  // Guru diurutkan abjad
  const sortedGuruList = useMemo(() => {
    return [...guruList].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [guruList]);

  // Filter transaksi berdasarkan tab dan tanggal
  const filteredTransaksi = useMemo(() => {
    let data = keuanganList;
    
    // Filter by tab
    if (activeTab === 'siswa') {
      data = data.filter(t => t.siswa_id);
    } else if (activeTab === 'pegawai') {
      data = data.filter(t => t.guru_id || t.nama_pegawai);
    } else if (activeTab === 'pemasukan') {
      data = data.filter(t => t.jenis === 'Pemasukan');
    } else if (activeTab === 'pengeluaran') {
      data = data.filter(t => t.jenis === 'Pengeluaran');
    }
    
    // Filter by date
    if (filterDateFrom) {
      data = data.filter(t => t.tanggal >= filterDateFrom);
    }
    if (filterDateTo) {
      data = data.filter(t => t.tanggal <= filterDateTo);
    }
    
    return data;
  }, [keuanganList, activeTab, filterDateFrom, filterDateTo]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Keuangan.create({ ...data, jumlah: Number(data.jumlah) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keuangan'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Keuangan.update(id, { ...data, jumlah: Number(data.jumlah) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keuangan'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Keuangan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['keuangan'] }),
  });

  const resetForm = () => {
    setFormData({
      tanggal: format(new Date(), 'yyyy-MM-dd'),
      jenis: 'Pemasukan',
      tipe_transaksi: '',
      kategori: '',
      uraian: '',
      jumlah: '',
      siswa_id: '',
      nis: '',
      nama_siswa: '',
      kelas: '',
      guru_id: '',
      nip_pegawai: '',
      nama_pegawai: '',
      jabatan_pegawai: '',
      sumber_rekening: '',
      pic: '',
      status_bayar: 'Lunas',
      rencana_belanja_id: ''
    });
    setEditingData(null);
    setIsOpen(false);
    setJenisTransaksi('umum');
    setSelectedKelasId('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, pic: currentUser?.full_name || formData.pic || '' };
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (data) => {
    setEditingData(data);
    setFormData(data);
    if (data.siswa_id) {
      setJenisTransaksi('siswa');
      setSelectedKelasId(data.kelas_id || '');
    } else if (data.guru_id || data.nama_pegawai) {
      setJenisTransaksi('pegawai');
    } else {
      setJenisTransaksi('umum');
    }
    setIsOpen(true);
  };

  const handleSiswaChange = (siswaId) => {
    const siswa = siswaList.find(s => s.id === siswaId);
    if (siswa) {
      setFormData(prev => ({
        ...prev,
        siswa_id: siswa.id,
        nis: siswa.nis,
        nama_siswa: siswa.nama,
        kelas: siswa.nama_kelas,
        guru_id: '',
        nip_pegawai: '',
        nama_pegawai: '',
        jabatan_pegawai: ''
      }));
    }
  };

  const handleGuruChange = (guruId) => {
    const guru = guruList.find(g => g.id === guruId);
    if (guru) {
      setFormData(prev => ({
        ...prev,
        guru_id: guru.id,
        nip_pegawai: guru.nip,
        nama_pegawai: guru.nama,
        jabatan_pegawai: guru.jabatan,
        siswa_id: '',
        nis: '',
        nama_siswa: '',
        kelas: ''
      }));
    }
  };

  const handleTarifChange = (tarifId) => {
    const tarif = tarifIuranList.find(t => t.id === tarifId);
    if (tarif) {
      setFormData(prev => ({
        ...prev,
        tipe_transaksi: tarif.nama,
        jumlah: tarif.nominal,
        uraian: `Pembayaran ${tarif.nama}`
      }));
    }
  };

  const handlePrint = (transaksi) => {
    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kwitansi</title>
          <style>
            @page { size: 80mm 150mm; margin: 5mm; }
            body { font-family: 'Courier New', monospace; font-size: 11px; margin: 0; padding: 10px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 10px; }
            .header h2 { margin: 0; font-size: 14px; }
            .header p { margin: 2px 0; font-size: 10px; }
            .row { display: flex; justify-content: space-between; padding: 3px 0; }
            .label { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .amount { font-size: 14px; font-weight: bold; text-align: center; padding: 10px 0; }
            .footer { text-align: center; font-size: 9px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>KWITANSI</h2>
            <p>YPPI ARRAHMAH</p>
            <p>Jl. Contoh No. 123</p>
          </div>
          <div class="row"><span>No:</span><span>${transaksi.id.slice(-8).toUpperCase()}</span></div>
          <div class="row"><span>Tanggal:</span><span>${format(new Date(transaksi.tanggal), 'd/M/yyyy')}</span></div>
          <div class="divider"></div>
          ${transaksi.nama_siswa ? `<div class="row"><span>Siswa:</span><span>${transaksi.nama_siswa}</span></div>` : ''}
          ${transaksi.nama_siswa ? `<div class="row"><span>Kelas:</span><span>${transaksi.kelas}</span></div>` : ''}
          ${transaksi.nama_pegawai ? `<div class="row"><span>Pegawai:</span><span>${transaksi.nama_pegawai}</span></div>` : ''}
          <div class="row"><span>Jenis:</span><span>${transaksi.jenis}</span></div>
          <div class="row"><span>Tipe:</span><span>${transaksi.tipe_transaksi || '-'}</span></div>
          <div class="row"><span>Kategori:</span><span>${transaksi.kategori || '-'}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Uraian:</span></div>
          <div style="padding: 5px 0;">${transaksi.uraian || '-'}</div>
          <div class="divider"></div>
          <div class="amount">${formatRupiah(transaksi.jumlah)}</div>
          <div class="row"><span>Status:</span><span>${transaksi.status_bayar || 'Lunas'}</span></div>
          <div class="divider"></div>
          <div class="footer">
            <p>Terima kasih</p>
            <p>Dicetak: ${format(new Date(), 'd/M/yyyy HH:mm')}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const totalPemasukan = keuanganList.filter(k => k.jenis === 'Pemasukan').reduce((sum, k) => sum + (k.jumlah || 0), 0);
  const totalPengeluaran = keuanganList.filter(k => k.jenis === 'Pengeluaran').reduce((sum, k) => sum + (k.jumlah || 0), 0);
  const saldo = totalPemasukan - totalPengeluaran;

  const transaksiColumns = [
    { key: 'tanggal', label: 'Tanggal', render: (row) => format(new Date(row.tanggal), 'd MMM yyyy', { locale: idLocale }) },
    { 
      key: 'jenis', 
      label: 'Jenis',
      render: (row) => (
        <Badge className={row.jenis === 'Pemasukan' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
          {row.jenis === 'Pemasukan' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {row.jenis}
        </Badge>
      )
    },
    { key: 'tipe_transaksi', label: 'Tipe', render: (row) => row.tipe_transaksi || '-' },
    { key: 'kategori', label: 'Kategori', render: (row) => row.kategori || '-' },
    { 
      key: 'penerima', 
      label: 'Siswa/Pegawai', 
      render: (row) => {
        if (row.nama_siswa) return <span className="text-blue-600 text-sm">{row.nama_siswa}</span>;
        if (row.nama_pegawai) return <span className="text-purple-600 text-sm">{row.nama_pegawai}</span>;
        return <span className="text-slate-400">-</span>;
      }
    },
    { key: 'uraian', label: 'Uraian', render: (row) => <span className="max-w-[150px] truncate block text-sm">{row.uraian || '-'}</span> },
    { 
      key: 'jumlah', 
      label: 'Jumlah', 
      render: (row) => (
        <span className={`font-medium ${row.jenis === 'Pemasukan' ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatRupiah(row.jumlah)}
        </span>
      )
    },
    { 
      key: 'status_bayar', 
      label: 'Status',
      render: (row) => (
        <Badge className={
          row.status_bayar === 'Lunas' ? 'bg-emerald-100 text-emerald-700' :
          row.status_bayar === 'Cicilan' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }>
          {row.status_bayar || 'Lunas'}
        </Badge>
      )
    },
    {
      key: 'aksi',
      label: 'Aksi',
      sortable: false,
      filterable: false,
      render: (row) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => handlePrint(row)} title="Cetak Kwitansi">
            <Printer className="w-4 h-4" />
          </Button>
          {canEdit && (
            <>
              <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteMutation.mutate(row.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Wallet className="w-8 h-8 text-teal-500" />
              Transaksi
            </h1>
            <p className="text-slate-500 mt-1">Kelola semua transaksi keuangan sekolah</p>
          </div>
          
          {canEdit && (
            <Button onClick={() => { setFormData(prev => ({ ...prev, pic: currentUser?.full_name || '' })); setIsOpen(true); }} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" /> Tambah Transaksi
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm bg-emerald-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Total Pemasukan</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatRupiah(totalPemasukan)}</p>
                </div>
                <div className="p-3 bg-emerald-500 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-red-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Total Pengeluaran</p>
                  <p className="text-2xl font-bold text-red-700">{formatRupiah(totalPengeluaran)}</p>
                </div>
                <div className="p-3 bg-red-500 rounded-xl">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm ${saldo >= 0 ? 'bg-teal-50' : 'bg-amber-50'}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${saldo >= 0 ? 'text-teal-600' : 'text-amber-600'}`}>Saldo</p>
                  <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-teal-700' : 'text-amber-700'}`}>{formatRupiah(saldo)}</p>
                </div>
                <div className={`p-3 rounded-xl ${saldo >= 0 ? 'bg-teal-500' : 'bg-amber-500'}`}>
                  <Wallet className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Card className="border-0 shadow-sm mb-4">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">Filter Tanggal:</span>
              <Input 
                type="date" 
                value={filterDateFrom} 
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-40"
              />
              <span className="text-slate-400">s/d</span>
              <Input 
                type="date" 
                value={filterDateTo} 
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-40"
              />
              {(filterDateFrom || filterDateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}>
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="semua">Semua</TabsTrigger>
            <TabsTrigger value="siswa" className="flex items-center gap-1">
              <Users className="w-3 h-3" /> Siswa
            </TabsTrigger>
            <TabsTrigger value="pegawai" className="flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> Pegawai
            </TabsTrigger>
            <TabsTrigger value="pemasukan" className="flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Pemasukan
            </TabsTrigger>
            <TabsTrigger value="pengeluaran" className="flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> Pengeluaran
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Daftar Transaksi ({filteredTransaksi.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={transaksiColumns} data={filteredTransaksi} pageSize={10} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog Form */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingData ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Jenis Penerima */}
              {!editingData && (
                <div>
                  <Label>Jenis Transaksi</Label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    <Button type="button" variant={jenisTransaksi === 'umum' ? 'default' : 'outline'} onClick={() => setJenisTransaksi('umum')} className="text-xs">
                      Umum
                    </Button>
                    <Button type="button" variant={jenisTransaksi === 'siswa' ? 'default' : 'outline'} onClick={() => setJenisTransaksi('siswa')} className="text-xs">
                      <Users className="w-3 h-3 mr-1" /> Siswa
                    </Button>
                    <Button type="button" variant={jenisTransaksi === 'pegawai' ? 'default' : 'outline'} onClick={() => setJenisTransaksi('pegawai')} className="text-xs">
                      <UserCheck className="w-3 h-3 mr-1" /> Pegawai
                    </Button>
                    <Button type="button" variant={jenisTransaksi === 'donatur' ? 'default' : 'outline'} onClick={() => setJenisTransaksi('donatur')} className="text-xs">
                      <Heart className="w-3 h-3 mr-1" /> Donatur
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal</Label>
                  <Input type="date" value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} required />
                </div>
                <div>
                  <Label>Jenis</Label>
                  <Select value={formData.jenis} onValueChange={(v) => setFormData({...formData, jenis: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pemasukan">Pemasukan</SelectItem>
                      <SelectItem value="Pengeluaran">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Siswa Selection */}
              {jenisTransaksi === 'siswa' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <Label>Pilih Kelas</Label>
                    <Select
                      value={selectedKelasId}
                      onValueChange={(v) => {
                        setSelectedKelasId(v);
                        setFormData(prev => ({ ...prev, siswa_id: '', nis: '', nama_siswa: '', kelas: '' }));
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                      <SelectContent>
                        {kelasList.map(kelas => (
                          <SelectItem key={kelas.id} value={kelas.id}>
                            {kelas.nama_kelas}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedKelasId && (
                    <div>
                      <Label>Pilih Siswa</Label>
                      <Select value={formData.siswa_id} onValueChange={handleSiswaChange}>
                        <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
                        <SelectContent>
                          {sortedSiswaList.map(siswa => (
                            <SelectItem key={siswa.id} value={siswa.id}>
                              {siswa.nis} - {siswa.nama}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {formData.siswa_id && tarifIuranList.length > 0 && (
                    <div>
                      <Label>Pilih Tarif Iuran (Opsional)</Label>
                      <Select onValueChange={handleTarifChange}>
                        <SelectTrigger><SelectValue placeholder="Pilih tarif untuk auto-fill" /></SelectTrigger>
                        <SelectContent>
                          {tarifIuranList.map(tarif => (
                            <SelectItem key={tarif.id} value={tarif.id}>
                              {tarif.nama} - {formatRupiah(tarif.nominal)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Pegawai Selection - dengan pencarian */}
              {jenisTransaksi === 'pegawai' && (
                <div className="p-4 bg-purple-50 rounded-lg space-y-2">
                  <Label>Pilih Pegawai</Label>
                  <Popover open={pegawaiSearchOpen} onOpenChange={setPegawaiSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        {formData.guru_id
                          ? `${formData.nama_pegawai} (${formData.jabatan_pegawai || '-'})`
                          : "Cari pegawai..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Ketik nama pegawai..." />
                        <CommandList>
                          <CommandEmpty>Pegawai tidak ditemukan.</CommandEmpty>
                          <CommandGroup>
                            {sortedGuruList.map(guru => (
                              <CommandItem
                                key={guru.id}
                                value={`${guru.nama} ${guru.nip || ''} ${guru.jabatan || ''}`}
                                onSelect={() => {
                                  handleGuruChange(guru.id);
                                  setPegawaiSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${formData.guru_id === guru.id ? "opacity-100" : "opacity-0"}`}
                                />
                                <div className="flex flex-col">
                                  <span>{guru.nama}</span>
                                  <span className="text-xs text-slate-400">{guru.nip || '-'} · {guru.jabatan || '-'}</span>
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

              {/* Donatur */}
              {jenisTransaksi === 'donatur' && (
                <div className="p-4 bg-pink-50 rounded-lg">
                  <Label>Nama Donatur</Label>
                  <Input 
                    value={formData.uraian} 
                    onChange={(e) => setFormData({...formData, uraian: e.target.value, kategori: 'Donasi'})}
                    placeholder="Nama donatur atau hamba Allah"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipe Transaksi</Label>
                  <Select value={formData.tipe_transaksi} onValueChange={(v) => setFormData({...formData, tipe_transaksi: v})}>
                    <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                    <SelectContent>
                      {tipeTransaksiList.map(tipe => (
                        <SelectItem key={tipe.id} value={tipe.nama}>{tipe.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select value={formData.kategori} onValueChange={(v) => setFormData({...formData, kategori: v})}>
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      {kategoriList.map(kat => (
                        <SelectItem key={kat.id} value={kat.nama}>{kat.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Uraian</Label>
                <Textarea 
                  value={formData.uraian} 
                  onChange={(e) => setFormData({...formData, uraian: e.target.value})} 
                  placeholder="Deskripsi transaksi"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Jumlah (Rp)</Label>
                  <Input 
                    type="number" 
                    value={formData.jumlah} 
                    onChange={(e) => setFormData({...formData, jumlah: e.target.value})} 
                    placeholder="0"
                    required 
                  />
                </div>
                <div>
                  <Label>Status Bayar</Label>
                  <Select value={formData.status_bayar} onValueChange={(v) => setFormData({...formData, status_bayar: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lunas">Lunas</SelectItem>
                      <SelectItem value="Belum Lunas">Belum Lunas</SelectItem>
                      <SelectItem value="Cicilan">Cicilan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sumber Dana</Label>
                  <Select value={formData.sumber_rekening} onValueChange={(v) => setFormData({...formData, sumber_rekening: v})}>
                    <SelectTrigger><SelectValue placeholder="Pilih sumber" /></SelectTrigger>
                    <SelectContent>
                      {sumberDanaList.map(sumber => (
                        <SelectItem key={sumber.id} value={sumber.nama}>{sumber.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>PIC/Penanggung Jawab</Label>
                  <Input
                    value={formData.pic}
                    readOnly
                    placeholder={currentUser?.full_name || ''}
                    className="bg-slate-50 text-slate-600"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700">
                  {editingData ? 'Simpan' : 'Tambah'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}