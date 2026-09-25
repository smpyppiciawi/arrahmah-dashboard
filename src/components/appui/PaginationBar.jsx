import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Bar paginasi kompak: pilih jumlah baris per halaman + navigasi halaman */
export default function PaginationBar({ page, setPage, pageSize, setPageSize, total, pageSizes = [10, 25, 50] }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clamped = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (clamped - 1) * pageSize + 1;
  const end = Math.min(total, clamped * pageSize);
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
        <SelectTrigger className="h-8 w-[86px] text-xs rounded-lg bg-white border-slate-300">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pageSizes.map(s => <SelectItem key={s} value={String(s)}>{s} / hal</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="whitespace-nowrap tabular-nums">{start}–{end} / {total}</span>
      <Button variant="outline" size="icon" className="h-8 w-8 border-slate-300" disabled={clamped <= 1} onClick={() => setPage(clamped - 1)}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="icon" className="h-8 w-8 border-slate-300" disabled={clamped >= totalPages} onClick={() => setPage(clamped + 1)}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}