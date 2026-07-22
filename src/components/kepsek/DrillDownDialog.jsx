import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageCircle, X } from 'lucide-react';

export default function DrillDownDialog({ open, onOpenChange, title, data, columns, onWhatsApp }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100">{title} ({data?.length || 0})</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          {data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-800">
                  {columns.map(col => (
                    <TableHead key={col.key} className="text-slate-400 text-xs">{col.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, idx) => (
                  <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/50">
                    {columns.map(col => (
                      <TableCell key={col.key} className="text-slate-300 text-sm">
                        {col.render ? col.render(row) : row[col.key] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-slate-500 text-sm">Tidak ada data</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}