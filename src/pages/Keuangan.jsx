import React, { useState, useEffect } from 'react';
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
import { 
  Wallet, Plus, TrendingUp, TrendingDown, 
  Edit2, Trash2, ArrowUpRight, ArrowDownRight, Printer, ClipboardList
} from "lucide-react";

export default function Keuangan() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('transaksi');
  const [isRencanaBelanja, setIsRencanaBelanja] = useState(false);
  const [editingRencana, setEditingRencana] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const userRole = currentUser?.role || 'guru';
  const canEdit = ['admin', 'bendahara'].includes(userRole);

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
    sumber_rekening: '',
    pic: '',
    status_bayar: 'Lunas',
    rencana_belanja_id: ''
  });

  const [rencanaForm, setRencanaForm] = useState({
    nama_rencana: '',
    periode: '',
    kategori: '',
    anggaran: '',
    keterangan: '',
    status: 'Aktif'
  });

  const { data: keuanganList = [] } = useQuery({
    queryKey: ['keuangan'],
    queryFn: () => base44.entities.Keuangan.list('-tanggal'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: rencanaList = [] } = useQuery({
    queryKey: ['rencana-belanja'],
    queryFn: () => base44.entities.RencanaBelanja.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Keuangan.create({ ...data, jumlah: Number(data.jumlah) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keuangan'] });
      queryClient.invalidateQueries({ queryKey: ['rencana-belanja'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Keuangan.update(id, { ...data, jumlah: Number(data.jumlah) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keuangan'] });
      queryClient.invalidateQueries({ queryKey: ['rencana-belanja'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Keuangan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keuangan'] });
      queryClient.invalidateQueries({ queryKey: ['rencana-belanja'] });
    },
  });

  const createRencanaMutation = useMutation({
    mutationFn: (data) => base44.entities.RencanaBelanja.create({ 
      ...data, 
      anggaran: Number(data.anggaran),
      realisasi: 0,
      sisa: Number(data.anggaran)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rencana-belanja'] });
      resetRencanaForm();
    },
  });

  const updateRencanaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RencanaBelanja.update(id, { 
      ...data, 
      anggaran: Number(data.anggaran)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rencana-belanja'] });
      resetRencanaForm();
    },
  });

  const deleteRencanaMutation = useMutation({
    mutationFn: (id) => base44.entities.RencanaBelanja.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rencana-belanja'] }),
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
      sumber_rekening: '',
      pic: '',
      status_bayar: 'Lunas',
      rencana_belanja_id: ''
    });
    setEditingData(null);
    setIsOpen(false);
  };

  const resetRencanaForm = () => {
    setRencanaForm({
      nama_rencana: '',
      periode: '',
      kategori: '',
      anggaran: '',
      keterangan: '',
      status: 'Aktif'
    });
    setEditingRencana(null);
    setIsRencanaBelanja(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleRencanaSubmit = (e) => {
    e.preventDefault();
    if (editingRencana) {
      updateRencanaMutation.mutate({ id: editingRencana.id, data: rencanaForm });
    } else {
      createRencanaMutation.mutate(rencanaForm);
    }
  };

  const handleEdit = (data) => {
    setEditingData(data);
    setFormData(data);
    setIsOpen(true);
  };

  const handleEditRencana = (data) => {
    setEditingRencana(data);
    setRencanaForm(data);
    setIsRencanaBelanja(true);
  };

  const handleSiswaChange = (siswaId) => {
    const siswa = siswaList.find(s => s.id === siswaId);
    if (siswa) {
      setFormData(prev => ({
        ...prev,
        siswa_id: siswa.id,
        nis: siswa.nis,
        nama_siswa: siswa.nama,
        kelas: siswa.nama_kelas
      }));
    }
  };

  const handlePrint = (transaksi) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bukti Transaksi</title>
          <style>
            @page { 
              size: A4; 
              margin: 10mm 5mm 10mm 5mm;
            }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px;
              margin: 0;
              padding: 10px;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .row { 
              display: flex; 
              padding: 5px 0;
              border-bottom: 1px dashed #ccc;
            }
            .label { 
              width: 150px; 
              font-weight: bold;
            }
            .value { 
              flex: 1;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              border-top: 1px solid #000;
              padding-top: 10px;
            }
            .amount {
              font-size: 16px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>BUKTI TRANSAKSI</h2>
            <p>YPPI ARRAHMAH</p>
          </div>
          <div class="row">
            <div class="label">No. Transaksi</div>
            <div class="value">: ${transaksi.id}</div>
          </div>
          <div class="row">
            <div class="label">Tanggal</div>
            <div class="value">: ${format(new Date(transaksi.tanggal), 'd MMMM yyyy', { locale: idLocale })}</div>
          </div>
          <div class="row">
            <div class="label">Jenis</div>
            <div class="value">: ${transaksi.jenis}</div>
          </div>
          <div class="row">
            <div class="label">Tipe Transaksi</div>
            <div class="value">: ${transaksi.tipe_transaksi || '-'}</div>
          </div>
          <div class="row">
            <div class="label">Kategori</div>
            <div class="value">: ${transaksi.kategori}</div>
          </div>
          ${transaksi.nama_siswa ? `
          <div class="row">
            <div class="label">Siswa</div>
            <div class="value">: ${transaksi.nama_siswa} (${transaksi.nis})</div>
          </div>
          <div class="row">
            <div class="label">Kelas</div>
            <div class="value">: ${transaksi.kelas}</div>
          </div>
          ` : ''}
          <div class="row">
            <div class="label">Uraian</div>
            <div class="value">: ${transaksi.uraian || '-'}</div>
          </div>
          <div class="row">
            <div class="label">Jumlah</div>
            <div class="value amount">: ${formatRupiah(transaksi.jumlah)}</div>
          </div>
          <div class="row">
            <div class="label">Status</div>
            <div class="value">: ${transaksi.status_bayar || 'Lunas'}</div>
          </div>
          <div class="row">
            <div class="label">PIC</div>
            <div class="value">: ${transaksi.pic || '-'}</div>
          </div>
          <div class="footer">
            <p>Dicetak: ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: idLocale })}</p>
            <p>Sistem Informasi Sekolah YPPI ARRAHMAH</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalPemasukan = keuanganList.filter(k => k.jenis === 'Pemasukan').reduce((sum, k) => sum + (k.jumlah || 0), 0);
  const totalPengeluaran = keuanganList.filter(k => k.jenis === 'Pengeluaran').reduce((sum, k) => sum + (k.jumlah || 0), 0);
  const saldo = totalPemasukan - totalPengeluaran;

  // Transaksi columns for DataTable
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
    { key: 'kategori', label: 'Kategori' },
    { key: 'nama_siswa', label: 'Siswa', render: (row) => row.nama_siswa || '-' },
    { key: 'uraian', label: 'Uraian', render: (row) => <span className="max-w-xs truncate block">{row.uraian}</span> },
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
      key: 'aksi',
      label: 'Aksi',
      sortable: false,
      filterable: false,
      render: (row) => canEdit ? (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handlePrint(row)}>
            <Printer className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteMutation.mutate(row.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => handlePrint(row)}>
          <Printer className="w-4 h-4" />
        </Button>
      )
    }
  ];

  // Rencana Belanja columns
  const rencanaColumns = [
    { key: 'nama_rencana', label: 'Nama Rencana' },
    { key: 'periode', label: 'Periode', render: (row) => row.periode || '-' },
    { key: 'kategori', label: 'Kategori' },
    { key: 'anggaran', label: 'Anggaran', render: (row) => formatRupiah(row.anggaran) },
    { key: 'realisasi', label: 'Realisasi', render: (row) => formatRupiah(row.realisasi || 0) },
    { 
      key: 'sisa', 
      label: 'Sisa', 
      render: (row) => {
        const sisa = (row.anggaran || 0) - (row.realisasi || 0);
        return <span className={sisa >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>{formatRupiah(sisa)}</span>
      }
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => (
        <Badge className={
          row.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' :
          row.status === 'Selesai' ? 'bg-slate-100 text-slate-700' :
          'bg-amber-100 text-amber-700'
        }>
          {row.status}
        </Badge>
      )
    },
    {
      key: 'aksi',
      label: 'Aksi',
      sortable: false,
      filterable: false,
      render: (row) => canEdit ? (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEditRencana(row)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteRencanaMutation.mutate(row.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ) : '-'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Wallet className="w-8 h-8 text-teal-500" />
              Keuangan
            </h1>
            <p className="text-slate-500 mt-1">Kelola transaksi dan rencana belanja sekolah</p>
          </div>
          
          {canEdit && (
            <div className="flex gap-2">
              <Button onClick={() => setIsRencanaBelanja(true)} variant="outline" className="border-teal-600 text-teal-600 hover:bg-teal-50">
                <ClipboardList className="w-4 h-4 mr-2" /> Rencana Belanja
              </Button>
              <Button onClick={() => setIsOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" /> Tambah Transaksi
              </Button>
            </div>
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="transaksi">Transaksi</TabsTrigger>
            <TabsTrigger value="rencana">Rencana Belanja</TabsTrigger>
          </TabsList>

          <TabsContent value="transaksi">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Daftar Transaksi</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={transaksiColumns} data={keuanganList} pageSize={5} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rencana">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Rencana Belanja</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={rencanaColumns} data={rencanaList} pageSize={5} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog Transaksi */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingData ? 'Edit Transaksi' : 'Tambah Transaksi'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal</Label>
                  <Input 
                    type="date" 
                    value={formData.tanggal} 
                    onChange={(e) => setFormData({...formData, tanggal: e.target.value})} 
                    required 
                  />
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipe Transaksi</Label>
                  <Select value={formData.tipe_transaksi} onValueChange={(v) => setFormData({...formData, tipe_transaksi: v})}>
                    <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPP/Bulanan">SPP/Bulanan</SelectItem>
                      <SelectItem value="Ujian Sekolah">Ujian Sekolah</SelectItem>
                      <SelectItem value="Daftar Ulang">Daftar Ulang</SelectItem>
                      <SelectItem value="Kelulusan">Kelulusan</SelectItem>
                      <SelectItem value="Belanja Harian">Belanja Harian</SelectItem>
                      <SelectItem value="Belanja Bulanan">Belanja Bulanan</SelectItem>
                      <SelectItem value="Belanja Tahunan">Belanja Tahunan</SelectItem>
                      <SelectItem value="Kasbon Pegawai">Kasbon Pegawai</SelectItem>
                      <SelectItem value="Kegiatan">Kegiatan</SelectItem>
                      <SelectItem value="BOSP">BOSP</SelectItem>
                      <SelectItem value="Transaksi Khusus">Transaksi Khusus</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select value={formData.kategori} onValueChange={(v) => setFormData({...formData, kategori: v})}>
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPP">SPP</SelectItem>
                      <SelectItem value="BOS">BOS</SelectItem>
                      <SelectItem value="BOSP">BOSP</SelectItem>
                      <SelectItem value="Donasi">Donasi</SelectItem>
                      <SelectItem value="Gaji">Gaji</SelectItem>
                      <SelectItem value="Operasional">Operasional</SelectItem>
                      <SelectItem value="Sarpras">Sarpras</SelectItem>
                      <SelectItem value="Listrik">Listrik</SelectItem>
                      <SelectItem value="Air">Air</SelectItem>
                      <SelectItem value="Internet">Internet</SelectItem>
                      <SelectItem value="Kegiatan">Kegiatan</SelectItem>
                      <SelectItem value="ATK">ATK</SelectItem>
                      <SelectItem value="Kasbon">Kasbon</SelectItem>
                      <SelectItem value="Ujian">Ujian</SelectItem>
                      <SelectItem value="Daftar Ulang">Daftar Ulang</SelectItem>
                      <SelectItem value="Kelulusan">Kelulusan</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Siswa (Opsional)</Label>
                <Select value={formData.siswa_id} onValueChange={handleSiswaChange}>
                  <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Tidak ada</SelectItem>
                    {siswaList.map(siswa => (
                      <SelectItem key={siswa.id} value={siswa.id}>
                        {siswa.nis} - {siswa.nama} ({siswa.nama_kelas})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Uraian</Label>
                <Input 
                  value={formData.uraian} 
                  onChange={(e) => setFormData({...formData, uraian: e.target.value})} 
                  placeholder="Deskripsi transaksi"
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
                  <Label>Sumber/Rekening</Label>
                  <Input 
                    value={formData.sumber_rekening} 
                    onChange={(e) => setFormData({...formData, sumber_rekening: e.target.value})} 
                  />
                </div>
                <div>
                  <Label>PIC</Label>
                  <Input 
                    value={formData.pic} 
                    onChange={(e) => setFormData({...formData, pic: e.target.value})} 
                  />
                </div>
              </div>

              {formData.jenis === 'Pengeluaran' && (
                <div>
                  <Label>Rencana Belanja</Label>
                  <Select value={formData.rencana_belanja_id} onValueChange={(v) => setFormData({...formData, rencana_belanja_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Pilih rencana" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Tidak ada</SelectItem>
                      {rencanaList.filter(r => r.status === 'Aktif').map(rencana => (
                        <SelectItem key={rencana.id} value={rencana.id}>
                          {rencana.nama_rencana} ({rencana.kategori})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700">
                  {editingData ? 'Simpan' : 'Tambah'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Rencana Belanja */}
        <Dialog open={isRencanaBelanja} onOpenChange={setIsRencanaBelanja}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRencana ? 'Edit Rencana Belanja' : 'Tambah Rencana Belanja'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRencanaSubmit} className="space-y-4">
              <div>
                <Label>Nama Rencana</Label>
                <Input 
                  value={rencanaForm.nama_rencana} 
                  onChange={(e) => setRencanaForm({...rencanaForm, nama_rencana: e.target.value})} 
                  placeholder="Nama rencana belanja"
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Periode</Label>
                  <Input 
                    value={rencanaForm.periode} 
                    onChange={(e) => setRencanaForm({...rencanaForm, periode: e.target.value})} 
                    placeholder="2024/2025"
                  />
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select value={rencanaForm.kategori} onValueChange={(v) => setRencanaForm({...rencanaForm, kategori: v})}>
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gaji">Gaji</SelectItem>
                      <SelectItem value="Operasional">Operasional</SelectItem>
                      <SelectItem value="Sarpras">Sarpras</SelectItem>
                      <SelectItem value="Kegiatan">Kegiatan</SelectItem>
                      <SelectItem value="Pemeliharaan">Pemeliharaan</SelectItem>
                      <SelectItem value="Pengembangan">Pengembangan</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Anggaran (Rp)</Label>
                <Input 
                  type="number" 
                  value={rencanaForm.anggaran} 
                  onChange={(e) => setRencanaForm({...rencanaForm, anggaran: e.target.value})} 
                  placeholder="0"
                  required 
                />
              </div>

              <div>
                <Label>Keterangan</Label>
                <Input 
                  value={rencanaForm.keterangan} 
                  onChange={(e) => setRencanaForm({...rencanaForm, keterangan: e.target.value})} 
                  placeholder="Keterangan rencana"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={rencanaForm.status} onValueChange={(v) => setRencanaForm({...rencanaForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Selesai">Selesai</SelectItem>
                    <SelectItem value="Ditunda">Ditunda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetRencanaForm} className="flex-1">Batal</Button>
                <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700">
                  {editingRencana ? 'Simpan' : 'Tambah'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}