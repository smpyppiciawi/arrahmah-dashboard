import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, ChevronDown, ChevronUp, Activity, BellRing, BellOff, ShieldCheck, ClipboardCheck, BookUser, ClipboardList, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/lib/AuthContext';
import CariSiswaDashboard from '@/components/dashboard/CariSiswaDashboard';
import JadwalTab from '@/components/dashboard/JadwalTab';
import PiketInfo from '@/components/dashboard/PiketInfo';
import JadwalPiketView from '@/components/dashboard/JadwalPiketView';
import TugasPiketTab from '@/components/absensi/TugasPiketTab';
import PiketHariIniBadge from '@/components/dashboard/PiketHariIniBadge';
import LiveClock from '@/components/ui/LiveClock';
import { usePengingatMengajar } from '@/components/guru/PengingatMengajar';
import BukuTamuGuruTab from '@/components/bukutamu/BukuTamuGuruTab';
import CatatanSiswaDashboardTab from '@/components/dashboard/CatatanSiswaDashboardTab';
import BukuTamuDashboardTab from '@/components/dashboard/BukuTamuDashboardTab';
import KalenderDashboardTab from '@/components/dashboard/KalenderDashboardTab';

export default function Dashboard() {
  const { user } = useAuth();
  const userRole = user?.role || 'guru';
  const canSeeCariSiswa = ['admin', 'operator'].includes(userRole);
  const canSeeTugas = userRole === 'operator';
  const canSeeBukuTamu = ['admin', 'operator', 'tu', 'kepsek', 'guru'].includes(userRole);
  const { enabled: pengingatEnabled, toggle: togglePengingat } = usePengingatMengajar();
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [expandedGrade, setExpandedGrade] = useState(null);
  const [attendanceLimit, setAttendanceLimit] = useState('10');

  const { data: siswaList = [] } = useQuery({ queryKey: ['siswa'], queryFn: () => base44.entities.Siswa.list() });
  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list() });
  const { data: absensiList = [] } = useQuery({ queryKey: ['absensi', dateFilter], queryFn: () => base44.entities.Absensi.filter({ tanggal: dateFilter }) });
  const { data: pelanggaranList = [] } = useQuery({ queryKey: ['pelanggaran-improvement', dateFilter], queryFn: () => base44.entities.PelanggaranImprovement.filter({ tanggal: dateFilter }) });
  const { data: prestasiList = [] } = useQuery({ queryKey: ['prestasi', dateFilter], queryFn: () => base44.entities.Prestasi.filter({ tanggal: dateFilter }) });
  const { data: uksList = [] } = useQuery({ queryKey: ['uks', dateFilter], queryFn: () => base44.entities.UKS.filter({ tanggal: dateFilter }) });
  const { data: menstruasiList = [] } = useQuery({ queryKey: ['menstruasi', dateFilter], queryFn: () => base44.entities.Menstruasi.filter({ tanggal: dateFilter }) });
  const { data: izinList = [] } = useQuery({ queryKey: ['izinSiswa', dateFilter], queryFn: () => base44.entities.IzinSiswa.filter({ tanggal: dateFilter }) });

  const aktiveSiswa = siswaList.filter(s => s.status === 'Aktif');
  const siswa7 = aktiveSiswa.filter(s => s.nama_kelas?.startsWith('7'));
  const siswa8 = aktiveSiswa.filter(s => s.nama_kelas?.startsWith('8'));
  const siswa9 = aktiveSiswa.filter(s => s.nama_kelas?.startsWith('9'));

  const getStudentsByGrade = (grade) => {
    const students = aktiveSiswa.filter(s => s.nama_kelas?.startsWith(grade));
    return { total: students.length, male: students.filter(s => s.jenis_kelamin === 'Laki-laki').length, female: students.filter(s => s.jenis_kelamin === 'Perempuan').length };
  };

  const getStudentsByClass = (className) => {
    const students = aktiveSiswa.filter(s => s.nama_kelas === className);
    return { total: students.length, male: students.filter(s => s.jenis_kelamin === 'Laki-laki').length, female: students.filter(s => s.jenis_kelamin === 'Perempuan').length };
  };

  const attendanceSummary = kelasList.map(kelas => {
    const kelasAbsensi = absensiList.filter(a => a.kelas_id === kelas.id);
    return {
      kelas: kelas.nama_kelas,
      hadir: kelasAbsensi.filter(a => a.status === 'Hadir').length,
      sakit: kelasAbsensi.filter(a => a.status === 'Sakit').length,
      izin: kelasAbsensi.filter(a => a.status === 'Izin').length,
      alfa: kelasAbsensi.filter(a => a.status === 'Alfa').length,
      total: kelasAbsensi.length,
      totalSiswa: aktiveSiswa.filter(s => s.kelas_id === kelas.id).length
    };
  }).sort((a, b) => a.kelas.localeCompare(b.kelas));

  const statCards = [
    { label: 'Total Siswa Aktif', value: aktiveSiswa.length, sublabel: `${kelasList.length} kelas`, color: 'from-blue-500 to-blue-600', icon: Users, glow: 'shadow-blue-500/30' },
    { label: 'Tingkat 7', value: siswa7.length, sublabel: 'siswa aktif', color: 'from-emerald-500 to-emerald-600', icon: Users, glow: 'shadow-emerald-500/30' },
    { label: 'Tingkat 8', value: siswa8.length, sublabel: 'siswa aktif', color: 'from-amber-500 to-orange-500', icon: Users, glow: 'shadow-amber-500/30' },
    { label: 'Tingkat 9', value: siswa9.length, sublabel: 'siswa aktif', color: 'from-purple-500 to-purple-600', icon: Users, glow: 'shadow-purple-500/30' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-7 h-7 text-blue-500" />
              Dashboard
            </h1>
            <p className="text-slate-500 mt-0.5 text-sm">Ringkasan data & aktivitas sekolah hari ini</p>
          </div>
          <div className="flex items-center gap-2">
            {userRole === 'guru' && (
              <button
                onClick={togglePengingat}
                title={pengingatEnabled ? 'Pengingat Mengajar Aktif (klik untuk nonaktifkan)' : 'Pengingat Mengajar Nonaktif (klik untuk aktifkan)'}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium border transition-colors ${pengingatEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}
              >
                {pengingatEnabled ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                <span className="hidden sm:inline">{pengingatEnabled ? 'On' : 'Off'}</span>
              </button>
            )}
            {userRole === 'guru' && <PiketHariIniBadge />}
            <LiveClock />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Card key={i} className={`border-0 shadow-lg ${card.glow} overflow-hidden`}>
                <div className={`bg-gradient-to-br ${card.color} p-5`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-xs font-medium">{card.label}</p>
                      <p className="text-white text-3xl font-bold mt-1">{card.value}</p>
                      <p className="text-white/60 text-xs mt-0.5">{card.sublabel}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="jumlah" className="w-full">
          <div className="overflow-x-auto -mx-1 px-1 mb-1">
            <TabsList className="flex w-max gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
              {[
                { value: 'jumlah', label: 'Jumlah Siswa', icon: Users },
                { value: 'kehadiran', label: 'Kehadiran', icon: Calendar },
                { value: 'catatan', label: 'Catatan Siswa', icon: ClipboardList },
                { value: 'jadwal-piket', label: 'Jadwal Piket', icon: ShieldCheck },
                ...(canSeeCariSiswa ? [
                  { value: 'cari-siswa', label: 'Cari Siswa', icon: Users },
                  { value: 'jadwal', label: 'Jadwal', icon: CalendarDays },
                ] : []),
                ...(canSeeTugas ? [
                  { value: 'tugas', label: 'Tugas', icon: ClipboardCheck },
                ] : []),
                ...(canSeeBukuTamu ? [
                  { value: 'buku-tamu', label: 'Buku Tamu', icon: BookUser },
                ] : []),
                { value: 'kalender', label: 'Kalender', icon: CalendarDays },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-500/30 transition-all"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Jumlah Siswa */}
          <TabsContent value="jumlah">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800">Rekap Jumlah Siswa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {['7', '8', '9'].map(grade => {
                  const gradeData = getStudentsByGrade(grade);
                  const isExpanded = expandedGrade === grade;
                  const kelasInGrade = kelasList.filter(k => k.tingkat === grade);
                  const gradeColors = { '7': 'blue', '8': 'amber', '9': 'purple' };
                  const gc = gradeColors[grade];
                  return (
                    <div key={grade} className={`rounded-xl border-2 overflow-hidden transition-all ${isExpanded ? 'border-' + gc + '-200 bg-' + gc + '-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                      <button
                        onClick={() => setExpandedGrade(isExpanded ? null : grade)}
                        className="w-full flex items-center justify-between p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg bg-${gc}-100 flex items-center justify-center`}>
                            <span className={`text-${gc}-700 font-bold text-sm`}>{grade}</span>
                          </div>
                          <span className="font-semibold text-slate-800">Tingkat {grade}</span>
                          <Badge className="bg-slate-100 text-slate-700 font-medium">{gradeData.total} siswa</Badge>
                          <Badge className="bg-blue-50 text-blue-700">L: {gradeData.male}</Badge>
                          <Badge className="bg-pink-50 text-pink-700">P: {gradeData.female}</Badge>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {kelasInGrade.map(kelas => {
                            const classData = getStudentsByClass(kelas.nama_kelas);
                            return (
                              <div key={kelas.id} className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                                <p className="font-bold text-slate-800 text-sm">{kelas.nama_kelas}</p>
                                <p className="text-2xl font-bold text-blue-600 mt-1">{classData.total}</p>
                                <p className="text-xs text-slate-500">L:{classData.male} P:{classData.female}</p>
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
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <CardTitle className="text-base font-semibold text-slate-800">Rekap Kehadiran</CardTitle>
                  <div className="flex gap-2 items-center">
                    <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-44 text-sm h-8" />
                    <Select value={attendanceLimit} onValueChange={setAttendanceLimit}>
                      <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
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
                <PiketInfo dateFilter={dateFilter} />
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                  {[
                    { label: 'Hadir', val: attendanceSummary.reduce((s, i) => s + i.hadir, 0), color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    { label: 'Sakit', val: attendanceSummary.reduce((s, i) => s + i.sakit, 0), color: 'bg-blue-50 text-blue-700 border-blue-200' },
                    { label: 'Izin', val: attendanceSummary.reduce((s, i) => s + i.izin, 0), color: 'bg-amber-50 text-amber-700 border-amber-200' },
                    { label: 'Alfa', val: attendanceSummary.reduce((s, i) => s + i.alfa, 0), color: 'bg-red-50 text-red-700 border-red-200' },
                    { label: 'Total Siswa', val: attendanceSummary.reduce((s, i) => s + i.totalSiswa, 0), color: 'bg-slate-50 text-slate-700 border-slate-200' },
                  ].map(stat => (
                    <div key={stat.label} className={`rounded-xl border p-3 text-center ${stat.color}`}>
                      <p className="text-xl font-bold">{stat.val}</p>
                      <p className="text-xs font-medium mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <Table>
                    <TableHeader><TableRow className="bg-slate-50">
                      <TableHead className="text-xs">Kelas</TableHead>
                      <TableHead className="text-xs">Hadir</TableHead>
                      <TableHead className="text-xs">Sakit</TableHead>
                      <TableHead className="text-xs">Izin</TableHead>
                      <TableHead className="text-xs">Alfa</TableHead>
                      <TableHead className="text-xs">Total</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {attendanceSummary.slice(0, attendanceLimit === 'all' ? undefined : parseInt(attendanceLimit)).map(item => (
                        <TableRow key={item.kelas} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="font-semibold text-sm">{item.kelas}</TableCell>
                          <TableCell><Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">{item.hadir}</Badge></TableCell>
                          <TableCell><Badge className="bg-blue-50 text-blue-700 border-0 text-xs">{item.sakit}</Badge></TableCell>
                          <TableCell><Badge className="bg-amber-50 text-amber-700 border-0 text-xs">{item.izin}</Badge></TableCell>
                          <TableCell><Badge className="bg-red-50 text-red-700 border-0 text-xs">{item.alfa}</Badge></TableCell>
                          <TableCell><span className="text-xs text-slate-500">{item.total}/{item.totalSiswa}</span></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Catatan Siswa (gabungan) */}
          <TabsContent value="catatan">
            <CatatanSiswaDashboardTab
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              pelanggaranList={pelanggaranList}
              prestasiList={prestasiList}
              uksList={uksList}
              menstruasiList={menstruasiList}
              izinList={izinList}
            />
          </TabsContent>

          <TabsContent value="jadwal-piket">
            <JadwalPiketView />
          </TabsContent>

          {canSeeCariSiswa && (
            <>
              <TabsContent value="cari-siswa">
                <CariSiswaDashboard />
              </TabsContent>

              <TabsContent value="jadwal">
                <JadwalTab />
              </TabsContent>
            </>
          )}

          {canSeeTugas && (
            <TabsContent value="tugas">
              <TugasPiketTab />
            </TabsContent>
          )}

          {canSeeBukuTamu && (
            <TabsContent value="buku-tamu">
              {userRole === 'guru' ? <BukuTamuGuruTab /> : <BukuTamuDashboardTab siswaList={siswaList} />}
            </TabsContent>
          )}

          <TabsContent value="kalender">
            <KalenderDashboardTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}