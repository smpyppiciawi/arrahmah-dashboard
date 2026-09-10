import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SaldoBreakdownDialog({ open, onOpenChange, sumberDanaBreakdown, kategoriBreakdown, formatRupiah }) {
  const renderTable = (rows, labelKey) => (
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
          {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400 text-sm">Tidak ada data</TableCell></TableRow> : rows.map(r => (
            <TableRow key={r.key}>
              <TableCell className="font-medium text-sm">{r.key}</TableCell>
              <TableCell className="text-emerald-600 text-sm">{formatRupiah(r.masuk)}</TableCell>
              <TableCell className="text-red-500 text-sm">{formatRupiah(r.keluar)}</TableCell>
              <TableCell className={`font-semibold text-sm ${r.saldo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatRupiah(r.saldo)}</TableCell>
              <TableCell className="text-center text-xs text-slate-500">{r.transaksi}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const sumberRows = (sumberDanaBreakdown || []).map(s => ({ ...s, key: s.sumber_dana }));
  const kategoriRows = (kategoriBreakdown || []).map(s => ({ ...s, key: s.kategori }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Saldo per Sumber Dana & Kategori (All-Time)</DialogTitle></DialogHeader>
        <Tabs defaultValue="sumber">
          <TabsList className="mb-3">
            <TabsTrigger value="sumber">Sumber Dana</TabsTrigger>
            <TabsTrigger value="kategori">Kategori</TabsTrigger>
          </TabsList>
          <TabsContent value="sumber">{renderTable(sumberRows, 'Sumber Dana')}</TabsContent>
          <TabsContent value="kategori">{renderTable(kategoriRows, 'Kategori')}</TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}