import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, LogIn, Building2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";

export default function SiswaMasukTab() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: siswaMasukList = [], isLoading } = useQuery({
    queryKey: ['siswaMasuk'],
    queryFn: () => base44.entities.SiswaMasuk.list('-tanggal_masuk'),
  });

  const filteredList = siswaMasukList.filter(s => {
    const q = searchQuery.toLowerCase();
    return !searchQuery ||
      s.nama?.toLowerCase().includes(q) ||
      s.nisn?.includes(searchQuery) ||
      s.nama_sekolah_asal?.toLowerCase().includes(q);
  });

  const columns = [
    { key: 'nisn', label: 'NISN', render: (row) => row.nisn || '-' },
    { key: 'nama', label: 'Nama Siswa' },
    { key: 'kelas_tujuan', label: 'Kelas Tujuan', render: (row) => <Badge className="bg-emerald-100 text-emerald-700">{row.kelas_tujuan || '-'}</Badge> },
    { key: 'tanggal_masuk', label: 'Tgl Masuk', render: (row) => row.tanggal_masuk || '-' },
    {
      key: 'detail',
      label: 'Keterangan',
      render: (row) => (
        <div className="space-y-0.5">
          {row.nama_sekolah_asal && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Building2 className="w-3 h-3" /> {row.nama_sekolah_asal}
              {row.npsn_sekolah_asal && <span className="text-slate-400">NPSN: {row.npsn_sekolah_asal}</span>}
            </div>
          )}
          {row.alasan_pindah && <p className="text-xs text-slate-500">{row.alasan_pindah}</p>}
        </div>
      )
    },
    { key: 'tahun_ajaran', label: 'Tahun Ajaran', render: (row) => row.tahun_ajaran || '-' },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Cari nama, NISN, atau sekolah asal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Daftar Siswa Masuk ({filteredList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 text-slate-400">Memuat data...</div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-10">
              <LogIn className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">Belum ada data siswa mutasi masuk</p>
              <p className="text-xs text-slate-400 mt-1">Tambahkan via Menu Siswa → Tambah Siswa → Mutasi Masuk</p>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredList} pageSize={10} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}