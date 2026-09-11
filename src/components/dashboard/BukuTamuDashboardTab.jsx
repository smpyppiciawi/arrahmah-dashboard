import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookUser, Plus, ChevronRight } from "lucide-react";
import BukuTamuForm from '@/components/bukutamu/BukuTamuForm';

export default function BukuTamuDashboardTab({ siswaList }) {
  const [openForm, setOpenForm] = useState(false);
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list() });
  const { data: tamuList = [] } = useQuery({ queryKey: ['bukuTamu'], queryFn: () => base44.entities.BukuTamu.list('-tanggal') });
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayTamu = useMemo(() => (tamuList || []).filter(t => t.tanggal === today), [tamuList, today]);

  const namaTamu = (t) => t.jenis_tamu === 'Tamu Orang Tua/Wali' ? (t.nama_ortu_wali || '-') : (t.nama_lengkap || '-');

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BookUser className="w-4 h-4 text-cyan-600" />
            <h3 className="font-semibold text-slate-800 text-sm">Buku Tamu Hari Ini</h3>
            <Badge className="bg-cyan-50 text-cyan-700">{todayTamu.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setOpenForm(true)} className="bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4 mr-1" /> Tambah Tamu</Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead className="text-xs">Jenis</TableHead>
              <TableHead className="text-xs">Nama Tamu</TableHead>
              <TableHead className="text-xs">Keperluan</TableHead>
              <TableHead className="text-xs">Menemui</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {todayTamu.map(t => (
                <TableRow key={t.id} className="hover:bg-slate-50">
                  <TableCell><Badge className="bg-slate-100 text-slate-700 text-xs">{t.jenis_tamu}</Badge></TableCell>
                  <TableCell className="font-medium text-sm">{namaTamu(t)}</TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-xs truncate">{t.keperluan}</TableCell>
                  <TableCell className="text-xs text-slate-600">{t.ingin_bertemu || '-'}</TableCell>
                  <TableCell><Badge className={t.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 text-xs' : 'bg-amber-50 text-amber-700 text-xs'}>{t.status || 'Berkunjung'}</Badge></TableCell>
                </TableRow>
              ))}
              {todayTamu.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400 text-sm">Belum ada tamu hari ini</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="text-center">
          <Link to="/BukuTamu" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">Lihat Rekap di Menu Buku Tamu <ChevronRight className="w-3 h-3" /></Link>
        </div>
      </CardContent>
      <BukuTamuForm isOpen={openForm} onClose={() => setOpenForm(false)} siswaList={siswaList} guruList={guruList} />
    </Card>
  );
}