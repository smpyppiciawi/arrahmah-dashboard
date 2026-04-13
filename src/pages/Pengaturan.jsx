import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Settings, GraduationCap, Loader2, CheckCircle, CalendarDays, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LulusanTab from '@/components/pengaturan/LulusanTab';

export default function Pengaturan() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('pengaturan');
  const [tahunAjaranInput, setTahunAjaranInput] = useState('');
  const [showGraduateConfirm, setShowGraduateConfirm] = useState(false);

  const isAdmin = ['admin', 'operator', 'tu', 'kepsek'].includes(currentUser?.role);

  const { data: settings = [], isLoading: loadingSettings } = useQuery({
    queryKey: ['pengaturan-aplikasi'],
    queryFn: () => base44.entities.PengaturanAplikasi.list(),
    onSuccess: (data) => {
      if (data[0]?.tahun_ajaran_aktif) {
        setTahunAjaranInput(data[0].tahun_ajaran_aktif);
      }
    }
  });

  const pengaturan = settings[0] || null;

  // Set tahun input when data loads
  useEffect(() => {
    if (pengaturan?.tahun_ajaran_aktif && !tahunAjaranInput) {
      setTahunAjaranInput(pengaturan.tahun_ajaran_aktif);
    }
  }, [pengaturan]);

  const saveTahunAjaranMutation = useMutation({
    mutationFn: async (tahunAjaran) => {
      if (pengaturan?.id) {
        return base44.entities.PengaturanAplikasi.update(pengaturan.id, { tahun_ajaran_aktif: tahunAjaran });
      } else {
        return base44.entities.PengaturanAplikasi.create({ tahun_ajaran_aktif: tahunAjaran });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan-aplikasi'] });
      toast({ title: 'Berhasil', description: 'Tahun ajaran aktif berhasil diperbarui.' });
    },
    onError: () => {
      toast({ title: 'Gagal', description: 'Gagal memperbarui tahun ajaran.', variant: 'destructive' });
    }
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-all'],
    queryFn: () => base44.entities.Kelas.list(),
  });

  const graduateMutation = useMutation({
    mutationFn: async () => {
      // Cari semua kelas tingkat 9
      const kelas9 = kelasList.filter(k => k.tingkat === '9');
      const kelas9Ids = kelas9.map(k => k.id);

      if (kelas9Ids.length === 0) {
        return { updatedCount: 0 };
      }

      // Fetch semua siswa aktif
      const allSiswa = await base44.entities.Siswa.filter({ status: 'Aktif' });

      // Filter siswa yang ada di kelas 9
      const siswaKelas9 = allSiswa.filter(s => kelas9Ids.includes(s.kelas_id));

      if (siswaKelas9.length === 0) {
        return { updatedCount: 0 };
      }

      // Update status semua siswa kelas 9 menjadi Lulus
      await Promise.all(
        siswaKelas9.map(siswa =>
          base44.entities.Siswa.update(siswa.id, {
            status: 'Lulus',
          })
        )
      );

      return { updatedCount: siswaKelas9.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      if (data.updatedCount === 0) {
        toast({ title: 'Info', description: 'Tidak ada siswa kelas 9 yang aktif untuk diluluskan.' });
      } else {
        toast({ title: 'Berhasil!', description: `${data.updatedCount} siswa kelas 9 telah berhasil diluluskan.` });
      }
    },
    onError: () => {
      toast({ title: 'Gagal', description: 'Gagal meluluskan siswa kelas 9.', variant: 'destructive' });
    }
  });

  const kelas9Count = kelasList.filter(k => k.tingkat === '9').length;

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded-lg">
          <Settings className="w-6 h-6 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pengaturan Aplikasi</h1>
          <p className="text-slate-500 text-sm">Kelola konfigurasi sistem sekolah</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="pengaturan" className="gap-2">
            <Settings className="w-4 h-4" /> Umum
          </TabsTrigger>
          <TabsTrigger value="lulusan" className="gap-2">
            <GraduationCap className="w-4 h-4" /> Data Lulusan
          </TabsTrigger>
        </TabsList>

        {/* Tab Pengaturan Umum */}
        <TabsContent value="pengaturan" className="space-y-5 mt-5">
          {!isAdmin && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
              Anda tidak memiliki akses untuk mengubah pengaturan ini.
            </div>
          )}

          {/* Tahun Ajaran Aktif */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="w-5 h-5 text-blue-500" />
                Tahun Pelajaran Aktif
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-slate-500">Saat ini aktif:</span>
                {pengaturan?.tahun_ajaran_aktif ? (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    {pengaturan.tahun_ajaran_aktif}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-400">Belum diatur</Badge>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label className="text-sm mb-1.5 block">Ganti Tahun Pelajaran</Label>
                    <Input
                      value={tahunAjaranInput}
                      onChange={e => setTahunAjaranInput(e.target.value)}
                      placeholder="contoh: 2025/2026"
                      className="max-w-xs"
                    />
                    <p className="text-xs text-slate-400 mt-1">Format: YYYY/YYYY (contoh: 2025/2026)</p>
                  </div>
                  <Button
                    onClick={() => saveTahunAjaranMutation.mutate(tahunAjaranInput)}
                    disabled={saveTahunAjaranMutation.isPending || !tahunAjaranInput.trim()}
                  >
                    {saveTahunAjaranMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Simpan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Luluskan Siswa Kelas 9 */}
          <Card className="border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="w-5 h-5 text-amber-500" />
                Kelulusan Siswa Kelas 9
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800 font-medium mb-1">Informasi</p>
                <p className="text-sm text-amber-700">
                  Fitur ini akan mengubah status semua siswa aktif di tingkat kelas 9 menjadi <strong>&quot;Lulus&quot;</strong>.
                  Terdapat <strong>{kelas9Count} kelas</strong> tingkat 9. Aksi ini tidak dapat dibatalkan dengan mudah.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500">Status siswa kelas 9 akan berubah dari <strong>Aktif</strong> → <strong>Lulus</strong></span>
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  className="border-amber-400 text-amber-700 hover:bg-amber-50"
                  onClick={() => setShowGraduateConfirm(true)}
                  disabled={graduateMutation.isPending}
                >
                  {graduateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <GraduationCap className="w-4 h-4 mr-2" />
                  )}
                  Luluskan Siswa Kelas 9
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Data Lulusan */}
        <TabsContent value="lulusan" className="mt-5">
          <LulusanTab />
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <AlertDialog open={showGraduateConfirm} onOpenChange={setShowGraduateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Kelulusan Siswa Kelas 9</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin meluluskan semua siswa kelas 9 yang aktif?
              Aksi ini akan mengubah status siswa menjadi <strong>&quot;Lulus&quot;</strong> dan tidak dapat dibatalkan dengan mudah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                setShowGraduateConfirm(false);
                graduateMutation.mutate();
              }}
            >
              Luluskan Sekarang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}