import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Menu, LayoutDashboard, Calendar, ClipboardList, BookOpen, Home as HomeIcon,
  CalendarDays, Settings, Users, GraduationCap, Building, LogOut, Ruler, Package,
  Wallet, FolderOpen, TrendingUp, ScanLine
} from 'lucide-react';

const MENU = {
  top: [
    { name: 'Dashboard Kepsek', icon: TrendingUp, page: 'Kepsek', color: '#06b6d4' },
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', color: '#3b82f6' },
    { name: 'Absensi Siswa', icon: Calendar, page: 'Absensi', color: '#10b981' },
    { name: 'Absensi Pegawai', icon: ClipboardList, page: 'AbsensiPegawai', color: '#0d9488' },
    { name: 'Scan Absensi', icon: ScanLine, page: 'ScanAbsensi', color: '#10b981' },
    { name: 'Nilai', icon: BookOpen, page: 'Nilai', color: '#f59e0b' },
    { name: 'Catatan Siswa', icon: ClipboardList, page: 'CatatanSiswa', color: '#8b5cf6' },
    { name: 'Home Visit', icon: HomeIcon, page: 'HomeVisit', color: '#6366f1' },
    { name: 'Kalender Akademik', icon: CalendarDays, page: 'KalenderAkademik', color: '#6366f1' },
    { name: 'Pengaturan', icon: Settings, page: 'Pengaturan', color: '#64748b' },
  ],
  groups: [
    {
      name: 'ADMINISTRASI', icon: Users, color: '#ef4444', items: [
        { name: 'Siswa', icon: Users, page: 'Siswa', color: '#3b82f6' },
        { name: 'Pegawai', icon: GraduationCap, page: 'Guru', color: '#7c3aed' },
        { name: 'Kelas', icon: Building, page: 'Kelas', color: '#8b5cf6' },
        { name: 'Data Lulusan', icon: GraduationCap, page: 'DataLulusan', color: '#f59e0b' },
        { name: 'Siswa Keluar', icon: LogOut, page: 'SiswaKeluar', color: '#f97316' },
        { name: 'Periodik Siswa', icon: Ruler, page: 'PeriodikSiswa', color: '#8b5cf6' },
        { name: 'Sarpras', icon: Package, page: 'Sarpras', color: '#0d9488' },
      ],
    },
    {
      name: 'KEUANGAN', icon: Wallet, color: '#14b8a6', items: [
        { name: 'Transaksi', icon: Wallet, page: 'Transaksi', color: '#14b8a6' },
        { name: 'Laporan', icon: ClipboardList, page: 'LaporanKeuangan', color: '#3b82f6' },
        { name: 'Kelola Data', icon: FolderOpen, page: 'KelolaDataKeuangan', color: '#8b5cf6' },
      ],
    },
  ],
};

function MenuItem({ item, isDark, onClick }) {
  const Icon = item.icon;
  const cls = isDark
    ? 'text-slate-300 hover:bg-slate-800'
    : 'text-slate-700 hover:bg-slate-100';
  return (
    <Link to={createPageUrl(item.page)} onClick={onClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${cls}`}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${item.color}20` }}>
        <Icon className="w-4 h-4" style={{ color: item.color }} />
      </div>
      <span className="text-sm font-medium">{item.name}</span>
    </Link>
  );
}

export default function KepsekMenuDrawer({ isDark }) {
  const [open, setOpen] = useState(false);
  const labelCls = isDark ? 'text-slate-400' : 'text-slate-500';
  const headerCls = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const titleCls = isDark ? 'text-white' : 'text-slate-800';
  const triggerCls = isDark
    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
    : 'bg-slate-100 hover:bg-slate-200 text-slate-600';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center transition-colors ${triggerCls}`}
          title="Menu Navigasi"
        >
          <Menu className="w-4 h-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className={`w-72 p-0 ${headerCls}`}>
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle className={titleCls}>Menu Kepala Sekolah</SheetTitle>
        </SheetHeader>
        <div className="px-3 py-3 overflow-y-auto h-[calc(100vh-64px)] space-y-0.5">
          {MENU.top.map((item) => (
            <MenuItem key={item.page} item={item} isDark={isDark} onClick={() => setOpen(false)} />
          ))}
          {MENU.groups.map((g) => (
            <div key={g.name} className="mt-4">
              <p className={`px-3 text-[10px] font-bold tracking-widest uppercase mb-1 ${labelCls}`}>{g.name}</p>
              {g.items.map((item) => (
                <MenuItem key={item.page} item={item} isDark={isDark} onClick={() => setOpen(false)} />
              ))}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}