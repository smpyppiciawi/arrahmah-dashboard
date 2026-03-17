import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Users, Lock, User, ArrowLeft, Eye, EyeOff, School } from "lucide-react";
import { useAuth } from '@/lib/AuthContext';

export default function Masuk() {
  const [view, setView] = useState('main');
  const [nis, setNis] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { siswaLogin } = useAuth();

  const handleStaffLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const handleSiswaLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const siswaList = await base44.entities.Siswa.filter({ nis: nis.trim() });
      if (!siswaList || siswaList.length === 0) {
        setError('NIS tidak ditemukan. Periksa kembali NIS Anda.');
        return;
      }
      const siswa = siswaList[0];
      if (!siswa.tanggal_lahir) {
        setError('Data tanggal lahir belum tersedia. Hubungi admin sekolah.');
        return;
      }
      const [year, month, day] = siswa.tanggal_lahir.split('-');
      const expectedPassword = day + month + year;
      if (password !== expectedPassword) {
        setError('Password salah. Gunakan format tanggal lahir DDMMYYYY (contoh: 10011996)');
        return;
      }
      siswaLogin(siswa);
    } catch (err) {
      setError('Terjadi kesalahan koneksi. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20 shadow-lg">
            <School className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">YPPI ARRAHMAH</h1>
          <p className="text-blue-200 mt-2 text-sm">Sistem Informasi Sekolah</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {view === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-center text-white/60 mb-6 text-sm">Pilih tipe akun untuk masuk ke sistem</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Staff Card */}
                <motion.div whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <Card
                    className="bg-white/10 backdrop-blur-md border border-white/20 cursor-pointer hover:bg-white/15 transition-all duration-300 group shadow-xl"
                    onClick={handleStaffLogin}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="w-16 bg-gradient-to-br from-blue-400/40 to-blue-600/40 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:from-blue-400/60 group-hover:to-blue-600/60 transition-all duration-300 shadow-inner p-4">
                        <Users className="w-8 h-8 text-blue-100" />
                      </div>
                      <h3 className="text-white font-bold text-xl mb-2">Login Staff</h3>
                      <p className="text-blue-200/80 text-sm mb-4">Admin · Kepala Sekolah<br />Bendahara · Guru</p>
                      <div className="inline-flex items-center gap-1.5 text-xs text-blue-300 bg-blue-500/20 rounded-full px-3 py-1.5 border border-blue-400/20">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Masuk dengan Email
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Siswa Card */}
                <motion.div whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <Card
                    className="bg-white/10 backdrop-blur-md border border-white/20 cursor-pointer hover:bg-white/15 transition-all duration-300 group shadow-xl"
                    onClick={() => setView('siswa-form')}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="w-16 bg-gradient-to-br from-purple-400/40 to-purple-600/40 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:from-purple-400/60 group-hover:to-purple-600/60 transition-all duration-300 shadow-inner p-4">
                        <GraduationCap className="w-8 h-8 text-purple-100" />
                      </div>
                      <h3 className="text-white font-bold text-xl mb-2">Portal Siswa</h3>
                      <p className="text-purple-200/80 text-sm mb-4">Siswa & Orang Tua<br />Pantau perkembangan belajar</p>
                      <div className="inline-flex items-center gap-1.5 text-xs text-purple-300 bg-purple-500/20 rounded-full px-3 py-1.5 border border-purple-400/20">
                        <User className="w-3 h-3" />
                        Masuk dengan NIS
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          )}

          {view === 'siswa-form' && (
            <motion.div
              key="siswa-form"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
                <CardContent className="p-8">
                  <button
                    onClick={() => { setView('main'); setError(''); setNis(''); setPassword(''); }}
                    className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors mb-6 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" /> Kembali ke pilihan
                  </button>

                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-400/40 to-purple-600/40 rounded-2xl flex items-center justify-center mx-auto mb-3 p-3">
                      <GraduationCap className="w-7 h-7 text-purple-100" />
                    </div>
                    <h2 className="text-white font-bold text-xl">Portal Siswa</h2>
                    <p className="text-purple-200/70 text-sm mt-1">Masukkan NIS dan tanggal lahir sebagai password</p>
                  </div>

                  <form onSubmit={handleSiswaLogin} className="space-y-4">
                    <div>
                      <label className="text-blue-200 text-sm mb-1.5 block font-medium">NIS (Nomor Induk Siswa)</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                          value={nis}
                          onChange={(e) => setNis(e.target.value)}
                          placeholder="Masukkan NIS"
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-purple-400 focus:ring-purple-400/20"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-blue-200 text-sm mb-1.5 block font-medium">Password (Tanggal Lahir)</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Format: DDMMYYYY"
                          className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-purple-400"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-white/30 text-xs mt-1.5">Contoh: lahir 10 Januari 1996 → password: <span className="text-white/50 font-mono">10011996</span></p>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-200 text-sm"
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-5 rounded-xl mt-2 shadow-lg shadow-purple-900/50"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Memverifikasi...
                        </span>
                      ) : 'Masuk ke Portal Siswa'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-white/25 text-xs mt-6">
          © {new Date().getFullYear()} YPPI ARRAHMAH · Sistem Informasi Sekolah
        </p>
      </div>
    </div>
  );
}