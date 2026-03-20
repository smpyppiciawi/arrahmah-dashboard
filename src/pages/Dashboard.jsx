import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, AlertTriangle, Award, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [expandedGrade, setExpandedGrade] = useState(null);
  const [attendanceLimit, setAttendanceLimit] = useState('10');
  const [pelanggaranLimit, setPelanggaranLimit] = useState('10');
  const [prestasiLimit, setPrestasiLimit] = useState('10');
  const [uksLimit, setUksLimit] = useState('10');

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.list(),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list(),
  });

  const { data: absensiList = [] } = useQuery({
    queryKey: ['absensi', dateFilter],
    queryFn: () => base44.entities.Absensi.filter({ tanggal: dateFilter }),
  });

  const { data: pelanggaranList = [] } = useQuery({
    queryKey: ['pelanggaran', dateFilter],
    queryFn: () => base44.entities.Pelanggaran.filter({ tanggal: dateFilter }),
  });

  const { data: prestasiList = [] } = useQuery({
    queryKey: ['prestasi', dateFilter],
    queryFn: () => base44.entities.Prestasi.filter({ tanggal: dateFilter }),
  });

  const { data: uksList = [] } = useQuery({
    queryKey: ['uks', dateFilter],
    queryFn: () => base44.entities.UKS.filter({ tanggal: dateFilter }),
  });

  const aktiveSiswa = siswaList.filter(s => s.status === 'Aktif');
  const siswa7 = aktiveSiswa.filter(s => s.nama_kelas?.startsWith('7'));
  const siswa8 = aktiveSiswa.filter(s => s.nama_kelas?.startsWith('8'));
  const siswa9 = aktiveSiswa.filter(s => s.nama_kelas?.startsWith('9'));

  // Student count by grade and class
  const getStudentsByGrade = (grade) => {
    const students = aktiveSiswa.filter(s => s.nama_kelas?.startsWith(grade));
    const male = students.filter(s => s.jenis_kelamin === 'Laki-laki').length;
    const female = students.filter(s => s.jenis_kelamin === 'Perempuan').length;
    return { total: students.length, male, female };
  };

  const getStudentsByClass = (className) => {
    const students = aktiveSiswa.filter(s => s.nama_kelas === className);
    const male = students.filter(s => s.jenis_kelamin === 'Laki-laki').length;
    const female = students.filter(s => s.jenis_kelamin === 'Perempuan').length;
    return { total: students.length, male, female };
  };

  // Attendance summary
  const attendanceSummary = kelasList.map(kelas => {
    const kelasAbsensi = absensiList.filter(a => a.kelas_id === kelas.id);
    const hadir = kelasAbsensi.filter(a => a.status === 'Hadir').length;
    const sakit = kelasAbsensi.filter(a => a.status === 'Sakit').length;
    const izin = kelasAbsensi.filter(a => a.status === 'Izin').length;
    const alfa = kelasAbsensi.filter(a => a.status === 'Alfa').length;
    const totalSiswa = aktiveSiswa.filter(s => s.kelas_id === kelas.id).length;
    return { kelas: kelas.nama_kelas, hadir, sakit, izin, alfa, total: kelasAbsensi.length, totalSiswa };
  }).sort((a, b) => a.kelas.localeCompare(b.kelas));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">Ringkasan data sekolah</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Siswa Aktif</p>
                  <p className="text-3xl font-bold mt-1">{aktiveSiswa.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Siswa Tingkat 7</p>
                  <p className="text-3xl font-bold mt-1">{siswa7.length}</p>
                </div>
                <Users className="w-12 h-12 text-emerald-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">Siswa Tingkat 8</p>
                  <p className="text-3xl font-bold mt-1">{siswa8.length}</p>
                </div>
                <Users className="w-12 h-12 text-amber-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Siswa Tingkat 9</p>
                  <p className="text-3xl font-bold mt-1">{siswa9.length}</p>
                </div>
                <Users className="w-12 h-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="jumlah" className="w-full">
          <div className="overflow-x-auto mb-6 -mx-1 px-1">
            <TabsList className="flex w-max min-w-full gap-1">
              <TabsTrigger value="jumlah" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Jumlah Siswa</span>
              </TabsTrigger>
              <TabsTrigger value="kehadiran" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Kehadiran</span>
              </TabsTrigger>
              <TabsTrigger value="pelanggaran" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Pelanggaran</span>
              </TabsTrigger>
              <TabsTrigger value="prestasi" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Prestasi</span>
              </TabsTrigger>
              <TabsTrigger value="uks" className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4">
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>UKS</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Jumlah Siswa */}
          <TabsContent value="jumlah">
            <Card>
              <CardHeader>
                <CardTitle>Rekap Jumlah Siswa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {['7', '8', '9'].map(grade => {
                  const gradeData = getStudentsByGrade(grade);
                  const isExpanded = expandedGrade === grade;
                  const kelasInGrade = kelasList.filter(k => k.tingkat === grade);

                  return (
                    <div key={grade} className="border rounded-lg p-4">
                      <button
                        onClick={() => setExpandedGrade(isExpanded ? null : grade)}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-lg">Tingkat {grade}</div>
                          <Badge className="bg-blue-100 text-blue-700">
                            Total: {gradeData.total}
                          </Badge>
                          <Badge className="bg-indigo-100 text-indigo-700">
                            L: {gradeData.male}
                          </Badge>
                          <Badge className="bg-pink-100 text-pink-700">
                            P: {gradeData.female}
                          </Badge>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-4 pl-6 space-y-2">
                          {kelasInGrade.map(kelas => {
                            const classData = getStudentsByClass(kelas.nama_kelas);
                            return (
                              <div key={kelas.id} className="flex items-center gap-4 text-sm">
                                <div className="font-medium w-16">{kelas.nama_kelas}</div>
                                <Badge variant="secondary">Total: {classData.total}</Badge>
                                <Badge variant="secondary">L: {classData.male}</Badge>
                                <Badge variant="secondary">P: {classData.female}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Kehadiran */}
          <TabsContent value="kehadiran">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle>Rekap Kehadiran</CardTitle>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-48"
                    />
                    <Select value={attendanceLimit} onValueChange={setAttendanceLimit}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 data</SelectItem>
                        <SelectItem value="10">10 data</SelectItem>
                        <SelectItem value="25">25 data</SelectItem>
                        <SelectItem value="all">Semua</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-slate-600">Total Hadir</p>
                      <p className="text-2xl font-bold text-emerald-600">{attendanceSummary.reduce((sum, item) => sum + item.hadir, 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600">Total Sakit</p>
                      <p className="text-2xl font-bold text-blue-600">{attendanceSummary.reduce((sum, item) => sum + item.sakit, 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600">Total Izin</p>
                      <p className="text-2xl font-bold text-amber-600">{attendanceSummary.reduce((sum, item) => sum + item.izin, 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600">Total Alfa</p>
                      <p className="text-2xl font-bold text-red-600">{attendanceSummary.reduce((sum, item) => sum + item.alfa, 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600">Total Siswa</p>
                      <p className="text-2xl font-bold text-slate-800">{attendanceSummary.reduce((sum, item) => sum + item.totalSiswa, 0)}</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Hadir</TableHead>
                      <TableHead>Sakit</TableHead>
                      <TableHead>Izin</TableHead>
                      <TableHead>Alfa</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceSummary.slice(0, attendanceLimit === 'all' ? undefined : parseInt(attendanceLimit)).map(item => (
                      <TableRow key={item.kelas}>
                        <TableCell className="font-medium">{item.kelas}</TableCell>
                        <TableCell><Badge className="bg-emerald-100 text-emerald-700">{item.hadir}</Badge></TableCell>
                        <TableCell><Badge className="bg-blue-100 text-blue-700">{item.sakit}</Badge></TableCell>
                        <TableCell><Badge className="bg-amber-100 text-amber-700">{item.izin}</Badge></TableCell>
                        <TableCell><Badge className="bg-red-100 text-red-700">{item.alfa}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{item.total}/{item.totalSiswa}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pelanggaran */}
          <TabsContent value="pelanggaran">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle>Rekap Pelanggaran</CardTitle>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-48"
                    />
                    <Select value={pelanggaranLimit} onValueChange={setPelanggaranLimit}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 data</SelectItem>
                        <SelectItem value="10">10 data</SelectItem>
                        <SelectItem value="25">25 data</SelectItem>
                        <SelectItem value="all">Semua</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Siswa</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Poin</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pelanggaranList.slice(0, pelanggaranLimit === 'all' ? undefined : parseInt(pelanggaranLimit)).map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nama_siswa}</TableCell>
                        <TableCell><Badge variant="secondary">{item.nama_kelas}</Badge></TableCell>
                        <TableCell><Badge className="bg-red-100 text-red-700">{item.kategori}</Badge></TableCell>
                        <TableCell><Badge>{item.poin} poin</Badge></TableCell>
                        <TableCell><Badge className={item.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{item.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {pelanggaranList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                          Tidak ada data pelanggaran pada tanggal ini
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prestasi */}
          <TabsContent value="prestasi">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle>Rekap Prestasi</CardTitle>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-48"
                    />
                    <Select value={prestasiLimit} onValueChange={setPrestasiLimit}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 data</SelectItem>
                        <SelectItem value="10">10 data</SelectItem>
                        <SelectItem value="25">25 data</SelectItem>
                        <SelectItem value="all">Semua</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Siswa</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Prestasi</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Tingkat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prestasiList.slice(0, prestasiLimit === 'all' ? undefined : parseInt(prestasiLimit)).map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nama_siswa}</TableCell>
                        <TableCell><Badge variant="secondary">{item.nama_kelas}</Badge></TableCell>
                        <TableCell>{item.nama_prestasi}</TableCell>
                        <TableCell><Badge className="bg-yellow-100 text-yellow-700">{item.kategori}</Badge></TableCell>
                        <TableCell><Badge className="bg-emerald-100 text-emerald-700">{item.tingkat}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {prestasiList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                          Tidak ada data prestasi pada tanggal ini
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* UKS */}
          <TabsContent value="uks">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle>Rekap UKS</CardTitle>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-48"
                    />
                    <Select value={uksLimit} onValueChange={setUksLimit}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 data</SelectItem>
                        <SelectItem value="10">10 data</SelectItem>
                        <SelectItem value="25">25 data</SelectItem>
                        <SelectItem value="all">Semua</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Siswa</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Keluhan</TableHead>
                      <TableHead>Jam Masuk</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uksList.slice(0, uksLimit === 'all' ? undefined : parseInt(uksLimit)).map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nama_siswa}</TableCell>
                        <TableCell><Badge variant="secondary">{item.nama_kelas}</Badge></TableCell>
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
                    {uksList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                          Tidak ada data UKS pada tanggal ini
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}