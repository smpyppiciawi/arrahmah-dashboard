import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  School, Users, Calendar, Wallet, BookOpen, 
  FolderOpen, ArrowRight, GraduationCap, Building 
} from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const features = [
    {
      icon: Users,
      title: "Data Siswa",
      description: "Kelola data siswa per kelas",
      color: "from-blue-500 to-blue-600",
      page: "Siswa"
    },
    {
      icon: Calendar,
      title: "Absensi",
      description: "Rekap kehadiran siswa harian",
      color: "from-emerald-500 to-emerald-600",
      page: "Absensi"
    },
    {
      icon: Wallet,
      title: "Keuangan",
      description: "Monitor pemasukan & pengeluaran",
      color: "from-teal-500 to-teal-600",
      page: "Keuangan"
    },
    {
      icon: BookOpen,
      title: "Nilai",
      description: "Input dan kelola nilai siswa",
      color: "from-amber-500 to-amber-600",
      page: "Nilai"
    },
    {
      icon: FolderOpen,
      title: "Bank Materi",
      description: "Repositori materi pembelajaran",
      color: "from-indigo-500 to-indigo-600",
      page: "Materi"
    },
    {
      icon: Building,
      title: "Data Kelas",
      description: "Kelola kelas dan rombongan belajar",
      color: "from-purple-500 to-purple-600",
      page: "Kelas"
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <School className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">YPPI ARRAHMAH</h1>
              <p className="text-xs text-slate-500">Sistem Informasi Sekolah</p>
            </div>
          </div>
          {currentUser ? (
            <Button 
              onClick={() => navigate(createPageUrl('Dashboard'))}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              Login
            </Button>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-block p-4 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg mb-6">
            <School className="w-16 h-16 md:w-20 md:h-20 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-slate-800 mb-4">
            Selamat Datang di
            <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SIS YPPI Arrahmah
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Sistem Informasi Sekolah yang modern dan terintegrasi untuk mengelola 
            seluruh aspek administrasi sekolah dengan mudah dan efisien.
          </p>
          
          {currentUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <Card className="inline-block border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                    {currentUser.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-800">{currentUser.full_name}</p>
                    <p className="text-sm text-slate-500">{currentUser.email}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => currentUser && navigate(createPageUrl(feature.page))}
              >
                <CardContent className="p-6">
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description}</p>
                  <div className="flex items-center text-blue-600 mt-4 group-hover:translate-x-2 transition-transform duration-300">
                    <span className="text-sm font-medium">Selengkapnya</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
            <CardContent className="p-8 md:p-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-80" />
                  <p className="text-3xl font-bold mb-1">300+</p>
                  <p className="text-sm opacity-90">Siswa Aktif</p>
                </div>
                <div className="text-center">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-80" />
                  <p className="text-3xl font-bold mb-1">25+</p>
                  <p className="text-sm opacity-90">Tenaga Pengajar</p>
                </div>
                <div className="text-center">
                  <Building className="w-8 h-8 mx-auto mb-2 opacity-80" />
                  <p className="text-3xl font-bold mb-1">12</p>
                  <p className="text-sm opacity-90">Rombongan Belajar</p>
                </div>
                <div className="text-center">
                  <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-80" />
                  <p className="text-3xl font-bold mb-1">100+</p>
                  <p className="text-sm opacity-90">Materi Ajar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="border-t bg-white/80 backdrop-blur-sm mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} YPPI Arrahmah. Sistem Informasi Sekolah.
          </p>
        </div>
      </div>
    </div>
  );
}