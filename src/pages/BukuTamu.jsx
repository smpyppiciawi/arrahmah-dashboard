import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, LogOut as LogOutIcon, Search } from 'lucide-react';
import BukuTamuForm from '@/components/bukutamu/BukuTamuForm';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';

const JENIS_TAMU = ['Tamu Dinas', 'Tamu Orang Tua/Wali', 'Tamu Yayasan', 'Tamu Sekolah Lain', 'Tamu Umum'];
const JENIS_BADGE = {
  'Tamu Dinas': 'bg-blue-100 text-blue-700',
  'Tamu Orang Tua/Wali': 'bg-emerald-100 text-emerald-700',
  'Tamu Yayasan': 'bg-violet-100 text-violet-700',
  'Tamu Sekolah Lain': 'bg-amber-100 text-amber-700',
  'Tamu Umum': 'bg-slate-100 text-slate-700',
};

export default function BukuTamu() {
  const { user } = useAuth();
  const userRole = user?.role || 'guru';
  const canCreate = ['admin', 'kepsek', 'tu', 'operator'].includes(userRole);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState('today');
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const applyPreset = (p) => {
    setPreset(p);
    const today = new Date();
    if (p === 'today') { setDateFrom(format(today, 'yyyy-MM-dd')); setDateTo(format(today, 'yyyy-MM-dd')); }
    else if (p === 'week') { setDateFrom(format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')); setDateTo(format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')); }
    else if (p === 'month') { setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd')); setDateTo(format(endOfMonth(today), 'yyyy-MM-dd')); }
    else if (p === 'year') { setDateFrom(format(startOfYear(today), 'yyyy-MM-dd')); setDateTo(format(endOfYear(today), 'yyyy-MM-dd')); }
  };

  const { data: tamuList = [], isLoading } = useQuery({ queryKey: ['bukuTamu'], queryFn: () => base44.entities.BukuTamu.list('-tanggal') });
  const { data: siswaList = [] } = useQuery({ queryKey: ['siswa'], queryFn: () => base44.entities.Siswa.list() });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list() });

  const inRange = useMemo(() => tamuList.filter(t => t.tanggal >= dateFrom && t.tanggal <= dateTo), [tamuList, dateFrom, dateTo]);
  const allFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return tamuList.filter(t => !q ||
      (t.nama_lengkap || t.nama_ortu_wali || '').toLowerCase().includes(q) ||
      (t.keperluan || '').toLowerCase().includes(q) ||
      (t.nama_siswa || '').toLowerCase().includes(q));
  }, [tamuList, search]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BukuTamu.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bukuTamu'] }); toast({ title: 'Data tamu dihapus' }); setDeleteTarget(null); },
  });
  const selesaiMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.BukuTamu.update(id, { status, tanggal_keluar: status === 'Selesai' ? new Date().toISOString() : null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bukuTamu'] }),
  });

  const namaTamu = (t) => t.jenis_tamu === 'Tamu Orang Tua/Wali' ? (t.nama_ortu_wali || '-') : (t.nama_lengkap || '-');

  const renderRow = (t, withJenis) => (
    <TableRow key={t.id} className="hover:bg-slate-50">
      <TableCell className="text-xs text-slate-600 whitespace-nowrap">{format(parseISO(t.tanggal), 'd MMM yyyy', { locale: idLocale })}</TableCell>
      {withJenis && <TableCell><Badge className={JENIS_BADGE[t.jenis_tamu]}>{t.jenis_tamu}</Badge></TableCell>}
      <TableCell className="font-medium text-sm">
        {namaTamu(t)}
        {t.jenis_tamu === 'Tamu Orang Tua/Wali' && t.nama_siswa && <span className="block text-xs text-slate-400">Anak: {t.nama_siswa} ({t.nama_kelas || '-'})</span>}
      </TableCell>
      <TableCell className="text-sm text-slate-600 max-w-xs truncate">{t.keperluan}</TableCell>
      <TableCell className="text-xs text-slate-600">{t.no_hp_wa || '-'}</TableCell>
      <TableCell className="text-xs text-slate-600">{t.ingin_bertemu || '-'}</TableCell>
      <TableCell><Badge className={t.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>{t.status || 'Berkunjung'}</Badge></TableCell>
      {canCreate && (
        <TableCell>
          <div className="flex gap-1">
            {t.status !== 'Selesai' && <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => selesaiMutation.mutate({ id: t.id, status: 'Selesai' })} title="Tandai Selesai"><LogOutIcon className="w-3.5 h-3.5" /></Button>}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(t); setFormOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setDeleteTarget(t)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );

  const COLUMNS = (withJenis) => (
    <TableHeader><TableRow className="bg-slate-50">
      <TableHead className="text-xs">Tanggal</TableHead>
      {withJenis && <TableHead className="text-xs">Jenis</TableHead>}
      <TableHead className="text-xs">Nama</TableHead>
      <TableHead className="text-xs">Keperluan</TableHead>
      <TableHead className="text-xs">No HP/WA</TableHead>
      <TableHead className="text-xs">Ingin Bertemu</TableHead>
      <TableHead className="text-xs">Status</TableHead>
      {canCreate && <TableHead className="text-xs">Aksi</TableHead>}
    </TableRow></TableHeader>
  );

  const colSpanAll = withJenis => (canCreate ? (withJenis ? 8 : 7) : (withJenis ? 7 : 6));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Buku Tamu</h1>
            <p className="text-slate-500 mt-0.5 text-sm">Catatan kunjungan tamu ke sekolah</p>
          </div>
          {canCreate && <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Catat Tamu</Button>}
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            {[
              { key: 'today', label: 'Hari Ini' },
              { key: 'week', label: 'Minggu Ini' },
              { key: 'month', label: 'Bulan Ini' },
              { key: 'year', label: 'Tahun Ini' },
            ].map(p => (
              <button key={p.key} onClick={() => applyPreset(p.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${preset === p.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{p.label}</button>
            ))}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <input type="date" value={dateFrom} onChange={(e) => { setPreset('custom'); setDateFrom(e.target.value); }} className="bg-transparent text-xs border-0 focus:outline-none" />
              <span className="text-slate-400">-</span>
              <input type="date" value={dateTo} onChange={(e) => { setPreset('custom'); setDateTo(e.target.value); }} className="bg-transparent text-xs border-0 focus:outline-none" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tamu Berkunjung ({format(parseISO(dateFrom), 'd MMM', { locale: idLocale })} - {format(parseISO(dateTo), 'd MMM yyyy', { locale: idLocale })}) · {inRange.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <Table>
                {COLUMNS(true)}
                <TableBody>
                  {inRange.length ? inRange.map(t => renderRow(t, true))
                    : <TableRow><TableCell colSpan={colSpanAll(true)} className="text-center py-10 text-slate-400 text-sm">Belum ada tamu pada rentang ini</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base">Semua Daftar Tamu</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input className="pl-9 h-8 text-sm" placeholder="Cari nama / keperluan..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="Semua">
              <TabsList className="mb-3 flex flex-wrap h-auto gap-1">
                <TabsTrigger value="Semua" className="text-xs">Semua ({allFiltered.length})</TabsTrigger>
                {JENIS_TAMU.map(j => {
                  const list = allFiltered.filter(t => t.jenis_tamu === j);
                  return <TabsTrigger key={j} value={j} className="text-xs">{j.replace('Tamu ', '')} ({list.length})</TabsTrigger>;
                })}
              </TabsList>
              <TabsContent value="Semua">
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <Table>
                    {COLUMNS(true)}
                    <TableBody>
                      {allFiltered.map(t => renderRow(t, true))}
                      {allFiltered.length === 0 && <TableRow><TableCell colSpan={colSpanAll(true)} className="text-center py-10 text-slate-400 text-sm">Belum ada data</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              {JENIS_TAMU.map(j => {
                const list = allFiltered.filter(t => t.jenis_tamu === j);
                return (
                  <TabsContent key={j} value={j}>
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <Table>
                        {COLUMNS(false)}
                        <TableBody>
                          {list.map(t => renderRow(t, false))}
                          {list.length === 0 && <TableRow><TableCell colSpan={colSpanAll(false)} className="text-center py-10 text-slate-400 text-sm">Belum ada data</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <BukuTamuForm isOpen={formOpen} onClose={() => setFormOpen(false)} editingData={editing} siswaList={siswaList} guruList={guruList} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Hapus Data Tamu" description={`Hapus catatan tamu ${deleteTarget ? namaTamu(deleteTarget) : ''}?`} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} />
    </div>
  );
}