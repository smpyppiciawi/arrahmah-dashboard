import React, { useState, useEffect, useMemo } from 'react';
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
import { FileText, Plus, Trash2, MessageCircle, Clock, GraduationCap, Send, UserCheck, LogOut, ArrowLeftRight, Search } from "lucide-react";
import SiswaLulusRecordsDialog from './SiswaLulusRecordsDialog';
import IzinSiswaPicker from './IzinSiswaPicker';
import PaginationBar from '@/components/appui/PaginationBar';
import WaSendDialog, { buildWaTargets } from './WaSendDialog';
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function IzinTab({ readOnly = false }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeAcademicYear } = useActiveAcademicYear();
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [lulusOpen, setLulusOpen] = useState(false);
  const [waTarget, setWaTarget] = useState(null);
  const [tindakLanjutItem, setTindakLanjutItem] = useState(null);

  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jam_izin: '',
    alasan: 'Dispensasi',
    alasan_manual: '',
    keterangan: '',
    petugas_piket: '',
    petugas_piket_id: '',
  });
  const [siswaTerpilih, setSiswaTerpilih] = useState([]);
  const [filterRiwayat, setFilterRiwayat] = useState({ kelas_id: 'semua', alasan: 'semua', sort: 'tanggal_desc' });
  const [pageRiwayat, setPageRiwayat] = useState(1);
  const [pageSizeRiwayat, setPageSizeRiwayat] = useState(10);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list('nama'), staleTime: 60000 });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-aktif-izin'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }, 'nama'),
    staleTime: 60000,
  });

  const { data: izinList = [] } = useQuery({
    queryKey: ['izinSiswa'],
    queryFn: () => base44.entities.IzinSiswa.list('-tanggal'),
  });

  const { data: allSiswaList = [] } = useQuery({
    queryKey: ['siswa-all'],
    queryFn: () => base44.entities.Siswa.list(),
  });

  const siswaMap = useMemo(() => {
    const map = {};
    allSiswaList.forEach(s => { map[s.id] = s; });
    return map;
  }, [allSiswaList]);

  const izinSiswaAktif = useMemo(() => {
    return izinList.filter(i => {
      const siswa = siswaMap[i.siswa_id];
      return siswa && siswa.status === 'Aktif';
    });
  }, [izinList, siswaMap]);

  const riwayatFiltered = useMemo(() => {
    const hasil = izinSiswaAktif.filter(i => (
      (filterRiwayat.kelas_id === 'semua' || i.kelas_id === filterRiwayat.kelas_id)
      && (filterRiwayat.alasan === 'semua' || i.alasan === filterRiwayat.alasan)
    ));
    const banding = {
      tanggal_desc: (a, b) => `${b.tanggal}${b.jam_izin || ''}`.localeCompare(`${a.tanggal}${a.jam_izin || ''}`),
      tanggal_asc: (a, b) => `${a.tanggal}${a.jam_izin || ''}`.localeCompare(`${b.tanggal}${b.jam_izin || ''}`),
      nama_asc: (a, b) => (a.nama_siswa || '').localeCompare(b.nama_siswa || ''),
      kelas_asc: (a, b) => `${a.nama_kelas || ''}${a.nama_siswa || ''}`.localeCompare(`${b.nama_kelas || ''}${b.nama_siswa || ''}`),
    };
    return [...hasil].sort(banding[filterRiwayat.sort] || banding.tanggal_desc);
  }, [izinSiswaAktif, filterRiwayat]);

  const totalHalamanRiwayat = Math.max(1, Math.ceil(riwayatFiltered.length / pageSizeRiwayat));
  const halamanRiwayat = Math.min(pageRiwayat, totalHalamanRiwayat);
  const riwayatTampil = riwayatFiltered.slice((halamanRiwayat - 1) * pageSizeRiwayat, halamanRiwayat * pageSizeRiwayat);

  const izinHariIni = useMemo(() => {
    const hariIni = format(new Date(), 'yyyy-MM-dd');
    return izinSiswaAktif.filter(i => i.tanggal === hariIni);
  }, [izinSiswaAktif]);

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
    mutationFn: (data) => base44.entities.IzinSiswa.bulkCreate(data),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['izinSiswa'] });
      toast({
        title: '✅ Tersimpan',
        description: `${payload.length} data izin tersimpan. Gunakan tombol Kirim WA untuk mengirim notifikasi.`,
      });
      resetForm();
    },
  });

  const tindakLanjutMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.IzinSiswa.update(id, {
      tindak_lanjut: status,
      tindak_lanjut_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['izinSiswa'] });
      toast({ title: 'Tindak lanjut diperbarui' });
      setTindakLanjutItem(null);
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
      jam_izin: '', alasan: 'Dispensasi',
      alasan_manual: '', keterangan: '', petugas_piket: prev.petugas_piket, petugas_piket_id: prev.petugas_piket_id,
    }));
    setSiswaTerpilih([]);
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (siswaTerpilih.length === 0) {
      toast({ title: 'Siswa belum dipilih', description: 'Cari dan pilih minimal satu siswa.', variant: 'destructive' });
      return;
    }
    createMutation.mutate(siswaTerpilih.map((siswa) => {
      const kelas = kelasList.find(k => k.id === siswa.kelas_id);
      return {
        ...formData,
        siswa_id: siswa.id,
        nis: siswa.nis || '',
        nama_siswa: siswa.nama || '',
        kelas_id: siswa.kelas_id || '',
        nama_kelas: siswa.nama_kelas || kelas?.nama_kelas || '',
        wali_kelas: kelas?.wali_kelas || '',
        no_telp_ortu: siswa.no_telp_ortu || '',
        tahun_ajaran: activeAcademicYear || '',
      };
    }));
  };

  const buildIzinMessage = (r) => {
    const alasanText = r.alasan === 'Lainnya' ? (r.alasan_manual || 'Lainnya') : r.alasan;
    const tindakText = r.tindak_lanjut ? `\nTindak Lanjut: ${r.tindak_lanjut}` : '';
    return `*NOTIFIKASI IZIN SISWA*\n\nNama: ${r.nama_siswa}\nKelas: ${r.nama_kelas}\nTanggal: ${format(new Date(r.tanggal), 'd MMMM yyyy', { locale: idLocale })}\nJam Izin: ${r.jam_izin}\nAlasan: ${alasanText}\nKeterangan: ${r.keterangan || '-'}\nPetugas Piket: ${r.petugas_piket}${tindakText}`;
  };

  const handleSendWa = (item) => {
    const siswa = siswaMap[item.siswa_id];
    const kelas = kelasList.find(k => k.id === item.kelas_id);
    setWaTarget({ item, targets: buildWaTargets(siswa, kelas, guruList), message: buildIzinMessage(item) });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <FileText className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-700">{izinHariIni.length}</p>
            <p className="text-xs text-slate-500">Izin Hari Ini</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-700">{izinHariIni.filter(i => i.alasan === 'Dispensasi').length}</p>
            <p className="text-xs text-slate-500">Dispensasi</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <MessageCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-700">{izinHariIni.filter(i => i.notif_wa_sent).length}</p>
            <p className="text-xs text-slate-500">Notif WA Terkirim</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" /> Riwayat Izin Siswa
            </CardTitle>
            <div className="flex gap-2">
              {!readOnly && (
                <Button onClick={() => setLulusOpen(true)} variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  <GraduationCap className="w-4 h-4 mr-1" /> Siswa Lulus/Keluar
                </Button>
              )}
              {!readOnly && (
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1.5" onClick={() => setIsOpen(true)}>
                  <Plus className="w-4 h-4" /> Catat Izin
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50/70 px-3 py-2">
            <Select
              value={filterRiwayat.kelas_id}
              onValueChange={(v) => { setFilterRiwayat(p => ({ ...p, kelas_id: v })); setPageRiwayat(1); }}
            >
              <SelectTrigger className="h-8 w-[130px] text-xs bg-white border-slate-200">
                <SelectValue placeholder="Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Kelas</SelectItem>
                {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select
              value={filterRiwayat.alasan}
              onValueChange={(v) => { setFilterRiwayat(p => ({ ...p, alasan: v })); setPageRiwayat(1); }}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs bg-white border-slate-200">
                <SelectValue placeholder="Alasan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Alasan</SelectItem>
                <SelectItem value="Dispensasi">Dispensasi</SelectItem>
                <SelectItem value="Permintaan Orang Tua">Permintaan Orang Tua</SelectItem>
                <SelectItem value="Keluar Sekolah">Keluar Sekolah</SelectItem>
                <SelectItem value="Lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterRiwayat.sort}
              onValueChange={(v) => { setFilterRiwayat(p => ({ ...p, sort: v })); setPageRiwayat(1); }}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs bg-white border-slate-200">
                <SelectValue placeholder="Sortir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tanggal_desc">Terbaru</SelectItem>
                <SelectItem value="tanggal_asc">Terlama</SelectItem>
                <SelectItem value="nama_asc">Nama A–Z</SelectItem>
                <SelectItem value="kelas_asc">Kelas A–Z</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs text-slate-500 ml-auto">{riwayatFiltered.length} catatan</span>
          </div>

          {riwayatFiltered.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Belum ada riwayat izin sesuai filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs">Siswa</TableHead>
                    <TableHead className="text-xs">Kelas</TableHead>
                    <TableHead className="text-xs">Jam</TableHead>
                    <TableHead className="text-xs">Alasan</TableHead>
                    <TableHead className="text-xs">Tindak Lanjut</TableHead>
                    <TableHead className="text-xs">Petugas</TableHead>
                    <TableHead className="text-xs w-24">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riwayatTampil.map((item, i) => (
                    <TableRow key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {item.tanggal ? format(new Date(item.tanggal), 'dd MMM yy', { locale: idLocale }) : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{item.nama_siswa}</TableCell>
                      <TableCell><Badge className="bg-slate-100 text-slate-700 text-xs border-0">{item.nama_kelas}</Badge></TableCell>
                      <TableCell className="text-sm text-slate-600">{item.jam_izin}</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-50 text-amber-700 text-xs border-0">
                          {item.alasan === 'Lainnya' && item.alasan_manual ? item.alasan_manual : item.alasan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.tindak_lanjut ? (
                          <Badge className={
                            item.tindak_lanjut === 'Sudah Kembali'
                              ? 'bg-emerald-100 text-emerald-700 text-xs border-0'
                              : 'bg-red-100 text-red-700 text-xs border-0'
                          }>
                            {item.tindak_lanjut === 'Sudah Kembali' && <UserCheck className="w-3 h-3 mr-0.5 inline" />}
                            {item.tindak_lanjut === 'Pulang' && <LogOut className="w-3 h-3 mr-0.5 inline" />}
                            {item.tindak_lanjut}
                          </Badge>
                        ) : (
                          <button
                            onClick={() => setTindakLanjutItem(item)}
                            className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-0.5"
                          >
                            <ArrowLeftRight className="w-3 h-3" /> Proses
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{item.petugas_piket}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button onClick={() => handleSendWa(item)} className="p-1 text-green-500 hover:bg-green-50 rounded" title="Kirim WA Gateway">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          {!readOnly && (
                            <button onClick={() => deleteMutation.mutate(item.id)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {riwayatFiltered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
            <p className="text-xs text-slate-500">Halaman {halamanRiwayat} dari {totalHalamanRiwayat}</p>
            <PaginationBar
              page={halamanRiwayat}
              setPage={setPageRiwayat}
              pageSize={pageSizeRiwayat}
              setPageSize={setPageSizeRiwayat}
              total={riwayatFiltered.length}
            />
          </div>
        )}
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
              <Label className="text-xs">Alasan</Label>
              <Select value={formData.alasan} onValueChange={(v) => setFormData({ ...formData, alasan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dispensasi">Dispensasi</SelectItem>
                  <SelectItem value="Permintaan Orang Tua">Permintaan Orang Tua</SelectItem>
                  <SelectItem value="Keluar Sekolah">Keluar Sekolah</SelectItem>
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
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-semibold text-amber-800">Cari Nama Siswa</p>
                <span className="ml-auto text-[11px] font-medium text-amber-700">{siswaTerpilih.length} terpilih</span>
              </div>
              <IzinSiswaPicker
                siswaList={siswaList}
                kelasList={kelasList}
                selected={siswaTerpilih}
                onChange={setSiswaTerpilih}
              />
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-xs text-amber-700 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Setelah simpan, gunakan tombol Kirim WA pada tabel untuk mengirim notifikasi via WA Gateway.
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>Batal</Button>
              <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700" disabled={createMutation.isPending || siswaTerpilih.length === 0}>
                {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {waTarget && (
        <WaSendDialog
          open={!!waTarget}
          onOpenChange={(open) => !open && setWaTarget(null)}
          targets={waTarget.targets}
          message={waTarget.message}
          onSent={() => {
            base44.entities.IzinSiswa.update(waTarget.item.id, { notif_wa_sent: true });
            queryClient.invalidateQueries({ queryKey: ['izinSiswa'] });
          }}
        />
      )}

      {/* Dialog Tindak Lanjut */}
      <Dialog open={!!tindakLanjutItem} onOpenChange={(open) => !open && setTindakLanjutItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-amber-500" /> Tindak Lanjut Izin
            </DialogTitle>
          </DialogHeader>
          {tindakLanjutItem && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p className="font-medium text-slate-800">{tindakLanjutItem.nama_siswa}</p>
                <p className="text-slate-500 text-xs">Kelas {tindakLanjutItem.nama_kelas} • Jam {tindakLanjutItem.jam_izin}</p>
              </div>
              <p className="text-sm text-slate-600">Pastikan status siswa:</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={tindakLanjutMutation.isPending}
                  onClick={() => tindakLanjutMutation.mutate({ id: tindakLanjutItem.id, status: 'Sudah Kembali' })}
                >
                  <UserCheck className="w-4 h-4 mr-1.5" /> Sudah Kembali
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  disabled={tindakLanjutMutation.isPending}
                  onClick={() => tindakLanjutMutation.mutate({ id: tindakLanjutItem.id, status: 'Pulang' })}
                >
                  <LogOut className="w-4 h-4 mr-1.5" /> Pulang
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SiswaLulusRecordsDialog
        open={lulusOpen}
        onOpenChange={setLulusOpen}
        entityName="IzinSiswa"
        queryKey="izin-lulus"
        title="Data Izin Siswa Lulus/Keluar"
        extraColumns={[
          { key: 'jam_izin', label: 'Jam Izin' },
          { key: 'alasan', label: 'Alasan', render: (row) => row.alasan === 'Lainnya' && row.alasan_manual ? row.alasan_manual : row.alasan },
          { key: 'petugas_piket', label: 'Petugas' },
        ]}
      />
    </div>
  );
}