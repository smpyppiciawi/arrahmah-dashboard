import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Heart, Search, Calendar, CheckCircle, AlertTriangle, TrendingUp, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import MenstruasiDetail from "./MenstruasiDetail";
import SiswaLulusRecordsDialog from './SiswaLulusRecordsDialog';

export default function MenstruasiTab({ readOnly = false }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedKelas, setSelectedKelas] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [recapSearch, setRecapSearch] = useState('');
  const [detailSiswa, setDetailSiswa] = useState(null);
  const [haidRecords, setHaidRecords] = useState({});
  const [lulusOpen, setLulusOpen] = useState(false);

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: allSiswaList = [] } = useQuery({
    queryKey: ['siswa-all'],
    queryFn: () => base44.entities.Siswa.list(),
  });

  const siswaMap = useMemo(() => {
    const map = {};
    allSiswaList.forEach(s => { map[s.id] = s; });
    return map;
  }, [allSiswaList]);

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-perempuan', selectedKelas],
    queryFn: async () => {
      if (!selectedKelas) return [];
      const all = await base44.entities.Siswa.filter({ kelas_id: selectedKelas, status: 'Aktif' });
      return all.filter(s => s.jenis_kelamin === 'Perempuan');
    },
    enabled: !!selectedKelas,
  });

  const { data: existingRecords = [] } = useQuery({
    queryKey: ['menstruasi', selectedDate, selectedKelas],
    queryFn: async () => {
      if (!selectedKelas) return [];
      return base44.entities.Menstruasi.filter({ tanggal: selectedDate, kelas_id: selectedKelas });
    },
    enabled: !!selectedKelas,
  });

  // Build a map of siswa_id -> record for quick lookup
  useEffect(() => {
    const map = {};
    existingRecords.forEach(r => { map[r.siswa_id] = r; });
    setHaidRecords(map);
  }, [existingRecords]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = base44.entities.Menstruasi.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['menstruasi'] });
      if (event.type === 'create' && event.data?.tanggal === selectedDate && event.data?.kelas_id === selectedKelas) {
        setHaidRecords(prev => ({ ...prev, [event.data.siswa_id]: event.data }));
        toast({ title: 'Data tersinkron', description: `${event.data.nama_siswa} tercatat haid (realtime).` });
      } else if (event.type === 'delete') {
        setHaidRecords(prev => {
          const next = { ...prev };
          // Can't know which siswa_id was deleted from event alone, so refetch
          return next;
        });
      }
    });
    return unsubscribe;
  }, [selectedDate, selectedKelas, queryClient, toast]);

  const filteredSiswa = useMemo(() => {
    if (!searchQuery) return siswaList;
    return siswaList.filter(s => s.nama?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [siswaList, searchQuery]);

  const toggleHaid = async (siswa) => {
    const existing = haidRecords[siswa.id];
    if (existing) {
      // Turn off — delete record
      setHaidRecords(prev => {
        const next = { ...prev };
        delete next[siswa.id];
        return next;
      });
      try {
        await base44.entities.Menstruasi.delete(existing.id);
        toast({ title: 'Dibatalkan', description: `${siswa.nama} tidak haid hari ini.` });
      } catch (e) {
        queryClient.invalidateQueries({ queryKey: ['menstruasi'] });
      }
    } else {
      // Turn on — create record
      const kelas = kelasList.find(k => k.id === selectedKelas);
      const newRecord = {
        siswa_id: siswa.id,
        nis: siswa.nis,
        nama_siswa: siswa.nama,
        kelas_id: selectedKelas,
        nama_kelas: kelas?.nama_kelas || '',
        tanggal: selectedDate,
      };
      setHaidRecords(prev => ({ ...prev, [siswa.id]: { ...newRecord, id: 'temp-' + Date.now() } }));
      try {
        const created = await base44.entities.Menstruasi.create(newRecord);
        setHaidRecords(prev => ({ ...prev, [siswa.id]: created }));
        toast({ title: 'Tersimpan', description: `${siswa.nama} tercatat haid.` });
      } catch (e) {
        setHaidRecords(prev => {
          const next = { ...prev };
          delete next[siswa.id];
          return next;
        });
        toast({ title: 'Error', description: 'Gagal menyimpan data.', variant: 'destructive' });
      }
    }
  };

  // Recap: all menstruasi records for recap search
  const { data: allMenstruasi = [] } = useQuery({
    queryKey: ['menstruasi-all-recap'],
    queryFn: () => base44.entities.Menstruasi.list('-tanggal'),
  });

  // Unique students from menstruasi records
  const recapStudents = useMemo(() => {
    const map = {};
    allMenstruasi.forEach(r => {
      if (r.siswa_id && !map[r.siswa_id]) {
        const siswa = siswaMap[r.siswa_id];
        if (!siswa || siswa.status !== 'Aktif') return;
        map[r.siswa_id] = { siswa_id: r.siswa_id, nis: r.nis, nama_siswa: r.nama_siswa, nama_kelas: r.nama_kelas, kelas_id: r.kelas_id };
      }
    });
    let list = Object.values(map);
    if (recapSearch) {
      list = list.filter(s => s.nama_siswa?.toLowerCase().includes(recapSearch.toLowerCase()) || s.nis?.includes(recapSearch));
    }
    return list.sort((a, b) => (a.nama_siswa || '').localeCompare(b.nama_siswa || ''));
  }, [allMenstruasi, recapSearch, siswaMap]);

  // Monthly recap stats
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const monthlyCount = allMenstruasi.filter(r => r.tanggal?.startsWith(currentMonthStr)).length;
  const todayCount = allMenstruasi.filter(r => r.tanggal === selectedDate).length;
  const haidTodayCount = Object.keys(haidRecords).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <Calendar className="w-5 h-5 text-pink-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-700">{todayCount}</p>
            <p className="text-xs text-slate-500">Haid Hari Ini</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-700">{monthlyCount}</p>
            <p className="text-xs text-slate-500">Catatan Bulan Ini</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <Heart className="w-5 h-5 text-rose-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-700">{recapStudents.length}</p>
            <p className="text-xs text-slate-500">Siswa Terdata</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Recording */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" /> Pendataan Harian Menstruasi
            </CardTitle>
            {!readOnly && (
              <Button onClick={() => setLulusOpen(true)} variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                <GraduationCap className="w-4 h-4 mr-1" /> Siswa Lulus/Keluar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Tanggal</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Kelas</Label>
              <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                <SelectContent>
                  {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedKelas && (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input className="pl-9" placeholder="Cari nama siswa..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>

              {filteredSiswa.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Tidak ada siswa perempuan di kelas ini
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {filteredSiswa.map(siswa => (
                    <div key={siswa.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${haidRecords[siswa.id] ? 'bg-pink-100 text-pink-600' : 'bg-slate-200 text-slate-400'}`}>
                          {siswa.nama?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{siswa.nama}</p>
                          <p className="text-xs text-slate-400">{siswa.nis}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {haidRecords[siswa.id] && (
                          <Badge className="bg-pink-100 text-pink-600 text-xs">Haid</Badge>
                        )}
                        <Switch
                          checked={!!haidRecords[siswa.id]}
                          onCheckedChange={() => toggleHaid(siswa)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Data tersimpan otomatis. Sinkron realtime antar perangkat.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recap & Detail */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" /> Rekap & Detail Menstruasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input className="pl-9" placeholder="Cari nama siswa untuk lihat detail..." value={recapSearch} onChange={(e) => setRecapSearch(e.target.value)} />
          </div>

          {recapStudents.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              Belum ada data siswa. Lakukan pendataan harian terlebih dahulu.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {recapStudents.map(s => {
                const studentRecords = allMenstruasi.filter(r => r.siswa_id === s.siswa_id);
                const currentMonthRecords = studentRecords.filter(r => r.tanggal?.startsWith(currentMonthStr));
                return (
                  <div key={s.siswa_id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-xs font-medium text-pink-600">
                        {s.nama_siswa?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{s.nama_siswa}</p>
                        <p className="text-xs text-slate-400">{s.nama_kelas} • {studentRecords.length} catatan total</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentMonthRecords.length > 0 && (
                        <Badge className="bg-pink-100 text-pink-600 text-xs">{currentMonthRecords.length}x bulan ini</Badge>
                      )}
                      <Button size="sm" variant="outline" className="text-pink-600 border-pink-200 hover:bg-pink-50" onClick={() => setDetailSiswa(s)}>
                        Detail
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {detailSiswa && <MenstruasiDetail siswa={detailSiswa} onClose={() => setDetailSiswa(null)} />}

      <SiswaLulusRecordsDialog
        open={lulusOpen}
        onOpenChange={setLulusOpen}
        entityName="Menstruasi"
        queryKey="menstruasi-lulus"
        title="Data Menstruasi Siswa Lulus/Keluar"
      />
    </div>
  );
}