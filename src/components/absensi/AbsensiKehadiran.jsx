import React, { useState, useEffect, useMemo } from 'react';
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
import { Calendar, Save, CheckCircle, AlertCircle, Clock, UserX, FileText, Users, WifiOff, CloudOff, RefreshCw, Loader2, Sun } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useOfflineAbsensi } from '@/hooks/useOfflineAbsensi';
import { useIsMobile } from "@/hooks/use-mobile";
import AbsensiSiswaCardList from "@/components/absensi/AbsensiSiswaCardList";
import AbsensiStatusSheet from "@/components/absensi/AbsensiStatusSheet";

const STATUS_CONFIG = {
  'Hadir':     { icon: CheckCircle, active: 'bg-emerald-500 text-white shadow-sm shadow-emerald-200', inactive: 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600' },
  'Sakit':     { icon: AlertCircle, active: 'bg-amber-500 text-white shadow-sm shadow-amber-200',   inactive: 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600' },
  'Izin':      { icon: FileText,    active: 'bg-blue-500 text-white shadow-sm shadow-blue-200',     inactive: 'bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600' },
  'Alfa':      { icon: UserX,       active: 'bg-red-500 text-white shadow-sm shadow-red-200',       inactive: 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600' },
  'Terlambat': { icon: Clock,       active: 'bg-orange-500 text-white shadow-sm shadow-orange-200', inactive: 'bg-slate-100 text-slate-400 hover:bg-orange-50 hover:text-orange-600' },
};

export default function AbsensiKehadiran() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedKelas, setSelectedKelas] = useState('');
  const [absensiData, setAbsensiData] = useState({});
  const [savedSnapshot, setSavedSnapshot] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [bulkJamMasuk, setBulkJamMasuk] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [sheetSiswaId, setSheetSiswaId] = useState(null);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(console.error); }, []);
  const userRole = currentUser?.role || 'guru';
  const canEdit = ['admin', 'guru', 'tu', 'operator', 'piket'].includes(userRole);

  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list('nama'), staleTime: 60000 });
  const guruData = guruList.find(g => g.email === currentUser?.email);
  const isGuruRole = userRole === 'guru';
  const { data: pembelajaranGuru = [] } = useQuery({
    queryKey: ['pembelajaran-guru-absensi', guruData?.id],
    queryFn: () => base44.entities.Pembelajaran.filter({ guru_id: guruData?.id }),
    enabled: isGuruRole && !!guruData?.id, staleTime: 60000,
  });
  const assignedKelasIds = useMemo(() => isGuruRole ? [...new Set(pembelajaranGuru.map(p => p.kelas_id))] : [], [isGuruRole, pembelajaranGuru]);
  const availableKelas = isGuruRole ? kelasList.filter(k => assignedKelasIds.includes(k.id)) : kelasList;

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
  const { data: jadwalList = [] } = useQuery({
    queryKey: ['jadwal-pelajaran', selectedKelas],
    queryFn: () => selectedKelas ? base44.entities.JadwalPelajaran.filter({ kelas_id: selectedKelas }) : [],
    enabled: !!selectedKelas,
  });
  const { data: kalenderList = [] } = useQuery({
    queryKey: ['kalender-akademik'],
    queryFn: () => base44.entities.KalenderAkademik.list(),
    staleTime: 300000,
  });

  const HARI_INDONESIA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayJadwal = jadwalList.filter(j => j.hari === HARI_INDONESIA[new Date(selectedDate).getDay()]).sort((a, b) => (a.jam_ke || 0) - (b.jam_ke || 0));

  // Detect holiday from Kalender Akademik (only on school days Mon-Fri)
  const liburInfo = useMemo(() => {
    const dateObj = new Date(selectedDate);
    const dow = dateObj.getDay();
    if (dow === 0 || dow === 6) return null; // weekend, not "school day libur"
    return kalenderList.find(k => {
      if (k.kategori !== 'Hari Libur Nasional' && k.kategori !== 'Libur Sekolah') return false;
      const mulai = new Date(k.tanggal_mulai);
      const selesai = k.tanggal_selesai ? new Date(k.tanggal_selesai) : mulai;
      return dateObj >= mulai && dateObj <= selesai;
    }) || null;
  }, [kalenderList, selectedDate]);
  const isLibur = !!liburInfo;

  useEffect(() => {
    const newData = {};
    siswaList.forEach(siswa => {
      const existing = existingAbsensi.find(a => a.siswa_id === siswa.id && a.jenis_absensi !== 'Jumat');
      newData[siswa.id] = {
        status: isLibur ? 'Libur' : (existing?.status || 'Hadir'),
        jam_masuk: existing?.jam_masuk || '',
        keterangan: isLibur ? (liburInfo?.judul || 'Hari Libur') : (existing?.keterangan || ''),
        existing_id: existing?.id,
      };
    });
    setAbsensiData(newData);
    // Snapshot kondisi asli per siswa — dasar dirty check saat Simpan
    const snap = {};
    siswaList.forEach(siswa => {
      const d = newData[siswa.id];
      if (d) snap[siswa.id] = { status: d.status, jam_masuk: d.jam_masuk || '', keterangan: d.keterangan || '' };
    });
    setSavedSnapshot(snap);
  }, [siswaList, existingAbsensi, isLibur, liburInfo]);

  useEffect(() => { if (isGuruRole && availableKelas.length > 0 && !selectedKelas) setSelectedKelas(availableKelas[0].id); }, [isGuruRole, availableKelas, selectedKelas]);

  const createMutation = useMutation({ mutationFn: (data) => base44.entities.Absensi.create(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['absensi'] }) });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.Absensi.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['absensi'] }) });

  const handleStatusChange = (siswaId, status) => setAbsensiData(prev => ({ ...prev, [siswaId]: { ...prev[siswaId], status } }));
  const handleBulkJamMasuk = () => { if (!bulkJamMasuk) return; setAbsensiData(prev => { const updated = { ...prev }; siswaList.forEach(s => { if (updated[s.id]) updated[s.id] = { ...updated[s.id], jam_masuk: bulkJamMasuk }; }); return updated; }); };

  const sortedSiswaList = [...siswaList].sort((a, b) => a.nama.localeCompare(b.nama));

  const { pendingCount, syncing, isOnline, queueAbsensi, syncNow } = useOfflineAbsensi();

  const handleSaveAll = async () => {
    setIsSaving(true);
    const kelas = kelasList.find(k => k.id === selectedKelas);
    const allRecords = siswaList.map(siswa => {
      const data = absensiData[siswa.id]; if (!data) return null;
      const payload = { tanggal: selectedDate, siswa_id: siswa.id, nis: siswa.nis, nama_siswa: siswa.nama, kelas_id: selectedKelas, nama_kelas: kelas?.nama_kelas || '', status: data.status, jam_masuk: data.jam_masuk, keterangan: data.keterangan, jenis_absensi: 'Kehadiran' };
      return { payload, existing_id: data.existing_id, siswa_id: siswa.id };
    }).filter(Boolean);

    // Dirty check: hanya kirim siswa yang isinya berubah (atau belum punya record) —
    // siswa yang tidak berubah diabaikan, tidak dikirim ulang.
    const isDirty = (siswaId) => {
      const data = absensiData[siswaId];
      const snap = savedSnapshot[siswaId];
      if (!data?.existing_id || !snap) return true;
      return snap.status !== data.status ||
        (snap.jam_masuk || '') !== (data.jam_masuk || '') ||
        (snap.keterangan || '') !== (data.keterangan || '');
    };
    const records = allRecords.filter(r => isDirty(r.siswa_id));
    const skipped = allRecords.length - records.length;

    if (records.length === 0) {
      toast({ title: '✅ Tidak Ada Perubahan', description: 'Semua data absensi sudah tersimpan. Tidak ada data yang dikirim ulang.', duration: 4000 });
      setIsSaving(false);
      return;
    }

    // Offline — hanya antrikan data yang berubah ke IndexedDB
    if (!isOnline) {
      await queueAbsensi(records);
      toast({ title: '📴 Mode Offline', description: `${records.length} perubahan absensi disimpan offline. Akan disinkron otomatis saat online.`, duration: 5000 });
      setIsSaving(false);
      return;
    }

    // Online — kirim massal (bulk): 1 panggilan update + 1 panggilan create,
    // cek duplikat lokal memakai existingAbsensi yang sudah dimuat (tanpa panggilan per siswa)
    let created = 0, updated = 0;
    const failed = [];
    const newIds = {};
    const savedSids = [];

    const updateRecords = [];
    const createRecords = [];
    records.forEach(record => {
      const localExisting = record.existing_id
        || existingAbsensi.find(a => a.siswa_id === record.siswa_id && a.jenis_absensi !== 'Jumat')?.id;
      if (localExisting) {
        record.existing_id = localExisting;
        updateRecords.push(record);
      } else {
        createRecords.push(record);
      }
    });

    // Bulk update — semua siswa yang sudah punya record dalam 1 panggilan
    if (updateRecords.length > 0) {
      try {
        await base44.entities.Absensi.bulkUpdate(updateRecords.map(r => ({ id: r.existing_id, ...r.payload })));
        updateRecords.forEach(r => savedSids.push(r.siswa_id));
        updated = updateRecords.length;
      } catch {
        failed.push(...updateRecords);
      }
    }

    // Bulk create — semua siswa baru dalam 1 panggilan
    if (createRecords.length > 0) {
      try {
        const result = await base44.entities.Absensi.bulkCreate(createRecords.map(r => r.payload));
        const createdArr = Array.isArray(result) ? result : [];
        createdArr.forEach((res, i) => {
          const rec = createRecords[i];
          if (!rec) return;
          const newId = typeof res === 'string' ? res : res?.id;
          if (newId) newIds[rec.siswa_id] = newId;
        });
        createRecords.forEach(r => savedSids.push(r.siswa_id));
        created = createRecords.length;
      } catch {
        failed.push(...createRecords);
      }
    }

    // Auto-pelanggaran F-02 untuk Alfa yang tersimpan (non-blocking — jangan gagalkan simpan absensi)
    const alfaSaved = records.filter(r => savedSids.includes(r.siswa_id) && r.payload.status === 'Alfa');
    for (const record of alfaSaved) {
      try {
        await base44.functions.invoke('autoPelanggaranAlfa', {
          action: 'create',
          absensi: {
            siswa_id: record.payload.siswa_id,
            nis: record.payload.nis,
            nama_siswa: record.payload.nama_siswa,
            kelas_id: record.payload.kelas_id,
            nama_kelas: record.payload.nama_kelas,
            tanggal: record.payload.tanggal,
            jenis_absensi: record.payload.jenis_absensi,
          },
        });
      } catch (e) { /* pelanggaran otomatis gagal — absensi tetap tersimpan */ }
    }

    // Notifikasi WA/Email terpusat untuk semua absensi yang tersimpan (fire-and-forget, tidak menahan simpan)
    const savedPayloads = records
      .filter(r => savedSids.includes(r.siswa_id))
      .map(r => ({
        person_type: 'Siswa', person_id: r.payload.siswa_id, tanggal: r.payload.tanggal,
        jam: r.payload.jam_masuk || '', status: r.payload.status, metode: 'Manual', jenis_absensi: r.payload.jenis_absensi,
      }));
    if (savedPayloads.length > 0) {
      base44.functions.invoke('notifyAbsensi', { batch: savedPayloads }).catch(() => { /* kegagalan notifikasi tidak memengaruhi absensi */ });
    }

    // Perbarui snapshot ke kondisi tersimpan agar simpan berikutnya tetap akurat
    if (savedSids.length > 0) {
      setSavedSnapshot(prev => {
        const next = { ...prev };
        savedSids.forEach(sid => {
          const d = absensiData[sid];
          if (d) next[sid] = { status: d.status, jam_masuk: d.jam_masuk || '', keterangan: d.keterangan || '' };
        });
        return next;
      });
    }

    // Update local state with newly created IDs to prevent duplicate creates
    if (Object.keys(newIds).length > 0) {
      setAbsensiData(prev => {
        const next = { ...prev };
        Object.entries(newIds).forEach(([sid, id]) => {
          if (next[sid]) next[sid] = { ...next[sid], existing_id: id };
        });
        return next;
      });
    }

    // Queue failures for background sync
    if (failed.length > 0) {
      await queueAbsensi(failed);
      toast({ title: '⚠️ Sebagian Gagal', description: `${created} baru, ${updated} update, ${failed.length} antrian offline, ${skipped} tanpa perubahan.`, variant: 'destructive', duration: 5000 });
    } else {
      toast({ title: '✅ Absensi Tersimpan', description: `${created} baru, ${updated} diupdate, ${skipped} tanpa perubahan (tidak dikirim ulang).`, duration: 4000 });
    }

    await queryClient.invalidateQueries({ queryKey: ['absensi'] });
    setIsSaving(false);
  };

  const stats = { hadir: Object.values(absensiData).filter(d => d.status === 'Hadir').length, libur: Object.values(absensiData).filter(d => d.status === 'Libur').length, sakit: Object.values(absensiData).filter(d => d.status === 'Sakit').length, izin: Object.values(absensiData).filter(d => d.status === 'Izin').length, alfa: Object.values(absensiData).filter(d => d.status === 'Alfa').length, terlambat: Object.values(absensiData).filter(d => d.status === 'Terlambat').length };
  const total = sortedSiswaList.length;
  // Libur dihitung sebagai Hadir
  const hadirPct = total > 0 ? Math.round(((stats.hadir + stats.libur) / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {(!isOnline || pendingCount > 0) && (
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border ${!isOnline ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <>
                <WifiOff className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm font-medium text-red-700">Mode Offline — data tersimpan lokal di perangkat</span>
              </>
            ) : (
              <>
                <CloudOff className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm font-medium text-amber-700">{pendingCount} absensi menunggu sinkronisasi</span>
              </>
            )}
          </div>
          {isOnline && pendingCount > 0 && (
            <Button size="sm" variant="outline" onClick={() => syncNow()} disabled={syncing} className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-100">
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {syncing ? 'Menyinkron...' : 'Sinkron Sekarang'}
            </Button>
          )}
        </div>
      )}
      {isLibur && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <Sun className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-indigo-700">Hari Libur: {liburInfo?.judul}</p>
            <p className="text-xs text-indigo-500">Absensi otomatis tercatat Libur &amp; dihitung sebagai Hadir</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-slate-500 text-sm">{format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: idLocale })}</p>
        {canEdit && selectedKelas && siswaList.length > 0 && (
          <Button onClick={handleSaveAll} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25 gap-2" disabled={isSaving}>
            <Save className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Simpan Absensi'}
          </Button>
        )}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1"><Label className="text-xs text-slate-500 font-medium mb-1 block">Tanggal</Label><Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9" /></div>
            <div className="flex-1"><Label className="text-xs text-slate-500 font-medium mb-1 block">Kelas</Label><Select value={selectedKelas} onValueChange={setSelectedKelas}><SelectTrigger className="h-9"><SelectValue placeholder="Pilih Kelas..." /></SelectTrigger><SelectContent>{availableKelas.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}</SelectContent></Select></div>
            {canEdit && (<div className="flex-1"><Label className="text-xs text-slate-500 font-medium mb-1 block">Set Jam Masuk (semua)</Label><div className="flex gap-2"><Select value={bulkJamMasuk || undefined} onValueChange={setBulkJamMasuk}><SelectTrigger className="h-9 flex-1"><SelectValue placeholder="Pilih Jam..." /></SelectTrigger><SelectContent>{todayJadwal.length === 0 ? <SelectItem value="none" disabled>Tidak ada jadwal</SelectItem> : todayJadwal.map(j => <SelectItem key={j.id} value={j.jam_mulai || ''}>Jam {j.jam_ke} ({j.jam_mulai} - {j.jam_selesai})</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={handleBulkJamMasuk} disabled={!selectedKelas || !bulkJamMasuk} className="h-9 gap-1 text-xs"><Clock className="w-3.5 h-3.5" /> Set</Button></div></div>)}
          </div>
        </CardContent>
      </Card>

      {selectedKelas && siswaList.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[{label:'Hadir',val:stats.hadir + (stats.libur || 0),color:'bg-emerald-50 border-emerald-200 text-emerald-700'},{label:'Sakit',val:stats.sakit,color:'bg-amber-50 border-amber-200 text-amber-700'},{label:'Izin',val:stats.izin,color:'bg-blue-50 border-blue-200 text-blue-700'},{label:'Alfa',val:stats.alfa,color:'bg-red-50 border-red-200 text-red-700'},{label:'Terlambat',val:stats.terlambat,color:'bg-orange-50 border-orange-200 text-orange-700'},{label:'Kehadiran',val:`${hadirPct}%`,color:'bg-indigo-50 border-indigo-200 text-indigo-700'}].map(s => (
            <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}><p className="text-xl font-bold">{s.val}</p><p className="text-[11px] font-medium mt-0.5">{s.label}</p></div>
          ))}
        </div>
      )}

      {selectedKelas ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-semibold text-slate-700">Daftar Siswa — {kelasList.find(k => k.id === selectedKelas)?.nama_kelas}</span>
            <Badge className="bg-slate-100 text-slate-600 text-xs border-0 ml-1">{total} siswa</Badge>
          </div>

          {isMobile ? (
            siswaList.length === 0 ? (
              <div className="text-center py-12 text-slate-400"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Tidak ada siswa aktif di kelas ini</p></div>
            ) : (
              <AbsensiSiswaCardList siswaList={sortedSiswaList} absensiData={absensiData} onOpen={(s) => setSheetSiswaId(s.id)} />
            )
          ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="pb-0 pt-4 px-4 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" /> Daftar Siswa — {kelasList.find(k => k.id === selectedKelas)?.nama_kelas}
              <Badge className="bg-slate-100 text-slate-600 text-xs border-0 ml-1">{total} siswa</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-slate-50/80"><TableHead className="w-10 text-center text-xs">#</TableHead><TableHead className="hidden sm:table-cell text-xs">NIS</TableHead><TableHead className="text-xs">Nama Siswa</TableHead><TableHead className="text-xs">Status Kehadiran</TableHead><TableHead className="hidden sm:table-cell text-xs">Jam Masuk</TableHead><TableHead className="hidden md:table-cell text-xs">Keterangan</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sortedSiswaList.map((siswa, index) => (
                    <TableRow key={siswa.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="text-center text-xs text-slate-400 font-medium">{index + 1}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-slate-500 font-mono">{siswa.nis}</TableCell>
                      <TableCell><div><p className="font-medium text-sm text-slate-800">{siswa.nama}</p>{absensiData[siswa.id]?.existing_id && <p className="text-[10px] text-emerald-500">✓ tersimpan</p>}</div></TableCell>
                      <TableCell>{isLibur ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500 text-white"><Sun className="w-3 h-3" /><span>Libur</span></span>
                      ) : (
                        <div className="flex flex-wrap gap-1">{Object.entries(STATUS_CONFIG).map(([status, cfg]) => { const isActive = absensiData[siswa.id]?.status === status; const Icon = cfg.icon; return <button key={status} type="button" onClick={() => canEdit && handleStatusChange(siswa.id, status)} disabled={!canEdit} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${isActive ? cfg.active : cfg.inactive}`}><Icon className="w-3 h-3" /><span className="hidden sm:inline">{status}</span></button>; })}</div>
                      )}</TableCell>
                      <TableCell className="hidden sm:table-cell"><Input type="time" value={absensiData[siswa.id]?.jam_masuk || ''} onChange={(e) => setAbsensiData(prev => ({ ...prev, [siswa.id]: { ...prev[siswa.id], jam_masuk: e.target.value } }))} className="w-28 h-8 text-xs" disabled={!canEdit} /></TableCell>
                      <TableCell className="hidden md:table-cell"><Input placeholder="Keterangan..." value={absensiData[siswa.id]?.keterangan || ''} onChange={(e) => setAbsensiData(prev => ({ ...prev, [siswa.id]: { ...prev[siswa.id], keterangan: e.target.value } }))} className="w-40 h-8 text-xs" disabled={!canEdit} /></TableCell>
                    </TableRow>
                  ))}
                  {siswaList.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-400"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Tidak ada siswa aktif di kelas ini</p></TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          )}
        </>
      ) : (
        <Card className="border-0 shadow-sm"><CardContent className="p-16 text-center"><div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Calendar className="w-8 h-8 text-emerald-400" /></div><p className="text-slate-700 font-semibold">Pilih tanggal dan kelas</p><p className="text-slate-400 text-sm mt-1">untuk memulai pencatatan absensi</p></CardContent></Card>
      )}

      <AbsensiStatusSheet
        siswa={sortedSiswaList.find(s => s.id === sheetSiswaId) || null}
        data={sheetSiswaId ? absensiData[sheetSiswaId] : {}}
        open={!!sheetSiswaId}
        onOpenChange={(v) => !v && setSheetSiswaId(null)}
        canEdit={canEdit}
        isLibur={isLibur}
        onStatus={handleStatusChange}
        onField={(siswaId, field, value) => setAbsensiData(prev => ({ ...prev, [siswaId]: { ...prev[siswaId], [field]: value } }))}
      />
    </div>
  );
}