import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Save, CheckCircle, AlertCircle, Clock, UserX, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Absensi() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedKelas, setSelectedKelas] = useState('');
  const [absensiData, setAbsensiData] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [bulkJamMasuk, setBulkJamMasuk] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const userRole = currentUser?.role || 'guru';
  const canEdit = ['admin', 'guru', 'tu'].includes(userRole);

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa', selectedKelas],
    queryFn: () => selectedKelas ? base44.entities.Siswa.filter({ kelas_id: selectedKelas, status: 'Aktif' }) : [],
    enabled: !!selectedKelas,
  });

  const { data: existingAbsensi = [] } = useQuery({
    queryKey: ['absensi', selectedDate, selectedKelas],
    queryFn: () => selectedKelas ? base44.entities.Absensi.filter({ tanggal: selectedDate, kelas_id: selectedKelas }) : [],
    enabled: !!selectedKelas,
  });

  // Initialize absensi data when siswa or existing data changes
  React.useEffect(() => {
    const newData = {};
    siswaList.forEach(siswa => {
      const existing = existingAbsensi.find(a => a.siswa_id === siswa.id);
      newData[siswa.id] = {
        status: existing?.status || 'Hadir',
        jam_masuk: existing?.jam_masuk || '',
        keterangan: existing?.keterangan || '',
        existing_id: existing?.id,
      };
    });
    setAbsensiData(newData);
  }, [siswaList, existingAbsensi]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Absensi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['absensi'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Absensi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['absensi'] }),
  });

  const handleStatusChange = (siswaId, status) => {
    setAbsensiData({
      ...absensiData,
      [siswaId]: { ...absensiData[siswaId], status }
    });
  };

  // Bulk set jam masuk untuk semua siswa
  const handleBulkJamMasuk = () => {
    if (!bulkJamMasuk) return;
    const newData = { ...absensiData };
    siswaList.forEach(siswa => {
      if (newData[siswa.id]) {
        newData[siswa.id] = { ...newData[siswa.id], jam_masuk: bulkJamMasuk };
      }
    });
    setAbsensiData(newData);
  };

  // Sort siswa alphabetically
  const sortedSiswaList = [...siswaList].sort((a, b) => a.nama.localeCompare(b.nama));

  const handleSaveAll = async () => {
    setIsSaving(true);
    const kelas = kelasList.find(k => k.id === selectedKelas);
    let createdCount = 0;
    let updatedCount = 0;
    let duplicateCount = 0;

    for (const siswa of siswaList) {
      const data = absensiData[siswa.id];
      if (!data) continue;

      const payload = {
        tanggal: selectedDate,
        siswa_id: siswa.id,
        nis: siswa.nis,
        nama_siswa: siswa.nama,
        kelas_id: selectedKelas,
        nama_kelas: kelas?.nama_kelas || '',
        status: data.status,
        jam_masuk: data.jam_masuk,
        keterangan: data.keterangan,
      };

      if (data.existing_id) {
        // Update data yang sudah ada (data pertama yang diinputkan)
        await updateMutation.mutateAsync({ id: data.existing_id, data: payload });
        updatedCount++;
      } else {
        // Cek duplikat dari server sebelum create
        const cekDuplikat = existingAbsensi.filter(a => a.siswa_id === siswa.id);
        if (cekDuplikat.length > 0) {
          // Ambil data pertama, update itu, hapus sisanya
          const first = cekDuplikat[0];
          await updateMutation.mutateAsync({ id: first.id, data: payload });
          // Hapus duplikat jika ada lebih dari 1
          for (let i = 1; i < cekDuplikat.length; i++) {
            await base44.entities.Absensi.delete(cekDuplikat[i].id);
          }
          duplicateCount++;
        } else {
          await createMutation.mutateAsync(payload);
          createdCount++;
        }
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['absensi'] });
    setIsSaving(false);

    // Notifikasi
    if (duplicateCount > 0) {
      toast({
        title: '⚠️ Data Ganda Ditemukan & Diperbaiki',
        description: `${duplicateCount} data duplikat diperbarui ke data pertama. ${createdCount} baru, ${updatedCount} diupdate.`,
        variant: 'default',
        duration: 5000,
      });
    } else if (updatedCount > 0 && createdCount === 0) {
      toast({
        title: '✅ Absensi Berhasil Diperbarui',
        description: `${updatedCount} data absensi berhasil diupdate.`,
        duration: 4000,
      });
    } else {
      toast({
        title: '✅ Absensi Berhasil Disimpan',
        description: `${createdCount} data absensi baru tersimpan${updatedCount > 0 ? `, ${updatedCount} diperbarui` : ''}.`,
        duration: 4000,
      });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Hadir': 'bg-emerald-100 text-emerald-700',
      'Sakit': 'bg-amber-100 text-amber-700',
      'Izin': 'bg-blue-100 text-blue-700',
      'Alfa': 'bg-red-100 text-red-700',
      'Terlambat': 'bg-orange-100 text-orange-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };



  // Stats
  const stats = {
    hadir: Object.values(absensiData).filter(d => d.status === 'Hadir').length,
    sakit: Object.values(absensiData).filter(d => d.status === 'Sakit').length,
    izin: Object.values(absensiData).filter(d => d.status === 'Izin').length,
    alfa: Object.values(absensiData).filter(d => d.status === 'Alfa').length,
    terlambat: Object.values(absensiData).filter(d => d.status === 'Terlambat').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-emerald-500" />
              Absensi Siswa
            </h1>
            <p className="text-slate-500 mt-1">
              {format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: idLocale })}
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-sm text-slate-500">Tanggal</Label>
                <Input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-slate-500">Kelas</Label>
                <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                  <SelectContent>
                    {kelasList.map(kelas => (
                      <SelectItem key={kelas.id} value={kelas.id}>{kelas.nama_kelas}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input 
                    type="time"
                    value={bulkJamMasuk}
                    onChange={(e) => setBulkJamMasuk(e.target.value)}
                    className="w-28"
                    placeholder="Jam Masuk"
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleBulkJamMasuk}
                    disabled={!selectedKelas || !bulkJamMasuk}
                  >
                    <Clock className="w-4 h-4 mr-1" /> Set Semua
                  </Button>
                  <Button 
                    onClick={handleSaveAll} 
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={!selectedKelas || siswaList.length === 0 || isSaving}
                  >
                    <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Menyimpan...' : 'Simpan Absensi'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {selectedKelas && siswaList.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-6">
            <Card className="border-0 shadow-sm bg-emerald-50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.hadir}</p>
                <p className="text-xs text-slate-500">Hadir</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-amber-50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.sakit}</p>
                <p className="text-xs text-slate-500">Sakit</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-blue-50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.izin}</p>
                <p className="text-xs text-slate-500">Izin</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-red-50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{stats.alfa}</p>
                <p className="text-xs text-slate-500">Alfa</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-orange-50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.terlambat}</p>
                <p className="text-xs text-slate-500">Terlambat</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Absensi Table */}
        {selectedKelas && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-10">No</TableHead>
                      <TableHead className="hidden sm:table-cell">NIS</TableHead>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Jam Masuk</TableHead>
                      <TableHead className="hidden md:table-cell">Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSiswaList.map((siswa, index) => (
                      <TableRow key={siswa.id} className="hover:bg-slate-50">
                        <TableCell className="text-slate-500">{index + 1}</TableCell>
                        <TableCell className="font-medium hidden sm:table-cell">{siswa.nis}</TableCell>
                        <TableCell>{siswa.nama}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {['Hadir', 'Sakit', 'Izin', 'Alfa', 'Terlambat'].map(status => {
                              const isActive = absensiData[siswa.id]?.status === status;
                              const StatusIcon = {
                                'Hadir': CheckCircle,
                                'Sakit': AlertCircle,
                                'Izin': FileText,
                                'Alfa': UserX,
                                'Terlambat': Clock,
                              }[status];
                              return (
                                <button 
                                  key={status}
                                  type="button"
                                  className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                                    isActive 
                                      ? getStatusColor(status) 
                                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                  }`}
                                  onClick={() => canEdit && handleStatusChange(siswa.id, status)}
                                  disabled={!canEdit}
                                >
                                  <StatusIcon className="w-3 h-3" />
                                  <span className="ml-1 hidden sm:inline">{status}</span>
                                </button>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Input 
                            type="time"
                            value={absensiData[siswa.id]?.jam_masuk || ''}
                            onChange={(e) => setAbsensiData({
                              ...absensiData,
                              [siswa.id]: { ...absensiData[siswa.id], jam_masuk: e.target.value }
                            })}
                            className="w-28"
                            disabled={!canEdit}
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Input 
                            placeholder="Keterangan..."
                            value={absensiData[siswa.id]?.keterangan || ''}
                            onChange={(e) => setAbsensiData({
                              ...absensiData,
                              [siswa.id]: { ...absensiData[siswa.id], keterangan: e.target.value }
                            })}
                            className="w-40"
                            disabled={!canEdit}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {siswaList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          Pilih kelas untuk melihat daftar siswa
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {!selectedKelas && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400">Pilih tanggal dan kelas untuk memulai absensi</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}