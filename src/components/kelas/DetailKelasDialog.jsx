import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default function DetailKelasDialog({ open, onOpenChange, kelas }) {
  const { data: siswaList = [], isLoading } = useQuery({
    queryKey: ['siswa-kelas', kelas?.id],
    queryFn: () => base44.entities.Siswa.filter({ kelas_id: kelas?.id, status: 'Aktif' }),
    enabled: !!kelas?.id && open,
  });

  const sorted = [...siswaList].sort((a, b) => a.nama?.localeCompare(b.nama));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Detail Kelas — {kelas?.nama_kelas}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
          <p className="text-sm text-slate-600">Wali Kelas: <span className="font-semibold">{kelas?.wali_kelas || '-'}</span></p>
          <span className="text-slate-300">|</span>
          <p className="text-sm text-slate-600">TA: <span className="font-semibold">{kelas?.tahun_ajaran || '-'}</span></p>
          <Badge className="ml-auto bg-purple-100 text-purple-700">{sorted.length} Siswa</Badge>
        </div>

        <div className="space-y-1 max-h-[55vh] overflow-y-auto">
          {isLoading && <p className="text-sm text-slate-400 text-center py-4">Memuat data...</p>}
          {!isLoading && sorted.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Belum ada siswa di kelas ini.<br /><span className="text-xs">Tambahkan di menu Siswa.</span></p>
          )}
          {sorted.map((siswa, i) => (
            <div key={siswa.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 border-b last:border-0">
              <span className="text-xs text-slate-400 w-6 text-right">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{siswa.nama}</p>
                <p className="text-xs text-slate-400">NIS: {siswa.nis || '-'}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {siswa.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
              </Badge>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center">Untuk mengubah data siswa, silakan ke menu Siswa.</p>
      </DialogContent>
    </Dialog>
  );
}