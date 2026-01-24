import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, AlertTriangle, Award, Heart, BookOpen, Building, GraduationCap, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function Kepsek() {
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [sortBy, setSortBy] = useState('nama');
  const [sortOrder, setSortOrder] = useState('asc');
  const [limit, setLimit] = useState('10');

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.list(),
  });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list(),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list(),
  });

  const { data: absensiList = [] } = useQuery({
    queryKey: ['absensi'],
    queryFn: () => base44.entities.Absensi.list(),
  });

  const { data: nilaiList = [] } = useQuery({
    queryKey: ['nilai'],
    queryFn: () => base44.entities.Nilai.list(),
  });

  const { data: pelanggaranList = [] } = useQuery({
    queryKey: ['pelanggaran'],
    queryFn: () => base44.entities.Pelanggaran.list(),
  });

  const { data: prestasiList = [] } = useQuery({
    queryKey: ['prestasi'],
    queryFn: () => base44.entities.Prestasi.list(),
  });

  const { data: uksList = [] } = useQuery({
    queryKey: ['uks'],
    queryFn: () => base44.entities.UKS.list(),
  });

  const { data: keuanganList = [] } = useQuery({
    queryKey: ['keuangan'],
    queryFn: () => base44.entities.Keuangan.list(),
  });

  const { data: materiList = [] } = useQuery({
    queryKey: ['materi'],
    queryFn: () => base44.entities.Materi.list(),
  });

  // Filter by date range
  const filteredAbsensi = absensiList.filter(a => a.tanggal >= dateFrom && a.tanggal <= dateTo);
  const filteredPelanggaran = pelanggaranList.filter(p => p.tanggal >= dateFrom && p.tanggal <= dateTo);
  const filteredPrestasi = prestasiList.filter(p => p.tanggal >= dateFrom && p.tanggal <= dateTo);
  const filteredUks = uksList.filter(u => u.tanggal >= dateFrom && u.tanggal <= dateTo);
  const filteredKeuangan = keuanganList.filter(k => k.tanggal >= dateFrom && k.tanggal <= dateTo);

  // Statistics
  const aktiveSiswa = siswaList.filter(s => s.status === 'Aktif');
  const aktivGuru = guruList.filter(g => g.status === 'Aktif');

  // Attendance stats
  const hadirCount = filteredAbsensi.filter(a => a.status === 'Hadir').length;
  const sakitCount = filteredAbsensi.filter(a => a.status === 'Sakit').length;
  const izinCount = filteredAbsensi.filter(a => a.status === 'Izin').length;
  const alfaCount = filteredAbsensi.filter(a => a.status === 'Alfa').length;

  const attendanceData = [
    { name: 'Hadir', value: hadirCount, color: '#10b981' },
    { name: 'Sakit', value: sakitCount, color: '#3b82f6' },
    { name: 'Izin', value: izinCount, color: '#f59e0b' },
    { name: 'Alfa', value: alfaCount, color: '#ef4444' }
  ];

  // Financial stats
  const totalPemasukan = filteredKeuangan.filter(k => k.jenis === 'Pemasukan').reduce((sum, k) => sum + (k.jumlah || 0), 0);
  const totalPengeluaran = filteredKeuangan.filter(k => k.jenis === 'Pengeluaran').reduce((sum, k) => sum + (k.jumlah || 0), 0);
  const saldo = totalPemasukan - totalPengeluaran;

  // Violation stats
  const pelanggaranByCategory = {};
  filteredPelanggaran.forEach(p => {
    pelanggaranByCategory[p.kategori] = (pelanggaranByCategory[p.kategori] || 0) + 1;
  });

  const pelanggaranChartData = Object.entries(pelanggaranByCategory).map(([name, value]) => ({ name, value }));

  // Achievement stats
  const prestasiByTingkat = {};
  filteredPrestasi.forEach(p => {
    prestasiByTingkat[p.tingkat] = (prestasiByTingkat[p.tingkat] || 0) + 1;
  });

  const prestasiChartData = Object.entries(prestasiByTingkat).map(([name, value]) => ({ name, value }));

  // Grade average
  const gradesByMapel = {};
  nilaiList.forEach(n => {
    if (!gradesByMapel[n.mapel]) gradesByMapel[n.mapel] = [];
    gradesByMapel[n.mapel].push(n.nilai);
  });

  const averageGradesData = Object.entries(gradesByMapel).map(([mapel, values]) => ({
    mapel,
    rata: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
  })).slice(0, 10);

  // Sorting function
  const sortData = (data, field) => {
    const sorted = [...data].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a[field] > b[field] ? 1 : -1;
      } else {
        return a[field] < b[field] ? 1 : -1;
      }
    });
    return limit === 'all' ? sorted : sorted.slice(0, parseInt(limit));
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard Kepala Sekolah</h1>
          <p className="text-slate-500 mt-1">Laporan lengkap dan analisis data sekolah</p>
        </div>

        {/* Filter Controls */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Dari:</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Sampai:</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Urutkan:</label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">A-Z / Kecil</SelectItem>
                    <SelectItem value="desc">Z-A / Besar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Tampilkan:</label>
                <Select value={limit} onValueChange={setLimit}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 data</SelectItem>
                    <SelectItem value="10">10 data</SelectItem>
                    <SelectItem value="25">25 data</SelectItem>
                    <SelectItem value="50">50 data</SelectItem>
                    <SelectItem value="all">Semua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Siswa</p>
                  <p className="text-3xl font-bold mt-1">{aktiveSiswa.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500 to-violet-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-100 text-sm">Total Guru</p>
                  <p className="text-3xl font-bold mt-1">{aktivGuru.length}</p>
                </div>
                <GraduationCap className="w-12 h-12 text-violet-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Total Kelas</p>
                  <p className="text-3xl font-bold mt-1">{kelasList.length}</p>
                </div>
                <Building className="w-12 h-12 text-emerald-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-500 to-teal-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-sm">Saldo</p>
                  <p className="text-xl font-bold mt-1">{formatRupiah(saldo)}</p>
                </div>
                <Wallet className="w-12 h-12 text-teal-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Kehadiran Siswa</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={attendanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rata-rata Nilai per Mapel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={averageGradesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mapel" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="rata" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="siswa" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="siswa">Siswa</TabsTrigger>
            <TabsTrigger value="pelanggaran">Pelanggaran</TabsTrigger>
            <TabsTrigger value="prestasi">Prestasi</TabsTrigger>
            <TabsTrigger value="uks">UKS</TabsTrigger>
            <TabsTrigger value="keuangan">Keuangan</TabsTrigger>
          </TabsList>

          <TabsContent value="siswa">
            <Card>
              <CardHeader>
                <CardTitle>Data Siswa</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NIS</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>JK</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortData(siswaList, 'nama').map(siswa => (
                      <TableRow key={siswa.id}>
                        <TableCell>{siswa.nis}</TableCell>
                        <TableCell className="font-medium">{siswa.nama}</TableCell>
                        <TableCell><Badge variant="secondary">{siswa.nama_kelas}</Badge></TableCell>
                        <TableCell>{siswa.jenis_kelamin}</TableCell>
                        <TableCell><Badge className={siswa.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{siswa.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pelanggaran">
            <Card>
              <CardHeader>
                <CardTitle>Data Pelanggaran</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Siswa</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Poin</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortData(filteredPelanggaran, 'tanggal').map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.tanggal}</TableCell>
                        <TableCell className="font-medium">{item.nama_siswa}</TableCell>
                        <TableCell><Badge variant="secondary">{item.nama_kelas}</Badge></TableCell>
                        <TableCell><Badge className="bg-red-100 text-red-700">{item.kategori}</Badge></TableCell>
                        <TableCell>{item.poin}</TableCell>
                        <TableCell><Badge className={item.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{item.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prestasi">
            <Card>
              <CardHeader>
                <CardTitle>Data Prestasi</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Siswa</TableHead>
                      <TableHead>Prestasi</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Tingkat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortData(filteredPrestasi, 'tanggal').map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.tanggal}</TableCell>
                        <TableCell className="font-medium">{item.nama_siswa}</TableCell>
                        <TableCell>{item.nama_prestasi}</TableCell>
                        <TableCell><Badge className="bg-yellow-100 text-yellow-700">{item.kategori}</Badge></TableCell>
                        <TableCell><Badge className="bg-emerald-100 text-emerald-700">{item.tingkat}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="uks">
            <Card>
              <CardHeader>
                <CardTitle>Data UKS</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Siswa</TableHead>
                      <TableHead>Keluhan</TableHead>
                      <TableHead>Jam Masuk</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortData(filteredUks, 'tanggal').map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.tanggal}</TableCell>
                        <TableCell className="font-medium">{item.nama_siswa}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.keluhan}</TableCell>
                        <TableCell>{item.jam_masuk}</TableCell>
                        <TableCell>
                          <Badge className={
                            item.status === 'Di UKS' ? 'bg-amber-100 text-amber-700' :
                            item.status === 'Pulang' ? 'bg-red-100 text-red-700' :
                            'bg-emerald-100 text-emerald-700'
                          }>
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keuangan">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Data Keuangan</CardTitle>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Pemasukan</p>
                      <p className="font-bold text-emerald-600">{formatRupiah(totalPemasukan)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Pengeluaran</p>
                      <p className="font-bold text-red-600">{formatRupiah(totalPengeluaran)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Saldo</p>
                      <p className="font-bold text-blue-600">{formatRupiah(saldo)}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Uraian</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortData(filteredKeuangan, 'tanggal').map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.tanggal}</TableCell>
                        <TableCell>
                          <Badge className={item.jenis === 'Pemasukan' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                            {item.jenis}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{item.kategori}</Badge></TableCell>
                        <TableCell className="max-w-xs truncate">{item.uraian}</TableCell>
                        <TableCell className="text-right font-medium">{formatRupiah(item.jumlah)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}