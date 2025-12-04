import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { 
  LayoutDashboard, Users, Building, Calendar, Wallet, 
  BookOpen, FolderOpen, GraduationCap, Menu, X, ChevronRight,
  School
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', color: 'text-blue-500' },
  { name: 'Siswa', icon: Users, page: 'Siswa', color: 'text-blue-500' },
  { name: 'Guru', icon: GraduationCap, page: 'Guru', color: 'text-violet-500' },
  { name: 'Kelas', icon: Building, page: 'Kelas', color: 'text-purple-500' },
  { name: 'Absensi', icon: Calendar, page: 'Absensi', color: 'text-emerald-500' },
  { name: 'Keuangan', icon: Wallet, page: 'Keuangan', color: 'text-teal-500' },
  { name: 'Nilai', icon: BookOpen, page: 'Nilai', color: 'text-amber-500' },
  { name: 'Materi', icon: FolderOpen, page: 'Materi', color: 'text-indigo-500' },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <div className="flex items-center gap-3 px-6 h-16 border-b">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
              <School className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800">SIS Sekolah</h1>
              <p className="text-xs text-slate-400">Sistem Informasi</p>
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
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-50'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : item.color}`} />
                    <span className={`font-medium ${isActive ? 'text-blue-600' : ''}`}>
                      {item.name}
                    </span>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 ml-auto text-blue-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t">
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
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}