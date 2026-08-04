import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Wallet,
  BookOpen, Users, Package, Lock, FileText, ArrowRight, History, RotateCcw,
} from 'lucide-react';

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function ProsesTahunAjaran() {
  const { user } = useAuth();
  const { activeAcademicYear, pengaturan } = useActiveAcademicYear();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tahunBaru, setTahunBaru] = useState('');
  const [showLockdown, setShowLockdown] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [migrationLogId, setMigrationLogId] = useState(null);

  const isAdmin = ['admin', 'kepsek'].includes(user?.role);

  // Pre-flight data
  const { data: allSiswa = [], isLoading: loadingSiswa } = useQuery({
    queryKey: ['siswa-finalisasi'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }, undefined, 2000),
    staleTime: 30 * 1000,
  });
  const { data: allBiayaKhusus = [], isLoading: loadingBiaya } = useQuery({
    queryKey: ['biayaKhusus-finalisasi'],
    queryFn: () => base44.entities.BiayaKhusus.list(),
    staleTime: 30 * 1000,
  });
  const { data: allNilai = [], isLoading: loadingNilai } = useQuery({
    queryKey: ['nilai-finalisasi', activeAcademicYear],
    queryFn: () => base44.entities.Nilai.filter({ tahun_ajaran: activeAcademicYear }, undefined, 2000),
    staleTime: 30 * 1000,
  });
  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-finalisasi'],
    queryFn: () => base44.entities.Kelas.list(),
  });
  const { data: logHistory = [] } = useQuery({
    queryKey: ['logTahunAjaran'],
    queryFn: () => base44.entities.LogTahunAjaran.list('-tanggal_migrasi', 10),
    staleTime: 60 * 1000,
  });

  // Pre-flight checks
  const kelas9Ids = useMemo(() => kelasList.filter(k => k.tingkat === '9').map(k => k.id), [kelasList]);
  const siswaKelas9 = useMemo(() => allSiswa.filter(s => kelas9Ids.includes(s.kelas_id)), [allSiswa, kelas9Ids]);
  const siswaTanpaKelas = useMemo(() => allSiswa.filter(s => !s.kelas_id), [allSiswa]);

  const biayaKhususTahunAktif = useMemo(() =>
    allBiayaKhusus.filter(b => !b.tahun_ajaran || b.tahun_ajaran === activeAcademicYear),
    [allBiayaKhusus, activeAcademicYear]
  );
  const totalTunggakan = useMemo(() => {
    return biayaKhususTahunAktif.reduce((sum, b) => {
      if (b.is_gratis) return sum;
      const sisa = Math.max(0, (b.nominal_khusus || 0) - (b.sudah_bayar || 0));
      return sum + sisa;
    }, 0);
  }, [biayaKhususTahunAktif]);

  const checks = [
    {
      id: 'keuangan',
      label: 'Keuangan',
      icon: Wallet,
      description: 'Closing sisa tunggakan menjadi Arsip Keuangan',
      status: totalTunggakan > 0 ? 'warning' : 'ok',
      detail: totalTunggakan > 0
        ? `${biayaKhususTahunAktif.filter(b => !b.is_gratis && (b.nominal_khusus || 0) - (b.sudah_bayar || 0) > 0).length} siswa punya tunggakan (akan diarsipkan)`
        : 'Tidak ada tunggakan tersisa',
      data: `${formatRupiah(totalTunggakan)} sisa tunggakan`,
    },
    {
      id: 'nilai',
      label: 'Nilai',
      icon: BookOpen,
      description: 'Arsip nilai akhir ke entitas Arsip Nilai',
      status: allNilai.length === 0 ? 'warning' : 'ok',
      detail: allNilai.length === 0 ? 'Tidak ada nilai tahun ini' : `${allNilai.length} record nilai akan diarsipkan`,
      data: `${allNilai.length} record`,
    },
    {
      id: 'siswa',
      label: 'Status Siswa',
      icon: Users,
      description: 'Verifikasi siswa aktif & kelulusan kelas 9',
      status: siswaTanpaKelas.length > 0 ? 'fail' : 'ok',
      detail: siswaTanpaKelas.length > 0
        ? `${siswaTanpaKelas.length} siswa aktif tanpa kelas! Perbaiki dulu.`
        : `${allSiswa.length} siswa aktif · ${siswaKelas9.length} siswa kelas 9 akan diluluskan`,
      data: `${allSiswa.length} siswa`,
    },
    {
      id: 'sarpras',
      label: 'Sarpras',
      icon: Package,
      description: 'Laporan kondisi akhir tahun',
      status: 'ok',
      detail: 'Kondisi barang tetap tersimpan, tidak perlu migrasi khusus',
      data: 'Tersimpan otomatis',
    },
  ];

  const allPassed = checks.every(c => c.status !== 'fail');
  const canActivate = allPassed && tahunBaru.trim() && tahunBaru.trim() !== activeAcademicYear && !isMigrating;

  const handleMigrate = async () => {
    setIsMigrating(true);
    setShowLockdown(false);
    try {
      const res = await base44.functions.invoke('prosesFinalisasi', {
        tahun_ajaran_lama: activeAcademicYear,
        tahun_ajaran_baru: tahunBaru.trim(),
        catatan: `Finalisasi oleh ${user?.full_name}`,
      });
      const data = res.data || res;
      if (data?.error) throw new Error(data.error);
      setSummary(data.summary);
      setMigrationLogId(data.log_id);
      queryClient.invalidateQueries();
      toast({
        title: 'Finalisasi Berhasil!',
        description: `Tahun ajaran telah berganti ke ${tahunBaru.trim()}. ${data.summary.jumlah_siswa_lulus} siswa diluluskan.`,
      });
    } catch (err) {
      toast({ title: 'Finalisasi Gagal', description: err.message, variant: 'destructive' });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleResetSummary = () => {
    setSummary(null);
    setMigrationLogId(null);
    setTahunBaru('');
  };

  // Summary report screen
  if (summary) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Finalisasi Selesai</h1>
          <p className="text-slate-500 mt-1">
            Tahun ajaran berganti dari <strong>{summary.tahun_ajaran_lama}</strong> → <strong>{summary.tahun_ajaran_baru}</strong>
          </p>
          <Badge className="mt-3 bg-emerald-100 text-emerald-700 border-emerald-200">
            Log ID: {migrationLogId?.slice(-8)}
          </Badge>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-blue-500" /> Laporan Ringkasan Migrasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Siswa Diarsip" value={summary.jumlah_siswa_diarsip} icon={Users} color="text-blue-600" />
              <StatBox label="Siswa Diluluskan" value={summary.jumlah_siswa_lulus} icon={CheckCircle2} color="text-amber-600" />
              <StatBox label="Nilai Diarsip" value={summary.jumlah_nilai_diarsip} icon={BookOpen} color="text-purple-600" />
              <StatBox label="Tunggakan Diarsip" value={summary.jumlah_tunggakan_diarsip} icon={Wallet} color="text-red-600" />
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">Total Saldo Tunggakan Sebelum</span>
                <span className="font-semibold text-slate-700">{formatRupiah(summary.total_saldo_sebelum)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">Total Saldo di Arsip Keuangan</span>
                <span className="font-semibold text-slate-700">{formatRupiah(summary.total_saldo_sesudah)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t">
                <span className="text-sm font-medium">Integritas Data (Checksum)</span>
                {summary.checksum_match ? (
                  <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Cocok</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" /> Selisih!</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleResetSummary} variant="outline" className="flex-1 gap-2">
            <RotateCcw className="w-4 h-4" /> Selesai
          </Button>
        </div>
      </div>
    );
  }

  // Migration in progress screen
  if (isMigrating) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Card className="border-amber-200">
          <CardContent className="py-16 text-center">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800">Sistem Dalam Mode Read-Only</h2>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              Proses migrasi sedang berjalan. Data sedang dipindahkan ke arsip historis.
              Mohon jangan menutup halaman ini hingga proses selesai.
            </p>
            <div className="mt-6 space-y-2 text-sm text-slate-600 max-w-sm mx-auto">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Menghitung checksum keuangan</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mengarsipkan tunggakan</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mengarsipkan nilai</div>
              <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 text-amber-500 animate-spin" /> Meluluskan siswa kelas 9...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <ShieldCheck className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Finalisasi & Pergantian Tahun Ajaran</h1>
          <p className="text-slate-500 text-sm">Proses closing & migrasi data historis sebelum mengaktifkan tahun baru</p>
        </div>
      </div>

      {/* Read-only / access notice */}
      {!isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4" /> Hanya Admin/Kepsek yang dapat menjalankan finalisasi.
        </div>
      )}

      {/* Current year status */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-lg">
                <History className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Tahun Ajaran Aktif Saat Ini</p>
                <p className="text-xl font-bold text-slate-800">{activeAcademicYear || 'Belum diatur'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-slate-300" />
              <div className="text-right">
                <p className="text-sm text-slate-500">Tahun Ajaran Baru</p>
                {isAdmin ? (
                  <Input
                    value={tahunBaru}
                    onChange={e => setTahunBaru(e.target.value)}
                    placeholder="2027/2028"
                    className="w-32 text-base font-bold"
                  />
                ) : (
                  <p className="text-xl font-bold text-slate-400">—</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pre-flight checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Pre-Flight Check (Modul Review)
          </CardTitle>
          <CardDescription className="text-xs">
            Semua modul wajib lulus validasi sebelum tahun baru dapat diaktifkan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((check) => {
            const Icon = check.icon;
            const isFail = check.status === 'fail';
            const isWarn = check.status === 'warning';
            return (
              <div
                key={check.id}
                className={`flex items-start gap-3 p-4 rounded-xl border ${
                  isFail ? 'border-red-200 bg-red-50' : isWarn ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
                }`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  isFail ? 'bg-red-100' : isWarn ? 'bg-amber-100' : 'bg-emerald-100'
                }`}>
                  <Icon className={`w-5 h-5 ${isFail ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-emerald-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-medium text-slate-800">{check.label}</p>
                    <Badge variant="outline" className="text-xs text-slate-500">{check.data}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{check.description}</p>
                  <p className={`text-xs mt-1 font-medium ${isFail ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {check.detail}
                  </p>
                </div>
                {isFail ? (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isWarn ? 'text-amber-500' : 'text-emerald-500'}`} />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Warning box */}
      {siswaTanpaKelas.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{siswaTanpaKelas.length} siswa aktif tidak memiliki kelas!</p>
              <p className="text-xs text-red-600 mt-1">
                Anda harus menetapkan kelas untuk siswa berikut sebelum finalisasi dapat dijalankan:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {siswaTanpaKelas.slice(0, 10).map(s => (
                  <Badge key={s.id} variant="outline" className="text-xs bg-white">
                    {s.nama} ({s.nis})
                  </Badge>
                ))}
                {siswaTanpaKelas.length > 10 && <Badge variant="outline" className="text-xs">+{siswaTanpaKelas.length - 10} lainnya</Badge>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activate button */}
      <Card className={allPassed ? 'border-emerald-200' : 'border-slate-200'}>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              {allPassed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-600">Semua modul valid. Siap mengaktifkan tahun baru.</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">Perbaiki masalah di atas untuk membuka kunci finalisasi.</span>
                </>
              )}
            </div>
            <Button
              disabled={!canActivate}
              onClick={() => setShowLockdown(true)}
              className="gap-2 w-full sm:w-auto"
            >
              <ShieldCheck className="w-4 h-4" />
              Aktifkan Tahun Baru
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Migration history */}
      {logHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-5 h-5 text-slate-500" /> Riwayat Finalisasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {logHistory.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700">{log.tahun_ajaran_lama}</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-medium text-slate-700">{log.tahun_ajaran_baru}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {new Date(log.tanggal_migrasi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Badge>
                  <Badge className={log.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {log.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Lockdown confirmation modal */}
      <AlertDialog open={showLockdown} onOpenChange={setShowLockdown}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" /> Konfirmasi System Lockdown
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan mengaktifkan tahun ajaran <strong>{tahunBaru}</strong> dan mengarsipkan data tahun <strong>{activeAcademicYear}</strong>.
              <br /><br />
              <strong className="text-amber-700">⚠️ Peringatan:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
                <li>Sistem akan terkunci (Read-Only) selama migrasi berlangsung.</li>
                <li>{siswaKelas9.length} siswa kelas 9 akan diluluskan otomatis.</li>
                <li>Tunggakan sisa akan dipindahkan ke Arsip Keuangan.</li>
                <li>Nilai tahun ini akan dipindahkan ke Arsip Nilai.</li>
                <li>Proses ini tidak dapat dibatalkan dengan mudah.</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleMigrate}
            >
              <Lock className="w-4 h-4 mr-1" /> Ya, Mulai Finalisasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color }) {
  return (
    <div className="p-3 bg-slate-50 rounded-lg border">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}