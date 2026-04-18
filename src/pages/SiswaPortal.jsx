import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  GraduationCap, Calendar, BookOpen, AlertTriangle, Wallet,
  LogOut, Award, School, TrendingUp, CheckCircle, User,
  Bell, Megaphone, Phone, MapPin, Edit2, Save, X,
  ChevronRight, Star, Zap, Heart, Shield, Home,
  ArrowLeft, Trophy, Flame, Target
} from "lucide-react";

// ===================== BOTTOM NAV =====================
const NAV_ITEMS = [
  { key: 'dashboard', icon: Home, label: 'Beranda' },
  { key: 'absensi', icon: Calendar, label: 'Absensi' },
  { key: 'nilai', icon: BookOpen, label: 'Nilai' },
  { key: 'catatan', icon: Shield, label: 'Catatan' },
  { key: 'keuangan', icon: Wallet, label: 'Keuangan' },
];

export default function SiswaPortal() {
  const { siswaUser, siswaLogout } = useAuth();
  const siswa = siswaUser;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingProfil, setEditingProfil] = useState(false);
  const [showProfil, setShowProfil] = useState(false);
  const [profilForm, setProfilForm] = useState(null);

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

  const { data: siswaData } = useQuery({
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
      toast({ title: '✅ Profil berhasil diperbarui!' });
    },
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

  const currentSiswa = siswaData || siswa;

  const handleEditProfil = () => {
    setProfilForm({
      alamat: currentSiswa?.alamat || '',
      no_telp_ortu: currentSiswa?.no_telp_ortu || '',
      nama_ortu: currentSiswa?.nama_ortu || '',
    });
    setEditingProfil(true);
  };

  const handleSaveProfil = () => {
    if (!currentSiswa?.id) return;
    updateSiswaMutation.mutate({ id: currentSiswa.id, data: profilForm });
  };

  // === PROFIL SCREEN ===
  if (showProfil) {
    return (
      <div className="min-h-screen bg-slate-50 max-w-md mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 px-4 pt-12 pb-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-12 -translate-x-8" />
          <button onClick={() => { setShowProfil(false); setEditingProfil(false); }} className="flex items-center gap-2 text-white/80 mb-4">
            <ArrowLeft className="w-5 h-5" /> Kembali
          </button>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-black text-white border-2 border-white/30">
              {currentSiswa?.nama?.charAt(0) || 'S'}
            </div>
            <div>
              <h2 className="text-white font-bold text-xl leading-tight">{currentSiswa?.nama}</h2>
              <p className="text-white/70 text-sm">{currentSiswa?.nis}</p>
              <div className="mt-1 px-2 py-0.5 bg-white/20 rounded-full inline-block">
                <span className="text-white text-xs font-medium">Kelas {currentSiswa?.nama_kelas}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 -mt-8 pb-8 space-y-4">
          {/* Data Diri Card */}
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-800">Data Diri</span>
              {!editingProfil && (
                <button onClick={handleEditProfil} className="flex items-center gap-1 text-indigo-600 text-sm font-medium">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
            <div className="px-5 py-4 space-y-3">
              <InfoItem icon="🎓" label="Nama Lengkap" value={currentSiswa?.nama} />
              <InfoItem icon="🪪" label="NIS" value={currentSiswa?.nis} />
              <InfoItem icon="🏫" label="Kelas" value={currentSiswa?.nama_kelas} />
              <InfoItem icon="⚥" label="Jenis Kelamin" value={currentSiswa?.jenis_kelamin} />
              <InfoItem icon="🎂" label="Tanggal Lahir" value={currentSiswa?.tanggal_lahir} />
              {editingProfil ? (
                <div className="pt-2 space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 font-medium">📍 Alamat</label>
                    <textarea
                      className="w-full mt-1 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                      rows={3}
                      value={profilForm?.alamat || ''}
                      onChange={(e) => setProfilForm({...profilForm, alamat: e.target.value})}
                      placeholder="Alamat lengkap..."
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditingProfil(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-medium">
                      Batal
                    </button>
                    <button onClick={handleSaveProfil} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium" disabled={updateSiswaMutation.isPending}>
                      {updateSiswaMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              ) : (
                <InfoItem icon="📍" label="Alamat" value={currentSiswa?.alamat} />
              )}
            </div>
          </div>

          {/* Data Ortu Card */}
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-800">Orang Tua / Wali</span>
              {!editingProfil && (
                <button onClick={handleEditProfil} className="flex items-center gap-1 text-indigo-600 text-sm font-medium">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
            <div className="px-5 py-4 space-y-3">
              {editingProfil ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 font-medium">👨‍👩‍👧 Nama Orang Tua/Wali</label>
                    <input
                      className="w-full mt-1 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      value={profilForm?.nama_ortu || ''}
                      onChange={(e) => setProfilForm({...profilForm, nama_ortu: e.target.value})}
                      placeholder="Nama orang tua/wali..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium">📱 No. Telpon</label>
                    <input
                      className="w-full mt-1 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      value={profilForm?.no_telp_ortu || ''}
                      onChange={(e) => setProfilForm({...profilForm, no_telp_ortu: e.target.value})}
                      placeholder="08xx-xxxx-xxxx"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditingProfil(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-medium">
                      Batal
                    </button>
                    <button onClick={handleSaveProfil} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium">
                      {updateSiswaMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <InfoItem icon="👨‍👩‍👧" label="Nama Orang Tua/Wali" value={currentSiswa?.nama_ortu} />
                  <InfoItem icon="📱" label="No. Telpon" value={currentSiswa?.no_telp_ortu} />
                </>
              )}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={siswaLogout}
            className="w-full py-4 rounded-3xl bg-red-50 border border-red-100 text-red-600 font-semibold flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" /> Keluar dari Akun
          </button>
        </div>
      </div>
    );
  }

  // === MAIN APP ===
  return (
    <div className="min-h-screen bg-slate-100 max-w-md mx-auto relative">

      {/* ====== DASHBOARD ====== */}
      {activeTab === 'dashboard' && (
        <div className="pb-24">
          {/* Hero Header */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-5 pt-12 pb-24 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-24 translate-x-20" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-16 -translate-x-10" />
            <div className="absolute top-8 right-8 w-16 h-16 bg-yellow-400/20 rounded-full" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-white/70 text-sm mb-1">Selamat datang 👋</p>
                <h1 className="text-white font-black text-2xl leading-tight">{siswa?.nama?.split(' ')[0]}</h1>
                <p className="text-white/60 text-xs mt-1">Kelas {siswa?.nama_kelas} · NIS {siswa?.nis}</p>
              </div>
              <div className="flex items-center gap-2">
                {pengumumanList.length > 0 && (
                  <div className="relative">
                    <button className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Bell className="w-5 h-5 text-white" />
                    </button>
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">{pengumumanList.length}</span>
                  </div>
                )}
                <button onClick={() => setShowProfil(true)} className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                  <span className="text-white font-black text-base">{siswa?.nama?.charAt(0)}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid - floating over header */}
          <div className="px-4 -mt-16 mb-5">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                emoji="📅"
                label="Kehadiran"
                value={`${stats.kehadiran}%`}
                sub={`${stats.hadir} dari ${stats.total} hari`}
                color={stats.kehadiran >= 75 ? 'from-emerald-400 to-teal-500' : 'from-red-400 to-rose-500'}
              />
              <StatCard
                emoji="📊"
                label="Rata-rata Nilai"
                value={stats.rataRataNilai || '-'}
                sub={`${nilaiList.length} penilaian`}
                color={stats.rataRataNilai >= 75 ? 'from-blue-400 to-cyan-500' : 'from-orange-400 to-amber-500'}
              />
              <StatCard
                emoji="🏆"
                label="Prestasi"
                value={prestasiList.length}
                sub="pencapaian"
                color="from-yellow-400 to-orange-400"
              />
              <StatCard
                emoji="⚠️"
                label="Poin Pelanggaran"
                value={stats.totalPoin}
                sub={`${pelanggaranList.length} catatan`}
                color={stats.totalPoin === 0 ? 'from-slate-400 to-slate-500' : stats.totalPoin > 50 ? 'from-red-500 to-rose-600' : 'from-amber-400 to-orange-500'}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 mb-5">
            <p className="text-slate-700 font-bold text-sm mb-3">Menu Cepat</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'absensi', emoji: '📅', label: 'Absensi', bg: 'bg-emerald-100', text: 'text-emerald-700' },
                { key: 'nilai', emoji: '📊', label: 'Nilai', bg: 'bg-blue-100', text: 'text-blue-700' },
                { key: 'catatan', emoji: '📋', label: 'Catatan', bg: 'bg-amber-100', text: 'text-amber-700' },
                { key: 'keuangan', emoji: '💰', label: 'Keuangan', bg: 'bg-teal-100', text: 'text-teal-700' },
              ].map(item => (
                <button key={item.key} onClick={() => setActiveTab(item.key)} className={`${item.bg} rounded-2xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}>
                  <span className="text-2xl">{item.emoji}</span>
                  <span className={`text-[10px] font-semibold ${item.text}`}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pengumuman Section */}
          {pengumumanList.length > 0 && (
            <div className="px-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-700 font-bold text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-500" /> Pengumuman
                </p>
                <span className="text-xs text-slate-400">{pengumumanList.length} pesan</span>
              </div>
              <div className="space-y-2">
                {pengumumanList.map((p, idx) => (
                  <div key={idx} className={`rounded-2xl p-4 ${p.penting ? 'bg-red-50 border border-red-200' : 'bg-white shadow-sm'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${p.penting ? 'bg-red-100' : 'bg-indigo-100'}`}>
                        <span className="text-lg">{p.penting ? '📣' : '📢'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {p.penting && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">PENTING</span>}
                          <span className="text-[10px] text-slate-400">{p.tanggal}</span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm">{p.judul}</p>
                        <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{p.isi}</p>
                        <p className="text-[10px] text-slate-400 mt-1">— {p.nama_guru || 'Sekolah'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Absensi */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-700 font-bold text-sm">Absensi Terkini</p>
              <button onClick={() => setActiveTab('absensi')} className="text-xs text-indigo-600 font-medium flex items-center gap-0.5">
                Lihat semua <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {absensiList.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <span className="text-3xl block mb-2">📅</span>
                  <p className="text-sm">Belum ada data absensi</p>
                </div>
              ) : (
                absensiList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).slice(0, 5).map((a, idx) => (
                  <div key={idx} className={`flex items-center justify-between px-4 py-3 ${idx > 0 ? 'border-t border-slate-50' : ''}`}>
                    <span className="text-sm text-slate-600 font-medium">{a.tanggal}</span>
                    <AbsensiBadge status={a.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== ABSENSI ====== */}
      {activeTab === 'absensi' && (
        <div className="pb-24">
          <PageHeader title="Absensi" emoji="📅" gradient="from-emerald-500 to-teal-500" />
          <div className="px-4 -mt-6">
            {/* Summary pills */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {[
                { label: 'Hadir', val: stats.hadir, color: 'bg-emerald-100 text-emerald-700' },
                { label: 'Sakit', val: stats.sakit, color: 'bg-blue-100 text-blue-700' },
                { label: 'Izin', val: stats.izin, color: 'bg-amber-100 text-amber-700' },
                { label: 'Alfa', val: stats.alfa, color: 'bg-red-100 text-red-700' },
              ].map(item => (
                <div key={item.label} className={`${item.color} rounded-2xl px-4 py-2 shrink-0`}>
                  <p className="text-xs font-medium opacity-70">{item.label}</p>
                  <p className="text-lg font-black">{item.val}</p>
                </div>
              ))}
              <div className={`${stats.kehadiran >= 75 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'} rounded-2xl px-4 py-2 shrink-0`}>
                <p className="text-xs font-medium opacity-70">Kehadiran</p>
                <p className="text-lg font-black">{stats.kehadiran}%</p>
              </div>
            </div>
            <div className="space-y-2">
              {absensiList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).map((a, idx) => (
                <div key={idx} className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{a.tanggal}</p>
                    {a.keterangan && <p className="text-slate-400 text-xs mt-0.5">{a.keterangan}</p>}
                  </div>
                  <AbsensiBadge status={a.status} />
                </div>
              ))}
              {absensiList.length === 0 && <EmptyState emoji="📅" text="Belum ada data absensi" />}
            </div>
          </div>
        </div>
      )}

      {/* ====== NILAI ====== */}
      {activeTab === 'nilai' && (
        <div className="pb-24">
          <PageHeader title="Nilai" emoji="📊" gradient="from-blue-500 to-cyan-500" />
          <div className="px-4 -mt-6">
            {/* Summary */}
            <div className="bg-white rounded-3xl shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Rata-rata Nilai</p>
                  <p className={`text-4xl font-black ${stats.rataRataNilai >= 75 ? 'text-blue-600' : 'text-red-500'}`}>{stats.rataRataNilai || '-'}</p>
                </div>
                <div className="w-20 h-20 rounded-full border-8 border-blue-100 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-bold text-emerald-600">{nilaiList.filter(n => n.status_ketuntasan === 'Tuntas').length}</p>
                    <p className="text-[9px] text-slate-400">Tuntas</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <div className="flex-1 bg-emerald-50 rounded-2xl px-3 py-2 text-center">
                  <p className="text-lg font-black text-emerald-600">{nilaiList.filter(n => n.status_ketuntasan === 'Tuntas').length}</p>
                  <p className="text-[10px] text-emerald-500">Tuntas</p>
                </div>
                <div className="flex-1 bg-red-50 rounded-2xl px-3 py-2 text-center">
                  <p className="text-lg font-black text-red-500">{nilaiList.filter(n => n.status_ketuntasan === 'Belum Tuntas').length}</p>
                  <p className="text-[10px] text-red-400">Belum Tuntas</p>
                </div>
                <div className="flex-1 bg-blue-50 rounded-2xl px-3 py-2 text-center">
                  <p className="text-lg font-black text-blue-600">{nilaiList.length}</p>
                  <p className="text-[10px] text-blue-400">Total</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {nilaiList.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map((n, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center">
                    <div className={`w-16 shrink-0 flex items-center justify-center py-4 ${n.nilai >= (n.kkm || 75) ? 'bg-emerald-500' : 'bg-red-500'}`}>
                      <span className="text-white font-black text-xl">{n.nilai}</span>
                    </div>
                    <div className="flex-1 px-4 py-3">
                      <p className="font-bold text-slate-800 text-sm">{n.mapel}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{n.jenis_penilaian}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{n.semester}</span>
                        {n.kompetensi_bab && <span className="text-[10px] text-slate-400">{n.kompetensi_bab}</span>}
                      </div>
                    </div>
                    <div className="pr-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${n.nilai >= (n.kkm || 75) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {n.nilai >= (n.kkm || 75) ? '✓ Tuntas' : '✗ Belum'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {nilaiList.length === 0 && <EmptyState emoji="📊" text="Belum ada data nilai" />}
            </div>
          </div>
        </div>
      )}

      {/* ====== CATATAN ====== */}
      {activeTab === 'catatan' && (
        <div className="pb-24">
          <PageHeader title="Catatan" emoji="📋" gradient="from-amber-500 to-orange-500" />
          <div className="px-4 -mt-6 space-y-4">
            {/* Pelanggaran */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-700 font-bold text-sm">⚠️ Pelanggaran</p>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${stats.totalPoin === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {stats.totalPoin} poin
                </span>
              </div>
              {pelanggaranList.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center">
                  <span className="text-4xl block mb-2">✅</span>
                  <p className="font-bold text-emerald-700">Hebat! Tidak ada pelanggaran</p>
                  <p className="text-emerald-500 text-xs mt-1">Tetap pertahankan ya!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pelanggaranList.map((p, idx) => (
                    <div key={idx} className="bg-white rounded-2xl shadow-sm p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 text-sm">{p.uraian}</p>
                          <p className="text-slate-400 text-xs mt-1">{p.tanggal} · {p.jenis_pelanggaran}</p>
                          {p.sanksi && <p className="text-red-500 text-xs mt-1">⚡ {p.sanksi}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-red-600 font-black text-lg">{p.poin}</span>
                          <span className="text-[9px] text-red-400">poin</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prestasi */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-700 font-bold text-sm">🏆 Prestasi</p>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">{prestasiList.length} pencapaian</span>
              </div>
              {prestasiList.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-sm p-6 text-center">
                  <span className="text-4xl block mb-2">🏅</span>
                  <p className="text-slate-500 text-sm">Belum ada prestasi tercatat</p>
                  <p className="text-slate-400 text-xs mt-1">Terus semangat berprestasi!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {prestasiList.map((p, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-2xl flex items-center justify-center text-xl shrink-0">🏆</div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 text-sm">{p.nama_prestasi}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{p.tanggal} · {p.jenis_prestasi}</p>
                          {p.penyelenggara && <p className="text-slate-400 text-xs">{p.penyelenggara}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">{p.kategori}</span>
                          <span className="text-[10px] text-slate-400">{p.tingkat}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== KEUANGAN ====== */}
      {activeTab === 'keuangan' && (
        <div className="pb-24">
          <PageHeader title="Keuangan" emoji="💰" gradient="from-teal-500 to-emerald-500" />
          <div className="px-4 -mt-6">
            {/* Summary Card */}
            <div className="bg-white rounded-3xl shadow-sm p-5 mb-4">
              <p className="text-slate-400 text-xs mb-1">Total Pembayaran</p>
              <p className="text-3xl font-black text-teal-600">{formatRupiah(stats.totalPembayaran)}</p>
              <div className="flex gap-3 mt-4">
                <div className="flex-1 bg-slate-50 rounded-2xl px-3 py-2 text-center">
                  <p className="text-lg font-black text-slate-700">{keuanganList.length}</p>
                  <p className="text-[10px] text-slate-400">Transaksi</p>
                </div>
                <div className="flex-1 bg-emerald-50 rounded-2xl px-3 py-2 text-center">
                  <p className="text-lg font-black text-emerald-600">{keuanganList.filter(k => k.status_bayar === 'Lunas').length}</p>
                  <p className="text-[10px] text-emerald-500">Lunas</p>
                </div>
                <div className="flex-1 bg-amber-50 rounded-2xl px-3 py-2 text-center">
                  <p className="text-lg font-black text-amber-600">{keuanganList.filter(k => k.status_bayar !== 'Lunas').length}</p>
                  <p className="text-[10px] text-amber-500">Pending</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {keuanganList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).map((k, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${k.jenis === 'Pemasukan' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {k.jenis === 'Pemasukan' ? '💳' : '📤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{k.uraian || k.kategori}</p>
                    <p className="text-slate-400 text-xs">{k.tanggal}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-sm ${k.jenis === 'Pemasukan' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {k.jenis === 'Pengeluaran' ? '-' : '+'}{formatRupiah(k.jumlah)}
                    </p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${k.status_bayar === 'Lunas' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {k.status_bayar}
                    </span>
                  </div>
                </div>
              ))}
              {keuanganList.length === 0 && <EmptyState emoji="💰" text="Belum ada riwayat keuangan" />}
            </div>
          </div>
        </div>
      )}

      {/* ====== BOTTOM NAVIGATION ====== */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 shadow-2xl px-2 py-2 z-50">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all ${isActive ? 'bg-indigo-50' : ''}`}
              >
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===================== HELPERS =====================
function StatCard({ emoji, label, value, sub, color }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-3xl p-4 text-white shadow-lg`}>
      <span className="text-2xl block mb-1">{emoji}</span>
      <p className="text-3xl font-black leading-none">{value}</p>
      <p className="text-xs font-semibold opacity-80 mt-1">{label}</p>
      <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>
    </div>
  );
}

function PageHeader({ title, emoji, gradient }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} px-5 pt-12 pb-14 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
      <h2 className="text-white font-black text-2xl flex items-center gap-2 relative">
        <span>{emoji}</span> {title}
      </h2>
    </div>
  );
}

function AbsensiBadge({ status }) {
  const map = {
    'Hadir': 'bg-emerald-100 text-emerald-700',
    'Sakit': 'bg-blue-100 text-blue-700',
    'Izin': 'bg-amber-100 text-amber-700',
    'Alfa': 'bg-red-100 text-red-700',
    'Terlambat': 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

function EmptyState({ emoji, text }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm py-12 text-center">
      <span className="text-5xl block mb-3">{emoji}</span>
      <p className="text-slate-400 text-sm">{text}</p>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base w-6 text-center shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-[11px] text-slate-400 font-medium">{label}</p>
        <p className="text-slate-800 text-sm font-semibold">{value || <span className="text-slate-300 font-normal italic">Belum diisi</span>}</p>
      </div>
    </div>
  );
}