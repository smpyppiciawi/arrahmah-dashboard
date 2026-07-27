import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Search, Clock, UserSearch } from "lucide-react";

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function getTodayName() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const today = days[new Date().getDay()];
  return HARI.includes(today) ? today : 'Senin';
}

export default function JadwalTab() {
  const [selectedHari, setSelectedHari] = useState(getTodayName());
  const [searchGuru, setSearchGuru] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('all');

  const { data: jadwalList = [], isLoading } = useQuery({
    queryKey: ['jadwal-all'],
    queryFn: () => base44.entities.JadwalPelajaran.list(),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const sortedKelasList = useMemo(() =>
    [...kelasList].sort((a, b) => {
      const ta = parseInt(a.tingkat) || 0;
      const tb = parseInt(b.tingkat) || 0;
      if (ta !== tb) return ta - tb;
      return (a.nama_kelas || '').localeCompare(b.nama_kelas || '');
    }), [kelasList]);

  const jadwalHari = useMemo(() =>
    jadwalList
      .filter(j => j.hari === selectedHari)
      .sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || '')),
    [jadwalList, selectedHari]);

  // View 1: Jadwal Mengajar Guru (all teachers teaching on this day)
  const guruMengajar = useMemo(() => {
    let list = jadwalHari.filter(j => j.nama_guru);
    if (searchGuru) {
      const q = searchGuru.toLowerCase();
      list = list.filter(j =>
        j.nama_guru?.toLowerCase().includes(q) ||
        j.mapel?.toLowerCase().includes(q) ||
        j.nama_kelas?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [jadwalHari, searchGuru]);

  // View 2: Jadwal per Kelas
  const jadwalPerKelas = useMemo(() => {
    if (selectedKelas === 'all') return [];
    return jadwalHari.filter(j => j.kelas_id === selectedKelas);
  }, [jadwalHari, selectedKelas]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-500" />
            Jadwal Pelajaran & Mengajar Guru
          </CardTitle>
          <Select value={selectedHari} onValueChange={setSelectedHari}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {HARI.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="guru" className="w-full">
          <TabsList className="mb-3">
            <TabsTrigger value="guru" className="text-xs sm:text-sm">
              <UserSearch className="w-3.5 h-3.5 mr-1" /> Mengajar Guru
            </TabsTrigger>
            <TabsTrigger value="kelas" className="text-xs sm:text-sm">
              <CalendarDays className="w-3.5 h-3.5 mr-1" /> Per Kelas
            </TabsTrigger>
          </TabsList>

          {/* View: Jadwal Mengajar Guru */}
          <TabsContent value="guru">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Cari guru, mapel, atau kelas..."
                value={searchGuru}
                onChange={(e) => setSearchGuru(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Memuat data...</div>
            ) : guruMengajar.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">Tidak ada jadwal mengajar pada hari {selectedHari}</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-2.5">Jam</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-2.5">Mata Pelajaran</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-2.5">Guru</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-2.5">Kelas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guruMengajar.map((j, i) => (
                      <tr key={j.id} className={`border-b last:border-0 hover:bg-emerald-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="font-mono">{j.jam_mulai} - {j.jam_selesai}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{j.mapel}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-700">{j.nama_guru}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="text-xs">{j.nama_kelas}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {guruMengajar.length > 0 && (
              <p className="text-xs text-slate-400 text-right mt-2">{guruMengajar.length} jadwal mengajar</p>
            )}
          </TabsContent>

          {/* View: Jadwal Per Kelas */}
          <TabsContent value="kelas">
            <div className="mb-3">
              <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger className="w-full sm:w-56 h-8 text-sm"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">— Pilih Kelas —</SelectItem>
                  {sortedKelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedKelas === 'all' ? (
              <div className="text-center py-8 text-slate-400 text-sm">Pilih kelas untuk melihat jadwal</div>
            ) : jadwalPerKelas.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">Belum ada jadwal untuk kelas ini pada hari {selectedHari}</div>
            ) : (
              <div className="space-y-1">
                {jadwalPerKelas.map((j, i) => (
                  <div key={j.id} className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${i % 2 === 0 ? 'bg-white border-slate-100' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 w-28">
                        <Clock className="w-3 h-3" />
                        <span className="font-mono">{j.jam_mulai} - {j.jam_selesai}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-800">{j.mapel}</span>
                    </div>
                    {j.nama_guru && (
                      <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">{j.nama_guru}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}