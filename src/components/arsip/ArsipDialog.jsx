import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { Archive, ArchiveRestore, Trash2, Search } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

/**
 * Dialog Arsip generik untuk entitas Siswa / Guru.
 * Menampilkan data terarsip (is_arsip = true), pencarian via UID/NIS/NUPTK/nama,
 * tombol Pulihkan (kembalikan status lama) dan Hapus Permanen (khusus Admin).
 */
export default function ArsipDialog({ open, onOpenChange, entity, title, subtitle, columns }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [q, setQ] = useState('');
  const [hapusTarget, setHapusTarget] = useState(null);

  const { data: arsipList = [], isLoading } = useQuery({
    queryKey: ['arsip', entity],
    queryFn: async () => {
      const page = await base44.entities[entity].filter({ is_arsip: true }, { sort: '-arsip_at', limit: 1000 });
      return page.items || [];
    },
    enabled: open,
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return arsipList;
    return arsipList.filter(r =>
      [r.uid, r.nis, r.nama, r.nuptk, r.nama_kelas, r.jabatan].some(v => String(v || '').toLowerCase().includes(s))
    );
  }, [arsipList, q]);

  const invalidateSemua = () => {
    queryClient.invalidateQueries({ queryKey: ['arsip', entity] });
    queryClient.invalidateQueries({ queryKey: [entity === 'Siswa' ? 'siswa' : 'guru'] });
  };

  const restoreMutation = useMutation({
    mutationFn: (row) => base44.entities[entity].update(row.id, {
      is_arsip: false,
      status: row.status_sebelum_arsip || 'Aktif',
      status_sebelum_arsip: '',
      arsip_at: '',
      arsip_alasan: '',
      arsip_oleh: '',
    }),
    onSuccess: () => { invalidateSemua(); onOpenChange(false); },
  });

  const hapusPermanenMutation = useMutation({
    mutationFn: async (row) => {
      // Hapus permanen siswa ikut membersihkan riwayat terkait (alur lama)
      if (entity === 'Siswa') {
        const [absensiData, nilaiData, pelanggaranData, prestasiData, uksData] = await Promise.all([
          base44.entities.Absensi.filter({ siswa_id: row.id }),
          base44.entities.Nilai.filter({ siswa_id: row.id }),
          base44.entities.Pelanggaran.filter({ siswa_id: row.id }),
          base44.entities.Prestasi.filter({ siswa_id: row.id }),
          base44.entities.UKS.filter({ siswa_id: row.id }),
        ]);
        await Promise.all([
          ...absensiData.map(r => base44.entities.Absensi.delete(r.id)),
          ...nilaiData.map(r => base44.entities.Nilai.delete(r.id)),
          ...pelanggaranData.map(r => base44.entities.Pelanggaran.delete(r.id)),
          ...prestasiData.map(r => base44.entities.Prestasi.delete(r.id)),
          ...uksData.map(r => base44.entities.UKS.delete(r.id)),
        ]);
      }
      return base44.entities[entity].delete(row.id);
    },
    onSuccess: () => { invalidateSemua(); setHapusTarget(null); onOpenChange(false); },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Archive className="w-5 h-5 text-slate-500" /> {title}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari UID / NIS / nama..." className="pl-9" />
          </div>
          <div className="min-h-[200px]">
            {isLoading ? (
              <p className="text-sm text-slate-400 text-center py-8">Memuat arsip...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Belum ada data arsip.</p>
            ) : (
              <div className="space-y-2">
                {filtered.map(row => (
                  <div key={row.id} className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white">
                    <div className="min-w-0 flex-1">
                      {columns.map(col => (
                        <div key={col.key} className="text-xs text-slate-500 truncate">
                          <span className="font-medium text-slate-600">{col.label}: </span>
                          {col.render ? col.render(row) : String(row[col.key] || '-')}
                        </div>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => restoreMutation.mutate(row)} disabled={restoreMutation.isPending}>
                      <ArchiveRestore className="w-3.5 h-3.5" /> Pulihkan
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={() => setHapusTarget(row)}>
                        <Trash2 className="w-3.5 h-3.5" /> Hapus Permanen
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!hapusTarget}
        onOpenChange={(v) => !v && setHapusTarget(null)}
        onConfirm={() => hapusPermanenMutation.mutate(hapusTarget)}
        title="Hapus Permanen"
        description={`Data ${hapusTarget?.nama || ''} beserta seluruh riwayat terkait akan dihapus PERMANEN dan tidak dapat dipulihkan. Pastikan Anda sudah punya cadangan data.`}
      />
    </>
  );
}