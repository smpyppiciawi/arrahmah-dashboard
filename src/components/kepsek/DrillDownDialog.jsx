import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowUpDown, ExternalLink, X } from 'lucide-react';

export default function DrillDownDialog({ open, onOpenChange, title, data, columns, isDark = true, fullLink, sortFn }) {
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  const c = isDark ? {
    dialog: 'bg-slate-900 border-slate-700',
    text: 'text-slate-100', textMuted: 'text-slate-500',
    head: 'border-slate-700', row: 'border-slate-800 hover:bg-slate-800/50',
    headCell: 'text-slate-400', cell: 'text-slate-300',
    input: 'bg-slate-800 text-slate-200 border-slate-700',
    btn: 'border-slate-700 text-slate-300 hover:bg-slate-800',
  } : {
    dialog: 'bg-white border-slate-200',
    text: 'text-slate-800', textMuted: 'text-slate-500',
    head: 'border-slate-200', row: 'border-slate-100 hover:bg-slate-50',
    headCell: 'text-slate-500', cell: 'text-slate-700',
    input: 'bg-white text-slate-700 border-slate-200',
    btn: 'border-slate-300 text-slate-600 hover:bg-slate-100',
  };

  const sortKey = columns?.[0]?.key;

  const processed = useMemo(() => {
    if (!data) return [];
    let rows = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => columns.some(col => {
        const val = r[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      }));
    }
    rows.sort((a, b) => {
      if (sortFn) return sortDir === 'asc' ? sortFn(a, b) : sortFn(b, a);
      const va = String(a?.[sortKey] ?? '');
      const vb = String(b?.[sortKey] ?? '');
      return sortDir === 'asc' ? va.localeCompare(vb, 'id') : vb.localeCompare(va, 'id');
    });
    return rows;
  }, [data, search, sortDir, sortFn, sortKey, columns]);

  const fullUrl = fullLink ? `${fullLink}${fullLink.includes('?') ? '&' : '?'}from=kepsek` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-3xl max-h-[80vh] overflow-hidden flex flex-col ${c.dialog}`}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className={c.text}>{title} ({processed.length}{search ? ` dari ${data?.length || 0}` : ''})</DialogTitle>
            {fullUrl && (
              <Link to={fullUrl} onClick={() => onOpenChange(false)}>
                <Button size="sm" variant="outline" className={`gap-1 text-xs ${c.btn}`}>
                  <ExternalLink className="w-3 h-3" /> Lihat Data Lengkap
                </Button>
              </Link>
            )}
          </div>
        </DialogHeader>
        <div className="flex items-center gap-2 pb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / data..." className={`pl-8 pr-8 h-9 ${c.input}`} />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button size="sm" variant="outline" className={`h-9 gap-1 ${c.btn}`} onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>
            <ArrowUpDown className="w-3.5 h-3.5" /> {sortDir === 'asc' ? 'A-Z' : 'Z-A'}
          </Button>
        </div>
        <div className="overflow-auto flex-1">
          {processed.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className={c.head}>
                  {columns.map((col) => <TableHead key={col.key} className={`${c.headCell} text-xs`}>{col.label}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {processed.map((row, idx) => (
                  <TableRow key={idx} className={c.row}>
                    {columns.map((col) => <TableCell key={col.key} className={`${c.cell} text-sm`}>{col.render ? col.render(row) : (row[col.key] || '-')}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10"><p className={`${c.textMuted} text-sm`}>{search ? 'Data tidak ditemukan' : 'Tidak ada data'}</p></div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}