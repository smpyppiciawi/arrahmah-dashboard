import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClipboardList, Award, AlertTriangle, Heart, Search } from "lucide-react";
import PrestasiTab from '../components/catatan/PrestasiTab';
import PelanggaranTab from '../components/catatan/PelanggaranTab';
import UKSTab from '../components/catatan/UKSTab';
import CariRecordSiswa from '../components/catatan/CariRecordSiswa';

export default function CatatanSiswa() {
  const [showCariRecord, setShowCariRecord] = useState(false);

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
            <TabsTrigger
              value="pelanggaran"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-red-500/25 transition-all"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Pelanggaran</span>
            </TabsTrigger>
            <TabsTrigger
              value="uks"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-emerald-500/25 transition-all"
            >
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">UKS</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prestasi"><PrestasiTab /></TabsContent>
          <TabsContent value="pelanggaran"><PelanggaranTab /></TabsContent>
          <TabsContent value="uks"><UKSTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}