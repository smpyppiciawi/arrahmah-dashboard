import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  School, Calendar, Users, Wallet, AlertTriangle, Award,
  TrendingUp, TrendingDown, MessageCircle, Mail, Settings,
  LogOut, RefreshCw, Clock, CalendarDays, Heart,
  FileText, Sun, Moon, Home as HomeIcon, Building, UserCheck, BookOpen,
  BookMarked, CheckCircle2, XCircle, ClipboardList
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import AgentChat from '@/components/kepsek/AgentChat';
import StatCard from '@/components/kepsek/StatCard';
import KepsekAlerts from '@/components/kepsek/KepsekAlerts';
import KepsekKalender from '@/components/kepsek/KepsekKalender';
import DrillDownDialog from '@/components/kepsek/DrillDownDialog';
import PenyebaranSiswaMap from '@/components/kepsek/PenyebaranSiswaMap';
import GuruContactFab from '@/components/kepsek/GuruContactFab';
import KepsekMenuDrawer from '@/components/kepsek/KepsekMenuDrawer';
import AktivitasHariIni from '@/components/kepsek/AktivitasHariIni';
import WaAssistantLink from '@/components/WaAssistantLink';

const DATE_PRESETS = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'yesterday', label: 'Kemarin' },
  { key: '7days', label: '7 Hari' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'year', label: 'Tahun Ini' },
];

export default function Kepsek() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDark, setIsDark] = useState(() => localStorage.getItem('kepsek-theme') !== 'light');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [preset, setPreset] = useState('today');
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [drillDown, setDrillDown] = useState(null);

  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { localStorage.setItem('kepsek-theme', isDark ? 'dark' : 'light'); }, [isDark]);
  useEffect(() => {
    const today = new Date();
    if (preset === 'today') { setDateFrom(format(today, 'yyyy-MM-dd')); setDateTo(format(today, 'yyyy-MM-dd')); }
    else if (preset === 'yesterday') { const y = subDays(today, 1); setDateFrom(format(y, 'yyyy-MM-dd')); setDateTo(format(y, 'yyyy-MM-dd')); }
    else if (preset === '7days') { setDateFrom(format(subDays(today, 6), 'yyyy-MM-dd')); setDateTo(format(today, 'yyyy-MM-dd')); }
    else if (preset === 'month') { setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd')); setDateTo(format(endOfMonth(today), 'yyyy-MM-dd')); }
    else if (preset === 'year') { setDateFrom(format(startOfYear(today), 'yyyy-MM-dd')); setDateTo(format(endOfYear(today), 'yyyy-MM-dd')); }
  }, [preset]);

  const { data: siswaList = [], refetch } = useQuery({ queryKey: ['siswa'], queryFn: () => base44.entities.Siswa.list() });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list() });
  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list() });
  const { data: absensiList = [] } = useQuery({ queryKey: ['absensi-kepsek'], queryFn: () => base44.entities.Absensi.list('-tanggal', 1000) });
  const { data: nilaiList = [] } = useQuery({ queryKey: ['nilai-kepsek'], queryFn: () => base44.entities.Nilai.list('-created_date', 1000) });
  const { data: pelanggaranList = [] } = useQuery({ queryKey: ['pelanggaran-kepsek'], queryFn: () => base44.entities.Pelanggaran.list('-tanggal') });
  const { data: prestasiList = [] } = useQuery({ queryKey: ['prestasi-kepsek'], queryFn: () => base44.entities.Prestasi.list('-tanggal') });
  const { data: keuanganList = [] } = useQuery({ queryKey: ['keuangan-kepsek'], queryFn: () => base44.entities.Keuangan.list('-tanggal') });
  const { data: kalenderList = [] } = useQuery({ queryKey: ['kalender-kepsek'], queryFn: () => base44.entities.KalenderAkademik.list('-tanggal_mulai') });
  const { data: izinList = [] } = useQuery({ queryKey: ['izin-kepsek'], queryFn: () => base44.entities.IzinSiswa.filter({ tanggal: format(new Date(), 'yyyy-MM-dd') }) });
  const { data: uksList = [] } = useQuery({ queryKey: ['uks-kepsek'], queryFn: () => base44.entities.UKS.list('-tanggal') });
  const { data: homeVisitList = [] } = useQuery({ queryKey: ['homeVisit-kepsek'], queryFn: () => base44.entities.HomeVisit.list('-tanggal_homevisit') });
  const { data: pengaturan = [] } = useQuery({ queryKey: ['pengaturan-kepsek'], queryFn: () => base44.entities.PengaturanAplikasi.list() });
  const { data: absensiPegawaiList = [] } = useQuery({ queryKey: ['absensiPegawai-kepsek'], queryFn: () => base44.entities.AbsensiPegawai.list('-tanggal', 500) });
  const { data: jadwalPelajaranList = [] } = useQuery({ queryKey: ['jadwalPelajaran-kepsek'], queryFn: () => base44.entities.JadwalPelajaran.list() });
  const { data: materiList = [] } = useQuery({ queryKey: ['materi-kepsek'], queryFn: () => base44.entities.Materi.list('-created_date', 2000) });
  const { data: izinPegawaiList = [] } = useQuery({ queryKey: ['izinPegawai-kepsek'], queryFn: () => base44.entities.IzinPegawai.filter({ status_approval: 'Pending' }) });
  const { data: sumberDanaList = [] } = useQuery({ queryKey: ['sumberDana-kepsek'], queryFn: () => base44.entities.SumberDana.list() });
  const currentSettings = pengaturan?.[0] || {};
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const getSchoolWeek = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const fmt = (x) => x.toISOString().slice(0, 10);
    const thu = new Date(monday); thu.setDate(monday.getDate() + 3);
    const year = thu.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const dayOfYear = Math.floor((thu - jan1) / 86400000);
    const jan1Day = (jan1.getDay() + 6) % 7;
    const weekNum = Math.ceil((dayOfYear + jan1Day + 1) / 7);
    return { weekKey: `${year}-${String(weekNum).padStart(2, '0')}`, weekStart: fmt(monday), weekEnd: fmt(friday) };
  };
  const { weekStart: curWeekStart, weekEnd: curWeekEnd } = getSchoolWeek(todayStr);

  const t = isDark ? {
    page: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100',
    header: 'bg-slate-900/80 backdrop-blur-lg border-slate-700',
    card: 'bg-slate-800/50 border border-slate-700 shadow-lg shadow-black/30',
    dialog: 'bg-slate-900 border-slate-700',
    text: 'text-slate-100', textMuted: 'text-slate-400', textSubtle: 'text-slate-500',
    btn: 'bg-slate-800 hover:bg-slate-700 text-slate-400', btnDanger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400',
    input: 'bg-slate-800 text-slate-300',
    presetActive: 'bg-indigo-600 text-white', presetInactive: 'bg-slate-800 text-slate-400 hover:bg-slate-700',
    chartBg: '#1e293b', chartBorder: '#334155', chartText: '#94a3b8', chartGrid: '#334155',
    item: 'bg-slate-700/50 hover:bg-slate-700', iconBg: 'bg-slate-700/50',
  } : {
    page: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-800',
    header: 'bg-white/80 backdrop-blur-lg border-slate-200 shadow-sm',
    card: 'bg-white border border-slate-200/80 shadow-md shadow-slate-300/30',
    dialog: 'bg-white border-slate-200',
    text: 'text-slate-800', textMuted: 'text-slate-500', textSubtle: 'text-slate-400',
    btn: 'bg-slate-100 hover:bg-slate-200 text-slate-600', btnDanger: 'bg-red-50 hover:bg-red-100 text-red-500',
    input: 'bg-white text-slate-700',
    presetActive: 'bg-indigo-500 text-white', presetInactive: 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200',
    chartBg: '#ffffff', chartBorder: '#e2e8f0', chartText: '#64748b', chartGrid: '#e2e8f0',
    item: 'bg-slate-50 hover:bg-slate-100', iconBg: 'bg-slate-100',
  };

  const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
  const handleWhatsApp = (phone, message) => {
    if (!phone) { toast({ title: 'Nomor tidak tersedia', variant: 'destructive' }); return; }
    const clean = phone.replace(/\D/g, '').replace(/^0/, '62');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, '_blank');
  };
  const handleDirectWA = async (phone, message) => {
    if (!phone) { toast({ title: 'Nomor tidak tersedia', variant: 'destructive' }); return; }
    try {
      await base44.functions.invoke('sendWANotif', { phone, message });
      toast({ title: '✅ WA terkirim langsung', description: 'Pesan dikirim via Fonnte ke Wali Kelas' });
    } catch (e) {
      toast({ title: 'Gagal kirim WA', description: e?.message || 'Terjadi kesalahan', variant: 'destructive' });
    }
  };
  const handleEmail = async (subject, body) => {
    if (!currentUser?.email) { toast({ title: 'Email tidak tersedia', variant: 'destructive' }); return; }
    try { await base44.integrations.Core.SendEmail({ to: currentUser.email, subject, body }); toast({ title: '📧 Email terkirim', description: `Notifikasi dikirim ke ${currentUser.email}` }); }
    catch (e) { toast({ title: 'Gagal mengirim email', description: 'Email penerima mungkin belum terdaftar', variant: 'destructive' }); }
  };
  const handleApproveIzin = async (alert, status) => {
    try {
      await base44.entities.IzinPegawai.update(alert.izinId, {
        status_approval: status,
        approver_id: currentUser?.id,
        approver_nama: currentUser?.full_name,
        approved_at: new Date().toISOString(),
        catatan_approver: status === 'Ditolak' ? 'Ditolak via Dashboard Kepsek' : '',
      });
      toast({ title: status === 'Disetujui' ? '✅ Izin disetujui' : 'Izin ditolak', description: alert.person });
      queryClient.invalidateQueries({ queryKey: ['izinPegawai-kepsek'] });
    } catch (e) { toast({ title: 'Gagal memproses izin', description: e?.message || 'Terjadi kesalahan', variant: 'destructive' }); }
  };
  const getWaliKelasInfo = (siswaId) => {
    const siswa = siswaList.find(s => s.id === siswaId);
    if (!siswa) return {};
    const kelas = kelasList.find(k => k.id === siswa.kelas_id);
    const waliGuru = guruList.find(g => g.nama === kelas?.wali_kelas);
    const ortuPhone = siswa.kontak_list?.[0]?.no_telp || siswa.no_telp_ortu;
    return { waliName: kelas?.wali_kelas, waliPhone: waliGuru?.no_telp, ortuPhone };
  };

  const stats = useMemo(() => {
    const aktiveSiswa = siswaList.filter(s => s.status === 'Aktif');
    const absensiHariIni = absensiList.filter(a => a.tanggal === todayStr);
    const hadirHariIni = absensiHariIni.filter(a => a.status === 'Hadir' || a.status === 'Terlambat').length;
    const persenHadir = absensiHariIni.length > 0 ? Math.round((hadirHariIni / absensiHariIni.length) * 100) : 0;
    const filteredKeuangan = keuanganList.filter(k => k.tanggal >= dateFrom && k.tanggal <= dateTo);
    const totalPemasukan = filteredKeuangan.filter(k => k.jenis === 'Pemasukan').reduce((s, k) => s + (k.jumlah || 0), 0);
    const totalPengeluaran = filteredKeuangan.filter(k => k.jenis === 'Pengeluaran').reduce((s, k) => s + (k.jumlah || 0), 0);
    // Logika mingguan: siswa dengan akumulasi absen (Alfa/Sakit) >= 3 hari dalam minggu berjalan (Senin-Jumat).
    // Sabtu & Minggu libur (tidak dihitung). Alert muncul saat akumulasi 3 hari tercapai dalam minggu tsb.
    // Mencakup 3 hari berturut (sub-kasus dari akumulasi mingguan). Alert reset tiap Senin.
    // curWeekStart/curWeekEnd dihitung di level komponen (dipakai juga oleh openDrillDown).
    const siswaAbsen3Hari = aktiveSiswa.map(s => {
      const records = absensiList.filter(a => a.siswa_id === s.id);
      const weekRecords = records
        .filter(r => r.tanggal >= curWeekStart && r.tanggal <= curWeekEnd && (r.status === 'Alfa' || r.status === 'Sakit'))
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
      if (weekRecords.length < 3) return null;
      return {
        ...s,
        _absenList: weekRecords.map(r => ({ tanggal: r.tanggal, status: r.status, keterangan: r.keterangan })),
        _alfaCount: weekRecords.filter(r => r.status === 'Alfa').length,
        _sakitCount: weekRecords.filter(r => r.status === 'Sakit').length,
        _lastAbsenDate: weekRecords[weekRecords.length - 1].tanggal,
        _weekStart: curWeekStart,
        _weekEnd: curWeekEnd,
      };
    }).filter(Boolean);
    const siswaAlfa3Hari = siswaAbsen3Hari.filter(s => s._alfaCount > 0);
    const siswaSakit3Hari = siswaAbsen3Hari.filter(s => s._sakitCount > 0 && s._alfaCount === 0);
    const pegawaiHadirHariIni = absensiPegawaiList.filter(a => a.tanggal === todayStr && (a.status === 'Hadir' || a.status === 'Terlambat'));
    const jadwalHariIni = jadwalPelajaranList.filter(j => j.hari === format(new Date(), 'EEEE', { locale: idLocale }));
    const pelanggaranSangatBerat = pelanggaranList.filter(p => {
      if (p.status !== 'Proses' || p.jenis_pelanggaran !== 'Sangat Berat') return false;
      const siswa = siswaList.find(s => s.id === p.siswa_id);
      return siswa && siswa.status === 'Aktif';
    });
    const pelanggaranBerat = pelanggaranList.filter(p => {
      if (p.status !== 'Proses' || p.jenis_pelanggaran !== 'Berat') return false;
      const siswa = siswaList.find(s => s.id === p.siswa_id);
      return siswa && siswa.status === 'Aktif';
    });
    const prestasiPeriod = prestasiList.filter(p => p.tanggal >= dateFrom && p.tanggal <= dateTo);
    const h2Date = new Date(); h2Date.setDate(h2Date.getDate() + 2);
    const h2Events = kalenderList.filter(k => k.tanggal_mulai === format(h2Date, 'yyyy-MM-dd'));
    const visitedIds = new Set(homeVisitList.map(h => h.siswa_id));
    const visitedSiswa = aktiveSiswa.filter(s => visitedIds.has(s.id));
    const notVisitedSiswa = aktiveSiswa.filter(s => !visitedIds.has(s.id));
    // Saldo all-time gabungan semua sumber dana
    const allPemasukan = keuanganList.filter(k => k.jenis === 'Pemasukan').reduce((s, k) => s + (k.jumlah || 0), 0);
    const allPengeluaran = keuanganList.filter(k => k.jenis === 'Pengeluaran').reduce((s, k) => s + (k.jumlah || 0), 0);
    const allSaldo = allPemasukan - allPengeluaran;
    const sumberKeys = new Set();
    sumberDanaList.forEach(s => sumberKeys.add(s.nama));
    keuanganList.forEach(k => { if (k.sumber_rekening) sumberKeys.add(k.sumber_rekening); });
    sumberKeys.add('Umum');
    const sumberDanaBreakdown = [...sumberKeys].map(key => {
      const rows = keuanganList.filter(k => (k.sumber_rekening || 'Umum') === key);
      const masuk = rows.filter(k => k.jenis === 'Pemasukan').reduce((s, k) => s + (k.jumlah || 0), 0);
      const keluar = rows.filter(k => k.jenis === 'Pengeluaran').reduce((s, k) => s + (k.jumlah || 0), 0);
      return { sumber_dana: key, masuk, keluar, saldo: masuk - keluar, transaksi: rows.length };
    }).filter(s => s.transaksi > 0 || sumberDanaList.some(sd => sd.nama === s.sumber_dana));
    // Agenda materi per guru (total bab setahun)
    const materiByGuru = {};
    materiList.forEach(m => {
      const g = m.guru_pengampu || 'Tanpa Nama';
      if (!materiByGuru[g]) materiByGuru[g] = { nama_guru: g, mapel: new Set(), jumlah_bab: 0, judul_list: [] };
      materiByGuru[g].jumlah_bab += 1;
      if (m.mapel) materiByGuru[g].mapel.add(m.mapel);
      if (m.judul) materiByGuru[g].judul_list.push(m.judul);
    });
    const materiPerGuru = Object.values(materiByGuru).map(g => ({ ...g, mapel: [...g.mapel].join(', ') })).sort((a, b) => a.nama_guru.localeCompare(b.nama_guru, 'id'));
    const totalBab = materiList.length;
    return {
      totalSiswa: aktiveSiswa.length, totalGuru: guruList.filter(g => g.status === 'Aktif').length, totalKelas: kelasList.length,
      persenHadir, absensiHariIni: absensiHariIni.length, hadirHariIni,
      sakitHariIni: absensiHariIni.filter(a => a.status === 'Sakit').length, alfaHariIni: absensiHariIni.filter(a => a.status === 'Alfa').length,
      izinHariIni: absensiHariIni.filter(a => a.status === 'Izin').length,
      saldo: totalPemasukan - totalPengeluaran, totalPemasukan, totalPengeluaran,
      siswaAbsen3Hari, siswaAlfa3Hari, siswaSakit3Hari, pegawaiHadirHariIni, jadwalHariIni,
      pelanggaranBerat, pelanggaranSangatBerat, prestasiPeriod,
      h2Events, izinCount: izinList.length, uksCount: uksList.filter(u => u.tanggal === todayStr).length,
      homeVisitTotal: homeVisitList.length, homeVisitVisited: visitedSiswa.length,
      homeVisitNotVisited: notVisitedSiswa, homeVisitNotVisitedCount: notVisitedSiswa.length,
      allSaldo, allPemasukan, allPengeluaran, sumberDanaBreakdown,
      materiPerGuru, totalBab, izinPegawaiPending: izinPegawaiList,
    };
  }, [siswaList, guruList, kelasList, absensiList, keuanganList, pelanggaranList, prestasiList, kalenderList, izinList, uksList, homeVisitList, absensiPegawaiList, jadwalPelajaranList, materiList, izinPegawaiList, sumberDanaList, dateFrom, dateTo, todayStr]);

  const alerts = useMemo(() => {
    const list = [];
    stats.siswaAlfa3Hari.forEach(s => { const info = getWaliKelasInfo(s.id); list.push({ id: `alfa3-${s.id}`, severity: 'critical', category: 'Absensi', title: `Alfa ${s._alfaCount} Hari (Minggu Ini)`, person: s.nama, kelas: s.nama_kelas, keterangan: `${s._absenList.map(d => `${format(parseISO(d.tanggal), 'd/MM')}: ${d.status}`).join(', ')} | Minggu ${format(parseISO(s._weekStart), 'd/MM')}-${format(parseISO(s._weekEnd), 'd/MM')}`, waliName: info.waliName, waliPhone: info.waliPhone, ortuPhone: info.ortuPhone }); });
    stats.siswaSakit3Hari.forEach(s => { const info = getWaliKelasInfo(s.id); list.push({ id: `sakit3-${s.id}`, severity: 'warning', category: 'Absensi', title: `Sakit ${s._sakitCount} Hari (Minggu Ini)`, person: s.nama, kelas: s.nama_kelas, keterangan: `${s._absenList.map(d => `${format(parseISO(d.tanggal), 'd/MM')}: ${d.status}`).join(', ')} | Minggu ${format(parseISO(s._weekStart), 'd/MM')}-${format(parseISO(s._weekEnd), 'd/MM')}`, waliName: info.waliName, waliPhone: info.waliPhone, ortuPhone: info.ortuPhone }); });
    stats.pelanggaranSangatBerat.forEach(p => { const siswa = siswaList.find(s => s.id === p.siswa_id); const info = getWaliKelasInfo(p.siswa_id); list.push({ id: `pel-${p.id}`, severity: 'critical', category: 'Pelanggaran', title: `Pelanggaran ${p.jenis_pelanggaran}`, person: p.nama_siswa, kelas: p.nama_kelas, poin: p.poin, durasi: p.durasi_sanksi ? `${p.durasi_sanksi} ${p.satuan_durasi || 'Hari'}` : '-', progress: p.progress_sanksi?.length ? `${p.progress_sanksi.filter(s => s.selesai).length}/${p.progress_sanksi.length}` : '-', status: p.status, waliName: info.waliName, waliPhone: info.waliPhone, ortuPhone: siswa?.kontak_list?.[0]?.no_telp || siswa?.no_telp_ortu }); });
    stats.pelanggaranBerat.forEach(p => { const siswa = siswaList.find(s => s.id === p.siswa_id); const info = getWaliKelasInfo(p.siswa_id); list.push({ id: `pel-${p.id}`, severity: 'warning', category: 'Pelanggaran', title: `Pelanggaran ${p.jenis_pelanggaran}`, person: p.nama_siswa, kelas: p.nama_kelas, poin: p.poin, durasi: p.durasi_sanksi ? `${p.durasi_sanksi} ${p.satuan_durasi || 'Hari'}` : '-', progress: p.progress_sanksi?.length ? `${p.progress_sanksi.filter(s => s.selesai).length}/${p.progress_sanksi.length}` : '-', status: p.status, waliName: info.waliName, waliPhone: info.waliPhone, ortuPhone: siswa?.kontak_list?.[0]?.no_telp || siswa?.no_telp_ortu }); });
    stats.h2Events.forEach(ev => { list.push({ id: `h2-${ev.id}`, severity: 'warning', category: 'Kalender', title: 'Kegiatan H-2', event: ev.judul, date: format(parseISO(ev.tanggal_mulai), 'd MMM yyyy', { locale: idLocale }) }); });
    stats.izinPegawaiPending.forEach(iz => { list.push({ id: `izinpg-${iz.id}`, severity: 'warning', category: 'Izin Pegawai', title: `Izin ${iz.jenis}`, person: iz.nama_pegawai, kelas: iz.jabatan || '', date: format(parseISO(iz.tanggal), 'd MMM yyyy', { locale: idLocale }), keterangan: iz.keterangan, izinId: iz.id }); });
    return list;
  }, [stats, siswaList, guruList, kelasList]);

  const attendanceData = useMemo(() => {
    const filtered = absensiList.filter(a => a.tanggal >= dateFrom && a.tanggal <= dateTo);
    return [
      { name: 'Hadir', value: filtered.filter(a => a.status === 'Hadir').length, color: '#10b981' },
      { name: 'Sakit', value: filtered.filter(a => a.status === 'Sakit').length, color: '#3b82f6' },
      { name: 'Izin', value: filtered.filter(a => a.status === 'Izin').length, color: '#f59e0b' },
      { name: 'Alfa', value: filtered.filter(a => a.status === 'Alfa').length, color: '#ef4444' },
    ].filter(d => d.value > 0);
  }, [absensiList, dateFrom, dateTo]);

  const gradeData = useMemo(() => {
    const byMapel = {};
    nilaiList.forEach(n => { if (!byMapel[n.mapel]) byMapel[n.mapel] = []; byMapel[n.mapel].push(n.nilai); });
    return Object.entries(byMapel).map(([mapel, values]) => ({ mapel: mapel.length > 10 ? mapel.substring(0, 10) + '…' : mapel, rata: Math.round(values.reduce((a, b) => a + b, 0) / values.length) })).sort((a, b) => b.rata - a.rata).slice(0, 6);
  }, [nilaiList]);

  const keuanganTrend = useMemo(() => {
    const filtered = keuanganList.filter(k => k.tanggal >= dateFrom && k.tanggal <= dateTo);
    const byDate = {};
    filtered.forEach(k => { if (!byDate[k.tanggal]) byDate[k.tanggal] = { tanggal: k.tanggal, masuk: 0, keluar: 0 }; if (k.jenis === 'Pemasukan') byDate[k.tanggal].masuk += k.jumlah || 0; else byDate[k.tanggal].keluar += k.jumlah || 0; });
    return Object.values(byDate).sort((a, b) => a.tanggal.localeCompare(b.tanggal)).map(d => ({ ...d, tanggal: format(parseISO(d.tanggal), 'd/MM', { locale: idLocale }) }));
  }, [keuanganList, dateFrom, dateTo]);

  const openDrillDown = (type) => {
    const bdg = isDark ? { Hadir: 'bg-emerald-500/20 text-emerald-300', Alfa: 'bg-red-500/20 text-red-300', Sakit: 'bg-amber-500/20 text-amber-300', Izin: 'bg-blue-500/20 text-blue-300', Pemasukan: 'bg-emerald-500/20 text-emerald-300', Pengeluaran: 'bg-red-500/20 text-red-300' }
      : { Hadir: 'bg-emerald-100 text-emerald-700', Alfa: 'bg-red-100 text-red-700', Sakit: 'bg-amber-100 text-amber-700', Izin: 'bg-blue-100 text-blue-700', Pemasukan: 'bg-emerald-100 text-emerald-700', Pengeluaran: 'bg-red-100 text-red-700' };
    const sortKelasNama = (a, b) => (a.nama_kelas || '').localeCompare(b.nama_kelas || '', 'id') || (a.nama_siswa || a.nama || '').localeCompare(b.nama_siswa || b.nama || '', 'id');
    const configs = {
      kehadiran: { title: 'Siswa Tidak Hadir Hari Ini', data: absensiList.filter(a => a.tanggal === todayStr && a.status !== 'Hadir').sort(sortKelasNama), summary: [
        { label: 'Hadir', value: absensiList.filter(a => a.tanggal === todayStr && (a.status === 'Hadir' || a.status === 'Terlambat')).length, color: 'emerald' },
        { label: 'Sakit', value: absensiList.filter(a => a.tanggal === todayStr && a.status === 'Sakit').length, color: 'blue' },
        { label: 'Izin', value: absensiList.filter(a => a.tanggal === todayStr && a.status === 'Izin').length, color: 'amber' },
        { label: 'Alfa', value: absensiList.filter(a => a.tanggal === todayStr && a.status === 'Alfa').length, color: 'red' },
      ], columns: [
        { key: 'nama_siswa', label: 'Nama' }, { key: 'nama_kelas', label: 'Kelas' },
        { key: 'status', label: 'Status', render: r => <Badge className={bdg[r.status] || 'bg-slate-500/20 text-slate-300'}>{r.status}</Badge> }, { key: 'keterangan', label: 'Keterangan' },
      ], fullLink: '/Absensi', sortFn: sortKelasNama },
      alfa3: { title: `Siswa Absen 3+ Hari Minggu Ini (${format(parseISO(curWeekStart), 'd/MM')} - ${format(parseISO(curWeekEnd), 'd/MM')})`, data: stats.siswaAbsen3Hari, columns: [
        { key: 'nama', label: 'Nama' }, { key: 'nama_kelas', label: 'Kelas' },
        { key: 'keterangan', label: 'Keterangan', render: r => (<div className="text-xs"><span className="font-medium text-red-500">Alfa: {r._alfaCount}x</span><span className="text-blue-500 ml-2">Sakit: {r._sakitCount}x</span><p className="text-slate-400 mt-0.5">Terakhir: {format(parseISO(r._lastAbsenDate), 'd MMM yyyy', { locale: idLocale })} | Minggu {format(parseISO(r._weekStart), 'd/MM')}-{format(parseISO(r._weekEnd), 'd/MM')}</p></div>) },
        { key: 'aksi', label: 'Hubungi', render: r => { const info = getWaliKelasInfo(r.id); const msg = `Yth. ${info.waliName || 'Wali Kelas'}, mohon tindak lanjut siswa ${r.nama} yang telah absen (Alfa ${r._alfaCount}x, Sakit ${r._sakitCount}x) selama 3+ hari dan belum hadir kembali. Mohon segera hubungi orang tua.`; return (<div className="flex gap-1">{info.waliPhone && <button onClick={() => handleWhatsApp(info.waliPhone, msg)} className="text-emerald-500" title="Buka WA Wali Kelas"><MessageCircle className="w-4 h-4" /></button>}{info.ortuPhone && <button onClick={() => handleWhatsApp(info.ortuPhone, `Yth. Orang Tua ${r.nama}, mohon konfirmasi kehadiran siswa yang telah absen 3+ hari.`)} className="text-blue-500" title="Buka WA Orang Tua"><MessageCircle className="w-4 h-4" /></button>}</div>); } },
      ], fullLink: '/Absensi' },
      pelanggaran: { title: 'Pelanggaran Berat (Aktif)', data: stats.pelanggaranBerat, columns: [
        { key: 'nama_siswa', label: 'Siswa' }, { key: 'nama_kelas', label: 'Kelas' },
        { key: 'uraian', label: 'Pelanggaran' },
        { key: 'poin', label: 'Poin' },
        { key: 'durasi_sanksi', label: 'Durasi', render: r => r.durasi_sanksi ? `${r.durasi_sanksi} ${r.satuan_durasi || 'Hari'}` : '-' },
        { key: 'progress', label: 'Progress', render: r => r.progress_sanksi?.length ? `${r.progress_sanksi.filter(s => s.selesai).length}/${r.progress_sanksi.length}` : '-' },
        { key: 'status', label: 'Status', render: r => <Badge className={r.status === 'Selesai' ? (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700') : (isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700')}>{r.status}</Badge> },
      ], fullLink: '/CatatanSiswa' },
      saldo: { title: 'Saldo per Sumber Dana (All-Time)', data: stats.sumberDanaBreakdown, columns: [
        { key: 'sumber_dana', label: 'Sumber Dana' },
        { key: 'masuk', label: 'Pemasukan', render: r => <span className="text-emerald-500">{formatRupiah(r.masuk)}</span> },
        { key: 'keluar', label: 'Pengeluaran', render: r => <span className="text-red-500">{formatRupiah(r.keluar)}</span> },
        { key: 'saldo', label: 'Saldo', render: r => <span className={`font-semibold ${r.saldo >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatRupiah(r.saldo)}</span> },
        { key: 'transaksi', label: 'Transaksi' },
      ], fullLink: '/Transaksi' },
      prestasi: { title: 'Prestasi Siswa', data: stats.prestasiPeriod, columns: [
        { key: 'nama_siswa', label: 'Siswa' }, { key: 'nama_prestasi', label: 'Prestasi' }, { key: 'kategori', label: 'Kategori' }, { key: 'tingkat', label: 'Tingkat' },
      ], fullLink: '/CatatanSiswa' },
      materi: { title: 'Agenda Materi per Guru (Total BAB Setahun)', data: stats.materiPerGuru, columns: [
        { key: 'nama_guru', label: 'Nama Guru' },
        { key: 'mapel', label: 'Keterangan Mapel' },
        { key: 'jumlah_bab', label: 'Jumlah BAB', render: r => <Badge className="bg-violet-100 text-violet-700">{r.jumlah_bab}</Badge> },
        { key: 'judul_list', label: 'Judul Materi', render: r => <span className="text-xs">{(r.judul_list || []).slice(0, 5).join(' • ')}{(r.judul_list || []).length > 5 ? ' …' : ''}</span> },
      ], fullLink: '/Materi' },
      siswa: { title: 'Data Siswa Aktif', data: siswaList.filter(s => s.status === 'Aktif'), columns: [
        { key: 'nis', label: 'NIS' }, { key: 'nama', label: 'Nama' }, { key: 'nama_kelas', label: 'Kelas' }, { key: 'jenis_kelamin', label: 'JK' },
      ], fullLink: '/Siswa' },
      guru: { title: 'Data Guru & Pegawai', data: guruList, columns: [
        { key: 'nama', label: 'Nama' }, { key: 'jabatan', label: 'Jabatan' }, { key: 'no_telp', label: 'No Telp' }, { key: 'status', label: 'Status' },
      ], fullLink: '/Guru' },
      kelas: { title: 'Data Kelas', data: kelasList, columns: [
        { key: 'nama_kelas', label: 'Kelas' }, { key: 'tingkat', label: 'Tingkat' }, { key: 'wali_kelas', label: 'Wali Kelas' }, { key: 'tahun_ajaran', label: 'TA' },
      ], fullLink: '/Kelas' },
      homevisit: { title: 'Data Home Visit', data: homeVisitList, columns: [
        { key: 'nama_siswa', label: 'Siswa' }, { key: 'nama_kelas', label: 'Kelas' }, { key: 'tanggal_homevisit', label: 'Tanggal' }, { key: 'keadaan_rumah', label: 'Keadaan Rumah' },
      ], fullLink: '/HomeVisit' },
      homevisitBelum: { title: 'Siswa Belum Home Visit', data: stats.homeVisitNotVisited, columns: [
        { key: 'nama', label: 'Nama' }, { key: 'nama_kelas', label: 'Kelas' }, { key: 'nis', label: 'NIS' },
      ], fullLink: '/HomeVisit' },
      izin: { title: 'Izin Siswa Hari Ini', data: izinList, columns: [
        { key: 'nama_siswa', label: 'Siswa' }, { key: 'nama_kelas', label: 'Kelas' }, { key: 'alasan', label: 'Alasan' }, { key: 'jam_izin', label: 'Jam Izin' },
      ], fullLink: '/CatatanSiswa' },
      uks: { title: 'Kunjungan UKS Hari Ini', data: uksList.filter(u => u.tanggal === todayStr), columns: [
        { key: 'nama_siswa', label: 'Siswa' }, { key: 'nama_kelas', label: 'Kelas' }, { key: 'keluhan', label: 'Keluhan' }, { key: 'status', label: 'Status' },
      ], fullLink: '/CatatanSiswa' },
      pegawaiHadir: { title: 'Pegawai Hadir Hari Ini', data: stats.pegawaiHadirHariIni, columns: [
        { key: 'nama_pegawai', label: 'Nama' }, { key: 'jabatan', label: 'Jabatan' },
        { key: 'status', label: 'Status', render: r => <Badge className={r.status === 'Terlambat' ? (isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700') : (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700')}>{r.status}</Badge> },
        { key: 'jam_masuk', label: 'Jam Masuk' },
      ], fullLink: '/AbsensiPegawai' },
      izinPegawai: { title: 'Pengajuan Izin Pegawai (Menunggu Approval)', data: stats.izinPegawaiPending, columns: [
        { key: 'nama_pegawai', label: 'Nama' }, { key: 'jabatan', label: 'Jabatan' },
        { key: 'jenis', label: 'Jenis', render: r => <Badge className={r.jenis === 'Sakit' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}>{r.jenis}</Badge> },
        { key: 'tanggal', label: 'Tanggal' }, { key: 'keterangan', label: 'Keterangan' },
        { key: 'aksi', label: 'Aksi', render: r => (<div className="flex gap-1"><button onClick={() => handleApproveIzin({ izinId: r.id, person: r.nama_pegawai }, 'Disetujui')} className="px-2 py-1 text-xs rounded bg-emerald-500 text-white hover:bg-emerald-600">Setujui</button><button onClick={() => handleApproveIzin({ izinId: r.id, person: r.nama_pegawai }, 'Ditolak')} className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600">Tolak</button></div>) },
      ], fullLink: '/AbsensiPegawai' },
      jadwalHariIni: { title: 'Jadwal Pelajaran Hari Ini', data: stats.jadwalHariIni, columns: [
        { key: 'nama_kelas', label: 'Kelas' }, { key: 'jam', label: 'Jam', render: r => `${(r.jam_mulai || '').substring(0, 5)}-${(r.jam_selesai || '').substring(0, 5)}` },
        { key: 'mapel', label: 'Mapel' }, { key: 'nama_guru', label: 'Guru' },
      ], fullLink: '/Kelas' },
    };
    setDrillDown(configs[type]);
  };

  const statCards = [
    { label: 'Kehadiran', value: `${stats.persenHadir}%`, subtitle: `${stats.hadirHariIni}/${stats.absensiHariIni} siswa`, icon: Calendar, gradient: 'from-emerald-500 to-emerald-600', alert: stats.alfaHariIni, onClick: () => openDrillDown('kehadiran') },
    { label: 'Absen 3 Hari', value: stats.siswaAbsen3Hari.length, subtitle: 'minggu ini', icon: AlertTriangle, gradient: 'from-red-500 to-red-600', alert: stats.siswaAbsen3Hari.length, onClick: () => openDrillDown('alfa3') },
    { label: 'Pelanggaran', value: stats.pelanggaranBerat.length, subtitle: 'berat/aktif', icon: AlertTriangle, gradient: 'from-orange-500 to-red-500', alert: stats.pelanggaranBerat.length + stats.pelanggaranSangatBerat.length, onClick: () => openDrillDown('pelanggaran') },
    { label: 'Saldo', value: formatRupiah(stats.allSaldo).replace('Rp', '').trim(), subtitle: `+${formatRupiah(stats.allPemasukan).replace('Rp','').trim()} / -${formatRupiah(stats.allPengeluaran).replace('Rp','').trim()}`, icon: Wallet, gradient: stats.allSaldo >= 0 ? 'from-teal-500 to-cyan-600' : 'from-red-500 to-red-600', onClick: () => openDrillDown('saldo') },
    { label: 'Pegawai Hadir', value: stats.pegawaiHadirHariIni.length, subtitle: 'hari ini', icon: UserCheck, gradient: 'from-teal-500 to-emerald-600', onClick: () => openDrillDown('pegawaiHadir') },
    { label: 'Prestasi', value: stats.prestasiPeriod.length, subtitle: 'prestasi', icon: Award, gradient: 'from-yellow-500 to-amber-600', onClick: () => openDrillDown('prestasi') },
    { label: 'Agenda Materi', value: stats.totalBab, subtitle: 'total bab', icon: BookMarked, gradient: 'from-violet-500 to-purple-600', onClick: () => openDrillDown('materi') },
    { label: 'Kegiatan H-2', value: stats.h2Events.length, subtitle: 'lusa', icon: CalendarDays, gradient: 'from-indigo-500 to-purple-600', alert: stats.h2Events.length },
  ];

  return (
    <div className={`min-h-screen ${t.page} font-inter transition-colors duration-300`}>
      <header className={`sticky top-0 z-40 ${t.header} border-b`}>
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3">
            <KepsekMenuDrawer isDark={isDark} />
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <School className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`${t.text} font-bold text-sm md:text-base`}>Dashboard Kepala Sekolah</h1>
              <p className={`${t.textMuted} text-xs`}>{currentSettings.nama_sekolah || 'YPPI ARRAHMAH'} — Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <Clock className={`w-4 h-4 ${t.textMuted}`} />
              <span className={`text-sm font-medium ${t.text}`}>{format(now, 'HH:mm:ss')}</span>
              <span className={t.textSubtle}>|</span>
              <span className={`text-xs ${t.textMuted}`}>{format(now, 'EEEE, d MMMM yyyy', { locale: idLocale })}</span>
            </div>
            <button onClick={() => setIsDark(!isDark)} className={`w-8 h-8 md:w-9 md:h-9 rounded-lg ${t.btn} flex items-center justify-center transition-colors`} title="Ganti Tema">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => refetch()} className={`w-8 h-8 md:w-9 md:h-9 rounded-lg ${t.btn} flex items-center justify-center transition-colors`}><RefreshCw className="w-4 h-4" /></button>
            <button onClick={() => setSettingsOpen(true)} className={`w-8 h-8 md:w-9 md:h-9 rounded-lg ${t.btn} flex items-center justify-center transition-colors`}><Settings className="w-4 h-4" /></button>
            <button onClick={() => base44.auth.logout()} className={`w-8 h-8 md:w-9 md:h-9 rounded-lg ${t.btnDanger} flex items-center justify-center transition-colors`}><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto p-3 md:p-6 space-y-3 md:space-y-5">
        <div className="flex items-center gap-2 overflow-x-auto flex-nowrap pb-1 md:flex-wrap md:pb-0">
          {DATE_PRESETS.map(p => (
            <button key={p.key} onClick={() => setPreset(p.key)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${preset === p.key ? t.presetActive : t.presetInactive}`}>{p.label}</button>
          ))}
          <div className={`flex items-center gap-1 ${t.input} rounded-lg px-2 py-1`}>
            <input type="date" value={dateFrom} onChange={(e) => { setPreset('custom'); setDateFrom(e.target.value); }} className="bg-transparent text-xs border-0 focus:outline-none" />
            <span className={t.textSubtle}>-</span>
            <input type="date" value={dateTo} onChange={(e) => { setPreset('custom'); setDateTo(e.target.value); }} className="bg-transparent text-xs border-0 focus:outline-none" />
          </div>
        </div>

        <KepsekAlerts alerts={alerts} onWhatsApp={handleWhatsApp} onDirectWA={handleDirectWA} onEmail={handleEmail} onApproveIzin={handleApproveIzin} isDark={isDark} />

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2 md:gap-3 auto-rows-fr">
          {statCards.map((card, i) => <StatCard key={i} {...card} />)}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-9 gap-2 md:gap-3">
          {[
            { label: 'Siswa Aktif', value: stats.totalSiswa, icon: Users, color: 'text-blue-500', onClick: () => openDrillDown('siswa') },
            { label: 'Guru Aktif', value: stats.totalGuru, icon: School, color: 'text-violet-500', onClick: () => openDrillDown('guru') },
            { label: 'Total Kelas', value: stats.totalKelas, icon: Building, color: 'text-emerald-500', onClick: () => openDrillDown('kelas') },
            { label: 'Jadwal Hari Ini', value: stats.jadwalHariIni.length, icon: BookOpen, color: 'text-indigo-500', onClick: () => openDrillDown('jadwalHariIni') },
            { label: 'Izin Siswa', value: stats.izinCount, icon: FileText, color: 'text-amber-500', onClick: () => openDrillDown('izin') },
            { label: 'UKS Hari Ini', value: stats.uksCount, icon: Heart, color: 'text-pink-500', onClick: () => openDrillDown('uks') },
            { label: 'Home Visit', value: stats.homeVisitVisited, icon: HomeIcon, color: 'text-indigo-500', onClick: () => openDrillDown('homevisit') },
            { label: 'Belum Visit', value: stats.homeVisitNotVisitedCount, icon: AlertTriangle, color: 'text-red-500', onClick: () => openDrillDown('homevisitBelum') },
            { label: 'Izin Pegawai', value: stats.izinPegawaiPending.length, icon: ClipboardList, color: 'text-teal-500', onClick: () => openDrillDown('izinPegawai') },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <button key={i} onClick={item.onClick} className={`rounded-2xl ${t.card} p-2 md:p-3 flex items-center gap-2 md:gap-3 transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer text-left`}>
                <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center ${t.iconBg} flex-shrink-0`}><Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${item.color}`} /></div>
                <div className="min-w-0"><p className={`text-sm md:text-xl font-bold ${t.text} truncate`}>{item.value}</p><p className={`text-[9px] md:text-[10px] ${t.textMuted} truncate`}>{item.label}</p></div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
          <div className="lg:col-span-2 space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className={`rounded-2xl ${t.card} p-3 md:p-4`}>
                <h3 className={`${t.text} font-bold text-sm mb-3`}>Statistik Kehadiran</h3>
                {attendanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart><Pie data={attendanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>{attendanceData.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ background: t.chartBg, border: `1px solid ${t.chartBorder}`, borderRadius: '8px' }} /></PieChart>
                  </ResponsiveContainer>
                ) : <p className={`${t.textMuted} text-xs text-center py-10`}>Tidak ada data</p>}
              </div>
              <div className={`rounded-2xl ${t.card} p-3 md:p-4`}>
                <h3 className={`${t.text} font-bold text-sm mb-3`}>Rata-rata Nilai per Mapel</h3>
                {gradeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={gradeData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} /><XAxis type="number" domain={[0, 100]} tick={{ fill: t.chartText, fontSize: 10 }} /><YAxis dataKey="mapel" type="category" width={80} tick={{ fill: t.chartText, fontSize: 10 }} /><Tooltip contentStyle={{ background: t.chartBg, border: `1px solid ${t.chartBorder}`, borderRadius: '8px' }} /><Bar dataKey="rata" fill="#8b5cf6" radius={[0, 4, 4, 0]} /></BarChart>
                  </ResponsiveContainer>
                ) : <p className={`${t.textMuted} text-xs text-center py-10`}>Tidak ada data</p>}
              </div>
            </div>
            <div className={`rounded-2xl ${t.card} p-3 md:p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`${t.text} font-bold text-sm`}>Tren Keuangan</h3>
                <div className="flex gap-3 text-xs">
                  <span className="text-emerald-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {formatRupiah(stats.totalPemasukan)}</span>
                  <span className="text-red-500 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> {formatRupiah(stats.totalPengeluaran)}</span>
                </div>
              </div>
              {keuanganTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={keuanganTrend}><defs><linearGradient id="masukGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.5} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient><linearGradient id="keluarGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} /><XAxis dataKey="tanggal" tick={{ fill: t.chartText, fontSize: 10 }} /><YAxis tick={{ fill: t.chartText, fontSize: 10 }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v} /><Tooltip contentStyle={{ background: t.chartBg, border: `1px solid ${t.chartBorder}`, borderRadius: '8px' }} formatter={(v) => formatRupiah(v)} /><Area type="monotone" dataKey="masuk" stroke="#10b981" fill="url(#masukGrad)" strokeWidth={2} /><Area type="monotone" dataKey="keluar" stroke="#ef4444" fill="url(#keluarGrad)" strokeWidth={2} /></AreaChart>
                </ResponsiveContainer>
              ) : <p className={`${t.textMuted} text-xs text-center py-10`}>Tidak ada data transaksi</p>}
            </div>
          </div>
          <KepsekKalender events={kalenderList} onEmail={handleEmail} today={new Date()} isDark={isDark} />
        </div>

        <AktivitasHariIni absensiPegawaiList={absensiPegawaiList} jadwalPelajaranList={jadwalPelajaranList} guruList={guruList} isDark={isDark} />

        <PenyebaranSiswaMap homeVisitList={homeVisitList} />
      </div>

      <AgentChat />
      <GuruContactFab guruList={guruList} onWhatsApp={handleWhatsApp} isDark={isDark} />
      <DrillDownDialog open={!!drillDown} onOpenChange={(v) => !v && setDrillDown(null)} title={drillDown?.title} data={drillDown?.data} columns={drillDown?.columns} isDark={isDark} fullLink={drillDown?.fullLink} sortFn={drillDown?.sortFn} summary={drillDown?.summary} />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className={`max-w-md ${t.dialog}`}>
          <DialogHeader><DialogTitle className={`flex items-center gap-2 ${t.text}`}><Settings className="w-5 h-5" /> Pengaturan Aplikasi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className={`p-4 rounded-xl ${t.item}`}><p className={`text-xs ${t.textMuted}`}>Tahun Ajaran Aktif</p><p className={`text-xl font-bold ${t.text}`}>{currentSettings.tahun_ajaran_aktif || '-'}</p></div>
            <div className={`p-4 rounded-xl ${t.item}`}><p className={`text-xs ${t.textMuted}`}>Nama Sekolah</p><p className={`text-xl font-bold ${t.text}`}>{currentSettings.nama_sekolah || 'YPPI ARRAHMAH'}</p></div>
            <Link to="/Pengaturan" onClick={() => setSettingsOpen(false)}><Button className="w-full bg-indigo-500 hover:bg-indigo-600">Buka Pengaturan Lengkap</Button></Link>
            <WaAssistantLink agentName="wa_kepsek_bot" className="mt-1" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}