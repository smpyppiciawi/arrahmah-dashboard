import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function DrillDownDialog({ open, onOpenChange, title, data, columns, onWhatsApp, isDark = true }) {
  const c = isDark ? {
    dialog: 'bg-slate-900 border-slate-700',
    text: 'text-slate-100', textMuted: 'text-slate-500',
    head: 'border-slate-700', row: 'border-slate-800 hover:bg-slate-800/50',
    headCell: 'text-slate-400', cell: 'text-slate-300',
  } : {
    dialog: 'bg-white border-slate-200',
    text: 'text-slate-800', textMuted: 'text-slate-500',
    head: 'border-slate-200', row: 'border-slate-100 hover:bg-slate-50',
    headCell: 'text-slate-500', cell: 'text-slate-700',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-3xl max-h-[80vh] overflow-hidden flex flex-col ${c.dialog}`}>
        <DialogHeader>
          <DialogTitle className={c.text}>{title} ({data?.length || 0})</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          {data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className={c.head}>
                  {columns.map(col => <TableHead key={col.key} className={`${c.headCell} text-xs`}>{col.label}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, idx) => (
                  <TableRow key={idx} className={c.row}>
                    {columns.map(col => <TableCell key={col.key} className={`${c.cell} text-sm`}>{col.render ? col.render(row) : row[col.key] || '-'}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <div className="text-center py-10"><p className={`${c.textMuted} text-sm`}>Tidak ada data</p></div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}