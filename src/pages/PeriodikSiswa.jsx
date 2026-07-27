import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Ruler, Weight, Circle, Loader2, Lock, Save, X, Upload, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PeriodikSiswa() {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [inputValues, setInputValues] = useState({});
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => { try { const u = await base44.auth.me(); setCurrentUser(u); } catch {} };
    fetchUser();
  }, []);

  const userRole = currentUser?.role || 'guru';
  const canEdit = ['admin', 'tu', 'operator', 'piket'].includes(userRole);

  // Realtime subscription for lock changes
  useEffect(() => {
    const unsubscribe = base44.entities.PeriodikSiswa.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['periodikSiswa'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: siswaList = [], isLoading: siswaLoading } = useQuery({
    queryKey: ['siswa', selectedKelas],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif', kelas_id: selectedKelas }),
    enabled: !!selectedKelas,
  });

  const { data: periodikList = [], isLoading: periodikLoading } = useQuery({
    queryKey: ['periodikSiswa', tanggal, selectedKelas],
    queryFn: () => base44.entities.PeriodikSiswa.filter({ tanggal, kelas_id: selectedKelas }),
    enabled: !!selectedKelas && !!tanggal,
    refetchInterval: 5000, // Poll every 5s for lock changes
  });

  const sortedSiswa = [...siswaList].sort((a, b) => a.nama.localeCompare(b.nama));
  const periodikMap = {};
  periodikList.forEach(p => { if (p.siswa_id) periodikMap[p.siswa_id] = p; });

  const handleStartInput = async (siswa) => {
    const existing = periodikMap[siswa.id];
    if (existing && existing.is_locked && existing.locked_by_id !== currentUser?.id) {
      toast({ title: 'Sedang diinput', description: `Siswa ini sedang diukur oleh ${existing.locked_by}`, variant: 'destructive' });
      return;
    }
    try {
      if (existing) {
        await base44.entities.PeriodikSiswa.update(existing.id, { is_locked: true, locked_by: currentUser?.full_name || 'Petugas', locked_by_id: currentUser?.id, locked_at: new Date().toISOString() });
        setInputValues({ tinggi_badan: existing.tinggi_badan || '', berat_badan: existing.berat_badan || '', lingkar_kepala: existing.lingkar_kepala || '' });
      } else {
        const created = await base44.entities.PeriodikSiswa.create({
          siswa_id: siswa.id, nis: siswa.nis, nama_siswa: siswa.nama, kelas_id: siswa.kelas_id, nama_kelas: siswa.nama_kelas,
          tanggal, is_locked: true, locked_by: currentUser?.full_name || 'Petugas', locked_by_id: currentUser?.id, locked_at: new Date().toISOString(),
        });
        setInputValues({ tinggi_badan: '', berat_badan: '', lingkar_kepala: '' });
      }
      setEditingId(siswa.id);
      queryClient.invalidateQueries({ queryKey: ['periodikSiswa'] });
    } catch (err) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
  };

  const handleSave = async (siswa) => {
    const existing = periodikMap[siswa.id];
    if (!existing) return;
    try {
      await base44.entities.PeriodikSiswa.update(existing.id, {
        tinggi_badan: inputValues.tinggi_badan ? Number(inputValues.tinggi_badan) : undefined,
        berat_badan: inputValues.berat_badan ? Number(inputValues.berat_badan) : undefined,
        lingkar_kepala: inputValues.lingkar_kepala ? Number(inputValues.lingkar_kepala) : undefined,
        is_locked: false, locked_by: '', locked_by_id: '', locked_at: '',
        input_by: currentUser?.full_name || 'Petugas', input_by_id: currentUser?.id,
      });
      setEditingId(null); setInputValues({});
      queryClient.invalidateQueries({ queryKey: ['periodikSiswa'] });
      toast({ title: 'Tersimpan', description: `Data ${siswa.nama} berhasil disimpan.` });
    } catch (err) {
      toast({ title: 'Gagal menyimpan', description: err.message, variant: 'destructive' });
    }
  };

  const handleCancel = async (siswa) => {
    const existing = periodikMap[siswa.id];
    if (existing && existing.is_locked && existing.locked_by_id === currentUser?.id) {
      // Only release lock if no data was saved yet
      if (!existing.tinggi_badan && !existing.berat_badan && !existing.lingkar_kepala) {
        await base44.entities.PeriodikSiswa.delete(existing.id);
      } else {
        await base44.entities.PeriodikSiswa.update(existing.id, { is_locked: false, locked_by: '', locked_by_id: '', locked_at: '' });
      }
      queryClient.invalidateQueries({ queryKey: ['periodikSiswa'] });
    }
    setEditingId(null); setInputValues({});
  };

  const handleExport = () => {
    if (sortedSiswa.length === 0) { toast({ title: 'Tidak ada data', variant: 'destructive' }); return; }
    const headers = ['NIS', 'Nama', 'Kelas', 'Tanggal', 'Tinggi Badan', 'Berat Badan', 'Lingkar Kepala', 'Petugas'];
    const rows = sortedSiswa.map(s => {
      const p = periodikMap[s.id];
      return [s.nis, s.nama, s.nama_kelas, tanggal, p?.tinggi_badan || '', p?.berat_badan || '', p?.lingkar_kepala || '', p?.input_by || ''].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `periodik_${tanggal}_${selectedKelas}.csv`; a.click();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(r => r.trim());
      if (lines.length < 2) throw new Error('CSV kosong');
      const toCreate = []; const toUpdate = [];
      for (const line of lines.slice(1)) {
        const cols = line.split(',').map(s => (s || '').trim());
        if (!cols[0]) continue;
        const nis = cols[0]; const tinggi = cols[4] ? Number(cols[4]) : undefined;
        const berat = cols[5] ? Number(cols[5]) : undefined; const lingkar = cols[6] ? Number(cols[6]) : undefined;
        const siswa = siswaList.find(s => s.nis === nis);
        if (!siswa) continue;
        const existing = periodikMap[siswa.id];
        const payload = { tinggi_badan: tinggi, berat_badan: berat, lingkar_kepala: lingkar, input_by: currentUser?.full_name, input_by_id: currentUser?.id, is_locked: false };
        if (existing) toUpdate.push({ id: existing.id, ...payload });
        else toCreate.push({ siswa_id: siswa.id, nis: siswa.nis, nama_siswa: siswa.nama, kelas_id: siswa.kelas_id, nama_kelas: siswa.nama_kelas, tanggal, ...payload });
      }
      if (toCreate.length > 0) await base44.entities.PeriodikSiswa.bulkCreate(toCreate);
      if (toUpdate.length > 0) await base44.entities.PeriodikSiswa.bulkUpdate(toUpdate);
      queryClient.invalidateQueries({ queryKey: ['periodikSiswa'] });
      toast({ title: 'Import berhasil', description: `${toCreate.length} baru, ${toUpdate.length} diperbarui` });
    } catch (err) { toast({ title: 'Import gagal', description: err.message, variant: 'destructive' }); }
    finally { setImporting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Ruler className="w-8 h-8 text-violet-500" />
              Data Periodik Siswa
            </h1>
            <p className="text-slate-500 mt-1">Pengukuran Tinggi Badan, Berat Badan & Lingkar Kepala</p>
          </div>
          <div className="flex gap-2">
            {canEdit && <input type="file" accept=".csv" ref={fileRef} onChange={handleImport} className="hidden" />}
            {canEdit && (
              <Button variant="outline" size="sm" disabled={!selectedKelas || importing} onClick={() => fileRef.current?.click()}>
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Import
              </Button>
            )}
            <Button variant="outline" size="sm" disabled={!selectedKelas} onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-sm mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label className="text-xs">Tanggal Pengukuran</Label>
                <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Pilih Kelas</Label>
                <Select value={selectedKelas} onValueChange={(v) => { setSelectedKelas(v); setEditingId(null); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                  <SelectContent>{kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedKelas && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Daftar Siswa ({sortedSiswa.length})</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['periodikSiswa'] })}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {siswaLoading || periodikLoading ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></div>
              ) : sortedSiswa.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Belum ada siswa di kelas ini.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-slate-500">
                        <th className="text-left py-2 px-2">NIS</th>
                        <th className="text-left py-2 px-2">Nama</th>
                        <th className="text-center py-2 px-2"><Ruler className="w-3.5 h-3.5 mx-auto" /> TB (cm)</th>
                        <th className="text-center py-2 px-2"><Weight className="w-3.5 h-3.5 mx-auto" /> BB (kg)</th>
                        <th className="text-center py-2 px-2"><Circle className="w-3.5 h-3.5 mx-auto" /> LK (cm)</th>
                        <th className="text-center py-2 px-2">Status</th>
                        <th className="text-center py-2 px-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSiswa.map(siswa => {
                        const p = periodikMap[siswa.id];
                        const isEditing = editingId === siswa.id;
                        const isLockedByOther = p?.is_locked && p?.locked_by_id !== currentUser?.id;
                        return (
                          <tr key={siswa.id} className="border-b hover:bg-slate-50">
                            <td className="py-2 px-2 font-mono text-xs">{siswa.nis}</td>
                            <td className="py-2 px-2 font-medium">{siswa.nama}</td>
                            {isEditing ? (
                              <>
                                <td className="py-1 px-1"><Input type="number" className="h-8 text-center" value={inputValues.tinggi_badan || ''} onChange={(e) => setInputValues(v => ({ ...v, tinggi_badan: e.target.value }))} /></td>
                                <td className="py-1 px-1"><Input type="number" className="h-8 text-center" value={inputValues.berat_badan || ''} onChange={(e) => setInputValues(v => ({ ...v, berat_badan: e.target.value }))} /></td>
                                <td className="py-1 px-1"><Input type="number" className="h-8 text-center" value={inputValues.lingkar_kepala || ''} onChange={(e) => setInputValues(v => ({ ...v, lingkar_kepala: e.target.value }))} /></td>
                                <td></td>
                                <td className="py-1 px-1">
                                  <div className="flex gap-1 justify-center">
                                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSave(siswa)}><Save className="w-3.5 h-3.5" /></Button>
                                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleCancel(siswa)}><X className="w-3.5 h-3.5" /></Button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-2 text-center">{p?.tinggi_badan || '-'}</td>
                                <td className="py-2 px-2 text-center">{p?.berat_badan || '-'}</td>
                                <td className="py-2 px-2 text-center">{p?.lingkar_kepala || '-'}</td>
                                <td className="py-2 px-2 text-center">
                                  {isLockedByOther ? (
                                    <Badge className="bg-amber-100 text-amber-700"><Lock className="w-3 h-3 mr-1" /> {p.locked_by}</Badge>
                                  ) : p ? (
                                    <Badge className="bg-emerald-100 text-emerald-700">Tersimpan</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-500">Belum</Badge>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  {canEdit ? (
                                    <Button size="sm" variant="outline" disabled={isLockedByOther} onClick={() => handleStartInput(siswa)}>
                                      {p ? 'Edit' : 'Input'}
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-slate-400">-</span>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}