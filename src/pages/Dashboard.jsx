import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  Users, Wallet, BookOpen, FileText, TrendingUp, 
  Calendar, GraduationCap, Building
} from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import KehadiranChart from '../components/dashboard/KehadiranChart';
import KeuanganChart from '../components/dashboard/KeuanganChart';
import SiswaPerhatianList from '../components/dashboard/SiswaPerhatianList';
import KetuntasanChart from '../components/dashboard/KetuntasanChart';

export default function Dashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch all data
  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: absensiHariIni = [] } = useQuery({
    queryKey: ['absensi-today', today],
    queryFn: () => base44.entities.Absensi.filter({ tanggal: today }),
  });

  const { data: keuanganList = [] } = useQuery({
    queryKey: ['keuangan'],
    queryFn: () => base44.entities.Keuangan.list('-tanggal', 500),
  });

  const { data: nilaiList = [] } = useQuery({
    queryKey: ['nilai'],
    queryFn: () => base44.entities.Nilai.list('-created_date', 1000),
  });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.filter({ status: 'Aktif' }),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list(),
  });

  // Calculate statistics
  const kehadiranData = {
    hadir: absensiHariIni.filter(a => a.status === 'Hadir').length,
    sakit: absensiHariIni.filter(a => a.status === 'Sakit').length,
    izin: absensiHariIni.filter(a => a.status === 'Izin').length,
    alfa: absensiHariIni.filter(a => a.status === 'Alfa').length,
    terlambat: absensiHariIni.filter(a => a.status === 'Terlambat').length,
  };

  const totalKehadiran = kehadiranData.hadir + kehadiranData.terlambat;
  const persentaseKehadiran = siswaList.length > 0 
    ? ((totalKehadiran / siswaList.length) * 100).toFixed(1) 
    : 0;

  // Calculate financial data
  const totalPemasukan = keuanganList
    .filter(k => k.jenis === 'Pemasukan')
    .reduce((sum, k) => sum + (k.jumlah || 0), 0);

  const totalPengeluaran = keuanganList
    .filter(k => k.jenis === 'Pengeluaran')
    .reduce((sum, k) => sum + (k.jumlah || 0), 0);

  const saldo = totalPemasukan - totalPengeluaran;

  // Monthly financial data for chart
  const getMonthlyData = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
      
      const monthPemasukan = keuanganList
        .filter(k => k.jenis === 'Pemasukan' && k.tanggal >= monthStart && k.tanggal <= monthEnd)
        .reduce((sum, k) => sum + (k.jumlah || 0), 0);
      
      const monthPengeluaran = keuanganList
        .filter(k => k.jenis === 'Pengeluaran' && k.tanggal >= monthStart && k.tanggal <= monthEnd)
        .reduce((sum, k) => sum + (k.jumlah || 0), 0);

      months.push({
        bulan: format(monthDate, 'MMM', { locale: id }),
        pemasukan: monthPemasukan,
        pengeluaran: monthPengeluaran,
      });
    }
    return months;
  };

  // Calculate ketuntasan per mapel
  const getKetuntasanData = () => {
    const mapelStats = {};
    nilaiList.forEach(n => {
      if (!mapelStats[n.mapel]) {
        mapelStats[n.mapel] = { tuntas: 0, total: 0 };
      }
      mapelStats[n.mapel].total++;
      if (n.status_ketuntasan === 'Tuntas' || n.nilai >= (n.kkm || 75)) {
        mapelStats[n.mapel].tuntas++;
      }
    });

    return Object.entries(mapelStats)
      .map(([mapel, stats]) => ({
        mapel: mapel.length > 12 ? mapel.substring(0, 12) + '...' : mapel,
        ketuntasan: stats.total > 0 ? (stats.tuntas / stats.total) * 100 : 0,
      }))
      .slice(0, 6);
  };

  // Get students needing attention
  const getSiswaPerhatian = () => {
    // Count alfa per siswa
    const alfaCount = {};
    absensiHariIni.filter(a => a.status === 'Alfa').forEach(a => {
      if (!alfaCount[a.siswa_id]) {
        alfaCount[a.siswa_id] = { nama: a.nama_siswa, kelas: a.nama_kelas, jumlah: 0 };
      }
      alfaCount[a.siswa_id].jumlah++;
    });

    return Object.values(alfaCount).filter(s => s.jumlah >= 1);
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
            Dashboard Sekolah
          </h1>
          <p className="text-slate-500 mt-1">
            {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            title="Total Siswa Aktif"
            value={siswaList.length}
            icon={Users}
            color="blue"
          />
          <StatCard 
            title="Kehadiran Hari Ini"
            value={`${persentaseKehadiran}%`}
            subtitle={`${totalKehadiran} dari ${siswaList.length} siswa`}
            icon={Calendar}
            color="green"
          />
          <StatCard 
            title="Saldo Keuangan"
            value={formatRupiah(saldo)}
            icon={Wallet}
            color={saldo >= 0 ? "teal" : "red"}
          />
          <StatCard 
            title="Total Guru"
            value={guruList.length}
            icon={GraduationCap}
            color="purple"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <KehadiranChart data={kehadiranData} />
          <KeuanganChart data={getMonthlyData()} />
          <SiswaPerhatianList siswaAbsen={getSiswaPerhatian()} />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <KetuntasanChart data={getKetuntasanData()} />
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard 
              title="Total Kelas"
              value={kelasList.length}
              icon={Building}
              color="yellow"
            />
            <StatCard 
              title="Nilai Diinput"
              value={nilaiList.length}
              icon={FileText}
              color="purple"
            />
            <StatCard 
              title="Pemasukan Bulan Ini"
              value={formatRupiah(getMonthlyData()[5]?.pemasukan || 0)}
              icon={TrendingUp}
              color="green"
            />
            <StatCard 
              title="Pengeluaran Bulan Ini"
              value={formatRupiah(getMonthlyData()[5]?.pengeluaran || 0)}
              icon={Wallet}
              color="red"
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-slate-400 mt-8 pb-4">
          Sistem Informasi Sekolah • {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}