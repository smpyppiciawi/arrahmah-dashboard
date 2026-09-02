import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";

// Tabel kompak dengan pencarian global (mencari semua field termasuk yang tidak ditampilkan)
// agar tidak ada scroll horizontal tapi data tetap bisa dicari seluruhnya.
export default function CatatanCompactTable({ columns, data, searchKeys = [], pageSize = 10, emptyMessage = "Tidak ada data" }) {
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState({ column: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    const keys = searchKeys.length ? searchKeys : Object.keys(data[0] || {});
    return data.filter(row => keys.some(k => {
      const v = row[k];
      return v != null && String(v).toLowerCase().includes(q);
    }));
  }, [data, search, searchKeys]);

  const sortedData = useMemo(() => {
    if (!sorting.column) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sorting.column];
      const bVal = b[sorting.column];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const c = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sorting.direction === 'asc' ? c : -c;
    });
  }, [filteredData, sorting]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, safePage, rowsPerPage]);

  const handleSort = (key) => {
    if (!key) return;
    setSorting(prev => prev.column === key
      ? { column: key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { column: key, direction: 'asc' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari semua data (siswa, kelas, kode, uraian, ...)"
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Tampilkan</span>
          <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-slate-500">dari {sortedData.length} data</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-xs text-slate-500 whitespace-nowrap">Hal {safePage}/{totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-slate-50">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`${col.sortable === false ? '' : 'cursor-pointer select-none'} ${col.headClassName || ''}`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1 font-semibold text-slate-700 whitespace-nowrap">
                    {col.label}
                    {col.sortable !== false && (
                      sorting.column === col.key
                        ? (sorting.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                        : null
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? paginatedData.map((row, idx) => (
              <TableRow key={row.id || idx} className="hover:bg-slate-50">
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className || ''}>
                    {col.render ? col.render(row) : row[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-slate-400">{emptyMessage}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}