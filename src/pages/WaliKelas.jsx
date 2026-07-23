import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import UangKasTab from '@/components/walikelas/UangKasTab';
import KontakOrtuFab from '@/components/walikelas/KontakOrtuFab';
import { Users, Megaphone, Plus, Trash2, Building, User, Bell, Wallet } from 'lucide-react';

export default function WaliKelas() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [pengumumanOpen, setPengumumanOpen] = useState(false);
  const [pengumumanForm, setPengumumanForm] = useState({ judul: '', isi: '', penting: false });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  // Cari data guru yang login
  const guruData = guruList.find(g => g.email === currentUser?.email) || null;
  // Cari kelas yang diwalikannya
  const kelasWali = kelasList.find(k => k.wali_kelas === guruData?.nama) || null;

  const { data: siswaKelas = [] } = useQuery({
    queryKey: ['siswa-wali', kelasWali?.id],
    queryFn: () => base44.entities.Siswa.filter({ kelas_id: kelasWali.id, status: 'Aktif' }, 'nama'),
    enabled: !!kelasWali?.id,
  });

  const { data: pengumumanList = [] } = useQuery({
    queryKey: ['pengumuman-kelas', kelasWali?.id],
    queryFn: () => base44.entities.Pengumuman.filter({ kelas_id: kelasWali.id }, '-created_date'),
    enabled: !!kelasWali?.id,
  });

  const createPengumumanMutation = useMutation({
    mutationFn: (data) => base44.entities.Pengumuman.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengumuman-kelas', kelasWali?.id] });
      setPengumumanOpen(false);
      setPengumumanForm({ judul: '', isi: '', penting: false });
      toast({ title: 'Berhasil', description: 'Pengumuman berhasil dikirim ke siswa kelas ini.' });
    },
  });

  const deletePengumumanMutation = useMutation({
    mutationFn: (id) => base44.entities.Pengumuman.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengumuman-kelas', kelasWali?.id] });
      toast({ title: 'Berhasil', description: 'Pengumuman telah dihapus.' });
    },
  });


  const handleSendPengumuman = () => {
    if (!pengumumanForm.judul || !pengumumanForm.isi) return;
    createPengumumanMutation.mutate({
      ...pengumumanForm,
      kelas_id: kelasWali.id,
      nama_kelas: kelasWali.nama_kelas,
      guru_id: guruData?.id || '',
      nama_guru: guruData?.nama || currentUser?.full_name || '',
      tanggal: new Date().toISOString().split('T')[0],
    });
  };

  if (!guruData) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Data guru tidak ditemukan</p>
            <p className="text-slate-400 text-sm mt-2">
              Pastikan email akun Anda terdaftar di data guru.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!kelasWali) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Anda bukan Wali Kelas</p>
            <p className="text-slate-400 text-sm mt-2">
              Menu ini hanya dapat diakses oleh guru yang menjabat sebagai wali kelas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lakiLaki = siswaKelas.filter(s => s.jenis_kelamin === 'Laki-laki').length;
  const perempuan = siswaKelas.filter(s => s.jenis_kelamin === 'Perempuan').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Wali Kelas</h1>
            <p className="text-slate-500 text-sm">Kelola siswa dan informasi kelas Anda</p>
          </div>
        </div>

        {/* Kelas Info Card */}
        <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 border-0 text-white">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-purple-200 text-sm">Kelas yang diwalikan</p>
                <h2 className="text-3xl font-bold mt-1">{kelasWali.nama_kelas}</h2>
                <p className="text-purple-200 text-sm mt-1">TA: {kelasWali.tahun_ajaran || '-'}</p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{siswaKelas.length}</p>
                  <p className="text-purple-200 text-xs">Total Siswa</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-200">{lakiLaki}</p>
                  <p className="text-purple-200 text-xs">Laki-laki</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-pink-200">{perempuan}</p>
                  <p className="text-purple-200 text-xs">Perempuan</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="siswa">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="siswa" className="gap-1.5">
              <User className="w-4 h-4" /> Data Siswa
            </TabsTrigger>
            <TabsTrigger value="pengumuman" className="gap-1.5">
              <Megaphone className="w-4 h-4" /> Pengumuman
            </TabsTrigger>
            <TabsTrigger value="uangkas" className="gap-1.5">
              <Wallet className="w-4 h-4" /> Uang Kas
            </TabsTrigger>
          </TabsList>

          {/* Data Siswa */}
          <TabsContent value="siswa">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  Daftar Siswa Kelas {kelasWali.nama_kelas}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs w-8">No</TableHead>
                        <TableHead className="text-xs">NIS</TableHead>
                        <TableHead className="text-xs">Nama Siswa</TableHead>
                        <TableHead className="text-xs w-8">L/P</TableHead>
                        <TableHead className="text-xs">Ayah / Ibu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {siswaKelas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-slate-400 py-10">
                            Belum ada siswa di kelas ini
                          </TableCell>
                        </TableRow>
                      ) : siswaKelas.map((siswa, i) => (
                        <TableRow key={siswa.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                          <TableCell className="text-xs font-mono text-slate-500">{siswa.nis}</TableCell>
                          <TableCell className="font-medium text-sm">{siswa.nama}</TableCell>
                          <TableCell>
                            <Badge className={siswa.jenis_kelamin === 'Laki-laki' ? 'bg-blue-100 text-blue-700 text-xs' : 'bg-pink-100 text-pink-700 text-xs'}>
                              {siswa.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            <div>{siswa.nama_ayah_kandung || siswa.nama_ortu || '-'}</div>
                            {siswa.nama_ibu_kandung && <div className="text-slate-400">{siswa.nama_ibu_kandung}</div>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pengumuman */}
          <TabsContent value="pengumuman">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">{pengumumanList.length} pengumuman untuk kelas {kelasWali.nama_kelas}</p>
                <Button className="bg-purple-600 hover:bg-purple-700 gap-2" onClick={() => setPengumumanOpen(true)}>
                  <Plus className="w-4 h-4" /> Buat Pengumuman
                </Button>
              </div>

              {pengumumanList.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-400">Belum ada pengumuman. Buat pengumuman untuk siswa kelas ini.</p>
                  </CardContent>
                </Card>
              ) : pengumumanList.map(p => (
                <Card key={p.id} className={`border-0 shadow-sm ${p.penting ? 'border-l-4 border-l-red-400' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-800">{p.judul}</h3>
                          {p.penting && <Badge className="bg-red-100 text-red-600 text-xs">Penting</Badge>}
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{p.isi}</p>
                        <p className="text-xs text-slate-400 mt-2">{p.tanggal} • {p.nama_guru}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 shrink-0" onClick={() => deletePengumumanMutation.mutate(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          {/* Uang Kas */}
          <TabsContent value="uangkas">
            <UangKasTab kelasWali={kelasWali} guruData={guruData} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Buat Pengumuman */}
      <Dialog open={pengumumanOpen} onOpenChange={setPengumumanOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-purple-500" />
              Buat Pengumuman Kelas {kelasWali.nama_kelas}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Judul Pengumuman</Label>
              <Input
                className="mt-1"
                value={pengumumanForm.judul}
                onChange={e => setPengumumanForm({...pengumumanForm, judul: e.target.value})}
                placeholder="Masukkan judul pengumuman"
              />
            </div>
            <div>
              <Label>Isi Pengumuman</Label>
              <Textarea
                className="mt-1 min-h-[120px]"
                value={pengumumanForm.isi}
                onChange={e => setPengumumanForm({...pengumumanForm, isi: e.target.value})}
                placeholder="Tulis isi pengumuman di sini..."
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={pengumumanForm.penting}
                onCheckedChange={v => setPengumumanForm({...pengumumanForm, penting: v})}
              />
              <Label>Tandai sebagai penting</Label>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
              Pengumuman ini akan ditampilkan kepada <strong>{siswaKelas.length} siswa</strong> kelas {kelasWali.nama_kelas}.
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setPengumumanOpen(false)}>Batal</Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={!pengumumanForm.judul || !pengumumanForm.isi || createPengumumanMutation.isPending}
                onClick={handleSendPengumuman}
              >
                Kirim Pengumuman
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <KontakOrtuFab siswaList={siswaKelas} />
    </div>
  );
}