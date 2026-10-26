import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, AlertTriangle, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// Baris sumber dana yang tidak berasal dari daftar Sumber Dana resmi
export const BELUM_TERPETAKAN = 'Belum Terpetakan';

export default function SaldoBreakdownDialog({ open, onOpenChange, sumberDanaBreakdown, kategoriBreakdown, sumberDetail, formatRupiah, periodLabel }) {
  const [expanded, setExpanded] = useState(null);

  const renderDetail = (row) => {
    const rows = (sumberDetail?.[row.key] || []).filter(k => k.jenis);
    if (!rows.length) return null;
    const sorted = [...rows].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
    const tampil = sorted.slice(0, 100);
    return (
      <div className="bg-slate-50/80 border-t border-slate-100 px-3 py-2">
        {row.key === BELUM_TERPETAKAN && (
          <p className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Transaksi berikut tercatat tanpa Sumber Dana resmi, sehingga tidak masuk ke rekening mana pun. Tetapkan sumber dananya lewat menu Transaksi.</span>
          </p>
        )}
        <div className="divide-y divide-slate-200/70">
          {tampil.map(k => (
            <div key={k.id} className="py-1.5 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-500">
                  {k.tanggal ? format(parseISO(k.tanggal), 'd MMM yyyy', { locale: idLocale }) : '-'}
                  <span className="mx-1">·</span>
                  {k.jenis}
                  {(k.tipe_transaksi || k.kategori) && <><span className="mx-1">·</span>{k.tipe_transaksi || k.kategori}</>}
                </p>
                <p className="text-xs text-slate-700 truncate">{k.uraian || '-'}</p>
                {(k.nama_siswa || k.nama_pegawai || k.nama_donatur) && (
                  <p className="text-[11px] text-slate-400 truncate">{k.nama_siswa || k.nama_pegawai || k.nama_donatur}{k.nama_kelas ? ` — ${k.nama_kelas}` : ''}</p>
                )}
              </div>
              <span className={`text-xs font-semibold flex-shrink-0 ${k.jenis === 'Pemasukan' ? 'text-emerald-600' : 'text-red-500'}`}>
                {k.jenis === 'Pemasukan' ? '+' : '−'}{formatRupiah(k.jumlah)}
              </span>
            </div>
          ))}
        </div>
        {rows.length > tampil.length && (
          <p className="text-[11px] text-slate-400 pt-1.5">Menampilkan {tampil.length} dari {rows.length} transaksi — lihat seluruhnya di menu Transaksi.</p>
        )}
        <Link to="/Transaksi" onClick={() => onOpenChange(false)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 mt-2">
          Buka menu Transaksi <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    );
  };

  const renderTable = (rows, labelKey, withDetail = false) => (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <Table>
        <TableHeader><TableRow className="bg-slate-50">
          <TableHead className="text-xs">{labelKey}</TableHead>
          <TableHead className="text-xs">Pemasukan</TableHead>
          <TableHead className="text-xs">Pengeluaran</TableHead>
          <TableHead className="text-xs">Saldo</TableHead>
          <TableHead className="text-xs text-center">Transaksi</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400 text-sm">Tidak ada data</TableCell></TableRow> : rows.map(r => {
            const isUnmapped = r.key === BELUM_TERPETAKAN;
            const canExpand = withDetail && (sumberDetail?.[r.key] || []).length > 0;
            const isOpen = expanded === r.key;
            return (
              <React.Fragment key={r.key}>
                <TableRow
                  className={isUnmapped ? 'bg-amber-50/60' : canExpand ? 'cursor-pointer hover:bg-slate-50' : ''}
                  onClick={canExpand ? () => setExpanded(isOpen ? null : r.key) : undefined}
                >
                  <TableCell className="font-medium text-sm">
                    <span className="inline-flex items-center gap-1">
                      {canExpand && <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                      <span className={isUnmapped ? 'text-amber-700' : ''}>{r.key}</span>
                    </span>
                    {isUnmapped && <span className="block text-[10px] font-normal text-amber-600 mt-0.5">Tanpa sumber dana resmi</span>}
                  </TableCell>
                  <TableCell className="text-emerald-600 text-sm">{formatRupiah(r.masuk)}</TableCell>
                  <TableCell className="text-red-500 text-sm">{formatRupiah(r.keluar)}</TableCell>
                  <TableCell className={`font-semibold text-sm ${r.saldo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatRupiah(r.saldo)}</TableCell>
                  <TableCell className="text-center text-xs text-slate-500">{r.transaksi}</TableCell>
                </TableRow>
                {isOpen && canExpand && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="p-0">{renderDetail(r)}</TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const sumberRows = (sumberDanaBreakdown || []).map(s => ({ ...s, key: s.sumber_dana }));
  const kategoriRows = (kategoriBreakdown || []).map(s => ({ ...s, key: s.kategori }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Saldo per Sumber Dana &amp; Kategori</DialogTitle>
          <p className="text-xs text-slate-500">{periodLabel ? `Periode ${periodLabel}` : 'Periode terpilih'} · sama dengan Laporan Bendahara</p>
        </DialogHeader>
        <Tabs defaultValue="sumber">
          <TabsList className="mb-3">
            <TabsTrigger value="sumber">Sumber Dana</TabsTrigger>
            <TabsTrigger value="kategori">Kategori</TabsTrigger>
          </TabsList>
          <TabsContent value="sumber">
            <p className="text-[11px] text-slate-400 mb-2">Klik baris untuk melihat transaksi pembentuk saldo.</p>
            {renderTable(sumberRows, 'Sumber Dana', true)}
          </TabsContent>
          <TabsContent value="kategori">{renderTable(kategoriRows, 'Kategori')}</TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}