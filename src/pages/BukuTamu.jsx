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
import { Plus, Pencil, Trash2, LogOut as LogOutIcon, Search, BookUser } from 'lucide-react';
import BukuTamuForm from '@/components/bukutamu/BukuTamuForm';
import BukuTamuCardList from '@/components/bukutamu/BukuTamuCardList';
import BukuTamuDetailSheet from '@/components/bukutamu/BukuTamuDetailSheet';
import AppHeader from '@/components/appui/AppHeader';
import SummaryScroll from '@/components/appui/SummaryScroll';
import StickyFilterBar from '@/components/appui/StickyFilterBar';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const [detailTamu, setDetailTamu] = useState(null);
  const isMobile = useIsMobile();

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

  const showTanggal = dateFrom !== dateTo;

  const allFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return tamuList
      .filter(t => t.tanggal >= dateFrom && t.tanggal <= dateTo)
      .filter(t => !q ||
        (t.nama_lengkap || t.nama_ortu_wali || '').toLowerCase().includes(q) ||
        (t.keperluan || '').toLowerCase().includes(q) ||
        (t.nama_siswa || '').toLowerCase().includes(q));
  }, [tamuList, search, dateFrom, dateTo]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BukuTamu.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bukuTamu'] }); toast({ title: 'Data tamu dihapus' }); setDeleteTarget(null); },
  });
  const selesaiMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.BukuTamu.update(id, { status, tanggal_keluar: status === 'Selesai' ? new Date().toISOString() : null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bukuTamu'] }),
  });

  const namaTamu = (t) => t.jenis_tamu === 'Tamu Orang Tua/Wali' ? (t.nama_ortu_wali || '-') : (t.nama_lengkap || '-');

  const renderRow = (t, withJenis, withTanggal) => (
    <TableRow key={t.id} className="hover:bg-slate-50">
      {withTanggal && <TableCell className="text-xs text-slate-600 whitespace-nowrap">{format(parseISO(t.tanggal), 'd MMM yyyy', { locale: idLocale })}</TableCell>}
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

  const COLUMNS = (withJenis, withTanggal) => (
    <TableHeader><TableRow className="bg-slate-50">
      {withTanggal && <TableHead className="text-xs">Tanggal</TableHead>}
      {withJenis && <TableHead className="text-xs">Jenis</TableHead>}
      <TableHead className="text-xs">Nama</TableHead>
      <TableHead className="text-xs">Keperluan</TableHead>
      <TableHead className="text-xs">No HP/WA</TableHead>
      <TableHead className="text-xs">Ingin Bertemu</TableHead>
      <TableHead className="text-xs">Status</TableHead>
      {canCreate && <TableHead className="text-xs">Aksi</TableHead>}
    </TableRow></TableHeader>
  );

  const colSpan = (withJenis, withTanggal) => (withTanggal ? 1 : 0) + (withJenis ? 1 : 0) + 5 + (canCreate ? 1 : 0);

  const rangeLabel = showTanggal
    ? `${format(parseISO(dateFrom), 'd MMM', { locale: idLocale })} - ${format(parseISO(dateTo), 'd MMM yyyy', { locale: idLocale })}`
    : format(parseISO(dateFrom), 'd MMM yyyy', { locale: idLocale });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <AppHeader
          icon={BookUser}
          tint="sky"
          title="Buku Tamu"
          subtitle={`Catatan kunjungan tamu · ${rangeLabel}`}
          right={canCreate && (
            <Button className="hidden md:inline-flex bg-blue-600 hover:bg-blue-700" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Catat Tamu</Button>
          )}
        />

        <SummaryScroll items={[
          { label: 'Total Kunjungan', value: allFiltered.length, accent: 'slate' },
          { label: 'Sedang Berkunjung', value: allFiltered.filter(t => (t.status || 'Berkunjung') !== 'Selesai').length, accent: 'amber' },
          { label: 'Dinas', value: allFiltered.filter(t => t.jenis_tamu === 'Tamu Dinas').length, accent: 'blue' },
          { label: 'Ortu/Wali', value: allFiltered.filter(t => t.jenis_tamu === 'Tamu Orang Tua/Wali').length, accent: 'emerald' },
          { label: 'Yayasan', value: allFiltered.filter(t => t.jenis_tamu === 'Tamu Yayasan').length, accent: 'purple' },
          { label: 'Sekolah Lain', value: allFiltered.filter(t => t.jenis_tamu === 'Tamu Sekolah Lain').length, accent: 'orange' },
          { label: 'Umum', value: allFiltered.filter(t => t.jenis_tamu === 'Tamu Umum').length, accent: 'sky' },
        ]} />

        <StickyFilterBar>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input className="pl-9 h-10 rounded-full bg-white text-sm" placeholder="Cari nama / keperluan..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2.5 items-center">
            {[
              { key: 'today', label: 'Hari Ini' },
              { key: 'week', label: 'Minggu Ini' },
              { key: 'month', label: 'Bulan Ini' },
              { key: 'year', label: 'Tahun Ini' },
            ].map(p => (
              <button key={p.key} onClick={() => applyPreset(p.key)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-none transition-colors ${preset === p.key ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{p.label}</button>
            ))}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-3 py-1 flex-none">
              <input type="date" value={dateFrom} onChange={(e) => { setPreset('custom'); setDateFrom(e.target.value); }} className="bg-transparent text-xs border-0 focus:outline-none" />
              <span className="text-slate-400">-</span>
              <input type="date" value={dateTo} onChange={(e) => { setPreset('custom'); setDateTo(e.target.value); }} className="bg-transparent text-xs border-0 focus:outline-none" />
            </div>
          </div>
        </StickyFilterBar>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <Tabs defaultValue="Semua">
              <TabsList className="mb-3 flex overflow-x-auto no-scrollbar h-auto gap-1 w-full">
                <TabsTrigger value="Semua" className="text-xs whitespace-nowrap flex-none">Semua ({allFiltered.length})</TabsTrigger>
                {JENIS_TAMU.map(j => {
                  const list = allFiltered.filter(t => t.jenis_tamu === j);
                  return <TabsTrigger key={j} value={j} className="text-xs whitespace-nowrap flex-none">{j.replace('Tamu ', '')} ({list.length})</TabsTrigger>;
                })}
              </TabsList>
              <TabsContent value="Semua">
                {isMobile ? (
                  <BukuTamuCardList data={allFiltered} showTanggal={showTanggal} onOpen={setDetailTamu} />
                ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <Table>
                    {COLUMNS(true, showTanggal)}
                    <TableBody>
                      {allFiltered.map(t => renderRow(t, true, showTanggal))}
                      {allFiltered.length === 0 && <TableRow><TableCell colSpan={colSpan(true, showTanggal)} className="text-center py-10 text-slate-400 text-sm">Belum ada data pada rentang ini</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
                )}
              </TabsContent>
              {JENIS_TAMU.map(j => {
                const list = allFiltered.filter(t => t.jenis_tamu === j);
                return (
                  <TabsContent key={j} value={j}>
                    {isMobile ? (
                      <BukuTamuCardList data={list} showTanggal={showTanggal} onOpen={setDetailTamu} />
                    ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <Table>
                        {COLUMNS(false, showTanggal)}
                        <TableBody>
                          {list.map(t => renderRow(t, false, showTanggal))}
                          {list.length === 0 && <TableRow><TableCell colSpan={colSpan(false, showTanggal)} className="text-center py-10 text-slate-400 text-sm">Belum ada data</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* FAB — Catat Tamu (mobile) */}
      {canCreate && (
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-[0_8px_16px_rgba(37,99,235,0.35)] flex items-center justify-center active:scale-95 transition-transform"
          title="Catat Tamu"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <BukuTamuDetailSheet
        tamu={detailTamu}
        open={!!detailTamu}
        onOpenChange={(v) => !v && setDetailTamu(null)}
        canEdit={canCreate}
        onSelesai={(t) => { setDetailTamu(null); selesaiMutation.mutate({ id: t.id, status: 'Selesai' }); }}
        onEdit={(t) => { setDetailTamu(null); setEditing(t); setFormOpen(true); }}
        onDelete={(t) => { setDetailTamu(null); setDeleteTarget(t); }}
      />

      <BukuTamuForm isOpen={formOpen} onClose={() => setFormOpen(false)} editingData={editing} siswaList={siswaList} guruList={guruList} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Hapus Data Tamu" description={`Hapus catatan tamu ${deleteTarget ? namaTamu(deleteTarget) : ''}?`} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} />
    </div>
  );
}