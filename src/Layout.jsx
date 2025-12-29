import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import {
  LayoutDashboard, Users, Building, Calendar, Wallet,
  BookOpen, FolderOpen, GraduationCap, Menu, X, ChevronRight,
  School, LogOut } from
'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";

const allMenuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', color: 'text-blue-500', roles: ['admin', 'kepsek', 'bendahara', 'guru'] },
  { name: 'Siswa', icon: Users, page: 'Siswa', color: 'text-blue-500', roles: ['admin', 'kepsek'] },
  { name: 'Guru', icon: GraduationCap, page: 'Guru', color: 'text-violet-500', roles: ['admin'] },
  { name: 'Kelas', icon: Building, page: 'Kelas', color: 'text-purple-500', roles: ['admin', 'kepsek'] },
  { name: 'Absensi', icon: Calendar, page: 'Absensi', color: 'text-emerald-500', roles: ['admin', 'kepsek', 'guru'] },
  { name: 'Keuangan', icon: Wallet, page: 'Keuangan', color: 'text-teal-500', roles: ['admin', 'kepsek', 'bendahara'] },
  { name: 'Nilai', icon: BookOpen, page: 'Nilai', color: 'text-amber-500', roles: ['admin', 'kepsek', 'guru'] },
  { name: 'Materi', icon: FolderOpen, page: 'Materi', color: 'text-indigo-500', roles: ['admin', 'guru'] }
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

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
              {menuItems.map((item) => {
                const isActive = currentPageName === item.page;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                      ${isActive ?
                    'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 shadow-sm' :
                    'text-slate-600 hover:bg-slate-50'}
                    `
                    }>

                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : item.color}`} />
                    <span className={`font-medium ${isActive ? 'text-blue-600' : ''}`}>
                      {item.name}
                    </span>
                    {isActive &&
                    <ChevronRight className="w-4 h-4 ml-auto text-blue-400" />
                    }
                  </Link>);

              })}
            </div>
          </nav>

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