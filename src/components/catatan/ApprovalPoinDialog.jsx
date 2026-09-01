import React, { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { recomputeRaporForSiswa } from '@/lib/raporStatus';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function ApprovalPoinDialog({ open, onOpenChange, pelanggaranList, siswaList, currentUser }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const pendingList = useMemo(
    () => (pelanggaranList || [])
      .filter((p) => p.status === 'Pending')
      .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')),
    [pelanggaranList]
  );
  const siswaMap = useMemo(() => Object.fromEntries((siswaList || []).map((s) => [s.id, s])), [siswaList]);

  const approveMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.PelanggaranImprovement.update(id, {
      status: 'Proses',
      approved_by_id: currentUser?.id,
      approved_by_nama: currentUser?.full_name,
      approved_at: new Date().toISOString(),
    }),
    onSuccess: async (_d, vars) => {
      if (vars.siswa_id) { try { await recomputeRaporForSiswa(vars.siswa_id); } catch {} }
      queryClient.invalidateQueries({ queryKey: ['pelanggaran-improvement'] });
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      toast({ title: 'Poin disetujui & terakumulasi', description: 'Status pelanggaran menjadi Proses.' });
    }
  });

  const tolakMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.PelanggaranImprovement.update(id, { status: 'Dibatalkan' }),
    onSuccess: async (_d, vars) => {
      if (vars.siswa_id) { try { await recomputeRaporForSiswa(vars.siswa_id); } catch {} }
      queryClient.invalidateQueries({ queryKey: ['pelanggaran-improvement'] });
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      toast({ title: 'Pelanggaran ditolak', description: 'Poin tidak diakumulasi.' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <Clock className="w-5 h-5" /> Approval Poin Pelanggaran
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 -mt-2 mb-3">
          Pelanggaran dengan poin ≥ 100 berstatus <b>Pending</b> dan poinnya belum terakumulasi sampai disetujui.
        </p>
        {pendingList.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Check className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
            Tidak ada pelanggaran menunggu approval.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingList.map((p) => (
              <Card key={p.id} className="border-amber-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className="bg-slate-700 text-white font-mono text-xs">{p.kode}</Badge>
                        <Badge variant="outline" className="text-xs">{p.kategori_utama}</Badge>
                        <Badge className="bg-amber-100 text-amber-700 text-xs">Pending · {p.poin} poin</Badge>
                      </div>
                      <p className="font-semibold text-slate-800">
                        {p.nama_siswa} <span className="text-xs font-normal text-slate-500">— {p.nama_kelas}</span>
                      </p>
                      <p className="text-sm text-slate-600 mt-0.5">{p.uraian_pelanggaran}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {p.tanggal ? format(new Date(p.tanggal), 'dd MMM yyyy', { locale: idLocale }) : ''} · Pelapor: {p.pelapor_nama}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate({ id: p.id, siswa_id: p.siswa_id })}
                      >
                        <Check className="w-4 h-4 mr-1" /> Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={tolakMutation.isPending}
                        onClick={() => tolakMutation.mutate({ id: p.id, siswa_id: p.siswa_id })}
                      >
                        <X className="w-4 h-4 mr-1" /> Tolak
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}