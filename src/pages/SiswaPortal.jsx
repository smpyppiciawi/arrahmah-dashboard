import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap, Calendar, BookOpen, AlertTriangle, Wallet,
  LogOut, Award, School, TrendingUp, CheckCircle
} from "lucide-react";

export default function SiswaPortal() {
  const { siswaUser, siswaLogout } = useAuth();
  const siswa = siswaUser;

  const { data: absensiList = [] } = useQuery({
    queryKey: ['siswa-absensi', siswa?.id],
    queryFn: () => base44.entities.Absensi.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
  });

  const { data: nilaiList = [] } = useQuery({
    queryKey: ['siswa-nilai', siswa?.id],
    queryFn: () => base44.entities.Nilai.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
  });

  const { data: pelanggaranList = [] } = useQuery({
    queryKey: ['siswa-pelanggaran', siswa?.id],
    queryFn: () => base44.entities.Pelanggaran.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
  });

  const { data: prestasiList = [] } = useQuery({
    queryKey: ['siswa-prestasi', siswa?.id],
    queryFn: () => base44.entities.Prestasi.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
  });

  const { data: keuanganList = [] } = useQuery({
    queryKey: ['siswa-keuangan', siswa?.id],
    queryFn: () => base44.entities.Keuangan.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
  });

  const stats = useMemo(() => {
    const hadir = absensiList.filter(a => a.status === 'Hadir').length;
    const sakit = absensiList.filter(a => a.status === 'Sakit').length;
    const izin = absensiList.filter(a => a.status === 'Izin').length;
    const alfa = absensiList.filter(a => a.status === 'Alfa').length;
    const total = absensiList.length;
    const kehadiran = total > 0 ? Math.round((hadir / total) * 100) : 0;
    const rataRataNilai = nilaiList.length > 0
      ? Math.round(nilaiList.reduce((s, n) => s + (n.nilai || 0), 0) / nilaiList.length) : 0;
    const totalPembayaran = keuanganList.filter(k => k.jenis === 'Pemasukan').reduce((s, k) => s + (k.jumlah || 0), 0);
    const totalPoin = pelanggaranList.reduce((s, p) => s + (p.poin || 0), 0);
    return { hadir, sakit, izin, alfa, total, kehadiran, rataRataNilai, totalPembayaran, totalPoin };
  }, [absensiList, nilaiList, keuanganList, pelanggaranList]);

  const formatRupiah = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

  const statusAbsensiColor = {
    'Hadir': 'bg-emerald-100 text-emerald-700',
    'Sakit': 'bg-blue-100 text-blue-700',
    'Izin': 'bg-amber-100 text-amber-700',
    'Alfa': 'bg-red-100 text-red-700',
    'Terlambat': 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white px-4 md:px-8 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base md:text-lg leading-tight">{siswa?.nama}</h1>
              <p className="text-indigo-200 text-xs md:text-sm">NIS: {siswa?.nis} · Kelas {siswa?.nama_kelas}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg border border-white/20">
              <School className="w-3.5 h-3.5 text-indigo-200" />
              <span className="text-xs text-indigo-200">YPPI ARRAHMAH</span>
            </div>
            <Button variant="ghost" className="text-white hover:bg-white/20 text-sm h-8 px-3" onClick={siswaLogout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Keluar
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-slate-500 font-medium">Kehadiran</p>
              </div>
              <p className={`text-2xl font-bold ${stats.kehadiran >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>{stats.kehadiran}%</p>
              <p className="text-xs text-slate-400 mt-0.5">{stats.hadir} dari {stats.total} hari</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-slate-500 font-medium">Rata-rata Nilai</p>
              </div>
              <p className={`text-2xl font-bold ${stats.rataRataNilai >= 75 ? 'text-blue-600' : 'text-red-600'}`}>{stats.rataRataNilai}</p>
              <p className="text-xs text-slate-400 mt-0.5">{nilaiList.length} penilaian</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-slate-500 font-medium">Poin Pelanggaran</p>
              </div>
              <p className={`text-2xl font-bold ${stats.totalPoin === 0 ? 'text-slate-700' : stats.totalPoin > 50 ? 'text-red-600' : 'text-amber-600'}`}>{stats.totalPoin}</p>
              <p className="text-xs text-slate-400 mt-0.5">{pelanggaranList.length} catatan</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-yellow-500" />
                <p className="text-xs text-slate-500 font-medium">Prestasi</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{prestasiList.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">pencapaian</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="absensi">
          <TabsList className="bg-white shadow-sm border mb-1">
            <TabsTrigger value="absensi" className="text-xs md:text-sm"><Calendar className="w-3 h-3 mr-1" /> Absensi</TabsTrigger>
            <TabsTrigger value="nilai" className="text-xs md:text-sm"><BookOpen className="w-3 h-3 mr-1" /> Nilai</TabsTrigger>
            <TabsTrigger value="catatan" className="text-xs md:text-sm"><AlertTriangle className="w-3 h-3 mr-1" /> Catatan</TabsTrigger>
            <TabsTrigger value="keuangan" className="text-xs md:text-sm"><Wallet className="w-3 h-3 mr-1" /> Keuangan</TabsTrigger>
          </TabsList>

          {/* Absensi Tab */}
          <TabsContent value="absensi">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" /> Rekap Absensi
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">Hadir: {stats.hadir}</Badge>
                  <Badge className="bg-blue-100 text-blue-700 border-0">Sakit: {stats.sakit}</Badge>
                  <Badge className="bg-amber-100 text-amber-700 border-0">Izin: {stats.izin}</Badge>
                  <Badge className="bg-red-100 text-red-700 border-0">Alfa: {stats.alfa}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {absensiList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).map((a, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm hover:bg-slate-100 transition-colors">
                      <div>
                        <span className="font-medium text-slate-700">{a.tanggal}</span>
                        {a.jam_masuk && <span className="text-slate-400 text-xs ml-2">{a.jam_masuk}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {a.keterangan && <span className="text-slate-400 text-xs hidden md:block">{a.keterangan}</span>}
                        <Badge className={`border-0 ${statusAbsensiColor[a.status] || 'bg-slate-100 text-slate-700'}`}>{a.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {absensiList.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>Belum ada data absensi</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nilai Tab */}
          <TabsContent value="nilai">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" /> Rekap Nilai
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {nilaiList.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map((n, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm hover:bg-slate-100 transition-colors">
                      <div>
                        <span className="font-medium text-slate-700">{n.mapel}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-xs px-1.5 py-0">{n.jenis_penilaian}</Badge>
                          {n.kompetensi_bab && <span className="text-slate-400 text-xs">{n.kompetensi_bab}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{n.semester}</span>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${n.nilai >= (n.kkm || 75) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {n.nilai}
                        </div>
                      </div>
                    </div>
                  ))}
                  {nilaiList.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>Belum ada data nilai</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Catatan Tab */}
          <TabsContent value="catatan">
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Catatan Pelanggaran
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {pelanggaranList.map((p, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl text-sm hover:bg-slate-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-700">{p.uraian}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{p.tanggal} · {p.jenis_pelanggaran}</p>
                            {p.sanksi && <p className="text-xs text-red-500 mt-0.5">Sanksi: {p.sanksi}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className="bg-red-100 text-red-700 border-0">{p.poin} poin</Badge>
                            <Badge className={`border-0 ${p.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pelanggaranList.length === 0 && (
                      <div className="text-center py-6 text-slate-400">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                        <p>Tidak ada catatan pelanggaran</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" /> Prestasi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {prestasiList.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm hover:bg-slate-100 transition-colors">
                        <div>
                          <p className="font-medium text-slate-700">{p.nama_prestasi}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{p.tanggal} · {p.penyelenggara || '-'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-yellow-100 text-yellow-700 border-0">{p.kategori}</Badge>
                          <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">{p.tingkat}</Badge>
                        </div>
                      </div>
                    ))}
                    {prestasiList.length === 0 && (
                      <div className="text-center py-6 text-slate-400">
                        <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>Belum ada catatan prestasi</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Keuangan Tab */}
          <TabsContent value="keuangan">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-teal-500" /> Riwayat Keuangan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <p className="text-xs text-emerald-600 font-medium">Total Pembayaran</p>
                    <p className="text-lg font-bold text-emerald-700">{formatRupiah(stats.totalPembayaran)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 font-medium">Jumlah Transaksi</p>
                    <p className="text-lg font-bold text-slate-700">{keuanganList.length}</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {keuanganList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).map((k, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm hover:bg-slate-100 transition-colors">
                      <div>
                        <p className="font-medium text-slate-700">{k.uraian || k.kategori}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{k.tanggal} · {k.tipe_transaksi || k.kategori}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-semibold text-sm ${k.jenis === 'Pemasukan' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {k.jenis === 'Pengeluaran' ? '-' : '+'}{formatRupiah(k.jumlah)}
                        </span>
                        <Badge className={`border-0 text-xs ${k.status_bayar === 'Lunas' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {k.status_bayar}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {keuanganList.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>Belum ada riwayat keuangan</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}