import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import {
  LayoutDashboard, Users, Building, Calendar, Wallet,
  BookOpen, FolderOpen, GraduationCap, Menu, X,
  School, LogOut, ChevronDown, ClipboardList, Settings,
  UserCircle, TrendingUp, Bell, Search, CalendarDays, Home as HomeIcon, Ruler, Package,
  PanelLeftClose, PanelLeftOpen, ScanLine, ShieldCheck, BookMarked, BookUser
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useWaliKelas } from '@/hooks/useWaliKelas';
import { Badge } from "@/components/ui/badge";
import LiveClock from '@/components/ui/LiveClock';
import BellAlarmSystem from '@/components/dashboard/BellAlarmSystem';
import { PengingatMengajarProvider } from '@/components/guru/PengingatMengajar';
import KepsekBackButton from '@/components/kepsek/KepsekBackButton';

const FULL_ACCESS_MENU = {
  topItems: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', color: '#3b82f6' },
    { name: 'Absensi Siswa', icon: Calendar, page: 'Absensi', color: '#10b981' },
    { name: 'Absensi Pegawai', icon: ClipboardList, page: 'AbsensiPegawai', color: '#0d9488' },
    { name: 'Jadwal Piket', icon: ShieldCheck, page: 'JadwalPiketPegawai', color: '#0d9488' },
    { name: 'Scan Absensi', icon: ScanLine, page: 'ScanAbsensi', color: '#10b981' },
    { name: 'Nilai', icon: BookOpen, page: 'Nilai', color: '#f59e0b' },
    { name: 'Materi', icon: FolderOpen, page: 'Materi', color: '#6366f1' },
    { name: 'Catatan Siswa', icon: ClipboardList, page: 'CatatanSiswa', color: '#8b5cf6' },
    { name: 'Home Visit', icon: HomeIcon, page: 'HomeVisit', color: '#6366f1' },
    { name: 'Kalender Akademik', icon: CalendarDays, page: 'KalenderAkademik', color: '#6366f1' },
    { name: 'Hapalan', icon: BookMarked, page: 'Hapalan', color: '#16a34a' },
    { name: 'Buku Tamu', icon: BookUser, page: 'BukuTamu', color: '#0891b2' },
    { name: 'Dashboard Kepsek', icon: TrendingUp, page: 'Kepsek', color: '#06b6d4' },
    { name: 'Pengaturan', icon: Settings, page: 'Pengaturan', color: '#64748b' },
  ],
  groups: [
    {
      id: 'bendahara',
      name: 'BENDAHARA',
      icon: Wallet,
      color: '#14b8a6',
      items: [
        { name: 'Transaksi', icon: Wallet, page: 'Transaksi', color: '#14b8a6' },
        { name: 'Laporan', icon: ClipboardList, page: 'LaporanKeuangan', color: '#3b82f6' },
        { name: 'Kelola Data', icon: FolderOpen, page: 'KelolaDataKeuangan', color: '#8b5cf6' },
      ]
    },
    {
      id: 'admin',
      name: 'ADMIN',
      icon: Users,
      color: '#ef4444',
      items: [
        { name: 'Siswa', icon: Users, page: 'Siswa', color: '#3b82f6' },
        { name: 'Pegawai', icon: GraduationCap, page: 'Guru', color: '#7c3aed' },
        { name: 'Kelas', icon: Building, page: 'Kelas', color: '#8b5cf6' },
        { name: 'Data Lulusan', icon: GraduationCap, page: 'DataLulusan', color: '#f59e0b' },
        { name: 'Siswa Mutasi', icon: LogOut, page: 'SiswaKeluar', color: '#f97316' },
        { name: 'Periodik Siswa', icon: Ruler, page: 'PeriodikSiswa', color: '#8b5cf6' },
        { name: 'Sarpras', icon: Package, page: 'Sarpras', color: '#0d9488' },
        { name: 'Profil Sekolah', icon: School, page: 'ProfilSekolah', color: '#0ea5e9' },
      ],
      separated: true
    }
  ]
};

const ROLE_MENU = {
  admin: FULL_ACCESS_MENU,
  operator: {
    topItems: [
      { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', color: '#3b82f6' },
      { name: 'Absensi Siswa', icon: Calendar, page: 'Absensi', color: '#10b981' },
      { name: 'Scan Absensi', icon: ScanLine, page: 'ScanAbsensi', color: '#10b981' },
      { name: 'Catatan Siswa', icon: ClipboardList, page: 'CatatanSiswa', color: '#8b5cf6' },
      { name: 'Periodik Siswa', icon: Ruler, page: 'PeriodikSiswa', color: '#8b5cf6' },
      { name: 'Buku Tamu', icon: BookUser, page: 'BukuTamu', color: '#0891b2' },
      { name: 'Home Visit', icon: HomeIcon, page: 'HomeVisit', color: '#6366f1' },
      { name: 'Kalender Akademik', icon: CalendarDays, page: 'KalenderAkademik', color: '#6366f1' },
      { name: 'Pengaturan', icon: Settings, page: 'Pengaturan', color: '#64748b' },
    ],
    groups: []
  },
  tu: {
    topItems: [
      { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', color: '#3b82f6' },
      { name: 'Absensi Siswa', icon: Calendar, page: 'Absensi', color: '#10b981' },
    { name: 'Absensi Pegawai', icon: ClipboardList, page: 'AbsensiPegawai', color: '#0d9488' },
      { name: 'Jadwal Piket', icon: ShieldCheck, page: 'JadwalPiketPegawai', color: '#0d9488' },
      { name: 'Scan Absensi', icon: ScanLine, page: 'ScanAbsensi', color: '#10b981' },
      { name: 'Nilai', icon: BookOpen, page: 'Nilai', color: '#f59e0b' },
      { name: 'Materi', icon: FolderOpen, page: 'Materi', color: '#6366f1' },
      { name: 'Catatan Siswa', icon: ClipboardList, page: 'CatatanSiswa', color: '#8b5cf6' },
      { name: 'Hapalan', icon: BookMarked, page: 'Hapalan', color: '#16a34a' },
      { name: 'Buku Tamu', icon: BookUser, page: 'BukuTamu', color: '#0891b2' },
      { name: 'Home Visit', icon: HomeIcon, page: 'HomeVisit', color: '#6366f1' },
      { name: 'Kalender Akademik', icon: CalendarDays, page: 'KalenderAkademik', color: '#6366f1' },
      { name: 'Pengaturan', icon: Settings, page: 'Pengaturan', color: '#64748b' },
    ],
    groups: [
      {
        id: 'admin', name: 'ADMIN', icon: Users, color: '#ef4444',
        items: [
          { name: 'Siswa', icon: Users, page: 'Siswa', color: '#3b82f6' },
          { name: 'Pegawai', icon: GraduationCap, page: 'Guru', color: '#7c3aed' },
          { name: 'Kelas', icon: Building, page: 'Kelas', color: '#8b5cf6' },
          { name: 'Data Lulusan', icon: GraduationCap, page: 'DataLulusan', color: '#f59e0b' },
          { name: 'Siswa Mutasi', icon: LogOut, page: 'SiswaKeluar', color: '#f97316' },
          { name: 'Periodik Siswa', icon: Ruler, page: 'PeriodikSiswa', color: '#8b5cf6' },
        { name: 'Sarpras', icon: Package, page: 'Sarpras', color: '#0d9488' },
        ]
      }
    ]
  },
  piket: {
    topItems: [
      { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', color: '#3b82f6' },
      { name: 'Absensi Siswa', icon: Calendar, page: 'Absensi', color: '#10b981' },
    { name: 'Absensi Pegawai', icon: ClipboardList, page: 'AbsensiPegawai', color: '#0d9488' },
      { name: 'Buku Tamu', icon: BookUser, page: 'BukuTamu', color: '#0891b2' },
      { name: 'Catatan Siswa', icon: ClipboardList, page: 'CatatanSiswa', color: '#8b5cf6' },
      { name: 'Home Visit', icon: HomeIcon, page: 'HomeVisit', color: '#6366f1' },
      { name: 'Kalender Akademik', icon: CalendarDays, page: 'KalenderAkademik', color: '#6366f1' },
      { name: 'Pengaturan', icon: Settings, page: 'Pengaturan', color: '#64748b' },
    ],
    groups: []
  },
  kepsek: {
    topItems: [
      { name: 'Dashboard Kepsek', icon: TrendingUp, page: 'Kepsek', color: '#06b6d4' },
      { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', color: '#3b82f6' },
      { name: 'Absensi Siswa', icon: Calendar, page: 'Absensi', color: '#10b981' },
      { name: 'Absensi Pegawai', icon: ClipboardList, page: 'AbsensiPegawai', color: '#0d9488' },
      { name: 'Scan Absensi', icon: ScanLine, page: 'ScanAbsensi', color: '#10b981' },
      { name: 'Nilai', icon: BookOpen, page: 'Nilai', color: '#f59e0b' },
      { name: 'Buku Tamu', icon: BookUser, page: 'BukuTamu', color: '#0891b2' },
      { name: 'Catatan Siswa', icon: ClipboardList, page: 'CatatanSiswa', color: '#8b5cf6' },
      { name: 'Home Visit', icon: HomeIcon, page: 'HomeVisit', color: '#6366f1' },
      { name: 'Kalender Akademik', icon: CalendarDays, page: 'KalenderAkademik', color: '#6366f1' },
      { name: 'Pengaturan', icon: Settings, page: 'Pengaturan', color: '#64748b' },
    ],
    groups: [
      {
        id: 'kepsek-admin', name: 'ADMINISTRASI', icon: Users, color: '#ef4444',
        items: [
          { name: 'Siswa', icon: Users, page: 'Siswa', color: '#3b82f6' },
          { name: 'Pegawai', icon: GraduationCap, page: 'Guru', color: '#7c3aed' },
          { name: 'Kelas', icon: Building, page: 'Kelas', color: '#8b5cf6' },
          { name: 'Data Lulusan', icon: GraduationCap, page: 'DataLulusan', color: '#f59e0b' },
          { name: 'Siswa Mutasi', icon: LogOut, page: 'SiswaKeluar', color: '#f97316' },
          { name: 'Periodik Siswa', icon: Ruler, page: 'PeriodikSiswa', color: '#8b5cf6' },
          { name: 'Sarpras', icon: Package, page: 'Sarpras', color: '#0d9488' },
          { name: 'Profil Sekolah', icon: School, page: 'ProfilSekolah', color: '#0ea5e9' },
        ]
      },
      {
        id: 'kepsek-keuangan', name: 'KEUANGAN', icon: Wallet, color: '#14b8a6',
        items: [
          { name: 'Transaksi', icon: Wallet, page: 'Transaksi', color: '#14b8a6' },
          { name: 'Laporan', icon: ClipboardList, page: 'LaporanKeuangan', color: '#3b82f6' },
          { name: 'Kelola Data', icon: FolderOpen, page: 'KelolaDataKeuangan', color: '#8b5cf6' },
        ]
      }
    ]
  },
  bendahara: {
    topItems: [
      { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', color: '#3b82f6' },
      { name: 'Home Visit', icon: HomeIcon, page: 'HomeVisit', color: '#6366f1' },
      { name: 'Buku Tamu', icon: BookUser, page: 'BukuTamu', color: '#0891b2' },
    ],
    groups: [
      {
        id: 'bendahara', name: 'BENDAHARA', icon: Wallet, color: '#14b8a6',
        items: [
          { name: 'Transaksi', icon: Wallet, page: 'Transaksi', color: '#14b8a6' },
          { name: 'Laporan', icon: ClipboardList, page: 'LaporanKeuangan', color: '#3b82f6' },
          { name: 'Kelola Data', icon: FolderOpen, page: 'KelolaDataKeuangan', color: '#8b5cf6' },
        ]
      },
      {
        id: 'admin', name: 'ADMIN', icon: Users, color: '#ef4444',
        items: [
          { name: 'Siswa', icon: Users, page: 'Siswa', color: '#3b82f6' },
          { name: 'Pegawai', icon: GraduationCap, page: 'Guru', color: '#7c3aed' },
          { name: 'Kelas', icon: Building, page: 'Kelas', color: '#8b5cf6' },
          { name: 'Data Lulusan', icon: GraduationCap, page: 'DataLulusan', color: '#f59e0b' },
          { name: 'Siswa Mutasi', icon: LogOut, page: 'SiswaKeluar', color: '#f97316' },
          { name: 'Periodik Siswa', icon: Ruler, page: 'PeriodikSiswa', color: '#8b5cf6' },
        { name: 'Sarpras', icon: Package, page: 'Sarpras', color: '#0d9488' },
          { name: 'Profil Sekolah', icon: School, page: 'ProfilSekolah', color: '#0ea5e9' },
        ],
        separated: true
      }
    ]
  },
  guru: {
    topItems: [
      { name: 'Profil Saya', icon: UserCircle, page: 'ProfilGuru', color: '#7c3aed' },
      { name: 'Wali Kelas', icon: Users, page: 'WaliKelas', color: '#8b5cf6' },
      { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', color: '#3b82f6' },
      { name: 'Absensi Siswa', icon: Calendar, page: 'Absensi', color: '#10b981' },
    { name: 'Absensi Pegawai', icon: ClipboardList, page: 'AbsensiPegawai', color: '#0d9488' },
      { name: 'Nilai', icon: BookOpen, page: 'Nilai', color: '#f59e0b' },
      { name: 'Materi', icon: FolderOpen, page: 'Materi', color: '#6366f1' },
      { name: 'Catatan Siswa', icon: ClipboardList, page: 'CatatanSiswa', color: '#8b5cf6' },
      { name: 'Hapalan', icon: BookMarked, page: 'Hapalan', color: '#16a34a' },
      { name: 'Kalender Akademik', icon: CalendarDays, page: 'KalenderAkademik', color: '#6366f1' },
    ],
    groups: []
  }
};

const ROLE_LABELS = {
  admin: 'Admin', operator: 'Operator', kepsek: 'Kepala Sekolah',
  bendahara: 'Bendahara', guru: 'Guru', tu: 'Tata Usaha', piket: 'Piket'
};

const ROLE_COLORS = {
  admin: { bg: 'bg-rose-500/20', text: 'text-rose-300', dot: 'bg-rose-400' },
  operator: { bg: 'bg-orange-500/20', text: 'text-orange-300', dot: 'bg-orange-400' },
  kepsek: { bg: 'bg-purple-500/20', text: 'text-purple-300', dot: 'bg-purple-400' },
  bendahara: { bg: 'bg-teal-500/20', text: 'text-teal-300', dot: 'bg-teal-400' },
  guru: { bg: 'bg-blue-500/20', text: 'text-blue-300', dot: 'bg-blue-400' },
  tu: { bg: 'bg-amber-500/20', text: 'text-amber-300', dot: 'bg-amber-400' },
  piket: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', dot: 'bg-cyan-400' },
};

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const { user: currentUser } = useAuth();

  const userRole = currentUser?.role || 'guru';
  const baseMenu = ROLE_MENU[userRole] || ROLE_MENU['tu'];

  // Untuk Guru: tampilkan menu Periodik Siswa & Home Visit hanya jika menjadi Wali Kelas dengan siswa aktif
  const isGuru = userRole === 'guru';
  const { waliKelasIds: waliKelasIdsMenu, hasSiswa: hasSiswaMenu } = useWaliKelas();
  const isWaliKelasWithSiswa = isGuru && waliKelasIdsMenu.length > 0 && hasSiswaMenu;

  // Operator: email tidak terdata sebagai Pegawai (dipakai bergiliran), sembunyikan Profil Saya
  const showProfilSaya = userRole !== 'operator';
  let topItems = (baseMenu.topItems.some(i => i.page === 'ProfilGuru') || !showProfilSaya)
    ? baseMenu.topItems
    : [...baseMenu.topItems, { name: 'Profil Saya', icon: UserCircle, page: 'ProfilGuru', color: '#7c3aed' }];
  if (isWaliKelasWithSiswa) {
    topItems = [...topItems, { name: 'Periodik Siswa', icon: Ruler, page: 'PeriodikSiswa', color: '#8b5cf6' }, { name: 'Home Visit', icon: HomeIcon, page: 'HomeVisit', color: '#6366f1' }];
  }
  const menuConfig = { ...baseMenu, topItems };
  const roleColor = ROLE_COLORS[userRole] || ROLE_COLORS['guru'];

  // Kepsek dashboard: full-screen, no sidebar
  if (currentPageName === 'Kepsek' && userRole === 'kepsek') {
    return <div className="min-h-screen font-inter">{children}</div>;
  }

  const handleGroupClick = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const initials = currentUser?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'U';

  return (
    <div className="min-h-screen bg-slate-950 font-inter">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
              <School className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-tight leading-none">YPPI ARRAHMAH</span>
              <p className="text-slate-500 text-[10px] leading-none mt-0.5">Sistem Informasi Sekolah</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LiveClock compact />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 h-full w-64 bg-slate-900 border-r border-slate-800
        transform transition-transform duration-300 ease-in-out
        flex flex-col pt-14 lg:pt-0 pb-16 lg:pb-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${sidebarHidden ? 'lg:-translate-x-full' : 'lg:translate-x-0'}
      `}>
        {/* Logo Area */}
        <div className="flex items-center gap-3 px-5 h-[72px] border-b border-slate-800 flex-shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
            <School className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-sm font-bold leading-none">YPPI ARRAHMAH</h1>
            <p className="text-slate-500 text-xs mt-0.5">Sistem Informasi Sekolah</p>
          </div>
          <button
            onClick={() => setSidebarHidden(true)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
            title="Sembunyikan Menu"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
          <div className="space-y-0.5">
            {menuConfig.topItems.map((item) => {
              const isActive = currentPageName === item.page;
              const Icon = item.icon;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-blue-500" />
                  )}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    isActive ? 'bg-blue-500/20' : 'bg-slate-800 group-hover:bg-slate-700'
                  }`}>
                    <Icon className="w-4 h-4" style={{ color: isActive ? item.color : undefined }} />
                  </div>
                  <span className={`text-sm font-medium ${isActive ? 'text-blue-300' : ''}`}>{item.name}</span>
                </Link>
              );
            })}

            {menuConfig.groups.map((group) => {
              const GroupIcon = group.icon;
              const isExpanded = expandedGroups[group.id];
              return (
                <React.Fragment key={group.id}>
                  {group.separated && <div className="my-3 border-t border-slate-800" />}
                  <div>
                    <button
                      onClick={() => handleGroupClick(group.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <GroupIcon className="w-4 h-4" style={{ color: group.color }} />
                      </div>
                      <span className="flex-1 text-left text-xs font-bold tracking-widest uppercase text-slate-500">{group.name}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-3 mt-0.5 space-y-0.5 overflow-hidden"
                        >
                          {group.items.map((item) => {
                            const isActive = currentPageName === item.page;
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.page}
                                to={createPageUrl(item.page)}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group ${
                                  isActive
                                    ? 'bg-blue-600/20 text-blue-400'
                                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60'
                                }`}
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isActive ? 'bg-blue-500/20' : 'bg-slate-800/80'
                                }`}>
                                  <Icon className="w-3.5 h-3.5" style={{ color: isActive ? item.color : undefined }} />
                                </div>
                                <span className={`text-sm ${isActive ? 'font-medium text-blue-300' : ''}`}>{item.name}</span>
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="flex-shrink-0 p-3 border-t border-slate-800">
          {currentUser && (
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-800/60">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-blue-500/20">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{currentUser.full_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${roleColor.dot}`} />
                  <span className={`text-xs ${roleColor.text}`}>{ROLE_LABELS[userRole] || 'User'}</span>
                </div>
              </div>
              <button
                onClick={() => base44.auth.logout()}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-xs text-slate-600 text-center mt-2">© {new Date().getFullYear()} SIS Sekolah</p>
        </div>
      </aside>

      {/* Overlay mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`${sidebarHidden ? 'lg:ml-0' : 'lg:ml-64'} pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen bg-slate-50 transition-all duration-300`}>
        <PengingatMengajarProvider>
          <KepsekBackButton />
          {children}
        </PengingatMengajarProvider>
      </main>

      {/* Floating show-sidebar button (desktop, when hidden) */}
      {sidebarHidden && (
        <button
          onClick={() => setSidebarHidden(false)}
          className="hidden lg:flex fixed top-3 left-3 z-40 p-2 rounded-lg bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 shadow-lg border border-slate-700 transition-colors"
          title="Tampilkan Menu"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      )}

      {/* Bottom Navigation - Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50">
        <div className="flex items-stretch justify-evenly px-1 h-16 pb-safe">
          {menuConfig.topItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all min-w-0"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? 'bg-white/10' : ''
                }`}>
                  <Icon className="w-[18px] h-[18px]" style={{ color: isActive ? item.color : '#64748b' }} />
                </div>
                <span className="text-[10px] font-medium leading-none truncate w-full text-center px-1" style={{ color: isActive ? item.color : '#64748b' }}>
                  {item.name.split(' ')[0]}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all min-w-0"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5">
              <Menu className="w-[18px] h-[18px] text-slate-400" />
            </div>
            <span className="text-[10px] font-medium leading-none text-slate-400">Menu</span>
          </button>
        </div>
      </nav>

      {/* Global Bell Alarm — aktif di semua halaman untuk Operator/Piket */}
      {userRole === 'operator' && <BellAlarmSystem floating />}
    </div>
  );
}