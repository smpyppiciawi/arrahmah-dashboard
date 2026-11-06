import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Scale, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { setujuiKenaikanRapor, tolakKenaikanRapor } from '@/lib/raporStatus';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const NAMA_BADGE = {
  Normal: 'bg-emerald-100 text-emerald-700',
  Kuning: 'bg-yellow-400 text-yellow-900',
  Merah: 'bg-red-500 text-white',
  Hitam: 'bg-black text-white',
};

export default function ApprovalRaporDialog({ open, onOpenChange, requests, currentUser }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState(null);

  const pending = useMemo(
    () => (requests || []).filter((r) => r.status_permintaan === 'Menunggu')
      .sort((a, b) => String(a.tanggal || '').localeCompare(String(b.tanggal || ''))),
    [requests]
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['riwayat-rapor-pending'] });
    queryClient.invalidateQueries({ queryKey: ['riwayat-rapor'] });
    queryClient.invalidateQueries({ queryKey: ['siswa'] });
    queryClient.invalidateQueries({ queryKey: ['pelanggaran-improvement'] });
  };

  const setujui = async (r) => {
    setBusyId(r.id);
    try {
      await setujuiKenaikanRapor(r.id, currentUser);
      refresh();
      toast({ title: `Status rapor menjadi ${r.ke_status}` });
    } catch (e) {
      toast({ title: 'Gagal menyetujui kenaikan rapor', variant: 'destructive' });
    }
    setBusyId(null);
  };

  const tolak = async (r) => {
    if (!confirm(`Tolak kenaikan status ${r.dari_status} → ${r.ke_status} untuk ${r.nama_siswa}?`)) return;
    setBusyId(r.id);
    try {
      await tolakKenaikanRapor(r.id, currentUser);
      refresh();
      toast({ title: 'Permintaan kenaikan rapor ditolak' });
    } catch (e) {
      toast({ title: 'Gagal menolak permintaan', variant: 'destructive' });
    }
    setBusyId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <Scale className="w-5 h-5" /> Persetujuan Kenaikan Status Rapor
            <Badge className="bg-indigo-100 text-indigo-700">{pending.length}</Badge>
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 -mt-2 mb-2">
          Kenaikan status menunggu persetujuan admin, kesiswaan, atau kurikulum. Status siswa berubah hanya setelah disetujui.
        </p>

        {pending.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Check className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
            Tidak ada permintaan kenaikan status rapor.
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="rounded-xl border border-indigo-100 bg-white p-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-800">{r.nama_siswa} <span className="text-xs font-normal text-slate-500">· {r.nama_kelas || '-'}</span></p>
                    <p className="text-[11px] text-slate-400">
                      {r.tanggal ? format(parseISO(r.tanggal), 'd MMM yyyy HH:mm', { locale: idLocale }) : '-'} · diusulkan {r.dibuat_oleh || 'Sistem'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className={NAMA_BADGE[r.dari_status] || NAMA_BADGE.Normal}>{r.dari_status}</Badge>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <Badge className={NAMA_BADGE[r.ke_status] || NAMA_BADGE.Kuning}>{r.ke_status}</Badge>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-1.5">{r.alasan}</p>
                <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">+{r.poin_pemicu || 0} poin baru</Badge>
                    <Badge variant="outline" className="text-[10px]">Total {r.poin_saat_ini || 0} poin</Badge>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => setujui(r)} disabled={busyId === r.id} className="h-8 bg-emerald-600 hover:bg-emerald-700">
                      {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />} Setujui
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => tolak(r)} disabled={busyId === r.id} className="h-8 border-red-200 text-red-600 hover:bg-red-50">
                      <X className="w-3.5 h-3.5 mr-1" /> Tolak
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}