import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  GraduationCap, Calendar, BookOpen, AlertTriangle, Wallet,
  LogOut, Award, School, TrendingUp, CheckCircle, User,
  Bell, Megaphone, Phone, MapPin, Edit2, Save, X
} from "lucide-react";

export default function SiswaPortal() {
  const { siswaUser, siswaLogout } = useAuth();
  const siswa = siswaUser;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingProfil, setEditingProfil] = useState(false);
  const [profilForm, setProfilForm] = useState(null);

  // === DATA QUERIES ===
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

  // Pengumuman: dari wali kelas (kelas_id match) + dari bendahara (kelas_id === 'all' atau kelas_id === siswa.kelas_id)
  const { data: pengumumanList = [] } = useQuery({
    queryKey: ['siswa-pengumuman', siswa?.kelas_id],
    queryFn: async () => {
      const all = await base44.entities.Pengumuman.list('-tanggal');
      return all.filter(p =>
        p.kelas_id === siswa.kelas_id ||
        p.kelas_id === 'all' ||
        p.kelas_id === siswa.id
      );
    },
    enabled: !!siswa?.kelas_id,
  });

  // Data siswa terkini dari DB (untuk profil lengkap)
  const { data: siswaData, refetch: refetchSiswa } = useQuery({
    queryKey: ['siswa-profil', siswa?.id],
    queryFn: () => base44.entities.Siswa.filter({ id: siswa.id }),
    enabled: !!siswa?.id,
    select: (data) => data[0],
  });

  const updateSiswaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Siswa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa-profil'] });
      setEditingProfil(false);
      toast({ title: 'Profil berhasil diperbarui' });
    },
  });

  // === STATS ===
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

  const handleEditProfil = () => {
    const data = siswaData || siswa;
    setProfilForm({
      alamat: data?.alamat || '',
      no_telp_ortu: data?.no_telp_ortu || '',
      nama_ortu: data?.nama_ortu || '',
    });
    setEditingProfil(true);
  };

  const handleSaveProfil = () => {
    if (!siswaData?.id && !siswa?.id) return;
    updateSiswaMutation.mutate({ id: siswaData?.id || siswa?.id, data: profilForm });
  };

  const currentSiswa = siswaData || siswa;
  const pengumumanPenting = pengumumanList.filter(p => p.penting);
  const pengumumanBiasa = pengumumanList.filter(p => !p.penting);

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

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white shadow-sm border mb-5 flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="dashboard" className="text-xs md:text-sm">
              <TrendingUp className="w-3 h-3 mr-1" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="profil" className="text-xs md:text-sm">
              <User className="w-3 h-3 mr-1" /> Profil
            </TabsTrigger>
            <TabsTrigger value="absensi" className="text-xs md:text-sm">
              <Calendar className="w-3 h-3 mr-1" /> Absensi
            </TabsTrigger>
            <TabsTrigger value="nilai" className="text-xs md:text-sm">
              <BookOpen className="w-3 h-3 mr-1" /> Nilai
            </TabsTrigger>
            <TabsTrigger value="catatan" className="text-xs md:text-sm">
              <AlertTriangle className="w-3 h-3 mr-1" /> Catatan
            </TabsTrigger>
            <TabsTrigger value="keuangan" className="text-xs md:text-sm">
              <Wallet className="w-3 h-3 mr-1" /> Keuangan
            </TabsTrigger>
          </TabsList>

          {/* === DASHBOARD TAB === */}
          <TabsContent value="dashboard" className="space-y-5">
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

            {/* Pengumuman Section */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-500" /> Pengumuman
                  {pengumumanList.length > 0 && (
                    <Badge className="bg-indigo-100 text-indigo-700 border-0 ml-auto">{pengumumanList.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pengumumanList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Belum ada pengumuman</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Pengumuman Penting */}
                    {pengumumanPenting.map((p, idx) => (
                      <div key={idx} className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-red-100 text-red-700 border-0 text-xs">PENTING</Badge>
                              <span className="text-xs text-slate-400">{p.tanggal}</span>
                            </div>
                            <p className="font-semibold text-slate-800">{p.judul}</p>
                            <p className="text-sm text-slate-600 mt-1">{p.isi}</p>
                            <p className="text-xs text-slate-400 mt-2">— {p.nama_guru || 'Sekolah'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Pengumuman Biasa */}
                    {pengumumanBiasa.map((p, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-slate-400">{p.tanggal}</span>
                            </div>
                            <p className="font-medium text-slate-800">{p.judul}</p>
                            <p className="text-sm text-slate-600 mt-1">{p.isi}</p>
                            <p className="text-xs text-slate-400 mt-2">— {p.nama_guru || 'Sekolah'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick recent absensi */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Absensi Terkini (5 Terakhir)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {absensiList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).slice(0, 5).map((a, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg bg-slate-50">
                      <span className="text-slate-600">{a.tanggal}</span>
                      <Badge className={`border-0 text-xs ${statusAbsensiColor[a.status] || 'bg-slate-100 text-slate-700'}`}>{a.status}</Badge>
                    </div>
                  ))}
                  {absensiList.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Belum ada data absensi</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === PROFIL TAB === */}
          <TabsContent value="profil">
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-500" /> Data Diri Siswa
                  </CardTitle>
                  {!editingProfil && (
                    <Button size="sm" variant="outline" onClick={handleEditProfil}>
                      <Edit2 className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {editingProfil ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Nama Lengkap</Label>
                          <Input value={currentSiswa?.nama || ''} disabled className="bg-slate-50 mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">NIS</Label>
                          <Input value={currentSiswa?.nis || ''} disabled className="bg-slate-50 mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Kelas</Label>
                          <Input value={currentSiswa?.nama_kelas || ''} disabled className="bg-slate-50 mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Tanggal Lahir</Label>
                          <Input value={currentSiswa?.tanggal_lahir || ''} disabled className="bg-slate-50 mt-1" />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs text-slate-500">Alamat *</Label>
                          <Input
                            value={profilForm?.alamat || ''}
                            onChange={(e) => setProfilForm({...profilForm, alamat: e.target.value})}
                            placeholder="Masukkan alamat lengkap"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium text-slate-700 mb-3">Data Orang Tua / Wali</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-slate-500">Nama Orang Tua / Wali *</Label>
                            <Input
                              value={profilForm?.nama_ortu || ''}
                              onChange={(e) => setProfilForm({...profilForm, nama_ortu: e.target.value})}
                              placeholder="Nama orang tua/wali"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">No. Telpon Orang Tua *</Label>
                            <Input
                              value={profilForm?.no_telp_ortu || ''}
                              onChange={(e) => setProfilForm({...profilForm, no_telp_ortu: e.target.value})}
                              placeholder="08xx-xxxx-xxxx"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingProfil(false)} className="flex-1">
                          <X className="w-4 h-4 mr-1" /> Batal
                        </Button>
                        <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleSaveProfil} disabled={updateSiswaMutation.isPending}>
                          <Save className="w-4 h-4 mr-1" /> Simpan
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoRow label="Nama Lengkap" value={currentSiswa?.nama} />
                      <InfoRow label="NIS" value={currentSiswa?.nis} />
                      <InfoRow label="Jenis Kelamin" value={currentSiswa?.jenis_kelamin} />
                      <InfoRow label="Kelas" value={currentSiswa?.nama_kelas} />
                      <InfoRow label="Tanggal Lahir" value={currentSiswa?.tanggal_lahir} />
                      <InfoRow label="Status" value={currentSiswa?.status} />
                      <InfoRow label="Alamat" value={currentSiswa?.alamat} icon={<MapPin className="w-3 h-3" />} fullWidth />
                    </div>
                  )}
                </CardContent>
              </Card>

              {!editingProfil && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-500" /> Data Orang Tua / Wali
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoRow label="Nama Orang Tua/Wali" value={currentSiswa?.nama_ortu} />
                      <InfoRow label="No. Telpon" value={currentSiswa?.no_telp_ortu} icon={<Phone className="w-3 h-3" />} />
                    </div>
                    {(!currentSiswa?.nama_ortu && !currentSiswa?.no_telp_ortu) && (
                      <div className="text-center py-4 text-slate-400 text-sm">
                        <p>Data orang tua belum diisi. Klik "Edit" untuk mengisi.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* === ABSENSI TAB === */}
          <TabsContent value="absensi">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" /> Rekap Absensi
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">Hadir: {stats.hadir}</Badge>
                  <Badge className="bg-blue-100 text-blue-700 border-0">Sakit: {stats.sakit}</Badge>
                  <Badge className="bg-amber-100 text-amber-700 border-0">Izin: {stats.izin}</Badge>
                  <Badge className="bg-red-100 text-red-700 border-0">Alfa: {stats.alfa}</Badge>
                  <Badge className="bg-slate-100 text-slate-700 border-0">Total: {stats.total} hari</Badge>
                  <Badge className={`border-0 ${stats.kehadiran >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>Kehadiran: {stats.kehadiran}%</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {absensiList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).map((a, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm hover:bg-slate-100 transition-colors">
                      <div>
                        <span className="font-medium text-slate-700">{a.tanggal}</span>
                        {a.jam_masuk && <span className="text-slate-400 text-xs ml-2">{a.jam_masuk}</span>}
                        {a.keterangan && <p className="text-slate-400 text-xs mt-0.5">{a.keterangan}</p>}
                      </div>
                      <Badge className={`border-0 ${statusAbsensiColor[a.status] || 'bg-slate-100 text-slate-700'}`}>{a.status}</Badge>
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

          {/* === NILAI TAB === */}
          <TabsContent value="nilai">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" /> Rekap Nilai
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-blue-100 text-blue-700 border-0">Total: {nilaiList.length} penilaian</Badge>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">Rata-rata: {stats.rataRataNilai}</Badge>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">Tuntas: {nilaiList.filter(n => n.status_ketuntasan === 'Tuntas').length}</Badge>
                  <Badge className="bg-red-100 text-red-700 border-0">Belum Tuntas: {nilaiList.filter(n => n.status_ketuntasan === 'Belum Tuntas').length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {nilaiList.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map((n, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm hover:bg-slate-100 transition-colors">
                      <div>
                        <span className="font-medium text-slate-700">{n.mapel}</span>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <Badge variant="outline" className="text-xs px-1.5 py-0">{n.jenis_penilaian}</Badge>
                          <Badge variant="outline" className="text-xs px-1.5 py-0">{n.semester}</Badge>
                          {n.kompetensi_bab && <span className="text-slate-400 text-xs">{n.kompetensi_bab}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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

          {/* === CATATAN TAB === */}
          <TabsContent value="catatan">
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Catatan Pelanggaran
                  </CardTitle>
                  <div className="flex gap-2 mt-1">
                    <Badge className="bg-red-100 text-red-700 border-0">Total Poin: {stats.totalPoin}</Badge>
                    <Badge className="bg-slate-100 text-slate-700 border-0">{pelanggaranList.length} catatan</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {pelanggaranList.map((p, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl text-sm hover:bg-slate-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-700">{p.uraian}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{p.tanggal} · {p.jenis_pelanggaran} · {p.kategori}</p>
                            {p.sanksi && <p className="text-xs text-red-500 mt-0.5">Sanksi: {p.sanksi}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-2">
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
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {prestasiList.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm hover:bg-slate-100 transition-colors">
                        <div>
                          <p className="font-medium text-slate-700">{p.nama_prestasi}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{p.tanggal} · {p.jenis_prestasi}</p>
                          {p.penyelenggara && <p className="text-xs text-slate-400">{p.penyelenggara}</p>}
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

          {/* === KEUANGAN TAB === */}
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
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
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

function InfoRow({ label, value, icon, fullWidth }) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
        {icon && <span className="text-slate-400">{icon}</span>}
        {value || <span className="text-slate-300 italic">Belum diisi</span>}
      </p>
    </div>
  );
}