import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Check, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PoinSiswaLulusDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState(null);

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-all'],
    queryFn: () => base44.entities.Siswa.list(),
    enabled: open,
  });

  const { data: pelanggaranList = [], isLoading } = useQuery({
    queryKey: ['pelanggaran'],
    queryFn: () => base44.entities.Pelanggaran.list('-tanggal'),
    enabled: open,
  });

  const nonActiveSiswa = useMemo(() => siswaList.filter(s => s.status !== 'Aktif'), [siswaList]);
  const siswaMap = useMemo(() => {
    const map = {};
    siswaList.forEach(s => { map[s.id] = s; });
    return map;
  }, [siswaList]);

  // Pelanggaran for non-active students with status 'Proses'
  const lulusPelanggaran = useMemo(() => {
    return pelanggaranList.filter(p => {
      const siswa = siswaMap[p.siswa_id];
      return siswa && siswa.status !== 'Aktif' && p.status === 'Proses';
    });
  }, [pelanggaranList, siswaMap]);

  // Group by siswa
  const groupedBySiswa = useMemo(() => {
    const groups = {};
    lulusPelanggaran.forEach(p => {
      if (!groups[p.siswa_id]) {
        groups[p.siswa_id] = {
          siswa: siswaMap[p.siswa_id],
          pelanggaran: [],
          totalPoin: 0,
        };
      }
      groups[p.siswa_id].pelanggaran.push(p);
      groups[p.siswa_id].totalPoin += p.poin || 0;
    });
    return Object.values(groups).sort((a, b) => (a.siswa?.nama || '').localeCompare(b.siswa?.nama || ''));
  }, [lulusPelanggaran, siswaMap]);

  const selesaikanMutation = useMutation({
    mutationFn: async (siswaId) => {
      const items = groupedBySiswa.find(g => g.siswa?.id === siswaId)?.pelanggaran || [];
      await base44.entities.Pelanggaran.bulkUpdate(
        items.map(p => ({ id: p.id, status: 'Selesai' }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pelanggaran'] });
      toast({ title: 'Berhasil', description: 'Semua pelanggaran siswa ditandai selesai.' });
      setProcessingId(null);
    },
    onError: (err) => {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
      setProcessingId(null);
    },
  });

  const handleSelesaikan = (siswaId) => {
    setProcessingId(siswaId);
    selesaikanMutation.mutate(siswaId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-amber-500" />
            Poin Siswa Lulus/Keluar
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" /></div>
        ) : groupedBySiswa.length === 0 ? (
          <div className="text-center py-10">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Tidak ada siswa lulus/keluar dengan pelanggaran yang belum selesai.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700">
                ℹ️ Siswa berikut berstatus <b>Lulus/Pindah/Keluar</b> dan masih memiliki pelanggaran dengan status <b>Proses</b>.
                Tandai selesai untuk memindahkan data ke riwayat pada menu Data Lulusan.
              </p>
            </div>

            {groupedBySiswa.map(group => (
              <Card key={group.siswa?.id} className="border border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800">{group.siswa?.nama}</h3>
                        <Badge className={
                          group.siswa?.status === 'Lulus' ? 'bg-blue-100 text-blue-700' :
                          group.siswa?.status === 'Pindah' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {group.siswa?.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        NIS: {group.siswa?.nis || '-'} • Kelas: {group.siswa?.nama_kelas || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">{group.totalPoin}</p>
                      <p className="text-xs text-slate-500">Total Poin</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {group.pelanggaran.map(p => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded text-xs">
                        <div className="flex-1">
                          <span className="font-medium text-slate-700">{p.kategori}</span>
                          <span className="text-slate-400 ml-2">— {p.uraian?.substring(0, 50)}{p.uraian?.length > 50 ? '...' : ''}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-100 text-slate-600 text-[10px]">{p.poin} poin</Badge>
                          <Badge className="bg-amber-100 text-amber-700 text-[10px]">{p.tanggal}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleSelesaikan(group.siswa?.id)}
                    disabled={processingId === group.siswa?.id}
                  >
                    {processingId === group.siswa?.id ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Memproses...</>
                    ) : (
                      <><Check className="w-4 h-4 mr-1" /> Tandai Semua Selesai</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}