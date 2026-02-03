import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, User, Trophy, AlertCircle, Stethoscope, X, Calendar, Award } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function CariRecordSiswa({ open, onOpenChange }) {
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState(null);

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: prestasiList = [] } = useQuery({
    queryKey: ['prestasi'],
    queryFn: () => base44.entities.Prestasi.list('-tanggal'),
  });

  const { data: pelanggaranList = [] } = useQuery({
    queryKey: ['pelanggaran'],
    queryFn: () => base44.entities.Pelanggaran.list('-tanggal'),
  });

  const { data: uksList = [] } = useQuery({
    queryKey: ['uks'],
    queryFn: () => base44.entities.UKS.list('-tanggal'),
  });

  const filteredSiswa = useMemo(() => {
    if (!selectedKelas) return [];
    return siswaList
      .filter(s => s.kelas_id === selectedKelas)
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaList, selectedKelas]);

  const siswaRecords = useMemo(() => {
    if (!selectedSiswa) return { prestasi: [], pelanggaran: [], uks: [] };
    return {
      prestasi: prestasiList.filter(p => p.siswa_id === selectedSiswa.id),
      pelanggaran: pelanggaranList.filter(p => p.siswa_id === selectedSiswa.id),
      uks: uksList.filter(u => u.siswa_id === selectedSiswa.id)
    };
  }, [selectedSiswa, prestasiList, pelanggaranList, uksList]);

  const totalPoin = siswaRecords.pelanggaran.reduce((sum, p) => sum + (p.poin || 0), 0);

  const handleReset = () => {
    setSelectedKelas('');
    setSelectedSiswa(null);
  };

  const categoryColors = {
    'Juara 1': 'bg-yellow-100 text-yellow-800',
    'Juara 2': 'bg-slate-100 text-slate-800',
    'Juara 3': 'bg-orange-100 text-orange-800',
    'Finalis': 'bg-blue-100 text-blue-800',
    'Peserta': 'bg-emerald-100 text-emerald-800'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" />
            Cari Record Siswa
          </DialogTitle>
        </DialogHeader>

        {/* Filter Section */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Pilih Kelas</Label>
            <Select value={selectedKelas} onValueChange={(v) => { setSelectedKelas(v); setSelectedSiswa(null); }}>
              <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
              <SelectContent>
                {kelasList.map(k => (
                  <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pilih Siswa</Label>
            <Select 
              value={selectedSiswa?.id || ''} 
              onValueChange={(v) => setSelectedSiswa(siswaList.find(s => s.id === v))}
              disabled={!selectedKelas}
            >
              <SelectTrigger><SelectValue placeholder={selectedKelas ? "Pilih Siswa" : "Pilih kelas dulu"} /></SelectTrigger>
              <SelectContent>
                {filteredSiswa.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Student Info Card */}
        {selectedSiswa && (
          <Card className="mb-4 border-indigo-200 bg-indigo-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-indigo-900">{selectedSiswa.nama}</h3>
                    <p className="text-sm text-indigo-600">NIS: {selectedSiswa.nis} | Kelas: {selectedSiswa.nama_kelas}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <Trophy className="w-3 h-3 mr-1" />
                    {siswaRecords.prestasi.length} Prestasi
                  </Badge>
                  <Badge className={totalPoin >= 100 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {totalPoin} Poin
                  </Badge>
                  <Badge className="bg-rose-100 text-rose-700">
                    <Stethoscope className="w-3 h-3 mr-1" />
                    {siswaRecords.uks.length} UKS
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Records Tabs */}
        {selectedSiswa && (
          <Tabs defaultValue="prestasi" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prestasi" className="flex items-center gap-1">
                <Trophy className="w-4 h-4" /> Prestasi ({siswaRecords.prestasi.length})
              </TabsTrigger>
              <TabsTrigger value="pelanggaran" className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Pelanggaran ({siswaRecords.pelanggaran.length})
              </TabsTrigger>
              <TabsTrigger value="uks" className="flex items-center gap-1">
                <Stethoscope className="w-4 h-4" /> UKS ({siswaRecords.uks.length})
              </TabsTrigger>
            </TabsList>

            {/* Prestasi Tab */}
            <TabsContent value="prestasi" className="mt-4">
              {siswaRecords.prestasi.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Belum ada data prestasi</div>
              ) : (
                <div className="space-y-3">
                  {siswaRecords.prestasi.map(item => (
                    <Card key={item.id} className="border-emerald-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Award className="w-4 h-4 text-emerald-600" />
                              <span className="font-semibold">{item.nama_prestasi}</span>
                            </div>
                            <p className="text-sm text-slate-500">{item.penyelenggara}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={categoryColors[item.kategori]}>{item.kategori}</Badge>
                            <p className="text-xs text-slate-400 mt-1">
                              {format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{item.jenis_prestasi}</Badge>
                          <Badge variant="outline">{item.tingkat}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Pelanggaran Tab */}
            <TabsContent value="pelanggaran" className="mt-4">
              {siswaRecords.pelanggaran.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Belum ada data pelanggaran</div>
              ) : (
                <div className="space-y-3">
                  {siswaRecords.pelanggaran.map(item => (
                    <Card key={item.id} className="border-red-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <span className="font-semibold">{item.uraian}</span>
                            </div>
                            <p className="text-sm text-slate-500">Sanksi: {item.sanksi || '-'}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={
                              item.jenis_pelanggaran === 'Sangat Berat' ? 'bg-red-600 text-white' :
                              item.jenis_pelanggaran === 'Berat' ? 'bg-red-100 text-red-700' :
                              item.jenis_pelanggaran === 'Sedang' ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }>
                              {item.poin} Poin
                            </Badge>
                            <p className="text-xs text-slate-400 mt-1">
                              {format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{item.jenis_pelanggaran}</Badge>
                          <Badge variant="outline">{item.kategori}</Badge>
                          <Badge className={item.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                            {item.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* UKS Tab */}
            <TabsContent value="uks" className="mt-4">
              {siswaRecords.uks.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Belum ada data kunjungan UKS</div>
              ) : (
                <div className="space-y-3">
                  {siswaRecords.uks.map(item => (
                    <Card key={item.id} className="border-rose-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Stethoscope className="w-4 h-4 text-rose-600" />
                              <span className="font-semibold">{item.keluhan}</span>
                            </div>
                            <p className="text-sm text-slate-500">Penanganan: {item.penanganan || '-'}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={
                              item.status === 'Di UKS' ? 'bg-amber-100 text-amber-700' :
                              item.status === 'Pulang' ? 'bg-red-100 text-red-700' :
                              'bg-emerald-100 text-emerald-700'
                            }>
                              {item.status}
                            </Badge>
                            <p className="text-xs text-slate-400 mt-1">
                              {format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2 text-xs text-slate-500">
                          <span>Masuk: {item.jam_masuk}</span>
                          {item.jam_keluar && <span>| Keluar: {item.jam_keluar}</span>}
                          {item.suhu_badan && <span>| Suhu: {item.suhu_badan}°C</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {!selectedSiswa && (
          <div className="text-center py-12 text-slate-400">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Pilih kelas dan siswa untuk melihat record</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}