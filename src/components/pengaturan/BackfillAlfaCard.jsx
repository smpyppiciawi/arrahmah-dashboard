import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, CalendarX, AlertTriangle, CheckCircle } from 'lucide-react';

export default function BackfillAlfaCard({ tahunAjaran }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState(null);

  const isAdmin = ['admin', 'operator', 'tu', 'kepsek'].includes(user?.role);
  if (!isAdmin) return null;

  const mutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke('backfillAlfa', payload),
    onSuccess: (res) => {
      const d = res?.data || res;
      setResult(d);
      setShowConfirm(false);
      if (d?.status === 'nothing_to_create' || d?.status === 'no_working_days') {
        toast({ title: 'Tidak ada yang perlu di-backfill', description: 'Semua siswa sudah memiliki catatan absensi pada hari kerja.' });
      } else {
        toast({
          title: 'Backfill selesai',
          description: `${d?.absensi_created || 0} absensi Alfa & ${d?.pelanggaran_created || 0} pelanggaran otomatis dibuat.`,
        });
      }
    },
    onError: (e) => {
      toast({ title: 'Gagal backfill', description: e?.message || 'Terjadi kesalahan', variant: 'destructive' });
    },
  });

  const y1 = (tahunAjaran || '').split('/')[0];
  const startDate = y1 ? `${y1}-07-01` : '1 Juli tahun ajaran aktif';

  return (
    <>
      <Card className="border-red-200 bg-gradient-to-br from-red-50 to-rose-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-red-700">
            <CalendarX className="w-5 h-5" />
            Backfill Absensi Alfa (1 Juli – Hari Ini)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-red-800/90">
            Mencatat otomatis ketidakhadiran (<strong>Alfa</strong>) bagi siswa aktif yang belum memiliki catatan absensi pada
            hari kerja (Senin–Jumat, kecuali hari libur sekolah) sejak <strong>{startDate}</strong> sampai hari ini.
            Setiap Alfa akan otomatis memicu pelanggaran: <strong>F-02</strong> (Kehadiran) / <strong>F-05</strong> (Jumat – Salat Jumat).
          </p>
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              Jalankan <strong>sekali</strong>. Siswa yang sudah ada catatan absensi pada hari tersebut akan dilewati. Aksi ini
              membuat record pelanggaran otomatis untuk seluruh hari kerja yang belum terisi.
            </p>
          </div>
          <Button
            className="bg-red-600 hover:bg-red-700 gap-2 w-full sm:w-auto"
            onClick={() => { setResult(null); setShowConfirm(true); }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarX className="w-4 h-4" />}
            Jalankan Backfill Alfa
          </Button>

          {result && result.status === 'success' && (
            <div className="mt-2 p-4 bg-white border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                <CheckCircle className="w-4 h-4" /> Backfill berhasil dijalankan
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <Info label="Hari kerja diproses" value={result.working_days} />
                <Info label="Siswa aktif" value={result.siswa_aktif} />
                <Info label="Absensi Alfa dibuat" value={result.absensi_created} highlight />
                <Info label="Pelanggaran dibuat" value={result.pelanggaran_created} highlight />
                <Info label="Dilewati (sudah ada record)" value={result.siswa_skipped_existing} />
                <Info label="Pelanggaran dedup" value={result.pelanggaran_dedup_skipped || 0} />
              </div>
              <p className="text-[11px] text-slate-400">
                Periode: {result.start_date} s/d {result.today} · Tahun ajaran {result.tahun_ajaran || '-'}
              </p>
            </div>
          )}
          {result && (result.status === 'nothing_to_create' || result.status === 'no_working_days') && (
            <div className="mt-2 p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Tidak ada absensi Alfa yang perlu dibuat — semua siswa sudah memiliki catatan pada hari kerja dalam periode tersebut.
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Konfirmasi Backfill Alfa
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sistem akan membuat record absensi <strong>Alfa</strong> untuk setiap siswa aktif yang belum memiliki catatan
              absensi pada hari kerja (Senin–Jumat, kecuali libur) dari <strong>{startDate}</strong> hingga hari ini.
              <br /><br />
              Setiap Alfa otomatis membuat pelanggaran <strong>F-02</strong> (Kehadiran, 20 poin) atau <strong>F-05</strong>
              (Jumat, 10 poin) dengan pelapor <strong>Admin/Sistem</strong>. Aksi ini sebaiknya dijalankan satu kali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => mutation.mutate({})}
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Ya, Jalankan Backfill
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