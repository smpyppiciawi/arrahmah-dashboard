import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import {
  LayoutDashboard, Users, Building, Calendar, Wallet,
  BookOpen, FolderOpen, GraduationCap, Menu, X, ChevronRight,
  School, LogOut, Lock, ChevronDown, ClipboardList } from
'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";

const menuGroups = [
  {
    id: 'admin',
    name: 'MENU ADMIN',
    icon: Users,
    color: 'text-red-500',
    password: 'Y@pis20200721',
    items: [
      { name: 'Siswa', icon: Users, page: 'Siswa', color: 'text-blue-500' },
      { name: 'Guru', icon: GraduationCap, page: 'Guru', color: 'text-violet-500' },
      { name: 'Kelas', icon: Building, page: 'Kelas', color: 'text-purple-500' }
    ]
  },
  {
    id: 'guru',
    name: 'MENU GURU',
    icon: GraduationCap,
    color: 'text-green-500',
    password: '20200721',
    items: [
      { name: 'Absensi', icon: Calendar, page: 'Absensi', color: 'text-emerald-500' },
      { name: 'Nilai', icon: BookOpen, page: 'Nilai', color: 'text-amber-500' },
      { name: 'Materi', icon: FolderOpen, page: 'Materi', color: 'text-indigo-500' },
      { name: 'Catatan Siswa', icon: ClipboardList, page: 'CatatanSiswa', color: 'text-purple-500' }
    ]
  },
  {
    id: 'bendahara',
    name: 'MENU BENDAHARA',
    icon: Wallet,
    color: 'text-teal-500',
    password: 'Y@pis20200721',
    items: [
      { name: 'Keuangan', icon: Wallet, page: 'Keuangan', color: 'text-teal-500' }
    ]
  }
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [unlockedGroups, setUnlockedGroups] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const userRole = currentUser?.role || 'guru';

  const handleGroupClick = (group) => {
    if (unlockedGroups[group.id]) {
      setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }));
    } else {
      setSelectedGroup(group);
      setPasswordInput('');
      setPasswordError('');
      setShowPasswordDialog(true);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === selectedGroup.password) {
      setUnlockedGroups(prev => ({ ...prev, [selectedGroup.id]: true }));
      setExpandedGroups(prev => ({ ...prev, [selectedGroup.id]: true }));
      setShowPasswordDialog(false);
      setPasswordInput('');
      setPasswordError('');
      
      // If kepsek, redirect to page
      if (selectedGroup.id === 'kepsek') {
        window.location.href = createPageUrl('Kepsek');
      }
    } else {
      setPasswordError('Password salah!');
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-700',
      kepsek: 'bg-purple-100 text-purple-700',
      bendahara: 'bg-teal-100 text-teal-700',
      guru: 'bg-blue-100 text-blue-700'
    };
    return colors[role] || 'bg-slate-100 text-slate-700';
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Admin',
      kepsek: 'Kepala Sekolah',
      bendahara: 'Bendahara',
      guru: 'Guru'
    };
    return labels[role] || 'User';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <School className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-800">SIS Sekolah</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 h-full w-64 bg-white border-r shadow-lg
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 h-20 border-b">
            <div className="bg-slate-400 p-4 rounded-lg from-blue-500 to-indigo-600 shadow-lg">
              <School className="lucide lucide-school w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-slate-800 my-1 px-1 py-1 text-sm font-bold">YPPI ARRAHMAH</h1>
              <p className="text-xs text-slate-400">Sistem Sekolah</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <div className="space-y-1">
              {/* Dashboard - Always Visible */}
              <Link
                to={createPageUrl('Dashboard')}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${currentPageName === 'Dashboard' ?
                    'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 shadow-sm' :
                    'text-slate-600 hover:bg-slate-50'}
                `}
              >
                <LayoutDashboard className={`w-5 h-5 ${currentPageName === 'Dashboard' ? 'text-blue-600' : 'text-blue-500'}`} />
                <span className={`font-medium ${currentPageName === 'Dashboard' ? 'text-blue-600' : ''}`}>
                  Dashboard
                </span>
                {currentPageName === 'Dashboard' && <ChevronRight className="w-4 h-4 ml-auto text-blue-400" />}
              </Link>

              {/* KEPSEK - Locked */}
              <button
                onClick={() => {
                  const group = { id: 'kepsek', name: 'KEPSEK', password: 'Y@pis20200721' };
                  if (unlockedGroups['kepsek']) {
                    window.location.href = createPageUrl('Kepsek');
                    setSidebarOpen(false);
                  } else {
                    setSelectedGroup(group);
                    setPasswordInput('');
                    setPasswordError('');
                    setShowPasswordDialog(true);
                  }
                }}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full
                  ${currentPageName === 'Kepsek' ?
                    'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 shadow-sm' :
                    'text-slate-600 hover:bg-slate-50'}
                `}
              >
                <LayoutDashboard className={`w-5 h-5 ${currentPageName === 'Kepsek' ? 'text-indigo-600' : 'text-indigo-500'}`} />
                <span className={`font-semibold ${currentPageName === 'Kepsek' ? 'text-indigo-600' : ''}`}>
                  KEPSEK
                </span>
                {!unlockedGroups['kepsek'] && <Lock className="w-4 h-4 ml-auto text-slate-400" />}
                {currentPageName === 'Kepsek' && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
              </button>

              <div className="my-2 border-t border-slate-200" />

              {/* Menu Groups */}
              {menuGroups.map((group) => {
                const GroupIcon = group.icon;
                const isUnlocked = unlockedGroups[group.id];
                const isExpanded = expandedGroups[group.id];

                return (
                  <div key={group.id} className="mb-2">
                    <button
                      onClick={() => handleGroupClick(group)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-700 hover:bg-slate-50 font-semibold"
                    >
                      <GroupIcon className={`w-5 h-5 ${group.color}`} />
                      <span className="flex-1 text-left text-sm">{group.name}</span>
                      {isUnlocked ? (
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {/* Submenu Items */}
                    {isUnlocked && isExpanded && (
                      <div className="ml-4 mt-1 space-y-1">
                        {group.items.map((item) => {
                          const isActive = currentPageName === item.page;
                          const Icon = item.icon;

                          return (
                            <Link
                              key={item.page}
                              to={createPageUrl(item.page)}
                              onClick={() => setSidebarOpen(false)}
                              className={`
                                flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200
                                ${isActive ?
                                  'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600' :
                                  'text-slate-600 hover:bg-slate-50'}
                              `}
                            >
                              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : item.color}`} />
                              <span className={`text-sm ${isActive ? 'font-medium text-blue-600' : ''}`}>
                                {item.name}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Password Dialog */}
          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-500" />
                  Masukkan Password
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-3">
                    Masukkan password untuk membuka <span className="font-semibold">{selectedGroup?.name}</span>
                  </p>
                  <Input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError('');
                    }}
                    placeholder="Masukkan password"
                    className={passwordError ? 'border-red-500' : ''}
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-xs text-red-500 mt-1">{passwordError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPasswordDialog(false)}
                    className="flex-1"
                  >
                    Batal
                  </Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                    Buka
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* User Profile & Footer */}
          <div className="px-4 py-4 border-t space-y-3">
            {currentUser && (
              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {currentUser.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{currentUser.full_name}</p>
                    <Badge className={`text-xs ${getRoleBadgeColor(userRole)}`}>
                      {getRoleLabel(userRole)}
                    </Badge>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs text-red-600 hover:bg-red-50"
                  onClick={() => base44.auth.logout()}
                >
                  <LogOut className="w-3 h-3 mr-1" /> Logout
                </Button>
              </div>
            )}
            <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
              <p className="text-xs text-slate-500 text-center">
                © {new Date().getFullYear()} SIS Sekolah
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {sidebarOpen &&
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden" />

        }
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>);

}