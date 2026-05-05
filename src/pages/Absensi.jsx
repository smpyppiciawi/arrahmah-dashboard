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
import { Calendar, Save, CheckCircle, AlertCircle, Clock, UserX, FileText, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_CONFIG = {
  'Hadir':     { icon: CheckCircle, active: 'bg-emerald-500 text-white shadow-sm shadow-emerald-200', inactive: 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600' },
  'Sakit':     { icon: AlertCircle, active: 'bg-amber-500 text-white shadow-sm shadow-amber-200',   inactive: 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600' },
  'Izin':      { icon: FileText,    active: 'bg-blue-500 text-white shadow-sm shadow-blue-200',     inactive: 'bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600' },
  'Alfa':      { icon: UserX,       active: 'bg-red-500 text-white shadow-sm shadow-red-200',       inactive: 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600' },
  'Terlambat': { icon: Clock,       active: 'bg-orange-500 text-white shadow-sm shadow-orange-200', inactive: 'bg-slate-100 text-slate-400 hover:bg-orange-50 hover:text-orange-600' },
};

export default function Absensi() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedKelas, setSelectedKelas] = useState('');
  const [absensiData, setAbsensiData] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [bulkJamMasuk, setBulkJamMasuk] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  const userRole = currentUser?.role || 'guru';
  const canEdit = ['admin', 'guru', 'tu'].includes(userRole);

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas'),
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

  // Sync local state from DB data
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
    setAbsensiData(prev => ({ ...prev, [siswaId]: { ...prev[siswaId], status } }));
  };

  const handleBulkJamMasuk = () => {
    if (!bulkJamMasuk) return;
    setAbsensiData(prev => {
      const updated = { ...prev };
      siswaList.forEach(siswa => {
        if (updated[siswa.id]) updated[siswa.id] = { ...updated[siswa.id], jam_masuk: bulkJamMasuk };
      });
      return updated;
    });
  };

  const sortedSiswaList = [...siswaList].sort((a, b) => a.nama.localeCompare(b.nama));

  const handleSaveAll = async () => {
    setIsSaving(true);
    const kelas = kelasList.find(k => k.id === selectedKelas);
    let createdCount = 0, updatedCount = 0, duplicateCount = 0;

    for (const siswa of siswaList) {
      const data = absensiData[siswa.id];
      if (!data) continue;

      const payload = {
        tanggal: selectedDate, siswa_id: siswa.id, nis: siswa.nis,
        nama_siswa: siswa.nama, kelas_id: selectedKelas,
        nama_kelas: kelas?.nama_kelas || '',
        status: data.status, jam_masuk: data.jam_masuk, keterangan: data.keterangan,
      };

      if (data.existing_id) {
        await updateMutation.mutateAsync({ id: data.existing_id, data: payload });
        updatedCount++;
      } else {
        // Cek duplikat — ambil data pertama, hapus sisanya
        const cekDuplikat = existingAbsensi.filter(a => a.siswa_id === siswa.id);
        if (cekDuplikat.length > 0) {
          await updateMutation.mutateAsync({ id: cekDuplikat[0].id, data: payload });
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

    if (duplicateCount > 0) {
      toast({ title: '⚠️ Data Ganda Diperbaiki', description: `${duplicateCount} duplikat diperbarui. ${createdCount} baru, ${updatedCount} diupdate.`, duration: 5000 });
    } else if (updatedCount > 0 && createdCount === 0) {
      toast({ title: '✅ Absensi Diperbarui', description: `${updatedCount} data berhasil diupdate.`, duration: 4000 });
    } else {
      toast({ title: '✅ Absensi Tersimpan', description: `${createdCount} data baru${updatedCount > 0 ? `, ${updatedCount} diperbarui` : ''}.`, duration: 4000 });
    }
  };

  const stats = {
    hadir: Object.values(absensiData).filter(d => d.status === 'Hadir').length,
    sakit: Object.values(absensiData).filter(d => d.status === 'Sakit').length,
    izin: Object.values(absensiData).filter(d => d.status === 'Izin').length,
    alfa: Object.values(absensiData).filter(d => d.status === 'Alfa').length,
    terlambat: Object.values(absensiData).filter(d => d.status === 'Terlambat').length,
  };

  const total = sortedSiswaList.length;
  const hadirPct = total > 0 ? Math.round((stats.hadir / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-7 h-7 text-emerald-500" />
              Absensi Siswa
            </h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              {format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: idLocale })}
            </p>
          </div>
          {canEdit && selectedKelas && siswaList.length > 0 && (
            <Button
              onClick={handleSaveAll}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25 gap-2"
              disabled={isSaving}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan Absensi'}
            </Button>
          )}
        </div>

        {/* Filter Bar */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Label className="text-xs text-slate-500 font-medium mb-1 block">Tanggal</Label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9" />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-slate-500 font-medium mb-1 block">Kelas</Label>
                <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih Kelas..." /></SelectTrigger>
                  <SelectContent>
                    {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {canEdit && (
                <div className="flex-1">
                  <Label className="text-xs text-slate-500 font-medium mb-1 block">Set Jam Masuk (semua)</Label>
                  <div className="flex gap-2">
                    <Input type="time" value={bulkJamMasuk} onChange={(e) => setBulkJamMasuk(e.target.value)} className="h-9 flex-1" />
                    <Button variant="outline" onClick={handleBulkJamMasuk} disabled={!selectedKelas || !bulkJamMasuk} className="h-9 gap-1 text-xs">
                      <Clock className="w-3.5 h-3.5" /> Set
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {selectedKelas && siswaList.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: 'Hadir', val: stats.hadir, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
              { label: 'Sakit', val: stats.sakit, color: 'bg-amber-50 border-amber-200 text-amber-700' },
              { label: 'Izin', val: stats.izin, color: 'bg-blue-50 border-blue-200 text-blue-700' },
              { label: 'Alfa', val: stats.alfa, color: 'bg-red-50 border-red-200 text-red-700' },
              { label: 'Terlambat', val: stats.terlambat, color: 'bg-orange-50 border-orange-200 text-orange-700' },
              { label: 'Kehadiran', val: `${hadirPct}%`, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
                <p className="text-xl font-bold">{s.val}</p>
                <p className="text-[11px] font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {selectedKelas ? (
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-0 pt-4 px-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  Daftar Siswa — {kelasList.find(k => k.id === selectedKelas)?.nama_kelas}
                  <Badge className="bg-slate-100 text-slate-600 text-xs border-0 ml-1">{total} siswa</Badge>
                </CardTitle>
                {existingAbsensi.length > 0 && (
                  <Badge className="bg-emerald-50 text-emerald-700 text-xs border-0">Data tersimpan</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="w-10 text-center text-xs">#</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs">NIS</TableHead>
                      <TableHead className="text-xs">Nama Siswa</TableHead>
                      <TableHead className="text-xs">Status Kehadiran</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs">Jam Masuk</TableHead>
                      <TableHead className="hidden md:table-cell text-xs">Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSiswaList.map((siswa, index) => (
                      <TableRow key={siswa.id} className="hover:bg-slate-50/60 transition-colors">
                        <TableCell className="text-center text-xs text-slate-400 font-medium">{index + 1}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-slate-500 font-mono">{siswa.nis}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm text-slate-800">{siswa.nama}</p>
                            {absensiData[siswa.id]?.existing_id && (
                              <p className="text-[10px] text-emerald-500">✓ tersimpan</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                              const isActive = absensiData[siswa.id]?.status === status;
                              const Icon = cfg.icon;
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => canEdit && handleStatusChange(siswa.id, status)}
                                  disabled={!canEdit}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${isActive ? cfg.active : cfg.inactive}`}
                                >
                                  <Icon className="w-3 h-3" />
                                  <span className="hidden sm:inline">{status}</span>
                                </button>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Input
                            type="time"
                            value={absensiData[siswa.id]?.jam_masuk || ''}
                            onChange={(e) => setAbsensiData(prev => ({
                              ...prev, [siswa.id]: { ...prev[siswa.id], jam_masuk: e.target.value }
                            }))}
                            className="w-28 h-8 text-xs"
                            disabled={!canEdit}
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Input
                            placeholder="Keterangan..."
                            value={absensiData[siswa.id]?.keterangan || ''}
                            onChange={(e) => setAbsensiData(prev => ({
                              ...prev, [siswa.id]: { ...prev[siswa.id], keterangan: e.target.value }
                            }))}
                            className="w-40 h-8 text-xs"
                            disabled={!canEdit}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {siswaList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Tidak ada siswa aktif di kelas ini</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-16 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-slate-700 font-semibold">Pilih tanggal dan kelas</p>
              <p className="text-slate-400 text-sm mt-1">untuk memulai pencatatan absensi</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}