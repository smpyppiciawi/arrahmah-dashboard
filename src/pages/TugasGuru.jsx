import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck } from "lucide-react";

export default function TugasGuru() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: tugasList = [] } = useQuery({ queryKey: ['tugas-materi'], queryFn: () => base44.entities.TugasMateri.list('-tanggal', 500) });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (tugasList || [])
      .filter(t => statusFilter === 'all' || (statusFilter === 'sudah' ? t.status_verifikasi === 'Sudah Diverifikasi' : t.status_verifikasi !== 'Sudah Diverifikasi'))
      .filter(t => !q || (t.nama_guru || '').toLowerCase().includes(q) || (t.kelas_tujuan || '').toLowerCase().includes(q) || (t.mapel || '').toLowerCase().includes(q));
  }, [tugasList, search, statusFilter]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-emerald-500" /> Tugas Guru</h1>
        <p className="text-slate-500 text-sm">Rekap data tugas guru (terverifikasi/belum) yang telah melewati hari tugas diajukan.</p>
      </div>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Daftar Tugas Guru</CardTitle>
            <div className="flex gap-2">
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari guru/kelas/mapel..." className="w-full sm:w-56 h-8 text-sm" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="sudah">Sudah Verifikasi</SelectItem>
                  <SelectItem value="belum">Belum Verifikasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="bg-slate-50">
                <TableHead className="text-xs">Tanggal</TableHead>
                <TableHead className="text-xs">Guru</TableHead>
                <TableHead className="text-xs">Mapel</TableHead>
                <TableHead className="text-xs">Kelas</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Verifikator</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400 text-sm">Tidak ada data</TableCell></TableRow> : filtered.map(t => (
                  <TableRow key={t.id} className="hover:bg-slate-50">
                    <TableCell className="text-xs text-slate-600 whitespace-nowrap">{format(new Date(t.tanggal), 'd MMM yyyy', { locale: idLocale })}</TableCell>
                    <TableCell className="font-medium text-sm">{t.nama_guru}</TableCell>
                    <TableCell className="text-sm text-slate-600">{t.mapel || '-'}</TableCell>
                    <TableCell><Badge className="bg-slate-100 text-slate-700 text-xs">{t.kelas_tujuan}</Badge></TableCell>
                    <TableCell><Badge className={t.status_verifikasi === 'Sudah Diverifikasi' ? 'bg-emerald-100 text-emerald-700 text-xs' : 'bg-amber-100 text-amber-700 text-xs'}>{t.status_verifikasi}</Badge></TableCell>
                    <TableCell className="text-xs text-slate-500">{t.verifikator_nama || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}