import React, { useEffect, useMemo, useState } from 'react';
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
  ArrowLeft, Trophy, Flame, Target, ChevronDown
} from "lucide-react";
import CatatanSection from '@/components/siswaportal/CatatanSection';
import KeuanganSection from '@/components/siswaportal/KeuanganSection';
import HapalanProgressCard from '@/components/siswaportal/HapalanProgressCard';
import NilaiSection from '@/components/siswaportal/NilaiSection';
import { getFotoAktif } from '@/lib/fotoSiswa';

// ===== Date Helpers (Indonesian) =====
const HARI_NAMA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_NAMA = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const formatDateDMY = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const formatDateWithDay = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${HARI_NAMA[d.getDay()]}, ${formatDateDMY(dateStr)}`;
};

const getCurrentWeekDays = () => {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
};

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
  const [phoneForm, setPhoneForm] = useState({ no_telp_ortu: '', no_ayah: '', no_ibu: '', no_wali: '' });
  const [savingPhone, setSavingPhone] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState(null);

  const { data: absensiList = [] } = useQuery({
    queryKey: ['siswa-absensi', siswa?.id],
    queryFn: () => base44.entities.Absensi.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
  });

  // Group absensi by month for accordion view (harus setelah deklarasi absensiList)
  const absensiByMonth = useMemo(() => {
    const map = new Map();
    absensiList.forEach(a => {
      const d = new Date(a.tanggal);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });
    map.forEach(list => list.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)));
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [absensiList]);

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

  const { data: pelanggaranImprovementList = [] } = useQuery({
    queryKey: ['siswa-pelanggaran-improvement', siswa?.id],
    queryFn: () => base44.entities.PelanggaranImprovement.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
  });

  const { data: improvementList = [] } = useQuery({
    queryKey: ['siswa-improvement', siswa?.id],
    queryFn: () => base44.entities.Improvement.filter({ siswa_id: siswa.id }),
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

  const { data: jadwalPelajaranList = [] } = useQuery({
    queryKey: ['jadwal-pelajaran', siswa?.kelas_id],
    queryFn: () => base44.entities.JadwalPelajaran.filter({ kelas_id: siswa.kelas_id }),
    enabled: !!siswa?.kelas_id,
  });
  const { data: hapalanItemList = [] } = useQuery({
    queryKey: ['hapalan-item-portal'],
    queryFn: () => base44.entities.HapalanItem.list(),
    enabled: !!siswa?.id,
  });
  const { data: hapalanSiswaList = [] } = useQuery({
    queryKey: ['hapalan-siswa-portal', siswa?.id],
    queryFn: () => base44.entities.HapalanSiswa.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
  });
  const { data: kalenderList = [] } = useQuery({
    queryKey: ['kalender-akademik-portal'],
    queryFn: () => base44.entities.KalenderAkademik.list(),
    enabled: !!siswa?.id,
  });

  const hapalanProgress = useMemo(() => {
    const tingkat = siswa?.nama_kelas?.charAt(0);
    if (!tingkat) return { total: 0, selesai: 0, persen: 0, items: [] };
    const items = hapalanItemList.filter(h => h.tingkat === tingkat).sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
    const itemsWithStatus = items.map(item => {
      const hs = hapalanSiswaList.find(h => h.hapalan_item_id === item.id);
      return { ...item, sudah_hapal: hs?.sudah_hapal || false, tanggal_setor: hs?.tanggal_setor };
    });
    const selesai = itemsWithStatus.filter(i => i.sudah_hapal).length;
    return { total: items.length, selesai, persen: items.length > 0 ? Math.round((selesai / items.length) * 100) : 0, items: itemsWithStatus };
  }, [hapalanItemList, hapalanSiswaList, siswa?.nama_kelas]);

  // Cek apakah tanggal tertentu adalah hari libur sekolah (Senin-Jumat)
  const isDateLibur = (dateObj) => {
    const dow = dateObj.getDay();
    if (dow === 0 || dow === 6) return null;
    return kalenderList.find(k => {
      if (k.kategori !== 'Hari Libur Nasional' && k.kategori !== 'Libur Sekolah') return false;
      const mulai = new Date(k.tanggal_mulai);
      const selesai = k.tanggal_selesai ? new Date(k.tanggal_selesai) : mulai;
      return dateObj >= mulai && dateObj <= selesai;
    }) || null;
  };

  const [selectedHari, setSelectedHari] = useState(() => {
    const today = new Date().getDay();
    return HARI_NAMA[today === 0 ? 1 : today]; // Senin-Sabtu
  });

  const { data: siswaData } = useQuery({
    queryKey: ['siswa-profil', siswa?.id],
    queryFn: () => base44.entities.Siswa.filter({ id: siswa.id }),
    enabled: !!siswa?.id,
    select: (data) => data[0],
  });

  // Home Visit — untuk integrasi dua arah titik koordinat rumah
  const { data: homeVisitList = [] } = useQuery({
    queryKey: ['siswa-homevisit-portal', siswa?.id],
    queryFn: () => base44.entities.HomeVisit.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
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
    const libur = absensiList.filter(a => a.status === 'Libur').length;
    const sakit = absensiList.filter(a => a.status === 'Sakit').length;
    const izin = absensiList.filter(a => a.status === 'Izin').length;
    const alfa = absensiList.filter(a => a.status === 'Alfa').length;
    const total = absensiList.length;
    const kehadiran = total > 0 ? Math.round(((hadir + libur) / total) * 100) : 0;
    const rataRataNilai = nilaiList.length > 0
      ? Math.round(nilaiList.reduce((s, n) => s + (n.nilai || 0), 0) / nilaiList.length) : 0;
    const totalPoin = pelanggaranList.reduce((s, p) => s + (p.poin || 0), 0);
    const totalPoinImprovement = pelanggaranImprovementList.reduce((s, p) => s + (p.poin || 0), 0);
    const totalPengurangan = improvementList.filter(i => i.status === 'Aktif').reduce((s, i) => s + (i.poin_pengurangan || 0), 0);
    const poinBersih = totalPoin + totalPoinImprovement - totalPengurangan;
    return { hadir, libur, sakit, izin, alfa, total, kehadiran, rataRataNilai, totalPoin, totalPoinImprovement, totalPengurangan, poinBersih };
  }, [absensiList, nilaiList, keuanganList, pelanggaranList, pelanggaranImprovementList, improvementList]);

  const formatRupiah = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

  const currentSiswa = siswaData || siswa;

  // Koordinat rumah — terintegrasi dua arah dengan Home Visit (data terbaru menang)
  const latestHomeVisit = useMemo(
    () => [...homeVisitList].sort((a, b) => new Date(b.tanggal_homevisit) - new Date(a.tanggal_homevisit))[0] || null,
    [homeVisitList]
  );
  const koordinatTampil = currentSiswa?.koordinat || latestHomeVisit?.koordinat_rumah || '';

  // Update dari Profil -> sinkron ke record Home Visit terbaru
  const syncKoordinatKeHomeVisit = (coord) => {
    if (!latestHomeVisit?.id || !coord) return;
    base44.entities.HomeVisit.update(latestHomeVisit.id, { koordinat_rumah: coord })
      .then(() => queryClient.invalidateQueries({ queryKey: ['siswa-homevisit-portal'] }))
      .catch(() => {});
  };

  // Home Visit sudah terisi -> otomatis isi koordinat di Data Profil siswa
  useEffect(() => {
    if (currentSiswa?.id && !currentSiswa?.koordinat && latestHomeVisit?.koordinat_rumah) {
      base44.entities.Siswa.update(currentSiswa.id, { koordinat: latestHomeVisit.koordinat_rumah })
        .then(() => queryClient.invalidateQueries({ queryKey: ['siswa-profil'] }))
        .catch(() => {});
    }
  }, [currentSiswa?.id, currentSiswa?.koordinat, latestHomeVisit?.koordinat_rumah]);

  // Selalu sinkron form nomor telepon dengan data Siswa terbaru
  useEffect(() => {
    if (currentSiswa) {
      setPhoneForm({
        no_telp_ortu: currentSiswa.no_telp_ortu || '',
        no_ayah: currentSiswa.kontak_list?.find(k => k.hubungan === 'Ayah')?.no_telp || '',
        no_ibu: currentSiswa.kontak_list?.find(k => k.hubungan === 'Ibu')?.no_telp || '',
        no_wali: currentSiswa.kontak_list?.find(k => k.hubungan === 'Wali')?.no_telp || '',
      });
    }
  }, [currentSiswa?.id, currentSiswa?.no_telp_ortu, currentSiswa?.kontak_list]);

  // Simpan nomor telepon -> update langsung ke Data Siswa (no_telp_ortu + kontak_list)
  const handleSavePhone = () => {
    if (!currentSiswa?.id) return;
    const kontak_list = [];
    if (phoneForm.no_ayah) kontak_list.push({ no_telp: phoneForm.no_ayah, hubungan: 'Ayah' });
    if (phoneForm.no_ibu) kontak_list.push({ no_telp: phoneForm.no_ibu, hubungan: 'Ibu' });
    if (phoneForm.no_wali) kontak_list.push({ no_telp: phoneForm.no_wali, hubungan: 'Wali' });
    setSavingPhone(true);
    base44.entities.Siswa.update(currentSiswa.id, { no_telp_ortu: phoneForm.no_telp_ortu, kontak_list })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['siswa-profil'] });
        toast({ title: '✅ Nomor telepon tersimpan & terintegrasi ke Data Siswa' });
      })
      .catch(() => toast({ title: 'Gagal menyimpan nomor telepon', variant: 'destructive' }))
      .finally(() => setSavingPhone(false));
  };

  const handleEditProfil = () => {
    setProfilForm({
      alamat: currentSiswa?.alamat || '',
      koordinat: koordinatTampil,
      nama_ayah_kandung: currentSiswa?.nama_ayah_kandung || '',
      nama_ibu_kandung: currentSiswa?.nama_ibu_kandung || '',
      nama_wali: currentSiswa?.nama_wali || '',
    });
    setEditingProfil(true);
  };

  const handleSaveProfil = () => {
    if (!currentSiswa?.id) return;
    if (profilForm.koordinat && profilForm.koordinat !== currentSiswa?.koordinat) syncKoordinatKeHomeVisit(profilForm.koordinat);
    updateSiswaMutation.mutate({ id: currentSiswa.id, data: {
      alamat: profilForm.alamat,
      koordinat: profilForm.koordinat,
      nama_ayah_kandung: profilForm.nama_ayah_kandung,
      nama_ibu_kandung: profilForm.nama_ibu_kandung,
      nama_wali: profilForm.nama_wali,
    }});
  };

  const handleSetCoordinate = () => {
    if (!navigator.geolocation) { toast({ title: 'GPS tidak tersedia', variant: 'destructive' }); return; }
    toast({ title: '📍 Mendapatkan lokasi...' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coord = `${position.coords.latitude},${position.coords.longitude}`;
        syncKoordinatKeHomeVisit(coord);
        updateSiswaMutation.mutate({ id: currentSiswa.id, data: { koordinat: coord } });
        if (profilForm) setProfilForm(prev => ({ ...prev, koordinat: coord }));
      },
      () => toast({ title: 'Gagal mendapatkan lokasi', description: 'Pastikan GPS aktif', variant: 'destructive' })
    );
  };

  // === PROFIL SCREEN ===
  if (showProfil) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 px-4 pt-14 pb-14 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-12 -translate-x-8" />
          <button onClick={() => { setShowProfil(false); setEditingProfil(false); }} className="flex items-center gap-2 text-white/80 mb-4">
            <ArrowLeft className="w-5 h-5" /> Kembali
          </button>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-black text-white border-2 border-white/30 overflow-hidden">
              {getFotoAktif(currentSiswa)
                ? <img src={getFotoAktif(currentSiswa)} alt="Foto Profil" className="w-full h-full object-cover" />
                : (currentSiswa?.nama?.charAt(0) || 'S')}
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

        <div className="px-4 -mt-10 pb-8 space-y-4">
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
                  <div>
                    <label className="text-xs text-slate-500 font-medium">🗺️ Titik Koordinat Rumah</label>
                    <div className="flex gap-2 mt-1">
                      <input className="flex-1 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm" value={profilForm?.koordinat || ''} readOnly placeholder="Klik GPS untuk dapat koordinat" />
                      <button type="button" onClick={handleSetCoordinate} className="px-3 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium flex items-center gap-1 shrink-0">
                        <MapPin className="w-4 h-4" /> GPS
                      </button>
                    </div>
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
                <>
                  <InfoItem icon="📍" label="Alamat" value={currentSiswa?.alamat} />
                  <InfoItem icon="🗺️" label="Koordinat Rumah" value={koordinatTampil} />
                  {koordinatTampil && (
                    <a href={`https://maps.google.com/?q=${koordinatTampil}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-xs flex items-center gap-1 ml-9 mt-0.5">
                      <MapPin className="w-3 h-3" /> Lihat di Maps
                    </a>
                  )}
                  <button onClick={handleSetCoordinate} className="ml-9 mt-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1 w-fit">
                    <MapPin className="w-3 h-3" /> {koordinatTampil ? 'Update Koordinat' : 'Tambah Koordinat'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Kontak Telepon Card — selalu bisa diedit, terintegrasi ke Data Siswa */}
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <span className="font-bold text-slate-800 flex items-center gap-2"><Phone className="w-4 h-4 text-indigo-500" /> Kontak Telepon</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Nomor ini terintegrasi dengan Data Siswa. Perubahan langsung tersimpan ke data siswa.</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs text-slate-500 font-medium">📞 Nomor Telepon Utama (Orang Tua/Wali)</label>
                <input className="w-full mt-1 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={phoneForm.no_telp_ortu || ''} onChange={(e) => setPhoneForm({...phoneForm, no_telp_ortu: e.target.value})} placeholder="Contoh: 0812xxxxxxx" inputMode="tel" />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">👨 No. Telp Ayah</label>
                <input className="w-full mt-1 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={phoneForm.no_ayah || ''} onChange={(e) => setPhoneForm({...phoneForm, no_ayah: e.target.value})} placeholder="0812xxxxxxx" inputMode="tel" />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">👩 No. Telp Ibu</label>
                <input className="w-full mt-1 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={phoneForm.no_ibu || ''} onChange={(e) => setPhoneForm({...phoneForm, no_ibu: e.target.value})} placeholder="0812xxxxxxx" inputMode="tel" />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">🧑 No. Telp Wali</label>
                <input className="w-full mt-1 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={phoneForm.no_wali || ''} onChange={(e) => setPhoneForm({...phoneForm, no_wali: e.target.value})} placeholder="0812xxxxxxx" inputMode="tel" />
              </div>
              <button onClick={handleSavePhone} disabled={savingPhone} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                <Save className="w-4 h-4" /> {savingPhone ? 'Menyimpan...' : 'Simpan Nomor Telepon'}
              </button>
            </div>
          </div>

          {/* Data Keluarga Card */}
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-800">Data Keluarga</span>
              {!editingProfil && (
                <button onClick={handleEditProfil} className="flex items-center gap-1 text-indigo-600 text-sm font-medium">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
            <div className="px-5 py-4 space-y-3">
              {editingProfil ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600">👨 Ayah</p>
                    <input className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={profilForm?.nama_ayah_kandung || ''} onChange={(e) => setProfilForm({...profilForm, nama_ayah_kandung: e.target.value})} placeholder="Nama Ayah" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600">👩 Ibu</p>
                    <input className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={profilForm?.nama_ibu_kandung || ''} onChange={(e) => setProfilForm({...profilForm, nama_ibu_kandung: e.target.value})} placeholder="Nama Ibu" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600">🧑 Wali (Jika Ada)</p>
                    <input className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" value={profilForm?.nama_wali || ''} onChange={(e) => setProfilForm({...profilForm, nama_wali: e.target.value})} placeholder="Nama Wali" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditingProfil(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-medium">Batal</button>
                    <button onClick={handleSaveProfil} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium">{updateSiswaMutation.isPending ? 'Menyimpan...' : 'Simpan'}</button>
                  </div>
                </div>
              ) : (
                <>
                  <InfoItem icon="👨" label="Nama Ayah" value={currentSiswa?.nama_ayah_kandung} />
                  <InfoItem icon="👩" label="Nama Ibu" value={currentSiswa?.nama_ibu_kandung} />
                  <InfoItem icon="🧑" label="Nama Wali" value={currentSiswa?.nama_wali} />
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
      </div>
    );
  }

  // === MAIN APP ===
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center">
    <div className="w-full max-w-lg relative">

      {/* ====== DASHBOARD ====== */}
      {activeTab === 'dashboard' && (
        <div className="pb-24">
          {/* Hero Header — compact */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 pt-12 pb-5 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full" />
            <div className="absolute bottom-0 left-1/2 w-24 h-24 bg-white/5 rounded-full translate-y-8" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-indigo-200 text-xs font-medium mb-0.5">Selamat datang 👋</p>
                <h1 className="text-white font-black text-xl leading-tight">{siswa?.nama?.split(' ').slice(0, 2).join(' ')}</h1>
                <p className="text-indigo-300 text-[11px] mt-0.5">Kelas {siswa?.nama_kelas} · {siswa?.nis}</p>
              </div>
              <div className="flex items-center gap-2">
                {pengumumanList.length > 0 && (
                  <div className="relative">
                    <button className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                      <Bell className="w-4 h-4 text-white" />
                    </button>
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">{pengumumanList.length}</span>
                  </div>
                )}
                <button onClick={() => setShowProfil(true)} className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
                  <span className="text-white font-black text-sm">{siswa?.nama?.charAt(0)}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid — 4 compact cards */}
          <div className="px-4 mt-4 mb-4">
            <div className="grid grid-cols-4 gap-2">
              <SmallStatCard
                emoji="📅"
                label="Hadir"
                value={`${stats.kehadiran}%`}
                bg={stats.kehadiran >= 75 ? 'bg-emerald-500' : 'bg-red-500'}
              />
              <SmallStatCard
                emoji="📊"
                label="Nilai"
                value={stats.rataRataNilai || '-'}
                bg={stats.rataRataNilai >= 75 ? 'bg-blue-500' : 'bg-orange-500'}
              />
              <SmallStatCard
                emoji="🏆"
                label="Prestasi"
                value={prestasiList.length}
                bg="bg-amber-500"
              />
              <SmallStatCard
                emoji="⚠️"
                label="Poin"
                value={stats.poinBersih}
                bg={stats.poinBersih === 0 ? 'bg-slate-400' : stats.poinBersih > 50 ? 'bg-red-500' : 'bg-orange-400'}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 mb-4">
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'absensi', emoji: '📅', label: 'Absensi', bg: 'bg-emerald-50 border border-emerald-100', text: 'text-emerald-700' },
                { key: 'nilai', emoji: '📊', label: 'Nilai', bg: 'bg-blue-50 border border-blue-100', text: 'text-blue-700' },
                { key: 'catatan', emoji: '📋', label: 'Catatan', bg: 'bg-amber-50 border border-amber-100', text: 'text-amber-700' },
                { key: 'keuangan', emoji: '💰', label: 'Keuangan', bg: 'bg-teal-50 border border-teal-100', text: 'text-teal-700' },
              ].map(item => (
                <button key={item.key} onClick={() => setActiveTab(item.key)} className={`${item.bg} rounded-2xl py-3 px-1 flex flex-col items-center gap-1 active:scale-95 transition-transform`}>
                  <span className="text-xl">{item.emoji}</span>
                  <span className={`text-[10px] font-semibold ${item.text}`}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Progres Hapalan */}
          <HapalanProgressCard hapalanProgress={hapalanProgress} />

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

          {/* Absensi Minggu Ini (Senin-Jumat) */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-700 font-bold text-sm">Absensi Minggu Ini</p>
              <button onClick={() => setActiveTab('absensi')} className="text-xs text-indigo-600 font-medium flex items-center gap-0.5">
                Lihat semua <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {(() => {
                const weekDays = getCurrentWeekDays();
                const todayStr = formatDateDMY(new Date());
                return weekDays.map((d, idx) => {
                  const dStr = formatDateDMY(d);
                  const record = absensiList.find(a => formatDateDMY(a.tanggal) === dStr);
                  const libur = isDateLibur(d);
                  const isToday = dStr === todayStr;
                  const isFuture = d > new Date() && !isToday;
                  return (
                    <div key={idx} className={`flex items-center justify-between px-4 py-3 ${idx > 0 ? 'border-t border-slate-50' : ''} ${isToday ? 'bg-indigo-50/50' : ''} ${libur ? 'bg-indigo-50/30' : ''}`}>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm text-slate-700 font-semibold flex items-center gap-1.5">
                          {HARI_NAMA[d.getDay()]}
                          {isToday && <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-bold">HARI INI</span>}
                          {libur && <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">LIBUR</span>}
                        </span>
                        <span className="text-xs text-slate-400">{dStr}</span>
                        {libur && <span className="text-[10px] text-indigo-500 truncate max-w-[140px]">{libur.judul}</span>}
                      </div>
                      {libur ? (
                        <AbsensiBadge status="Libur" />
                      ) : record ? (
                        <AbsensiBadge status={record.status} />
                      ) : isFuture ? (
                        <span className="text-xs text-slate-300 font-medium">—</span>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium">Belum tercatat</span>
                      )}
                    </div>
                  );
                });
              })()}
              {absensiList.length === 0 && (
                <div className="py-6 text-center text-slate-400">
                  <span className="text-3xl block mb-2">📅</span>
                  <p className="text-sm">Belum ada data absensi</p>
                </div>
              )}
            </div>
          </div>

          {/* Jadwal Pelajaran */}
          <div className="px-4 mt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-700 font-bold text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" /> Jadwal Pelajaran
              </p>
            </div>
            {/* Day Picker */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(hari => (
                <button
                  key={hari}
                  onClick={() => setSelectedHari(hari)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                    selectedHari === hari
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {hari}
                </button>
              ))}
            </div>
            {/* Schedule for selected day + next day */}
            {(() => {
              const hariIdx = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].indexOf(selectedHari);
              const nextHari = hariIdx >= 0 && hariIdx < 5 ? ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][hariIdx + 1] : null;
              const daySchedule = jadwalPelajaranList.filter(j => j.hari === selectedHari).sort((a, b) => (a.jam_ke || 0) - (b.jam_ke || 0));
              const nextSchedule = nextHari ? jadwalPelajaranList.filter(j => j.hari === nextHari).sort((a, b) => (a.jam_ke || 0) - (b.jam_ke || 0)) : [];
              const renderSchedule = (label, schedule, isPrimary) => (
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold mb-2 ${isPrimary ? 'text-indigo-600' : 'text-slate-400'}`}>{label}</p>
                  {schedule.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      {schedule.map((j, idx) => (
                        <div key={idx} className={`flex items-center gap-3 px-3 py-2.5 ${idx > 0 ? 'border-t border-slate-50' : ''}`}>
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[9px] text-indigo-400 font-bold leading-none">JAM</span>
                            <span className="text-sm font-black text-indigo-700 leading-none">{j.jam_ke || '-'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{j.mapel}</p>
                            <p className="text-[10px] text-slate-400">{j.jam_mulai} - {j.jam_selesai}{j.nama_guru ? ` · ${j.nama_guru}` : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm py-6 text-center">
                      <span className="text-2xl block mb-1">📭</span>
                      <p className="text-xs text-slate-400">Tidak ada jadwal</p>
                    </div>
                  )}
                </div>
              );
              return (
                <div className="flex flex-col sm:flex-row gap-3">
                  {renderSchedule(`Hari Ini · ${selectedHari}`, daySchedule, true)}
                  {nextHari && renderSchedule(`Besok · ${nextHari}`, nextSchedule, false)}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ====== ABSENSI ====== */}
      {activeTab === 'absensi' && (
        <div className="pb-24">
          <PageHeader title="Absensi" emoji="📅" gradient="from-emerald-500 to-teal-500" />
          <div className="px-4 mt-4">
            {/* Total Tahun Ajaran Aktif */}
            <p className="text-xs text-slate-400 font-medium mb-2 px-1">Total Tahun Ajaran Aktif</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[
                { label: 'Hadir', val: stats.hadir, color: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
                { label: 'Sakit', val: stats.sakit, color: 'bg-blue-50 text-blue-700 border border-blue-100' },
                { label: 'Izin', val: stats.izin, color: 'bg-amber-50 text-amber-700 border border-amber-100' },
                { label: 'Alfa', val: stats.alfa, color: 'bg-red-50 text-red-700 border border-red-100' },
              ].map(item => (
                <div key={item.label} className={`${item.color} rounded-2xl px-2 py-2.5 text-center`}>
                  <p className="text-base font-black leading-none">{item.val}</p>
                  <p className="text-[10px] font-semibold opacity-70 mt-1">{item.label}</p>
                </div>
              ))}
              <div className={`${stats.kehadiran >= 75 ? 'bg-emerald-500' : 'bg-red-500'} text-white rounded-2xl px-2 py-2.5 text-center`}>
                <p className="text-base font-black leading-none">{stats.kehadiran}%</p>
                <p className="text-[10px] font-semibold opacity-80 mt-1">Hadir</p>
              </div>
            </div>

            {/* Rekap per Bulan (Accordion) */}
            <p className="text-xs text-slate-400 font-medium mb-2 px-1">Rekap per Bulan</p>
            {absensiByMonth.length === 0 ? (
              <EmptyState emoji="📅" text="Belum ada data absensi" />
            ) : (
              <div className="space-y-2">
                {absensiByMonth.map(([monthKey, records]) => {
                  const [year, monthIdx] = monthKey.split('-');
                  const monthName = BULAN_NAMA[parseInt(monthIdx)];
                  const hadir = records.filter(r => r.status === 'Hadir').length;
                  const total = records.length;
                  const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;
                  const isExpanded = expandedMonth === monthKey;
                  return (
                    <div key={monthKey} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedMonth(isExpanded ? null : monthKey)}
                        className="w-full flex items-center justify-between px-4 py-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[9px] text-emerald-500 font-bold leading-none uppercase">{monthName.slice(0, 3)}</span>
                            <span className="text-sm font-black text-emerald-700 leading-none mt-0.5">{year}</span>
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-800 text-sm">{monthName} {year}</p>
                            <p className="text-xs text-slate-400">{total} catatan · {hadir} hadir</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pct >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {pct}%
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-slate-100">
                          {records.map((a, idx) => (
                            <div key={idx} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-b-0">
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{formatDateWithDay(a.tanggal)}</p>
                                {a.keterangan && <p className="text-slate-400 text-xs mt-0.5">{a.keterangan}</p>}
                              </div>
                              <AbsensiBadge status={a.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== NILAI ====== */}
      {activeTab === 'nilai' && (
        <NilaiSection siswa={currentSiswa} nilaiList={nilaiList} />
      )}

      {/* ====== CATATAN ====== */}
      {activeTab === 'catatan' && (
        <CatatanSection siswa={currentSiswa} pelanggaranList={pelanggaranList} pelanggaranImprovementList={pelanggaranImprovementList} improvementList={improvementList} prestasiList={prestasiList} absensiList={absensiList} />
      )}

      {/* ====== KEUANGAN ====== */}
      {activeTab === 'keuangan' && (
        <KeuanganSection siswa={currentSiswa} keuanganList={keuanganList} />
      )}

      {/* ====== BOTTOM NAVIGATION ====== */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center z-50">
      <div className="w-full max-w-lg bg-white border-t border-slate-100 shadow-2xl px-2 py-2">
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
    </div>
    </div>
  );
}

// ===================== HELPERS =====================
function SmallStatCard({ emoji, label, value, bg }) {
  return (
    <div className={`${bg} rounded-2xl p-2.5 text-white text-center shadow-md`}>
      <span className="text-lg block leading-none mb-1">{emoji}</span>
      <p className="text-base font-black leading-none">{value}</p>
      <p className="text-[9px] font-semibold opacity-80 mt-0.5 truncate">{label}</p>
    </div>
  );
}

function PageHeader({ title, emoji, gradient }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} px-5 pt-10 pb-10 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
      <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/10 rounded-full" />
      <h2 className="text-white font-black text-2xl flex items-center gap-3 relative">
        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl backdrop-blur-sm border border-white/30">
          {emoji}
        </div>
        {title}
      </h2>
    </div>
  );
}

function AbsensiBadge({ status }) {
  const map = {
    'Hadir': 'bg-emerald-100 text-emerald-700',
    'Libur': 'bg-indigo-100 text-indigo-700',
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