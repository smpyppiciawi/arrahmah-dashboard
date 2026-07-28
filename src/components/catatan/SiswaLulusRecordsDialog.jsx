import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Loader2, AlertCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";

export default function SiswaLulusRecordsDialog({ open, onOpenChange, entityName, queryKey, title, extraColumns = [] }) {
  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-all'],
    queryFn: () => base44.entities.Siswa.list(),
    enabled: open,
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: () => base44.entities[entityName].list('-tanggal'),
    enabled: open,
  });

  const siswaMap = useMemo(() => {
    const map = {};
    siswaList.forEach(s => { map[s.id] = s; });
    return map;
  }, [siswaList]);

  const lulusRecords = useMemo(() => {
    return records.filter(r => {
      const siswa = siswaMap[r.siswa_id];
      return siswa && siswa.status !== 'Aktif';
    });
  }, [records, siswaMap]);

  const columns = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'nama_siswa', label: 'Siswa' },
    { key: 'nama_kelas', label: 'Kelas', render: (row) => <Badge variant="secondary" className="bg-blue-100 text-blue-700">{row.nama_kelas}</Badge> },
    ...extraColumns,
    {
      key: 'status_siswa',
      label: 'Status Siswa',
      sortable: false,
      filterable: false,
      render: (row) => {
        const siswa = siswaMap[row.siswa_id];
        return (
          <Badge className={
            siswa?.status === 'Lulus' ? 'bg-blue-100 text-blue-700' :
            siswa?.status === 'Pindah' ? 'bg-orange-100 text-orange-700' :
            'bg-slate-100 text-slate-700'
          }>
            {siswa?.status || '-'}
          </Badge>
        );
      }
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-amber-500" />
            {title || 'Data Siswa Lulus/Keluar'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" /></div>
        ) : lulusRecords.length === 0 ? (
          <div className="text-center py-10">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Tidak ada data siswa lulus/keluar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700">
                ℹ️ Menampilkan data untuk siswa berstatus <b>Lulus/Pindah/Keluar</b>.
                Data siswa aktif tidak ditampilkan di sini.
              </p>
            </div>
            <DataTable columns={columns} data={lulusRecords} pageSize={10} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}