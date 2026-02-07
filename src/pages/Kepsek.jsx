import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { 
  Calendar, RefreshCw, School, Users, GraduationCap, Building, Wallet, 
  BookOpen, AlertTriangle, Award, Heart, Bell, TrendingDown, TrendingUp,
  MessageCircle, Eye, X, ChevronRight, Phone, FileText, Settings,
  ClipboardList, FolderOpen
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function Kepsek() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const firstDayOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
  const lastDayOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd');
  
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(lastDayOfMonth);
  const [activeSection, setActiveSection] = useState('ringkasan');
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  // Queries
  const { data: siswaList = [], refetch: refetchSiswa } = useQuery({
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
    queryFn: () => base44.entities.Absensi.list('-tanggal', 1000),
  });

  const { data: nilaiList = [] } = useQuery({
    queryKey: ['nilai'],
    queryFn: () => base44.entities.Nilai.list('-created_date', 1000),
  });

  const { data: pelanggaranList = [] } = useQuery({
    queryKey: ['pelanggaran'],
    queryFn: () => base44.entities.Pelanggaran.list('-tanggal'),
  });

  const { data: prestasiList = [] } = useQuery({
    queryKey: ['prestasi'],
    queryFn: () => base44.entities.Prestasi.list('-tanggal'),
  });

  const { data: uksList = [] } = useQuery({
    queryKey: ['uks'],
    queryFn: () => base44.entities.UKS.list('-tanggal'),
  });

  const { data: keuanganList = [] } = useQuery({
    queryKey: ['keuangan'],
    queryFn: () => base44.entities.Keuangan.list('-tanggal'),
  });

  const { data: materiList = [] } = useQuery({
    queryKey: ['materi'],
    queryFn: () => base44.entities.Materi.list(),
  });

  const { data: tarifIuranList = [] } = useQuery({
    queryKey: ['tarif-iuran'],
    queryFn: () => base44.entities.TarifIuran.filter({ status: 'Aktif' }),
  });

  const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

  const handleWhatsApp = (phone, message) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Stats
  const stats = useMemo(() => {
    const aktiveSiswa = siswaList.filter(s => s.status === 'Aktif');
    const aktivGuru = guruList.filter(g => g.status === 'Aktif');
    const absensiHariIni = absensiList.filter(a => a.tanggal === today);
    const hadirHariIni = absensiHariIni.filter(a => a.status === 'Hadir' || a.status === 'Terlambat').length;
    const kehadiranHariIni = absensiHariIni.length > 0 ? Math.round((hadirHariIni / absensiHariIni.length) * 100) : 0;
    const filteredKeuangan = keuanganList.filter(k => k.tanggal >= dateFrom && k.tanggal <= dateTo);
    const totalPemasukan = filteredKeuangan.filter(k => k.jenis === 'Pemasukan').reduce((sum, k) => sum + (k.jumlah || 0), 0);
    const totalPengeluaran = filteredKeuangan.filter(k => k.jenis === 'Pengeluaran').reduce((sum, k) => sum + (k.jumlah || 0), 0);
    const pelanggaranAktifCount = pelanggaranList.filter(p => p.status === 'Proses').length;
    const prestasiBulanIni = prestasiList.filter(p => p.tanggal >= dateFrom && p.tanggal <= dateTo).length;

    return {
      totalSiswa: siswaList.length, siswaAktif: aktiveSiswa.length,
      totalGuru: guruList.length, guruAktif: aktivGuru.length,
      totalKelas: kelasList.length, totalMateri: materiList.length,
      saldo: totalPemasukan - totalPengeluaran, totalPemasukan, totalPengeluaran,
      kehadiranHariIni, pelanggaranAktif: pelanggaranAktifCount, prestasiBulanIni
    };
  }, [siswaList, guruList, kelasList, absensiList, keuanganList, pelanggaranList, prestasiList, materiList, dateFrom, dateTo, today]);

  // Alerts
  const alerts = useMemo(() => {
    const alertList = [];
    pelanggaranList.filter(p => p.status === 'Proses' && (p.jenis_pelanggaran === 'Sangat Berat' || p.jenis_pelanggaran === 'Berat')).forEach(p => {
      alertList.push({ id: `pel-${p.id}`, severity: 'critical', category: 'Pelanggaran', title: `Pelanggaran ${p.jenis_pelanggaran}`, person: p.nama_siswa, kelas: p.nama_kelas, phone: siswaList.find(s => s.id === p.siswa_id)?.no_telp_ortu });
    });
    return alertList.filter(a => !dismissedAlerts.includes(a.id)).slice(0, 5);
  }, [pelanggaranList, siswaList, dismissedAlerts]);

  // Chart Data
  const attendanceData = useMemo(() => {
    const filtered = absensiList.filter(a => a.tanggal >= dateFrom && a.tanggal <= dateTo);
    return [
      { name: 'Hadir', value: filtered.filter(a => a.status === 'Hadir').length, color: '#10b981' },
      { name: 'Sakit', value: filtered.filter(a => a.status === 'Sakit').length, color: '#3b82f6' },
      { name: 'Izin', value: filtered.filter(a => a.status === 'Izin').length, color: '#f59e0b' },
      { name: 'Alfa', value: filtered.filter(a => a.status === 'Alfa').length, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [absensiList, dateFrom, dateTo]);

  const gradeData = useMemo(() => {
    const byMapel = {};
    nilaiList.forEach(n => { if (!byMapel[n.mapel]) byMapel[n.mapel] = []; byMapel[n.mapel].push(n.nilai); });
    return Object.entries(byMapel).map(([mapel, values]) => ({
      mapel: mapel.length > 12 ? mapel.substring(0, 12) + '...' : mapel,
      rata: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    })).sort((a, b) => b.rata - a.rata).slice(0, 8);
  }, [nilaiList]);

  // Menu sections
  const menuSections = [
    { id: 'ringkasan', label: 'Ringkasan', icon: School, color: 'bg-indigo-500' },
    { id: 'siswa', label: 'Data Siswa', icon: Users, color: 'bg-blue-500' },
    { id: 'guru', label: 'Data Guru', icon: GraduationCap, color: 'bg-violet-500' },
    { id: 'absensi', label: 'Absensi', icon: Calendar, color: 'bg-emerald-500' },
    { id: 'nilai', label: 'Nilai', icon: BookOpen, color: 'bg-amber-500' },
    { id: 'catatan', label: 'Catatan Siswa', icon: ClipboardList, color: 'bg-purple-500' },
    { id: 'keuangan', label: 'Keuangan', icon: Wallet, color: 'bg-teal-500' },
    { id: 'materi', label: 'Materi', icon: FolderOpen, color: 'bg-pink-500' },
  ];

  // Table Columns
  const siswaColumns = [
    { key: 'nis', label: 'NIS' },
    { key: 'nama', label: 'Nama' },
    { key: 'nama_kelas', label: 'Kelas', render: (row) => <Badge variant="outline">{row.nama_kelas}</Badge> },
    { key: 'jenis_kelamin', label: 'JK' },
    { key: 'status', label: 'Status', render: (row) => <Badge className={row.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{row.status}</Badge> },
    { key: 'aksi', label: 'Aksi', render: (row) => row.no_telp_ortu && <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => handleWhatsApp(row.no_telp_ortu, `Yth. Orang Tua ${row.nama},`)}><MessageCircle className="w-4 h-4" /></Button> }
  ];

  const guruColumns = [
    { key: 'nip', label: 'NIP', render: (row) => row.nip || '-' },
    { key: 'nama', label: 'Nama' },
    { key: 'jabatan', label: 'Jabatan', render: (row) => <Badge variant="outline">{row.jabatan}</Badge> },
    { key: 'mapel', label: 'Mapel', render: (row) => row.mapel?.join(', ') || '-' },
    { key: 'status', label: 'Status', render: (row) => <Badge className={row.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{row.status}</Badge> },
    { key: 'aksi', label: 'WA', render: (row) => row.no_telp && <Button size="sm" className="bg-emerald-500 h-7" onClick={() => handleWhatsApp(row.no_telp, `Halo ${row.nama},`)}><MessageCircle className="w-3 h-3" /></Button> }
  ];

  const absensiColumns = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'nama_siswa', label: 'Siswa' },
    { key: 'nama_kelas', label: 'Kelas' },
    { key: 'status', label: 'Status', render: (row) => <Badge className={row.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700' : row.status === 'Alfa' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>{row.status}</Badge> },
    { key: 'keterangan', label: 'Keterangan', render: (row) => row.keterangan || '-' }
  ];

  const nilaiColumns = [
    { key: 'nama_siswa', label: 'Siswa' },
    { key: 'nama_kelas', label: 'Kelas' },
    { key: 'mapel', label: 'Mapel' },
    { key: 'jenis_penilaian', label: 'Jenis' },
    { key: 'nilai', label: 'Nilai', render: (row) => <Badge className={row.nilai >= (row.kkm || 75) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{row.nilai}</Badge> },
    { key: 'status_ketuntasan', label: 'Status', render: (row) => <Badge className={row.status_ketuntasan === 'Tuntas' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{row.status_ketuntasan}</Badge> }
  ];

  const pelanggaranColumns = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'nama_siswa', label: 'Siswa' },
    { key: 'nama_kelas', label: 'Kelas' },
    { key: 'jenis_pelanggaran', label: 'Jenis', render: (row) => <Badge className={row.jenis_pelanggaran?.includes('Berat') ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>{row.jenis_pelanggaran}</Badge> },
    { key: 'poin', label: 'Poin' },
    { key: 'status', label: 'Status', render: (row) => <Badge className={row.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{row.status}</Badge> }
  ];

  const prestasiColumns = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'nama_siswa', label: 'Siswa' },
    { key: 'nama_prestasi', label: 'Prestasi' },
    { key: 'kategori', label: 'Kategori', render: (row) => <Badge className="bg-yellow-100 text-yellow-700">{row.kategori}</Badge> },
    { key: 'tingkat', label: 'Tingkat', render: (row) => <Badge className="bg-indigo-100 text-indigo-700">{row.tingkat}</Badge> }
  ];

  const keuanganColumns = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'jenis', label: 'Jenis', render: (row) => <Badge className={row.jenis === 'Pemasukan' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{row.jenis}</Badge> },
    { key: 'kategori', label: 'Kategori' },
    { key: 'uraian', label: 'Uraian', render: (row) => <span className="truncate max-w-[150px] block">{row.uraian}</span> },
    { key: 'jumlah', label: 'Jumlah', render: (row) => <span className={`font-medium ${row.jenis === 'Pemasukan' ? 'text-emerald-600' : 'text-red-600'}`}>{formatRupiah(row.jumlah)}</span> }
  ];

  const materiColumns = [
    { key: 'judul', label: 'Judul' },
    { key: 'mapel', label: 'Mapel' },
    { key: 'tingkat_kelas', label: 'Kelas' },
    { key: 'semester', label: 'Semester' },
    { key: 'jenis_file', label: 'Jenis', render: (row) => <Badge variant="outline">{row.jenis_file}</Badge> },
    { key: 'guru_pengampu', label: 'Guru' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-[1800px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <School className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard Kepala Sekolah</h1>
              <p className="text-slate-500 text-sm">Monitoring lengkap seluruh data sekolah</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border-0 p-0 h-auto w-32 text-sm" />
              <span className="text-slate-400">-</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border-0 p-0 h-auto w-32 text-sm" />
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchSiswa()}><RefreshCw className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Siswa', value: stats.siswaAktif, icon: Users, color: 'from-blue-500 to-blue-600' },
            { label: 'Guru', value: stats.guruAktif, icon: GraduationCap, color: 'from-violet-500 to-violet-600' },
            { label: 'Kelas', value: stats.totalKelas, icon: Building, color: 'from-emerald-500 to-emerald-600' },
            { label: 'Saldo', value: formatRupiah(stats.saldo), icon: Wallet, color: stats.saldo >= 0 ? 'from-teal-500 to-teal-600' : 'from-red-500 to-red-600', small: true },
            { label: 'Materi', value: stats.totalMateri, icon: BookOpen, color: 'from-indigo-500 to-indigo-600' },
            { label: 'Kehadiran', value: `${stats.kehadiranHariIni}%`, icon: Calendar, color: 'from-amber-500 to-amber-600' },
            { label: 'Pelanggaran', value: stats.pelanggaranAktif, icon: AlertTriangle, color: stats.pelanggaranAktif > 0 ? 'from-red-500 to-red-600' : 'from-slate-400 to-slate-500' },
            { label: 'Prestasi', value: stats.prestasiBulanIni, icon: Award, color: 'from-yellow-500 to-yellow-600' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className={`border-0 shadow-sm bg-gradient-to-br ${stat.color} text-white`}>
                <CardContent className="p-4">
                  <Icon className="w-5 h-5 opacity-80 mb-1" />
                  <p className={`font-bold ${stat.small ? 'text-sm' : 'text-xl'}`}>{stat.value}</p>
                  <p className="text-[10px] opacity-80">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Menu Navigation */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2">
              {menuSections.map((menu) => {
                const Icon = menu.icon;
                return (
                  <Button
                    key={menu.id}
                    variant={activeSection === menu.id ? 'default' : 'outline'}
                    className={`${activeSection === menu.id ? menu.color + ' text-white' : ''}`}
                    onClick={() => setActiveSection(menu.id)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {menu.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeSection === 'ringkasan' && (
              <div className="space-y-4">
                {/* Alerts */}
                {alerts.length > 0 && (
                  <Card className="border-0 shadow-lg border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-red-600"><Bell className="w-5 h-5" /> Peringatan Penting</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {alerts.map((alert, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{alert.title}</p>
                            <p className="text-xs text-slate-500">{alert.person} - {alert.kelas}</p>
                          </div>
                          {alert.phone && <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => handleWhatsApp(alert.phone, `Yth. Orang Tua ${alert.person},`)}><MessageCircle className="w-4 h-4" /></Button>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Statistik Kehadiran</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={attendanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {attendanceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Rata-rata Nilai per Mapel</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={gradeData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis dataKey="mapel" type="category" width={100} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="rata" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Data Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Pelanggaran Aktif</CardTitle></CardHeader>
                    <CardContent className="max-h-[250px] overflow-y-auto">
                      {pelanggaranList.filter(p => p.status === 'Proses').slice(0, 5).map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border-b">
                          <div><p className="text-sm font-medium">{p.nama_siswa}</p><p className="text-xs text-slate-500">{p.jenis_pelanggaran}</p></div>
                          <Badge className="bg-red-100 text-red-700">{p.poin} poin</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4 text-yellow-500" /> Prestasi Terbaru</CardTitle></CardHeader>
                    <CardContent className="max-h-[250px] overflow-y-auto">
                      {prestasiList.slice(0, 5).map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border-b">
                          <div><p className="text-sm font-medium">{p.nama_siswa}</p><p className="text-xs text-slate-500">{p.nama_prestasi}</p></div>
                          <Badge className="bg-yellow-100 text-yellow-700">{p.kategori}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeSection === 'siswa' && (
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> Data Siswa ({siswaList.length})</CardTitle></CardHeader>
                <CardContent><DataTable columns={siswaColumns} data={siswaList} pageSize={15} /></CardContent>
              </Card>
            )}

            {activeSection === 'guru' && (
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-violet-500" /> Data Guru ({guruList.length})</CardTitle></CardHeader>
                <CardContent><DataTable columns={guruColumns} data={guruList} pageSize={15} /></CardContent>
              </Card>
            )}

            {activeSection === 'absensi' && (
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-500" /> Data Absensi ({absensiList.length})</CardTitle></CardHeader>
                <CardContent><DataTable columns={absensiColumns} data={absensiList} pageSize={15} /></CardContent>
              </Card>
            )}

            {activeSection === 'nilai' && (
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-amber-500" /> Data Nilai ({nilaiList.length})</CardTitle></CardHeader>
                <CardContent><DataTable columns={nilaiColumns} data={nilaiList} pageSize={15} /></CardContent>
              </Card>
            )}

            {activeSection === 'catatan' && (
              <Tabs defaultValue="pelanggaran" className="w-full">
                <TabsList><TabsTrigger value="pelanggaran">Pelanggaran</TabsTrigger><TabsTrigger value="prestasi">Prestasi</TabsTrigger><TabsTrigger value="uks">UKS</TabsTrigger></TabsList>
                <TabsContent value="pelanggaran">
                  <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle>Data Pelanggaran ({pelanggaranList.length})</CardTitle></CardHeader>
                    <CardContent><DataTable columns={pelanggaranColumns} data={pelanggaranList} pageSize={15} /></CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="prestasi">
                  <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle>Data Prestasi ({prestasiList.length})</CardTitle></CardHeader>
                    <CardContent><DataTable columns={prestasiColumns} data={prestasiList} pageSize={15} /></CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="uks">
                  <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle>Data UKS ({uksList.length})</CardTitle></CardHeader>
                    <CardContent>
                      <DataTable columns={[
                        { key: 'tanggal', label: 'Tanggal' },
                        { key: 'nama_siswa', label: 'Siswa' },
                        { key: 'keluhan', label: 'Keluhan' },
                        { key: 'status', label: 'Status', render: (row) => <Badge className={row.status === 'Kembali ke Kelas' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{row.status}</Badge> }
                      ]} data={uksList} pageSize={15} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            {activeSection === 'keuangan' && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Wallet className="w-5 h-5 text-teal-500" /> Data Keuangan</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-emerald-600">Masuk: {formatRupiah(stats.totalPemasukan)}</span>
                      <span className="text-red-600">Keluar: {formatRupiah(stats.totalPengeluaran)}</span>
                      <span className="font-bold">Saldo: {formatRupiah(stats.saldo)}</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent><DataTable columns={keuanganColumns} data={keuanganList} pageSize={15} /></CardContent>
              </Card>
            )}

            {activeSection === 'materi' && (
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><FolderOpen className="w-5 h-5 text-pink-500" /> Data Materi ({materiList.length})</CardTitle></CardHeader>
                <CardContent><DataTable columns={materiColumns} data={materiList} pageSize={15} /></CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Phone className="w-4 h-4" /> Hubungi Guru</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                {guruList.filter(g => g.no_telp && g.status === 'Aktif').slice(0, 10).map((guru, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div><p className="text-sm font-medium">{guru.nama}</p><p className="text-xs text-slate-500">{guru.jabatan}</p></div>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 h-7" onClick={() => handleWhatsApp(guru.no_telp, `Halo ${guru.nama},`)}><MessageCircle className="w-3 h-3" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Kelas</CardTitle></CardHeader>
              <CardContent className="space-y-1 max-h-[200px] overflow-y-auto">
                {kelasList.map((kelas, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm">{kelas.nama_kelas}</span>
                    <Badge variant="outline">{kelas.wali_kelas || '-'}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}