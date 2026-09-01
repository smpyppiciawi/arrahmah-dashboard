import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, CalendarX, AlertTriangle, CheckCircle, Power, Trash2, CalendarRange } from 'lucide-react';

function todayLocalStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export default function BackfillAlfaCard({ pengaturan }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(todayLocalStr());
  const [showRunConfirm, setShowRunConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [cancelResult, setCancelResult] = useState(null);

  const isAdmin = ['admin', 'operator', 'tu', 'kepsek'].includes(user?.role);
  const backfillAktif = pengaturan?.backfill_aktif !== false;

  const tahunAjaran = pengaturan?.tahun_ajaran_aktif || '';
  useEffect(() => {
    if (!startDate) {
      const y1 = (tahunAjaran || '').split('/')[0];
      setStartDate(y1 ? `${y1}-07-01` : `${new Date().getFullYear()}-07-01`);
    }
  }, [tahunAjaran]);

  const toggleMutation = useMutation({
    mutationFn: async (newValue) => {
      if (pengaturan?.id) {
        return base44.entities.PengaturanAplikasi.update(pengaturan.id, { backfill_aktif: newValue });
      }
      return base44.entities.PengaturanAplikasi.create({ tahun_ajaran_aktif: tahunAjaran, backfill_aktif: newValue });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan-aplikasi'] });
      toast({ title: backfillAktif ? 'Fitur dinonaktifkan' : 'Fitur diaktifkan', description: backfillAktif ? 'Backfill & auto-pelanggaran Alfa dijeda.' : 'Backfill & auto-pelanggaran Alfa aktif kembali.' });
    },
    onError: (e) => toast({ title: 'Gagal', description: e?.message, variant: 'destructive' }),
  });

  const runMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke('backfillAlfa', payload),
    onSuccess: (res) => {
      const d = res?.data || res;
      setRunResult(d);
      setShowRunConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['absensi'] });
      if (d?.status === 'no_working_days') {
        toast({ title: 'Tidak ada hari sekolah', description: 'Tidak ada hari Senin-Jumat dalam rentang.' });
      } else {
        toast({ title: 'Backfill selesai', description: `${d?.absensi_created || 0} Absensi Alfa & ${d?.pelanggaran_created || 0} pelanggaran F-02 dibuat.` });
      }
    },
    onError: (e) => {
      setShowRunConfirm(false);
      toast({ title: 'Gagal backfill', description: e?.message || 'Terjadi kesalahan', variant: 'destructive' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => base44.functions.invoke('cancelBackfill', {}),
    onSuccess: (res) => {
      const d = res?.data || res;
      setCancelResult(d);
      setShowCancelConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['absensi'] });
      queryClient.invalidateQueries({ queryKey: ['pelanggaran'] });
      toast({ title: 'Data backfill dibatalkan', description: `${d?.absensiDeleted || 0} Absensi & ${d?.pelanggaranDeleted || 0} pelanggaran dihapus.` });
    },
    onError: (e) => {
      setShowCancelConfirm(false);
      toast({ title: 'Gagal membatalkan', description: e?.message, variant: 'destructive' });
    },
  });

  if (!isAdmin) return null;

  return (
    <>
      <Card className="border-red-200 bg-gradient-to-br from-red-50 to-rose-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-red-700">
            <CalendarX className="w-5 h-5" />
            Backfill Absensi Alfa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Banner status + master switch */}
          <div className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full ${backfillAktif ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Power className="w-3.5 h-3.5" /> Fitur Backfill {backfillAktif ? 'Aktif' : 'Dinonaktifkan'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {backfillAktif ? 'Backfill & auto-pelanggaran Alfa aktif.' : 'Dijeda — tidak ada pelanggaran otomatis dari Alfa.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-slate-500">{backfillAktif ? 'ON' : 'OFF'}</span>
              <Switch checked={backfillAktif} onCheckedChange={(v) => toggleMutation.mutate(v)} disabled={toggleMutation.isPending} />
            </div>
          </div>

          <p className="text-sm text-red-800/90">
            Mencatat otomatis ketidakhadiran (<strong>Alfa</strong>) bagi siswa yang belum memiliki catatan absensi pada
            hari sekolah (Senin–Jumat, kecuali hari libur Kalender Pendidikan). <strong>Hanya kelas yang absensinya sudah diisi petugas</strong> yang diproses —
            kelas yang belum diabsen sama sekali dilewati agar tidak terjadi Alfa massal. Setiap Alfa otomatis membuat pelanggaran <strong>F-02</strong> (20 poin).
          </p>

          {/* Rentang tanggal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1"><CalendarRange className="w-3 h-3" /> Tanggal Mulai</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" disabled={!backfillAktif} />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1"><CalendarRange className="w-3 h-3" /> Tanggal Selesai</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} max={todayLocalStr()} className="h-9" disabled={!backfillAktif} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="bg-red-600 hover:bg-red-700 gap-2 flex-1"
              onClick={() => { setRunResult(null); setShowRunConfirm(true); }}
              disabled={runMutation.isPending || !backfillAktif || !startDate || !endDate || startDate > endDate}
            >
              {runMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarX className="w-4 h-4" />}
              Jalankan Backfill
            </Button>
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 gap-2 flex-1"
              onClick={() => { setCancelResult(null); setShowCancelConfirm(true); }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Cancel Data Backfill
            </Button>
          </div>

          {runResult && runResult.status === 'success' && (
            <div className="p-4 bg-white border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                <CheckCircle className="w-4 h-4" /> Backfill berhasil
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <Info label="Hari sekolah" value={runResult.working_days} />
                <Info label="Kelas diproses" value={runResult.classes_processed} />
                <Info label="Kelas dilewati" value={runResult.classes_skipped} />
                <Info label="Absensi Alfa dibuat" value={runResult.absensi_created} highlight />
                <Info label="Pelanggaran F-02" value={runResult.pelanggaran_created} highlight />
                <Info label="Siswa aktif" value={runResult.siswa_aktif} />
              </div>
              <p className="text-[11px] text-slate-400">Periode: {runResult.start_date} s/d {runResult.end_date} · {runResult.tahun_ajaran || '-'}</p>
            </div>
          )}
          {runResult && runResult.status === 'no_working_days' && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Tidak ada hari sekolah dalam rentang tersebut.
            </div>
          )}

          {cancelResult && (
            <div className="p-4 bg-white border border-amber-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
                <CheckCircle className="w-4 h-4" /> Data backfill dibatalkan
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Info label="Absensi dihapus" value={cancelResult.absensiDeleted} highlight />
                <Info label="Pelanggaran dihapus" value={cancelResult.pelanggaranDeleted} highlight />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Run */}
      <AlertDialog open={showRunConfirm} onOpenChange={setShowRunConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Konfirmasi Backfill Alfa
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sistem akan mencatat <strong>Alfa</strong> untuk siswa yang belum memiliki catatan absensi pada hari sekolah
              (Senin–Jumat, kecuali libur Kalender Pendidikan) dalam rentang <strong>{startDate}</strong> s/d <strong>{endDate}</strong>.
              <br /><br />
              Hanya kelas yang absensinya <strong>sudah diisi petugas</strong> yang diproses. Setiap Alfa otomatis membuat pelanggaran <strong>F-02</strong> (20 poin, pelapor Sistem-Backfill).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => runMutation.mutate({ start_date: startDate, end_date: endDate })}>
              {runMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Ya, Jalankan Backfill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Cancel */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Cancel Semua Data Backfill
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan <strong>menghapus seluruh data hasil backfill</strong> tanpa memandang tanggal:
              semua Absensi ber-keterangan "Backfill otomatis" dan semua PelanggaranImprovement buatan backfill (pelapor Sistem-Backfill/Admin-Sistem) akan dihapus permanen.
              Data absensi & pelanggaran yang diinput petugas manual tidak ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => cancelMutation.mutate()}>
              {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Ya, Hapus Semua Data Backfill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Info({ label, value, highlight }) {
  return (
    <div className="p-2 bg-slate-50 rounded-lg">
      <p className="text-slate-400">{label}</p>
      <p className={`font-bold text-base ${highlight ? 'text-red-600' : 'text-slate-700'}`}>{value ?? 0}</p>
    </div>
  );
}