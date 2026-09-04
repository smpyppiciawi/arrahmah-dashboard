import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Search, Building2, Calendar, LogIn, Edit2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import KembaliMasukDialog from "@/components/siswa/KembaliMasukDialog";
import SiswaKeluarEditDialog from "@/components/siswa/SiswaKeluarEditDialog";
import SiswaMasukTab from "@/components/siswa/SiswaMasukTab";

const KATEGORI_STYLE = {
  'Pindah': 'bg-blue-100 text-blue-700',
  'Meninggal Dunia': 'bg-slate-200 text-slate-700',
  'Mengundurkan Diri': 'bg-amber-100 text-amber-700',
  'Lainnya': 'bg-purple-100 text-purple-700',
};

export default function SiswaKeluar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('all');
  const [kembaliMasukSiswa, setKembaliMasukSiswa] = useState(null);
  const [editSiswa, setEditSiswa] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try { const u = await base44.auth.me(); setCurrentUser(u); } catch {}
    };
    fetchUser();
  }, []);

  const userRole = currentUser?.role || 'guru';
  const canEdit = ['admin', 'tu'].includes(userRole);

  const { data: siswaKeluarList = [], isLoading } = useQuery({
    queryKey: ['siswaKeluar'],
    queryFn: () => base44.entities.SiswaKeluar.list('-tanggal_keluar'),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const filteredList = siswaKeluarList.filter(s => {
    const matchSearch = !searchQuery ||
      s.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis?.includes(searchQuery);
    const matchKategori = filterKategori === 'all' || s.kategori === filterKategori;
    return matchSearch && matchKategori;
  });

  const columns = [
    { key: 'nis', label: 'NIS' },
    { key: 'nama', label: 'Nama Siswa' },
    { key: 'nama_kelas', label: 'Kelas' },
    {
      key: 'kategori',
      label: 'Kategori',
      render: (row) => (
        <Badge className={KATEGORI_STYLE[row.kategori] || 'bg-slate-100 text-slate-700'}>
          {row.kategori === 'Lainnya' && row.kategori_manual ? row.kategori_manual : row.kategori}
        </Badge>
      )
    },
    {
      key: 'tanggal_keluar',
      label: 'Tgl Keluar',
      render: (row) => row.tanggal_keluar || '-'
    },
    {
      key: 'detail',
      label: 'Keterangan',
      render: (row) => (
        <div className="space-y-0.5">
          {row.kategori === 'Pindah' && row.nama_sekolah_tujuan && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Building2 className="w-3 h-3" /> {row.nama_sekolah_tujuan}
              {row.npsn_sekolah_tujuan && <span className="text-slate-400">NPSN: {row.npsn_sekolah_tujuan}</span>}
            </div>
          )}
          {row.alasan && <p className="text-xs text-slate-500">{row.alasan}</p>}
        </div>
      )
    },
    { key: 'tahun_ajaran', label: 'Tahun Ajaran', render: (row) => row.tahun_ajaran || '-' },
    {
      key: 'aksi',
      label: 'Aksi',
      sortable: false,
      filterable: false,
      render: (row) => canEdit ? (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditSiswa(row)} title="Edit">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => setKembaliMasukSiswa(row)}>
            <LogIn className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Kembali</span>
          </Button>
        </div>
      ) : (
        <span className="text-xs text-slate-400">-</span>
      )
    },
  ];

  const stats = {
    total: siswaKeluarList.length,
    pindah: siswaKeluarList.filter(s => s.kategori === 'Pindah').length,
    meninggal: siswaKeluarList.filter(s => s.kategori === 'Meninggal Dunia').length,
    undur: siswaKeluarList.filter(s => s.kategori === 'Mengundurkan Diri').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-orange-100 rounded-xl">
            <LogOut className="w-7 h-7 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Siswa Mutasi</h1>
            <p className="text-slate-500 mt-0.5 text-sm">Kelola data siswa mutasi keluar dan mutasi masuk</p>
          </div>
        </div>

        <Tabs defaultValue="keluar">
          <TabsList className="mb-4">
            <TabsTrigger value="keluar" className="gap-1.5"><LogOut className="w-4 h-4" /> Siswa Keluar</TabsTrigger>
            <TabsTrigger value="masuk" className="gap-1.5"><LogIn className="w-4 h-4" /> Siswa Masuk</TabsTrigger>
          </TabsList>
          <TabsContent value="keluar" className="mt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
              <p className="text-xs text-slate-500 mt-1">Total Keluar</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.pindah}</p>
              <p className="text-xs text-slate-500 mt-1">Pindah</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-600">{stats.meninggal}</p>
              <p className="text-xs text-slate-500 mt-1">Meninggal</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.undur}</p>
              <p className="text-xs text-slate-500 mt-1">Undur Diri</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Cari nama atau NIS siswa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterKategori} onValueChange={setFilterKategori}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <SelectItem value="Pindah">Pindah</SelectItem>
                  <SelectItem value="Meninggal Dunia">Meninggal Dunia</SelectItem>
                  <SelectItem value="Mengundurkan Diri">Mengundurkan Diri</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Daftar Siswa Keluar ({filteredList.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-slate-400">Memuat data...</div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-10">
                <LogOut className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">Belum ada data siswa keluar</p>
              </div>
            ) : (
              <DataTable columns={columns} data={filteredList} pageSize={10} />
            )}
          </CardContent>
        </Card>
          </TabsContent>
          <TabsContent value="masuk" className="mt-0">
            <SiswaMasukTab />
          </TabsContent>
        </Tabs>
      </div>
      {kembaliMasukSiswa && (
        <KembaliMasukDialog
          siswaKeluar={kembaliMasukSiswa}
          kelasList={kelasList}
          onClose={() => setKembaliMasukSiswa(null)}
        />
      )}
      {editSiswa && (
        <SiswaKeluarEditDialog siswaKeluar={editSiswa} onClose={() => setEditSiswa(null)} />
      )}
    </div>
  );
}