import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getNamaPelapor, getNamaPencatat } from '@/lib/pelanggaranMeta';
import { Search, X, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function PelanggaranDrillDownDialog({ open, onOpenChange, pelanggaranData, improvementData, dateLabel, isDark = true }) {
  const [search, setSearch] = useState('');

  const c = isDark ? {
    dialog: 'bg-slate-900 border-slate-700',
    text: 'text-slate-100', textMuted: 'text-slate-500',
    head: 'border-slate-700', row: 'border-slate-800 hover:bg-slate-800/50',
    headCell: 'text-slate-400', cell: 'text-slate-300',
    input: 'bg-slate-800 text-slate-200 border-slate-700',
    btn: 'border-slate-700 text-slate-300 hover:bg-slate-800',
    tabs: 'bg-slate-800',
  } : {
    dialog: 'bg-white border-slate-200',
    text: 'text-slate-800', textMuted: 'text-slate-500',
    head: 'border-slate-200', row: 'border-slate-100 hover:bg-slate-50',
    headCell: 'text-slate-500', cell: 'text-slate-700',
    input: 'bg-white text-slate-700 border-slate-200',
    btn: 'border-slate-300 text-slate-600 hover:bg-slate-100',
    tabs: 'bg-slate-100',
  };

  const filterRows = (rows, keys) => {
    if (!search.trim()) return rows || [];
    const q = search.toLowerCase();
    return (rows || []).filter(r => keys.some(k => { const v = r[k]; return v != null && String(v).toLowerCase().includes(q); }));
  };

  const pelCols = [
    { key: 'tanggal', label: 'Tanggal', render: r => r.tanggal ? format(parseISO(r.tanggal), 'd MMM yy', { locale: idLocale }) : '-' },
    { key: 'nama_siswa', label: 'Siswa' },
    { key: 'nama_kelas', label: 'Kelas' },
    { key: 'kode', label: 'Kode' },
    { key: 'uraian_pelanggaran', label: 'Pelanggaran' },
    { key: 'poin', label: 'Poin', render: r => <Badge className="bg-red-100 text-red-700">{r.poin}</Badge> },
    { key: 'status', label: 'Status', render: r => <Badge className={r.status === 'Pending' ? 'bg-amber-100 text-amber-700' : r.status === 'Proses' ? 'bg-blue-100 text-blue-700' : r.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>{r.status}</Badge> },
    { key: 'pelapor', label: 'Pelapor', render: (r) => getNamaPelapor(r) },
    { key: 'pencatat', label: 'Pencatat', render: (r) => getNamaPencatat(r) },
  ];
  const impCols = [
    { key: 'tanggal', label: 'Tanggal', render: r => r.tanggal ? format(parseISO(r.tanggal), 'd MMM yy', { locale: idLocale }) : '-' },
    { key: 'nama_siswa', label: 'Siswa' },
    { key: 'nama_kelas', label: 'Kelas' },
    { key: 'kegiatan_pembinaan_nama', label: 'Kegiatan' },
    { key: 'uraian', label: 'Uraian' },
    { key: 'poin_pengurangan', label: 'Pengurangan', render: r => <Badge className="bg-emerald-100 text-emerald-700">-{r.poin_pengurangan}</Badge> },
    { key: 'validator_nama', label: 'Validator' },
  ];

  const pelFiltered = useMemo(() => filterRows(pelanggaranData, ['nama_siswa', 'nama_kelas', 'kode', 'uraian_pelanggaran', 'pelapor_nama']), [pelanggaranData, search]);
  const impFiltered = useMemo(() => filterRows(improvementData, ['nama_siswa', 'nama_kelas', 'kegiatan_pembinaan_nama', 'uraian', 'validator_nama']), [improvementData, search]);

  const totalPoin = (pelanggaranData || []).reduce((s, p) => s + (p.poin || 0), 0);
  const totalPengurangan = (improvementData || []).reduce((s, i) => s + (i.poin_pengurangan || 0), 0);

  const renderTable = (rows, cols) => (
    <Table>
      <TableHeader>
        <TableRow className={c.head}>
          {cols.map(col => <TableHead key={col.key} className={`${c.headCell} text-xs whitespace-nowrap`}>{col.label}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={idx} className={c.row}>
            {cols.map(col => <TableCell key={col.key} className={`${c.cell} text-xs whitespace-nowrap`}>{col.render ? col.render(row) : (row[col.key] || '-')}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[80vh] overflow-hidden flex flex-col ${c.dialog}`}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className={c.text}>Laporan Pelanggaran & Improvement — {dateLabel}</DialogTitle>
            <Link to="/CatatanSiswa?from=kepsek" onClick={() => onOpenChange(false)}>
              <Button size="sm" variant="outline" className={`gap-1 text-xs ${c.btn}`}><ExternalLink className="w-3 h-3" /> Catatan Siswa</Button>
            </Link>
          </div>
        </DialogHeader>
        <div className="flex items-center gap-2 pb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 pointer-events-none" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari siswa / kelas / pelanggaran..." className={`pl-8 pr-8 h-9 ${c.input}`} />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>}
          </div>
        </div>
        <Tabs defaultValue="pelanggaran" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className={`grid w-full grid-cols-2 mb-2 ${c.tabs}`}>
            <TabsTrigger value="pelanggaran" className={`${c.text} text-xs`}>Pelanggaran ({pelFiltered.length}) · {totalPoin} poin</TabsTrigger>
            <TabsTrigger value="improvement" className={`${c.text} text-xs`}>Improvement ({impFiltered.length}) · -{totalPengurangan}</TabsTrigger>
          </TabsList>
          <TabsContent value="pelanggaran" className="overflow-auto flex-1 mt-0">
            {pelFiltered.length > 0 ? renderTable(pelFiltered, pelCols) : <div className="text-center py-10"><p className={`${c.textMuted} text-sm`}>{search ? 'Data tidak ditemukan' : 'Tidak ada pelanggaran pada periode ini'}</p></div>}
          </TabsContent>
          <TabsContent value="improvement" className="overflow-auto flex-1 mt-0">
            {impFiltered.length > 0 ? renderTable(impFiltered, impCols) : <div className="text-center py-10"><p className={`${c.textMuted} text-sm`}>{search ? 'Data tidak ditemukan' : 'Tidak ada improvement pada periode ini'}</p></div>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}