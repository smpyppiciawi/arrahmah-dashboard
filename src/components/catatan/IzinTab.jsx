import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useActiveAcademicYear } from "@/context/ActiveAcademicYearContext";
import { FileText, Plus, Trash2, MessageCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function IzinTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeAcademicYear } = useActiveAcademicYear();
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    kelas_id: '',
    siswa_id: '',
    jam_izin: '',
    alasan: 'Dispensasi',
    alasan_manual: '',
    keterangan: '',
    petugas_piket: '',
    petugas_piket_id: '',
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list('nama'), staleTime: 60000 });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-izin', formData.kelas_id],
    queryFn: () => formData.kelas_id ? base44.entities.Siswa.filter({ kelas_id: formData.kelas_id, status: 'Aktif' }, 'nama') : [],
    enabled: !!formData.kelas_id,
  });

  const { data: izinList = [] } = useQuery({
    queryKey: ['izinSiswa', formData.tanggal],
    queryFn: () => base44.entities.IzinSiswa.filter({ tanggal: formData.tanggal }, '-jam_izin'),
  });

  // Auto-fill petugas piket if current user is a guru
  useEffect(() => {
    if (currentUser && guruList.length > 0) {
      const guru = guruList.find(g => g.email === currentUser.email);
      if (guru && !formData.petugas_piket) {
        setFormData(prev => ({ ...prev, petugas_piket: guru.nama, petugas_piket_id: guru.id }));
      }
    }
  }, [currentUser, guruList]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const record = await base44.entities.IzinSiswa.create(data);
      // Send WA notifications
      try {
        const kelas = kelasList.find(k => k.id === data.kelas_id);
        const waliKelasName = kelas?.wali_kelas;
        const waliGuru = guruList.find(g => g.nama === waliKelasName);
        const siswa = siswaList.find(s => s.id === data.siswa_id);

        const alasanText = data.alasan === 'Lainnya' ? (data.alasan_manual || 'Lainnya') : data.alasan;
        const message = `*NOTIFIKASI IZIN SISWA*\n\nNama: ${data.nama_siswa}\nKelas: ${data.nama_kelas}\nTanggal: ${format(new Date(data.tanggal), 'd MMMM yyyy', { locale: idLocale })}\nJam Izin: ${data.jam_izin}\nAlasan: ${alasanText}\nKeterangan: ${data.keterangan || '-'}\nPetugas Piket: ${data.petugas_piket}`;

        if (waliGuru?.no_telp) {
          const cleaned = waliGuru.no_telp.replace(/\D/g, '').replace(/^0/, '62');
          window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`, '_blank');
        }

        if (siswa?.no_telp_ortu) {
          setTimeout(() => {
            const cleanedOrtu = siswa.no_telp_ortu.replace(/\D/g, '').replace(/^0/, '62');
            window.open(`https://wa.me/${cleanedOrtu}?text=${encodeURIComponent(message)}`, '_blank');
          }, 1500);
        }

        await base44.entities.IzinSiswa.update(record.id, { notif_wa_sent: true });
      } catch (e) {
        console.error('WA notification error:', e);
      }
      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['izinSiswa'] });
      toast({ title: '✅ Tersimpan', description: 'Notifikasi WA ke wali kelas & orang tua telah dibuka.' });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.IzinSiswa.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['izinSiswa'] });
      toast({ title: 'Dihapus', description: 'Data izin dihapus.' });
    },
  });

  const resetForm = () => {
    setFormData(prev => ({
      tanggal: format(new Date(), 'yyyy-MM-dd'),
      kelas_id: '', siswa_id: '', jam_izin: '', alasan: 'Dispensasi',
      alasan_manual: '', keterangan: '', petugas_piket: prev.petugas_piket, petugas_piket_id: prev.petugas_piket_id,
    }));
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const siswa = siswaList.find(s => s.id === formData.siswa_id);
    const kelas = kelasList.find(k => k.id === formData.kelas_id);
    createMutation.mutate({
      ...formData,
      nis: siswa?.nis || '',
      nama_siswa: siswa?.nama || '',
      nama_kelas: kelas?.nama_kelas || '',
      wali_kelas: kelas?.wali_kelas || '',
      no_telp_ortu: siswa?.no_telp_ortu || '',
      tahun_ajaran: activeAcademicYear || '',
    });
  };

  const openWA = (noTelp, namaSiswa) => {
    if (!noTelp) return;
    const cleaned = noTelp.replace(/\D/g, '').replace(/^0/, '62');
    const msg = `Informasi Izin Siswa: ${namaSiswa}`;
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <FileText className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-700">{izinList.length}</p>
            <p className="text-xs text-slate-500">Izin Hari Ini</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-700">{izinList.filter(i => i.alasan === 'Dispensasi').length}</p>
            <p className="text-xs text-slate-500">Dispensasi</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <MessageCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-700">{izinList.filter(i => i.notif_wa_sent).length}</p>
            <p className="text-xs text-slate-500">Notif WA Terkirim</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" /> Daftar Izin Siswa
            </CardTitle>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1.5" onClick={() => setIsOpen(true)}>
              <Plus className="w-4 h-4" /> Catat Izin
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {izinList.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Belum ada izin pada tanggal ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs">Siswa</TableHead>
                    <TableHead className="text-xs">Kelas</TableHead>
                    <TableHead className="text-xs">Jam</TableHead>
                    <TableHead className="text-xs">Alasan</TableHead>
                    <TableHead className="text-xs">Petugas</TableHead>
                    <TableHead className="text-xs w-16">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {izinList.map((item, i) => (
                    <TableRow key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <TableCell className="font-medium text-sm">{item.nama_siswa}</TableCell>
                      <TableCell><Badge className="bg-slate-100 text-slate-700 text-xs border-0">{item.nama_kelas}</Badge></TableCell>
                      <TableCell className="text-sm text-slate-600">{item.jam_izin}</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-50 text-amber-700 text-xs border-0">
                          {item.alasan === 'Lainnya' && item.alasan_manual ? item.alasan_manual : item.alasan}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{item.petugas_piket}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.no_telp_ortu && (
                            <button onClick={() => openWA(item.no_telp_ortu, item.nama_siswa)} className="p-1 text-green-500 hover:bg-green-50 rounded" title="WA Ortu">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => deleteMutation.mutate(item.id)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" /> Catat Izin Siswa
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tanggal</Label>
                <Input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} required />
              </div>
              <div>
                <Label className="text-xs">Jam Izin</Label>
                <Input type="time" value={formData.jam_izin} onChange={(e) => setFormData({ ...formData, jam_izin: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label className="text-xs">Kelas</Label>
              <Select value={formData.kelas_id} onValueChange={(v) => setFormData({ ...formData, kelas_id: v, siswa_id: '' })}>
                <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                <SelectContent>
                  {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Siswa</Label>
              <Select value={formData.siswa_id} onValueChange={(v) => setFormData({ ...formData, siswa_id: v })} disabled={!formData.kelas_id}>
                <SelectTrigger><SelectValue placeholder="Pilih Siswa" /></SelectTrigger>
                <SelectContent>
                  {siswaList.map(s => <SelectItem key={s.id} value={s.id}>{s.nama} ({s.nis})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Alasan</Label>
              <Select value={formData.alasan} onValueChange={(v) => setFormData({ ...formData, alasan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dispensasi">Dispensasi</SelectItem>
                  <SelectItem value="Permintaan Orang Tua">Permintaan Orang Tua</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.alasan === 'Lainnya' && (
              <div>
                <Label className="text-xs">Alasan (Manual)</Label>
                <Input value={formData.alasan_manual} onChange={(e) => setFormData({ ...formData, alasan_manual: e.target.value })} placeholder="Masukkan alasan" required />
              </div>
            )}
            <div>
              <Label className="text-xs">Keterangan Izin</Label>
              <Textarea value={formData.keterangan} onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })} placeholder="Keterangan tambahan" rows={2} />
            </div>
            <div>
              <Label className="text-xs">Petugas Piket</Label>
              <Select value={formData.petugas_piket_id} onValueChange={(v) => {
                const guru = guruList.find(g => g.id === v);
                setFormData({ ...formData, petugas_piket_id: v, petugas_piket: guru?.nama || '' });
              }}>
                <SelectTrigger><SelectValue placeholder="Pilih Petugas" /></SelectTrigger>
                <SelectContent>
                  {guruList.map(g => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-xs text-amber-700 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              Notifikasi WA akan otomatis terkirim ke Wali Kelas & Orang Tua siswa.
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>Batal</Button>
              <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}