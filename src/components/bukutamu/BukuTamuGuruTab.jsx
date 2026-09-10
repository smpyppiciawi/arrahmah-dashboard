import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/lib/AuthContext';
import { BookUser } from 'lucide-react';

export default function BukuTamuGuruTab() {
  const { user } = useAuth();
  const { data: tamuList = [] } = useQuery({ queryKey: ['bukuTamu'], queryFn: () => base44.entities.BukuTamu.list('-tanggal') });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list() });

  const myGuru = useMemo(() => guruList.find(g => (user?.full_name && g.nama === user.full_name) || (user?.email && g.email === user.email)), [guruList, user]);

  const myTamu = useMemo(() => {
    return tamuList.filter(t => {
      if (myGuru && t.ingin_bertemu_pegawai_id === myGuru.id) return true;
      if (t.ingin_bertemu && user?.full_name && t.ingin_bertemu.toLowerCase() === user.full_name.toLowerCase()) return true;
      return false;
    });
  }, [tamuList, myGuru, user]);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookUser className="w-4 h-4 text-cyan-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Tamu yang Ingin Bertemu Anda</h3>
          <Badge className="bg-cyan-50 text-cyan-700">{myTamu.length}</Badge>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead className="text-xs">Tanggal</TableHead>
              <TableHead className="text-xs">Jenis</TableHead>
              <TableHead className="text-xs">Nama Tamu</TableHead>
              <TableHead className="text-xs">Keperluan</TableHead>
              <TableHead className="text-xs">No HP/WA</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {myTamu.map(t => (
                <TableRow key={t.id} className="hover:bg-slate-50">
                  <TableCell className="text-xs text-slate-600 whitespace-nowrap">{format(parseISO(t.tanggal), 'd MMM yyyy', { locale: idLocale })}</TableCell>
                  <TableCell><Badge className="bg-slate-100 text-slate-700 text-xs">{t.jenis_tamu}</Badge></TableCell>
                  <TableCell className="font-medium text-sm">{t.jenis_tamu === 'Tamu Orang Tua/Wali' ? t.nama_ortu_wali : t.nama_lengkap}</TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-xs truncate">{t.keperluan}</TableCell>
                  <TableCell className="text-xs text-slate-600">{t.no_hp_wa || '-'}</TableCell>
                  <TableCell><Badge className={t.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 text-xs' : 'bg-amber-50 text-amber-700 text-xs'}>{t.status || 'Berkunjung'}</Badge></TableCell>
                </TableRow>
              ))}
              {myTamu.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400 text-sm">Belum ada tamu yang ingin bertemu dengan Anda</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}