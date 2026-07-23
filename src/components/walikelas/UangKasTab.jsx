import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useActiveAcademicYear } from "@/context/ActiveAcademicYearContext";
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function UangKasTab({ kelasWali, guruData }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeAcademicYear } = useActiveAcademicYear();
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jenis: 'Pemasukan',
    uraian: '',
    jumlah: '',
  });

  const { data: kasList = [], isLoading } = useQuery({
    queryKey: ['uangKas', kelasWali?.id],
    queryFn: () => base44.entities.UangKas.filter({ kelas_id: kelasWali?.id }, '-tanggal'),
    enabled: !!kelasWali?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.UangKas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uangKas'] });
      resetForm();
      toast({ title: 'Berhasil', description: 'Transaksi kas tersimpan.' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UangKas.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uangKas'] });
      resetForm();
      toast({ title: 'Berhasil', description: 'Transaksi kas diperbarui.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UangKas.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uangKas'] });
      toast({ title: 'Berhasil', description: 'Transaksi dihapus.' });
    },
  });

  const resetForm = () => {
    setFormData({ tanggal: format(new Date(), 'yyyy-MM-dd'), jenis: 'Pemasukan', uraian: '', jumlah: '' });
    setEditingData(null);
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      jumlah: Number(formData.jumlah),
      kelas_id: kelasWali.id,
      nama_kelas: kelasWali.nama_kelas,
      pic: guruData?.nama || '',
      tahun_ajaran: activeAcademicYear || '',
    };
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (row) => {
    setEditingData(row);
    setFormData({ tanggal: row.tanggal, jenis: row.jenis, uraian: row.uraian, jumlah: String(row.jumlah) });
    setIsOpen(true);
  };

  // Filter by month
  const filteredKas = useMemo(() => {
    return kasList.filter(k => k.tanggal?.startsWith(filterMonth));
  }, [kasList, filterMonth]);

  const totalPemasukan = filteredKas.filter(k => k.jenis === 'Pemasukan').reduce((sum, k) => sum + (k.jumlah || 0), 0);
  const totalPengeluaran = filteredKas.filter(k => k.jenis === 'Pengeluaran').reduce((sum, k) => sum + (k.jumlah || 0), 0);
  const saldo = totalPemasukan - totalPengeluaran;

  // All-time totals
  const allPemasukan = kasList.filter(k => k.jenis === 'Pemasukan').reduce((sum, k) => sum + (k.jumlah || 0), 0);
  const allPengeluaran = kasList.filter(k => k.jenis === 'Pengeluaran').reduce((sum, k) => sum + (k.jumlah || 0), 0);
  const allSaldo = allPemasukan - allPengeluaran;

  const formatRupiah = (n) => 'Rp ' + (n || 0).toLocaleString('id-ID');

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-emerald-700 truncate">{formatRupiah(totalPemasukan)}</p>
            <p className="text-xs text-slate-500">Pemasukan (Bulan)</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-rose-50">
          <CardContent className="p-3 text-center">
            <TrendingDown className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-red-700 truncate">{formatRupiah(totalPengeluaran)}</p>
            <p className="text-xs text-slate-500">Pengeluaran (Bulan)</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-3 text-center">
            <Wallet className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className={`text-sm font-bold truncate ${saldo >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatRupiah(saldo)}</p>
            <p className="text-xs text-slate-500">Saldo (Bulan)</p>
          </CardContent>
        </Card>
      </div>

      {/* All-time saldo badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-slate-500">Filter Bulan:</Label>
          <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-auto h-8 text-xs" />
        </div>
        <Badge className={allSaldo >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}>
          Total Saldo: {formatRupiah(allSaldo)}
        </Badge>
      </div>

      {/* Transaction List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-500" /> Transaksi Uang Kas {kelasWali?.nama_kelas}
            </CardTitle>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 gap-1.5" onClick={() => { setEditingData(null); setFormData({ tanggal: format(new Date(), 'yyyy-MM-dd'), jenis: 'Pemasukan', uraian: '', jumlah: '' }); setIsOpen(true); }}>
              <Plus className="w-4 h-4" /> Tambah
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-6 text-slate-400 text-sm">Memuat data...</div>
          ) : filteredKas.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">Belum ada transaksi pada bulan ini</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs">Jenis</TableHead>
                    <TableHead className="text-xs">Uraian</TableHead>
                    <TableHead className="text-xs text-right">Jumlah</TableHead>
                    <TableHead className="text-xs w-16">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKas.map((kas, i) => (
                    <TableRow key={kas.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <TableCell className="text-xs text-slate-500">
                        {format(new Date(kas.tanggal), 'd MMM yyyy', { locale: idLocale })}
                      </TableCell>
                      <TableCell>
                        <Badge className={kas.jenis === 'Pemasukan' ? 'bg-emerald-100 text-emerald-700 text-xs' : 'bg-red-100 text-red-700 text-xs'}>
                          {kas.jenis === 'Pemasukan' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {kas.jenis}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{kas.uraian}</TableCell>
                      <TableCell className={`text-right text-sm font-semibold ${kas.jenis === 'Pemasukan' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {kas.jenis === 'Pemasukan' ? '+' : '-'} {formatRupiah(kas.jumlah)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(kas)} className="p-1 text-slate-400 hover:text-purple-600 rounded">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(kas.id)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-500" />
              {editingData ? 'Edit Transaksi' : 'Tambah Transaksi'} Kas
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Tanggal</Label>
                <Input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} required />
              </div>
              <div>
                <Label className="text-xs">Jenis</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button type="button" onClick={() => setFormData({ ...formData, jenis: 'Pemasukan' })} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${formData.jenis === 'Pemasukan' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    <TrendingUp className="w-4 h-4" /> Pemasukan
                  </button>
                  <button type="button" onClick={() => setFormData({ ...formData, jenis: 'Pengeluaran' })} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${formData.jenis === 'Pengeluaran' ? 'bg-red-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    <TrendingDown className="w-4 h-4" /> Pengeluaran
                  </button>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Uraian</Label>
              <Textarea value={formData.uraian} onChange={(e) => setFormData({ ...formData, uraian: e.target.value })} placeholder="Contoh: Iuran harian siswa, Pembelian alat kebersihan" rows={2} required />
            </div>
            <div>
              <Label className="text-xs">Jumlah (Rp)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">Rp</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formData.jumlah ? new Intl.NumberFormat('id-ID').format(Number(formData.jumlah)) : ''}
                  onChange={(e) => setFormData({ ...formData, jumlah: e.target.value.replace(/\D/g, '') })}
                  placeholder="0"
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>Batal</Button>
              <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingData ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}