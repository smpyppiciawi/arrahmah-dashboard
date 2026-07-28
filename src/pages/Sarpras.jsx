import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Package, Plus, Search, Printer, Pencil, Trash2, Loader2, Boxes,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import SarprasForm from '@/components/sarpras/SarprasForm';
import BarcodeDialog from '@/components/sarpras/BarcodeDialog';

const KATEGORI_OPTIONS = ['Mebel', 'Elektronik', 'ATK', 'Olahraga', 'Laboratorium', 'Perpustakaan', 'Kebersihan', 'Keamanan', 'Lainnya'];

const KONDISI_CONFIG = {
  'Baik': 'bg-emerald-100 text-emerald-700',
  'Rusak Ringan': 'bg-amber-100 text-amber-700',
  'Rusak Berat': 'bg-red-100 text-red-700',
};

function formatRupiah(num) {
  if (!num) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
}

export default function Sarpras() {
  const { user: currentUser } = useAuth();
  const userRole = currentUser?.role || 'guru';
  const canEdit = ['admin', 'tu', 'bendahara'].includes(userRole);

  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterKondisi, setFilterKondisi] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showBarcode, setShowBarcode] = useState(false);
  const [barcodeItems, setBarcodeItems] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sarprasList = [], isLoading } = useQuery({
    queryKey: ['sarpras'],
    queryFn: () => base44.entities.Sarpras.list('-updated_date', 2000),
  });

  const filteredList = useMemo(() => {
    return sarprasList.filter(item => {
      if (search) {
        const q = search.toLowerCase();
        if (!item.nama_barang?.toLowerCase().includes(q) && !item.kode_barang?.toLowerCase().includes(q)) return false;
      }
      if (filterJenis && item.jenis !== filterJenis) return false;
      if (filterKategori && item.kategori !== filterKategori) return false;
      if (filterKondisi && item.kondisi !== filterKondisi) return false;
      return true;
    });
  }, [sarprasList, search, filterJenis, filterKategori, filterKondisi]);

  const stats = useMemo(() => {
    const total = sarprasList.length;
    const totalUnit = sarprasList.reduce((sum, i) => sum + (i.jumlah || 0), 0);
    const baik = sarprasList.filter(i => i.kondisi === 'Baik').length;
    const rusakRingan = sarprasList.filter(i => i.kondisi === 'Rusak Ringan').length;
    const rusakBerat = sarprasList.filter(i => i.kondisi === 'Rusak Berat').length;
    const totalNilai = sarprasList.reduce((sum, i) => sum + (i.harga_satuan || 0) * (i.jumlah || 0), 0);
    return { total, totalUnit, baik, rusakRingan, rusakBerat, totalNilai };
  }, [sarprasList]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await base44.entities.Sarpras.delete(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ['sarpras'] });
      toast({ title: 'Dihapus', description: `${deleteTarget.nama_barang} berhasil dihapus.` });
      setDeleteTarget(null);
    } catch (err) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleShowBarcode = (items) => {
    setBarcodeItems(items);
    setShowBarcode(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 md:w-7 md:h-7 text-teal-500" /> Sarana & Prasarana
            </h1>
            <p className="text-slate-500 text-sm mt-1">Manajemen inventaris barang sekolah dengan barcode</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleShowBarcode(filteredList)} disabled={filteredList.length === 0} className="gap-2">
              <Printer className="w-4 h-4" /> Cetak Barcode
            </Button>
            {canEdit && (
              <Button onClick={() => { setEditingItem(null); setShowForm(true); }} className="bg-teal-600 hover:bg-teal-700 gap-2">
                <Plus className="w-4 h-4" /> Tambah Barang
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-slate-700">{stats.total}</p>
            <p className="text-[10px] text-slate-500">Jenis Barang</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-indigo-700">{stats.totalUnit}</p>
            <p className="text-[10px] text-slate-500">Total Unit</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-emerald-700">{stats.baik}</p>
            <p className="text-[10px] text-emerald-600">Kondisi Baik</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-amber-700">{stats.rusakRingan}</p>
            <p className="text-[10px] text-amber-600">Rusak Ringan</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-red-700">{stats.rusakBerat}</p>
            <p className="text-[10px] text-red-600">Rusak Berat</p>
          </div>
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-teal-700">Rp {formatRupiah(stats.totalNilai)}</p>
            <p className="text-[10px] text-teal-600">Nilai Aset</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Cari kode/nama..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterJenis || 'all'} onValueChange={(v) => setFilterJenis(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Semua Jenis" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="Sarana">Sarana</SelectItem>
                  <SelectItem value="Prasarana">Prasarana</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterKategori || 'all'} onValueChange={(v) => setFilterKategori(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterKondisi || 'all'} onValueChange={(v) => setFilterKondisi(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Semua Kondisi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kondisi</SelectItem>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Rusak Ringan">Rusak Ringan</SelectItem>
                  <SelectItem value="Rusak Berat">Rusak Berat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-12">
                <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">{sarprasList.length === 0 ? 'Belum ada data barang' : 'Tidak ada hasil untuk filter ini'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-xs">Kode</TableHead>
                      <TableHead className="text-xs">Nama Barang</TableHead>
                      <TableHead className="text-xs">Jenis</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Kategori</TableHead>
                      <TableHead className="text-xs">Kondisi</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Lokasi</TableHead>
                      <TableHead className="text-xs text-center hidden sm:table-cell">Jumlah</TableHead>
                      <TableHead className="text-xs text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/60">
                        <TableCell className="font-mono text-xs text-slate-600">{item.kode_barang}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.foto_url && <img src={item.foto_url} alt="" className="w-8 h-8 rounded-lg object-cover border" />}
                            <div>
                              <p className="font-medium text-sm text-slate-800">{item.nama_barang}</p>
                              {item.sub_kategori && <p className="text-[10px] text-slate-400">{item.sub_kategori}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={item.jenis === 'Sarana' ? 'bg-blue-50 text-blue-700 text-xs' : 'bg-purple-50 text-purple-700 text-xs'}>
                            {item.jenis}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-slate-600">{item.kategori}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${KONDISI_CONFIG[item.kondisi] || 'bg-slate-100 text-slate-600'}`}>
                            {item.kondisi}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-slate-600">{item.lokasi || '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell text-center text-sm">{item.jumlah} {item.satuan}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-teal-600" onClick={() => handleShowBarcode([item])} title="Lihat Barcode">
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                            {canEdit && (
                              <>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => { setEditingItem(item); setShowForm(true); }} title="Edit">
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => setDeleteTarget(item)} title="Hapus">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
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
      </div>

      {/* Dialogs */}
      <SarprasForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingItem(null); }}
        editingItem={editingItem}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['sarpras'] })}
      />
      <BarcodeDialog
        items={barcodeItems}
        open={showBarcode}
        onClose={() => setShowBarcode(false)}
      />

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Hapus Barang?</p>
                <p className="text-xs text-slate-500">{deleteTarget.nama_barang} ({deleteTarget.kode_barang})</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Batal</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}