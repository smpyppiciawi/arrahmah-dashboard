import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, User, Upload, BarChart3, Loader2 } from 'lucide-react';
import FotoPeroranganTab from '@/components/fotosiswa/FotoPeroranganTab';
import FotoMassalTab from '@/components/fotosiswa/FotoMassalTab';
import RingkasanFotoTab from '@/components/fotosiswa/RingkasanFotoTab';

export default function FotoSiswa() {
  const { data: siswaAktif = [], isLoading } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });
  const { data: siswaLulus = [] } = useQuery({
    queryKey: ['siswa', 'lulus'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Lulus' }),
  });
  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const siswaList = [...siswaAktif, ...siswaLulus];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Camera className="w-8 h-8 text-sky-500" />
            Foto Siswa
          </h1>
          <p className="text-slate-500 mt-1">
            Kelola foto siswa per jenjang (7/8/9) dan foto orang tua/wali — tersimpan terpusat, otomatis dipakai Buku Induk & modul lain
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="perorangan">
            <TabsList className="mb-2">
              <TabsTrigger value="perorangan"><User className="w-4 h-4 mr-2" />Perorangan</TabsTrigger>
              <TabsTrigger value="massal"><Upload className="w-4 h-4 mr-2" />Upload Massal</TabsTrigger>
              <TabsTrigger value="ringkasan"><BarChart3 className="w-4 h-4 mr-2" />Kelengkapan</TabsTrigger>
            </TabsList>
            <TabsContent value="perorangan" className="mt-4">
              <FotoPeroranganTab siswaList={siswaList} kelasList={kelasList} />
            </TabsContent>
            <TabsContent value="massal" className="mt-4">
              <FotoMassalTab siswaList={siswaList} kelasList={kelasList} />
            </TabsContent>
            <TabsContent value="ringkasan" className="mt-4">
              <RingkasanFotoTab siswaList={siswaList} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}