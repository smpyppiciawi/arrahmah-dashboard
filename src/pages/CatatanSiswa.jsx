import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Award, AlertTriangle, Heart } from "lucide-react";
import PrestasiTab from '../components/catatan/PrestasiTab';
import PelanggaranTab from '../components/catatan/PelanggaranTab';
import UKSTab from '../components/catatan/UKSTab';

export default function CatatanSiswa() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-indigo-500" />
            Catatan Siswa
          </h1>
          <p className="text-slate-500 mt-1">Kelola catatan prestasi, pelanggaran, dan kesehatan siswa</p>
        </div>

        <Tabs defaultValue="prestasi" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="prestasi" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Prestasi</span>
            </TabsTrigger>
            <TabsTrigger value="pelanggaran" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Pelanggaran</span>
            </TabsTrigger>
            <TabsTrigger value="uks" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">UKS</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prestasi">
            <PrestasiTab />
          </TabsContent>

          <TabsContent value="pelanggaran">
            <PelanggaranTab />
          </TabsContent>

          <TabsContent value="uks">
            <UKSTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}