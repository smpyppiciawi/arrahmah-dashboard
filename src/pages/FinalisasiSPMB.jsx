import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SpmbGuard from '@/components/spmb/SpmbGuard';
import SpmbSyncButton from '@/components/spmb/SpmbSyncButton';
import StatusBadge from '@/components/spmb/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { useToast } from '@/components/ui/use-toast';
import { UserCheck, GraduationCap, Loader2, CheckCircle2 } from 'lucide-react';
import { finalisasiPendaftar, fmtRp } from '@/lib/spmbUtils';

function FinalisasiPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ['SiswaSPMB'],
    queryFn: () => base44.entities.SiswaSPMB.list('-created_date', 200),
  });
  const kelasQ = useQuery({ queryKey: ['Kelas'], queryFn: () => base44.entities.Kelas.list() });
  const pengaturanQ = useQuery({ queryKey: ['PengaturanAplikasi'], queryFn: () => base44.entities.PengaturanAplikasi.list() });

  const [selected, setSelected] = useState(null);
  const [kelasId, setKelasId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const list = data || [];
  const kandidat = list.filter((d) => d.status === 'accepted' && !d.finalized);
  const selesai = list.filter((d) => d.finalized);
  const taAktif = (pengaturanQ.data || [])[0]?.tahun_ajaran_aktif || '';
  const kelasList = (kelasQ.data || []).filter((k) => !taAktif || k.tahun_ajaran === taAktif);
  const kelasTerpilih = kelasList.find((k) => k.id === kelasId);

  const handleConfirm = async () => {
    if (!selected || !kelasTerpilih) return;
    setBusy(true);
    try {
      const { homevisit_id } = await finalisasiPendaftar(selected, kelasTerpilih, taAktif);
      await qc.invalidateQueries({ queryKey: ['SiswaSPMB'] });
      qc.invalidateQueries({ queryKey: ['Siswa'] });
      qc.invalidateQueries({ queryKey: ['HomeVisit'] });
      toast({
        title: 'Finalisasi berhasil',
        description: `${selected.nama} kini siswa aktif kelas ${kelasTerpilih.nama_kelas}${homevisit_id ? ' + draf Home Visit dibuat' : ''}. NIS akan diisi lewat Buku Induk.`,
      });
      setConfirmOpen(false);
      setSelected(null);
      setKelasId('');
    } catch (e) {
      toast({ title: 'Gagal finalisasi', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finalisasi Pendaftar</h1>
          <p className="text-sm text-slate-500">Menjadikan pendaftar berstatus Diterima sebagai Siswa Aktif</p>
        </div>
        <SpmbSyncButton />
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Siap Difinalisasi ({kandidat.length})</h2>
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">Memuat data...</div>
        ) : kandidat.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
            Tidak ada pendaftar Diterima yang menunggu finalisasi.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {kandidat.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{d.nama}</p>
                    <p className="font-mono text-xs text-slate-500">{d.reg_number}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4">
                  <span>{d.gender || '-'}</span>
                  <span>{d.wave || '-'}</span>
                  {d.previous_school && <span>Asal: {d.previous_school}</span>}
                  {d.total_dibayar > 0 && <span className="text-teal-600 font-semibold">Dibayar {fmtRp(d.total_dibayar)}</span>}
                </div>
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => { setSelected(d); setKelasId(''); }}
                >
                  <GraduationCap className="w-4 h-4" /> Finalisasi ke Siswa Aktif
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selesai.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Sudah Difinalisasi ({selesai.length})</h2>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 font-semibold">Nama</th>
                    <th className="px-4 py-3 font-semibold">No. Pendaftaran</th>
                    <th className="px-4 py-3 font-semibold">Home Visit</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selesai.map((d) => (
                    <tr key={d.id} className="border-b border-slate-100">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{d.nama}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{d.reg_number}</td>
                      <td className="px-4 py-2.5">
                        {d.homevisit_id
                          ? <span className="text-[11px] font-semibold text-violet-600">Draf dibuat</span>
                          : <span className="text-[11px] text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Siswa Aktif
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setKelasId(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-emerald-600" /> Finalisasi Pendaftar</DialogTitle>
            <DialogDescription>
              {selected?.nama} ({selected?.reg_number}) akan dibuat sebagai Siswa aktif. NIS diisi kosong dulu (lewat Buku Induk).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kelas Tujuan</label>
              <Select value={kelasId} onValueChange={setKelasId}>
                <SelectTrigger className="w-full mt-1 bg-white"><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
                <SelectContent>
                  {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                </SelectContent>
              </Select>
              {kelasList.length === 0 && !kelasQ.isLoading && (
                <p className="text-xs text-amber-600 mt-1">Tidak ada kelas untuk tahun ajaran {taAktif || 'aktif'}.</p>
              )}
            </div>
            {(selected?.interview_answers || []).length > 0 || selected?.interview_notes ? (
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                Data wawancara tersedia — draf Home Visit akan dibuat otomatis.
              </p>
            ) : null}
            <Button className="w-full" disabled={!kelasId || busy} onClick={() => setConfirmOpen(true)}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              Buat Siswa Aktif
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Konfirmasi Finalisasi"
        description={`${selected?.nama} akan dibuat sebagai Siswa aktif di kelas ${kelasTerpilih?.nama_kelas || ''}. Lanjutkan?`}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

export default function FinalisasiSPMB() {
  return <SpmbGuard><FinalisasiPage /></SpmbGuard>;
}