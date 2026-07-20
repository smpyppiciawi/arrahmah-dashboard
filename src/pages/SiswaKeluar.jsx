import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Search, Building2, Calendar } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";

const KATEGORI_STYLE = {
  'Pindah': 'bg-blue-100 text-blue-700',
  'Meninggal Dunia': 'bg-slate-200 text-slate-700',
  'Mengundurkan Diri': 'bg-amber-100 text-amber-700',
  'Lainnya': 'bg-purple-100 text-purple-700',
};

export default function SiswaKeluar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('all');

  const { data: siswaKeluarList = [], isLoading } = useQuery({
    queryKey: ['siswaKeluar'],
    queryFn: () => base44.entities.SiswaKeluar.list('-tanggal_keluar'),
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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Siswa Keluar</h1>
            <p className="text-slate-500 mt-0.5 text-sm">Arsip data siswa yang keluar, pindah, atau mengundurkan diri</p>
          </div>
        </div>

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
      </div>
    </div>
  );
}