import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClipboardList, Award, AlertTriangle, Heart, Search, Calendar, FileText, TrendingDown } from "lucide-react";
import PrestasiTab from '../components/catatan/PrestasiTab';
import PelanggaranTab from '../components/catatan/PelanggaranTab';
import ImprovementTab from '../components/catatan/ImprovementTab';
import UKSTab from '../components/catatan/UKSTab';
import CariRecordSiswa from '../components/catatan/CariRecordSiswa';
import MenstruasiTab from '../components/catatan/MenstruasiTab';
import IzinTab from '../components/catatan/IzinTab';
import { useAuth } from '@/lib/AuthContext';

export default function CatatanSiswa() {
  const [showCariRecord, setShowCariRecord] = useState(false);
  const { user } = useAuth();
  const userRole = user?.role || 'guru';

  const { data: pengaturanImprovement } = useQuery({
    queryKey: ['pengaturan-improvement'],
    queryFn: async () => { const l = await base44.entities.PengaturanImprovement.list(); return l[0] || null; }
  });
  const pelanggaranModuleAktif = pengaturanImprovement?.pelanggaran_module_aktif ?? true;
  // Tab Pelanggaran (modul lama) hanya tampil untuk ADMIN/TU, meski modul aktif di pengaturan
  const showPelanggaranTab = pelanggaranModuleAktif && (userRole === 'admin' || userRole === 'tu');

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-7 h-7 text-purple-500" />
              Catatan Siswa
            </h1>
            <p className="text-slate-500 mt-0.5 text-sm">Kelola prestasi, pelanggaran, dan kesehatan siswa</p>
          </div>
          <Button
            onClick={() => setShowCariRecord(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/25 gap-2"
          >
            <Search className="w-4 h-4" /> Cari Record Siswa
          </Button>
        </div>

        <CariRecordSiswa open={showCariRecord} onOpenChange={setShowCariRecord} />

        <Tabs defaultValue="prestasi" className="w-full">
          <TabsList className="flex w-fit gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm mb-6">
            <TabsTrigger
              value="prestasi"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/25 transition-all"
            >
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Prestasi</span>
            </TabsTrigger>
            {showPelanggaranTab && (
            <TabsTrigger
              value="pelanggaran"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-red-500/25 transition-all"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Pelanggaran</span>
            </TabsTrigger>
            )}
            <TabsTrigger
              value="improvement"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-emerald-500/25 transition-all"
            >
              <TrendingDown className="w-4 h-4" />
              <span className="hidden sm:inline">Improvement</span>
            </TabsTrigger>
            <TabsTrigger
              value="uks"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-emerald-500/25 transition-all"
            >
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">UKS</span>
            </TabsTrigger>
            <TabsTrigger
              value="menstruasi"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm data-[state=active]:bg-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-pink-500/25 transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Menstruasi</span>
            </TabsTrigger>
            <TabsTrigger
              value="izin"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/25 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Izin</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prestasi"><PrestasiTab /></TabsContent>
          {showPelanggaranTab && <TabsContent value="pelanggaran"><PelanggaranTab /></TabsContent>}
          <TabsContent value="improvement"><ImprovementTab /></TabsContent>
          <TabsContent value="uks"><UKSTab /></TabsContent>
          <TabsContent value="menstruasi"><MenstruasiTab /></TabsContent>
          <TabsContent value="izin"><IzinTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}