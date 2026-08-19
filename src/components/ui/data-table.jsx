import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";

export function DataTable({ columns, data, pageSize = 5 }) {
  const [sorting, setSorting] = useState({ column: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  // Apply filters
  const filteredData = useMemo(() => {
    let filtered = [...data];
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        const column = columns.find(c => c.key === key);
        filtered = filtered.filter(row => {
          const cellValue = column?.filterAccessor ? column.filterAccessor(row) : row[key];
          if (cellValue === null || cellValue === undefined) return false;
          return String(cellValue).toLowerCase().includes(String(value).toLowerCase());
        });
      }
    });
    
    return filtered;
  }, [data, filters]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sorting.column) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sorting.column];
      const bVal = b[sorting.column];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sorting.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sorting]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const handleSort = (columnKey) => {
    setSorting(prev => {
      if (prev.column === columnKey) {
        return { column: columnKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column: columnKey, direction: 'asc' };
    });
  };

  const handleFilterChange = (columnKey, value) => {
    setFilters(prev => ({ ...prev, [columnKey]: value }));
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Pagination Controls — dipindah ke pojok kanan atas agar tidak terganggu FAB */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Tampilkan</span>
          <Select value={String(rowsPerPage)} onValueChange={handleRowsPerPageChange}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-600">dari {sortedData.length} data</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600">
            Halaman {currentPage} dari {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {/* Column Headers with Sort */}
            <TableRow className="bg-slate-50">
              {columns.map((column) => (
                <TableHead key={column.key} className="font-semibold">
                  <button
                    onClick={() => column.sortable !== false && handleSort(column.key)}
                    className={`flex items-center gap-2 w-full ${column.sortable !== false ? 'hover:text-slate-900 cursor-pointer' : ''}`}
                  >
                    {column.label}
                    {column.sortable !== false && (
                      <span className="ml-auto">
                        {sorting.column === column.key ? (
                          sorting.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronsUpDown className="w-4 h-4 text-slate-400" />
                        )}
                      </span>
                    )}
                  </button>
                </TableHead>
              ))}
            </TableRow>
            
            {/* Filter Row */}
            <TableRow>
              {columns.map((column) => (
                <TableHead key={`filter-${column.key}`} className="py-2">
                  {column.filterable !== false && (
                    <Input
                      placeholder={`Filter ${column.label.toLowerCase()}...`}
                      value={filters[column.key] || ''}
                      onChange={(e) => handleFilterChange(column.key, e.target.value)}
                      className="h-8 text-xs"
                    />
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => (
                <TableRow key={row.id || index}>
                  {columns.map((column) => (
                    <TableCell key={`${row.id}-${column.key}`}>
                      {column.render ? column.render(row) : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-slate-400">
                  Tidak ada data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}