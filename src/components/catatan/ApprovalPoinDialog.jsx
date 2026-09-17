import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { recomputeRaporForSiswa } from '@/lib/raporStatus';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function ApprovalPoinDialog({ open, onOpenChange, pelanggaranList, siswaList, currentUser }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [kelasFilter, setKelasFilter] = useState('all');

  const pendingList = useMemo(
    () => (pelanggaranList || [])
      .filter((p) => p.status === 'Pending')
      .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')),
    [pelanggaranList]
  );

  const kelasOptions = useMemo(
    () => [...new Set(pendingList.map((p) => p.nama_kelas).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id')),
    [pendingList]
  );

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    return pendingList.filter((p) => {
      const matchQ = !q || (p.nama_siswa || '').toLowerCase().includes(q) || (p.nis || '').includes(q);
      const matchKelas = kelasFilter === 'all' || p.nama_kelas === kelasFilter;
      return matchQ && matchKelas;
    });
  }, [pendingList, search, kelasFilter]);

  // Grup per siswa: 1 siswa dengan beberapa pelanggaran = 1 blok ber-border
  const groups = useMemo(() => {
    const map = {};
    filtered.forEach((p) => {
      const key = p.siswa_id || p.nama_siswa;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return Object.values(map);
  }, [filtered]);

  // Invalidasi semua cache pelanggaran & data siswa — perubahan approval langsung
  // tersinkron untuk semua akun/halaman terkait (Kepsek, Catatan Siswa, dll).
  const invalidateAllRelated = () => {
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0] || '').toLowerCase().includes('pelanggaran') });
    queryClient.invalidateQueries({ queryKey: ['siswa'] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.PelanggaranImprovement.update(id, {
      status: 'Proses',
      approved_by_id: currentUser?.id,
      approved_by_nama: currentUser?.full_name,
      approved_at: new Date().toISOString(),
    }),
    onSuccess: async (_d, vars) => {
      if (vars.siswa_id) { try { await recomputeRaporForSiswa(vars.siswa_id); } catch {} }
      invalidateAllRelated();
      toast({ title: 'Poin disetujui & terakumulasi', description: 'Status pelanggaran menjadi Proses. Perubahan berlaku untuk semua akun terkait.' });
    }
  });

  const tolakMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.PelanggaranImprovement.update(id, { status: 'Dibatalkan' }),
    onSuccess: async (_d, vars) => {
      if (vars.siswa_id) { try { await recomputeRaporForSiswa(vars.siswa_id); } catch {} }
      invalidateAllRelated();
      toast({ title: 'Pelanggaran ditolak', description: 'Poin tidak diakumulasi. Perubahan berlaku untuk semua akun terkait.' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <Clock className="w-5 h-5" /> Approval Poin Pelanggaran
            <Badge className="bg-amber-100 text-amber-700">{pendingList.length}</Badge>
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 -mt-2 mb-3">
          Pelanggaran dengan poin ≥ 100 berstatus <b>Pending</b> dan poinnya belum terakumulasi sampai disetujui.
          Beberapa pelanggaran dari siswa yang sama ditampilkan dalam satu blok.
        </p>

        {pendingList.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama siswa / NIS..."
                className="w-full h-9 text-sm rounded-md border border-slate-200 pl-8 pr-3 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
            <Select value={kelasFilter} onValueChange={setKelasFilter}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {kelasOptions.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {pendingList.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Check className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
            Tidak ada pelanggaran menunggu approval.
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">Tidak ada hasil untuk pencarian/filter ini.</div>
        ) : (
          <div className="space-y-3">
            {groups.map((recs) => {
              const p0 = recs[0];
              const totalPoin = recs.reduce((s, p) => s + (p.poin || 0), 0);
              return (
                <div key={p0.siswa_id || p0.nama_siswa} className="rounded-xl border-2 border-amber-300/70 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-100/60">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{p0.nama_siswa}</p>
                      <p className="text-[11px] text-slate-500">{p0.nama_kelas || '-'} · {recs.length} pelanggaran menunggu</p>
                    </div>
                    <Badge className="bg-amber-500 text-white shrink-0">{totalPoin} poin</Badge>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {recs.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="bg-slate-700 text-white font-mono text-[10px]">{p.kode}</Badge>
                            <Badge variant="outline" className="text-[10px]">{p.kategori_utama}</Badge>
                            <span className="text-[10px] text-slate-400">{p.tanggal ? format(parseISO(p.tanggal), 'd MMM yyyy', { locale: idLocale }) : ''}</span>
                            <Badge className="bg-amber-100 text-amber-700 text-[10px]">{p.poin} poin</Badge>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{p.uraian_pelanggaran}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Pelapor: {p.pelapor_nama || '-'}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                          <button
                            onClick={() => approveMutation.mutate({ id: p.id, siswa_id: p.siswa_id })}
                            disabled={approveMutation.isPending}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Setujui
                          </button>
                          <button
                            onClick={() => tolakMutation.mutate({ id: p.id, siswa_id: p.siswa_id })}
                            disabled={tolakMutation.isPending}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Tolak
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}