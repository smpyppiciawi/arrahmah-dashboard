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
import { 
  Calendar, RefreshCw, School, Users, GraduationCap, Building, Wallet, 
  BookOpen, AlertTriangle, Award, Heart, Bell, TrendingDown, TrendingUp,
  MessageCircle, Eye, X, ChevronRight, Phone, FileText, Settings,
  ClipboardList
} from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
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
    queryFn: () => base44.entities.Absensi.list('-tanggal', 500),
  });

  const { data: nilaiList = [] } = useQuery({
    queryKey: ['nilai'],
    queryFn: () => base44.entities.Nilai.list('-created_date', 500),
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

  // Format Rupiah
  const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

  // WhatsApp handler
  const handleWhatsApp = (phone, message) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
  };

  // Computed Stats
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
      totalSiswa: siswaList.length,
      siswaAktif: aktiveSiswa.length,
      totalGuru: guruList.length,
      guruAktif: aktivGuru.length,
      totalKelas: kelasList.length,
      totalMateri: materiList.length,
      saldo: totalPemasukan - totalPengeluaran,
      totalPemasukan,
      totalPengeluaran,
      kehadiranHariIni,
      pelanggaranAktif: pelanggaranAktifCount,
      prestasiBulanIni
    };
  }, [siswaList, guruList, kelasList, absensiList, keuanganList, pelanggaranList, prestasiList, materiList, dateFrom, dateTo, today]);

  // Siswa Bermasalah
  const siswaBermasalah = useMemo(() => {
    return siswaList.filter(s => s.status === 'Aktif').map(siswa => {
      const poinPelanggaran = pelanggaranList
        .filter(p => p.siswa_id === siswa.id && p.status === 'Proses')
        .reduce((sum, p) => sum + (p.poin || 0), 0);
      
      const alfaCount = absensiList
        .filter(a => a.siswa_id === siswa.id && a.status === 'Alfa').length;
      
      const nilaiRendah = nilaiList
        .filter(n => n.siswa_id === siswa.id && n.nilai < (n.kkm || 75)).length;
      
      return { ...siswa, totalPoin: poinPelanggaran, alfaCount, nilaiRendah, score: poinPelanggaran * 2 + alfaCount * 3 + nilaiRendah };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 15);
  }, [siswaList, pelanggaranList, absensiList, nilaiList]);

  // Nilai di bawah KKM
  const nilaiBermasalah = useMemo(() => {
    return nilaiList.filter(n => n.nilai < (n.kkm || 75)).sort((a, b) => a.nilai - b.nilai);
  }, [nilaiList]);

  // Pelanggaran Aktif
  const pelanggaranAktif = useMemo(() => {
    return pelanggaranList.filter(p => p.status === 'Proses').sort((a, b) => {
      const order = { 'Sangat Berat': 0, 'Berat': 1, 'Sedang': 2, 'Ringan': 3, 'Sangat Ringan': 4 };
      return (order[a.jenis_pelanggaran] || 5) - (order[b.jenis_pelanggaran] || 5);
    });
  }, [pelanggaranList]);

  // Tunggakan Siswa
  const tunggakanSiswa = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    const sppTarif = tarifIuranList.find(t => t.nama?.toLowerCase().includes('spp'));
    const sppNominal = sppTarif?.nominal || 0;
    if (sppNominal === 0) return [];
    
    return siswaList.filter(s => s.status === 'Aktif').map(siswa => {
      const sppPayments = keuanganList.filter(k => k.siswa_id === siswa.id && k.tipe_transaksi?.toLowerCase().includes('spp'));
      const totalDibayar = sppPayments.reduce((sum, p) => sum + (p.jumlah || 0), 0);
      const bulanBayar = Math.floor(totalDibayar / sppNominal);
      const tunggakan = Math.max(0, (currentMonth - bulanBayar) * sppNominal);
      return { ...siswa, tunggakan };
    }).filter(s => s.tunggakan > 0).sort((a, b) => b.tunggakan - a.tunggakan).slice(0, 20);
  }, [siswaList, keuanganList, tarifIuranList]);

  // Generate Alerts
  const alerts = useMemo(() => {
    const alertList = [];
    
    pelanggaranAktif.filter(p => p.jenis_pelanggaran === 'Sangat Berat' || p.jenis_pelanggaran === 'Berat').forEach(p => {
      alertList.push({
        id: `pel-${p.id}`,
        type: 'pelanggaran',
        severity: 'critical',
        category: 'Pelanggaran',
        title: `Pelanggaran ${p.jenis_pelanggaran}`,
        message: p.uraian,
        person: p.nama_siswa,
        kelas: p.nama_kelas,
        time: p.tanggal,
        phone: siswaList.find(s => s.id === p.siswa_id)?.no_telp_ortu
      });
    });
    
    siswaBermasalah.filter(s => s.alfaCount >= 3).forEach(s => {
      alertList.push({
        id: `alfa-${s.id}`,
        type: 'absensi',
        severity: 'warning',
        category: 'Kehadiran',
        title: `Siswa Sering Alfa`,
        message: `${s.alfaCount} kali tidak hadir tanpa keterangan`,
        person: s.nama,
        kelas: s.nama_kelas,
        phone: s.no_telp_ortu
      });
    });
    
    return alertList.filter(a => !dismissedAlerts.includes(a.id));
  }, [pelanggaranAktif, siswaBermasalah, siswaList, dismissedAlerts]);

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
    nilaiList.forEach(n => {
      if (!byMapel[n.mapel]) byMapel[n.mapel] = [];
      byMapel[n.mapel].push(n.nilai);
    });
    return Object.entries(byMapel).map(([mapel, values]) => ({
      mapel: mapel.length > 10 ? mapel.substring(0, 10) + '...' : mapel,
      rata: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    })).sort((a, b) => b.rata - a.rata).slice(0, 8);
  }, [nilaiList]);

  const quickActions = [
    { label: 'Data Siswa', icon: Users, page: 'Siswa', color: 'bg-blue-500' },
    { label: 'Data Guru', icon: GraduationCap, page: 'Guru', color: 'bg-violet-500' },
    { label: 'Absensi', icon: Calendar, page: 'Absensi', color: 'bg-emerald-500' },
    { label: 'Nilai', icon: BookOpen, page: 'Nilai', color: 'bg-amber-500' },
    { label: 'Catatan Siswa', icon: ClipboardList, page: 'CatatanSiswa', color: 'bg-purple-500' },
    { label: 'Transaksi', icon: Wallet, page: 'Transaksi', color: 'bg-teal-500' },
    { label: 'Laporan', icon: FileText, page: 'LaporanKeuangan', color: 'bg-indigo-500' },
    { label: 'Kelola Data', icon: Settings, page: 'KelolaDataKeuangan', color: 'bg-slate-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <School className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard Kepala Sekolah</h1>
              <p className="text-slate-500 text-sm">Monitoring lengkap aktivitas sekolah</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border-0 p-0 h-auto w-32 text-sm" />
              <span className="text-slate-400">-</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border-0 p-0 h-auto w-32 text-sm" />
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchSiswa()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <Users className="w-6 h-6 opacity-80 mb-2" />
              <p className="text-xl font-bold">{stats.siswaAktif}</p>
              <p className="text-[10px] opacity-80">Total Siswa</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500 to-violet-600 text-white">
            <CardContent className="p-4">
              <GraduationCap className="w-6 h-6 opacity-80 mb-2" />
              <p className="text-xl font-bold">{stats.guruAktif}</p>
              <p className="text-[10px] opacity-80">Total Guru</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <Building className="w-6 h-6 opacity-80 mb-2" />
              <p className="text-xl font-bold">{stats.totalKelas}</p>
              <p className="text-[10px] opacity-80">Total Kelas</p>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm text-white ${stats.saldo >= 0 ? 'bg-gradient-to-br from-teal-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
            <CardContent className="p-4">
              <Wallet className="w-6 h-6 opacity-80 mb-2" />
              <p className="text-sm font-bold">{formatRupiah(stats.saldo)}</p>
              <p className="text-[10px] opacity-80">Saldo</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardContent className="p-4">
              <BookOpen className="w-6 h-6 opacity-80 mb-2" />
              <p className="text-xl font-bold">{stats.totalMateri}</p>
              <p className="text-[10px] opacity-80">Total Materi</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardContent className="p-4">
              <Calendar className="w-6 h-6 opacity-80 mb-2" />
              <p className="text-xl font-bold">{stats.kehadiranHariIni}%</p>
              <p className="text-[10px] opacity-80">Kehadiran Hari Ini</p>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm text-white ${stats.pelanggaranAktif > 0 ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
            <CardContent className="p-4">
              <AlertTriangle className="w-6 h-6 opacity-80 mb-2" />
              <p className="text-xl font-bold">{stats.pelanggaranAktif}</p>
              <p className="text-[10px] opacity-80">Pelanggaran Aktif</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-4">
              <Award className="w-6 h-6 opacity-80 mb-2" />
              <p className="text-xl font-bold">{stats.prestasiBulanIni}</p>
              <p className="text-[10px] opacity-80">Prestasi Bulan Ini</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Alerts & Quick Actions */}
          <div className="space-y-4">
            {/* Alert Panel */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2 bg-gradient-to-r from-red-500 to-amber-500 text-white rounded-t-xl">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="w-5 h-5" />
                  Notifikasi & Peringatan
                  <Badge className="bg-white/20 text-white ml-auto">{alerts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-emerald-700 font-medium">Tidak ada peringatan</p>
                  </div>
                ) : (
                  alerts.map((alert, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-4 border-b border-l-4 ${alert.severity === 'critical' ? 'border-l-red-500' : 'border-l-amber-500'}`}>
                      <AlertTriangle className={`w-4 h-4 ${alert.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                      <div className="flex-1">
                        <Badge className={alert.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>{alert.category}</Badge>
                        <p className="font-medium text-sm mt-1">{alert.title}</p>
                        <p className="text-xs text-slate-500">{alert.person} - {alert.kelas}</p>
                      </div>
                      {alert.phone && (
                        <Button size="sm" variant="ghost" className="h-7 text-emerald-600" onClick={() => handleWhatsApp(alert.phone, `Yth. Bapak/Ibu Orang Tua ${alert.person},`)}>
                          <MessageCircle className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Akses Cepat Menu</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-4 gap-2">
                {quickActions.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <Link key={idx} to={createPageUrl(action.page)}>
                      <Button variant="ghost" className={`w-full h-auto flex-col py-3 ${action.color} text-white hover:opacity-90`}>
                        <Icon className="w-5 h-5 mb-1" />
                        <span className="text-[10px]">{action.label}</span>
                      </Button>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>

            {/* Contact Guru */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Hubungi Guru/Pegawai
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
                {guruList.filter(g => g.no_telp && g.status === 'Aktif').slice(0, 8).map((guru, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{guru.nama}</p>
                      <p className="text-xs text-slate-500">{guru.jabatan}</p>
                    </div>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 h-8" onClick={() => handleWhatsApp(guru.no_telp, `Halo ${guru.nama},`)}>
                      <MessageCircle className="w-3 h-3 mr-1" /> WA
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Data Overview & Charts */}
          <div className="lg:col-span-2 space-y-4">
            {/* Data Tabs */}
            <Tabs defaultValue="siswa-bermasalah" className="w-full">
              <TabsList className="grid w-full grid-cols-5 h-auto">
                <TabsTrigger value="siswa-bermasalah" className="text-xs py-2">Perhatian</TabsTrigger>
                <TabsTrigger value="nilai" className="text-xs py-2">Nilai</TabsTrigger>
                <TabsTrigger value="pelanggaran" className="text-xs py-2">Pelanggaran</TabsTrigger>
                <TabsTrigger value="prestasi" className="text-xs py-2">Prestasi</TabsTrigger>
                <TabsTrigger value="tunggakan" className="text-xs py-2">Tunggakan</TabsTrigger>
              </TabsList>

              <TabsContent value="siswa-bermasalah">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Siswa Perlu Perhatian Khusus
                      <Badge className="bg-red-100 text-red-700 ml-auto">{siswaBermasalah.length} siswa</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[300px] overflow-y-auto">
                    {siswaBermasalah.length === 0 ? (
                      <p className="text-center text-slate-500 py-4">Tidak ada siswa bermasalah</p>
                    ) : (
                      <div className="space-y-2">
                        {siswaBermasalah.map((siswa, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                            <div>
                              <p className="font-medium text-sm">{siswa.nama}</p>
                              <p className="text-xs text-slate-500">{siswa.nama_kelas} - NIS: {siswa.nis}</p>
                              <div className="flex gap-1 mt-1">
                                {siswa.totalPoin > 0 && <Badge className="bg-red-100 text-red-700 text-[10px]">Poin: {siswa.totalPoin}</Badge>}
                                {siswa.nilaiRendah > 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Nilai Rendah: {siswa.nilaiRendah}</Badge>}
                                {siswa.alfaCount > 0 && <Badge className="bg-slate-100 text-slate-700 text-[10px]">Alfa: {siswa.alfaCount}x</Badge>}
                              </div>
                            </div>
                            {siswa.no_telp_ortu && (
                              <Button size="sm" variant="ghost" className="h-8 text-emerald-600" onClick={() => handleWhatsApp(siswa.no_telp_ortu, `Yth. Bapak/Ibu Orang Tua ${siswa.nama},`)}>
                                <MessageCircle className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="nilai">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-amber-500" />
                      Nilai di Bawah KKM
                      <Badge className="bg-amber-100 text-amber-700 ml-auto">{nilaiBermasalah.length} data</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[300px] overflow-y-auto">
                    {nilaiBermasalah.length === 0 ? (
                      <p className="text-center text-slate-500 py-4">Semua nilai di atas KKM</p>
                    ) : (
                      <div className="space-y-2">
                        {nilaiBermasalah.slice(0, 20).map((nilai, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <div>
                              <p className="font-medium text-sm">{nilai.nama_siswa}</p>
                              <p className="text-xs text-slate-500">{nilai.nama_kelas} - {nilai.mapel}</p>
                            </div>
                            <Badge className="bg-red-100 text-red-700">{nilai.nilai}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pelanggaran">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Pelanggaran Belum Selesai
                      <Badge className="bg-red-100 text-red-700 ml-auto">{pelanggaranAktif.length} kasus</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[300px] overflow-y-auto">
                    {pelanggaranAktif.length === 0 ? (
                      <p className="text-center text-slate-500 py-4">Tidak ada pelanggaran aktif</p>
                    ) : (
                      <div className="space-y-2">
                        {pelanggaranAktif.slice(0, 15).map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                            <div>
                              <p className="font-medium text-sm">{p.nama_siswa}</p>
                              <p className="text-xs text-slate-500">{p.nama_kelas} - {p.tanggal}</p>
                              <p className="text-xs text-red-600 mt-1">{p.uraian?.substring(0, 50)}...</p>
                            </div>
                            <Badge className={
                              p.jenis_pelanggaran === 'Sangat Berat' || p.jenis_pelanggaran === 'Berat' ? 'bg-red-500 text-white' :
                              p.jenis_pelanggaran === 'Sedang' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'
                            }>
                              {p.jenis_pelanggaran}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prestasi">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-500" />
                      Prestasi Terbaru
                      <Badge className="bg-yellow-100 text-yellow-700 ml-auto">{prestasiList.length} prestasi</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[300px] overflow-y-auto">
                    {prestasiList.length === 0 ? (
                      <p className="text-center text-slate-500 py-4">Belum ada data prestasi</p>
                    ) : (
                      <div className="space-y-2">
                        {prestasiList.slice(0, 10).map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                            <div>
                              <p className="font-medium text-sm">{p.nama_siswa}</p>
                              <p className="text-xs text-slate-500">{p.nama_kelas} - {p.tanggal}</p>
                              <p className="text-xs text-yellow-700 mt-1">{p.nama_prestasi}</p>
                            </div>
                            <Badge className="bg-yellow-500 text-white">{p.kategori}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tunggakan">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-red-500" />
                      Siswa dengan Tunggakan
                      <Badge className="bg-red-100 text-red-700 ml-auto">{tunggakanSiswa.length} siswa</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[300px] overflow-y-auto">
                    {tunggakanSiswa.length === 0 ? (
                      <p className="text-center text-slate-500 py-4">Tidak ada tunggakan</p>
                    ) : (
                      <div className="space-y-2">
                        {tunggakanSiswa.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                            <div>
                              <p className="font-medium text-sm">{s.nama}</p>
                              <p className="text-xs text-slate-500">{s.nama_kelas} - NIS: {s.nis}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-600">{formatRupiah(s.tunggakan)}</p>
                              {s.no_telp_ortu && (
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-emerald-600 mt-1" onClick={() => handleWhatsApp(s.no_telp_ortu, `Yth. Bapak/Ibu Orang Tua ${s.nama},\n\nKami ingin mengingatkan mengenai tunggakan pembayaran sebesar ${formatRupiah(s.tunggakan)}.`)}>
                                  <MessageCircle className="w-3 h-3 mr-1" /> Ingatkan
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Statistik Kehadiran</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={attendanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {attendanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Rata-rata Nilai per Mapel</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={gradeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="mapel" type="category" width={80} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="rata" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}