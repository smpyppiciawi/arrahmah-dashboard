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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, Plus, TrendingUp, TrendingDown, Search, 
  Edit2, Trash2, ArrowUpRight, ArrowDownRight 
} from "lucide-react";

const KATEGORI_PEMASUKAN = ['SPP', 'BOS', 'Donasi', 'Lainnya'];
const KATEGORI_PENGELUARAN = ['Gaji', 'Operasional', 'Sarpras', 'Listrik', 'Air', 'Internet', 'Kegiatan', 'ATK', 'Lainnya'];

export default function Keuangan() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
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
    kategori: '',
    uraian: '',
    jumlah: '',
    sumber_rekening: '',
    pic: '',
  });

  const { data: keuanganList = [], isLoading } = useQuery({
    queryKey: ['keuangan'],
    queryFn: () => base44.entities.Keuangan.list('-tanggal'),
  });

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
      kategori: '',
      uraian: '',
      jumlah: '',
      sumber_rekening: '',
      pic: '',
    });
    setEditingData(null);
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (data) => {
    setEditingData(data);
    setFormData(data);
    setIsOpen(true);
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filteredData = keuanganList.filter(item => {
    const matchSearch = item.uraian?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.kategori?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchJenis = filterJenis === 'all' || item.jenis === filterJenis;
    return matchSearch && matchJenis;
  });

  const totalPemasukan = keuanganList.filter(k => k.jenis === 'Pemasukan').reduce((sum, k) => sum + (k.jumlah || 0), 0);
  const totalPengeluaran = keuanganList.filter(k => k.jenis === 'Pengeluaran').reduce((sum, k) => sum + (k.jumlah || 0), 0);
  const saldo = totalPemasukan - totalPengeluaran;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Wallet className="w-8 h-8 text-teal-500" />
              Keuangan
            </h1>
            <p className="text-slate-500 mt-1">Kelola pemasukan dan pengeluaran</p>
          </div>
          
          {canEdit && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Transaksi
                </Button>
              </DialogTrigger>
            <DialogContent>
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
                    <Select value={formData.jenis} onValueChange={(v) => setFormData({...formData, jenis: v, kategori: ''})}>
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
                    <Label>Kategori</Label>
                    <Select value={formData.kategori} onValueChange={(v) => setFormData({...formData, kategori: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        {(formData.jenis === 'Pemasukan' ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN).map(kat => (
                          <SelectItem key={kat} value={kat}>{kat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                  <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700">
                    {editingData ? 'Simpan' : 'Tambah'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Cari transaksi..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={filterJenis} onValueChange={setFilterJenis} className="w-full md:w-auto">
                <TabsList className="grid w-full grid-cols-3 md:w-auto">
                  <TabsTrigger value="all">Semua</TabsTrigger>
                  <TabsTrigger value="Pemasukan">Pemasukan</TabsTrigger>
                  <TabsTrigger value="Pengeluaran">Pengeluaran</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Uraian</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50">
                      <TableCell>{format(new Date(item.tanggal), 'd MMM yyyy', { locale: idLocale })}</TableCell>
                      <TableCell>
                        <Badge className={item.jenis === 'Pemasukan' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                          {item.jenis === 'Pemasukan' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                          {item.jenis}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.kategori}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.uraian}</TableCell>
                      <TableCell className={`text-right font-medium ${item.jenis === 'Pemasukan' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatRupiah(item.jumlah)}
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteMutation.mutate(item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        {isLoading ? 'Memuat data...' : 'Belum ada data transaksi'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}