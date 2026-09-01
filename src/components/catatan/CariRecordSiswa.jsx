import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, User, Trophy, AlertCircle, Stethoscope, Calendar, Award, Plus, MessageSquare, CheckCircle, TrendingDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import ImprovementFormDialog from "./ImprovementFormDialog";
import PelanggaranImprovementFormDialog from "./PelanggaranImprovementFormDialog";

export default function CariRecordSiswa({ open, onOpenChange }) {
  const { activeAcademicYear: tahunAjaran } = useActiveAcademicYear();
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [showTindakLanjutForm, setShowTindakLanjutForm] = useState(false);
  const [selectedPelanggaran, setSelectedPelanggaran] = useState(null);
  const [tindakLanjutForm, setTindakLanjutForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    dilaporkan_kepada: '',
    nama_penerima: '',
    catatan: '',
    tindakan: '',
    status: 'Proses'
  });
  const [currentUser, setCurrentUser] = useState(null);

  // Improvement dialog states
  const [improvementOpen, setImprovementOpen] = useState(false);
  const [editingImprovement, setEditingImprovement] = useState(null);
  const [prefillSiswa, setPrefillSiswa] = useState(null);
  const [pelanggaranImpOpen, setPelanggaranImpOpen] = useState(false);
  const [editingPelanggaranImp, setEditingPelanggaranImp] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const queryClient = useQueryClient();

  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });
  const { data: siswaList = [] } = useQuery({ queryKey: ['siswa'], queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }) });
  const { data: prestasiList = [] } = useQuery({ queryKey: ['prestasi'], queryFn: () => base44.entities.Prestasi.list('-tanggal') });
  const { data: pelanggaranList = [] } = useQuery({ queryKey: ['pelanggaran'], queryFn: () => base44.entities.Pelanggaran.list('-tanggal') });
  const { data: uksList = [] } = useQuery({ queryKey: ['uks'], queryFn: () => base44.entities.UKS.list('-tanggal') });
  const { data: tindakLanjutList = [] } = useQuery({ queryKey: ['tindak-lanjut'], queryFn: () => base44.entities.TindakLanjut.list('-tanggal') });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list('nama') });

  // Improvement queries
  const { data: pelanggaranImprovementList = [] } = useQuery({ queryKey: ['pelanggaran-improvement'], queryFn: () => base44.entities.PelanggaranImprovement.list('-tanggal') });
  const { data: improvementList = [] } = useQuery({ queryKey: ['improvement'], queryFn: () => base44.entities.Improvement.list('-tanggal') });
  const { data: kodePelanggaranList = [] } = useQuery({ queryKey: ['kode-pelanggaran-improvement'], queryFn: () => base44.entities.KodePelanggaranImprovement.list('kode') });
  const { data: kegiatanList = [] } = useQuery({ queryKey: ['kegiatan-pembinaan'], queryFn: () => base44.entities.KegiatanPembinaan.list('no') });
  const { data: pengaturanImprovement } = useQuery({ queryKey: ['pengaturan-improvement'], queryFn: async () => { const l = await base44.entities.PengaturanImprovement.list(); return l[0] || null; } });
  const pelanggaranModuleAktif = pengaturanImprovement?.pelanggaran_module_aktif ?? true;
  const akumulasiLama = pengaturanImprovement?.akumulasi_poin_lama_aktif ?? false;

  const createTindakLanjutMutation = useMutation({
    mutationFn: (data) => base44.entities.TindakLanjut.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tindak-lanjut'] });
      setShowTindakLanjutForm(false);
      setSelectedPelanggaran(null);
      setTindakLanjutForm({ tanggal: new Date().toISOString().split('T')[0], dilaporkan_kepada: '', nama_penerima: '', catatan: '', tindakan: '', status: 'Proses' });
    },
  });

  const updateTindakLanjutMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TindakLanjut.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tindak-lanjut'] }); },
  });

  const filteredSiswa = useMemo(() => {
    if (!selectedKelas) return [];
    return siswaList.filter(s => s.kelas_id === selectedKelas).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaList, selectedKelas]);

  const siswaRecords = useMemo(() => {
    if (!selectedSiswa) return { prestasi: [], pelanggaran: [], uks: [], tindakLanjut: [] };
    return {
      prestasi: prestasiList.filter(p => p.siswa_id === selectedSiswa.id),
      pelanggaran: pelanggaranList.filter(p => p.siswa_id === selectedSiswa.id),
      uks: uksList.filter(u => u.siswa_id === selectedSiswa.id),
      tindakLanjut: tindakLanjutList.filter(t => t.siswa_id === selectedSiswa.id)
    };
  }, [selectedSiswa, prestasiList, pelanggaranList, uksList, tindakLanjutList]);

  const improvementRecords = useMemo(() => {
    if (!selectedSiswa) return { pelanggaranImprovement: [], improvement: [] };
    return {
      pelanggaranImprovement: pelanggaranImprovementList.filter(p => p.siswa_id === selectedSiswa.id),
      improvement: improvementList.filter(i => i.siswa_id === selectedSiswa.id)
    };
  }, [selectedSiswa, pelanggaranImprovementList, improvementList]);

  const poinBersih = useMemo(() => {
    const poinPelanggaranLama = akumulasiLama ? siswaRecords.pelanggaran.reduce((s, p) => s + (Number(p.poin) || 0), 0) : 0;
    const poinPelanggaran = improvementRecords.pelanggaranImprovement.reduce((s, p) => s + (Number(p.poin) || 0), 0) + poinPelanggaranLama;
    const poinPengurangan = improvementRecords.improvement.filter(i => i.status === 'Aktif').reduce((s, i) => s + (Number(i.poin_pengurangan) || 0), 0);
    return { poinPelanggaran, poinPelanggaranLama, poinPengurangan, poinBersih: poinPelanggaran - poinPengurangan };
  }, [improvementRecords, siswaRecords, akumulasiLama]);

  const getTindakLanjutByPelanggaran = (pelanggaranId) => tindakLanjutList.filter(t => t.pelanggaran_id === pelanggaranId);
  const handleAddTindakLanjut = (pelanggaran) => { setSelectedPelanggaran(pelanggaran); setShowTindakLanjutForm(true); };
  const handleSubmitTindakLanjut = (e) => {
    e.preventDefault();
    createTindakLanjutMutation.mutate({ ...tindakLanjutForm, pelanggaran_id: selectedPelanggaran.id, siswa_id: selectedPelanggaran.siswa_id, nama_siswa: selectedPelanggaran.nama_siswa });
  };
  const handleUpdateTindakLanjutStatus = (tindakLanjut) => {
    updateTindakLanjutMutation.mutate({ id: tindakLanjut.id, data: { status: tindakLanjut.status === 'Proses' ? 'Selesai' : 'Proses' } });
  };
  const getGuruByRole = (role) => {
    if (role === 'Wali Kelas') return guruList.filter(g => g.jabatan === 'Guru Mata Pelajaran');
    if (role === 'BP/BK') return guruList.filter(g => g.tugas_tambahan === 'BP/BK' || g.jabatan === 'Guru Mata Pelajaran');
    if (role === 'Kepala Sekolah') return guruList.filter(g => g.jabatan === 'Kepala Sekolah');
    return guruList;
  };

  const totalPoin = siswaRecords.pelanggaran.reduce((sum, p) => sum + (p.poin || 0), 0);

  const handleTambahPelanggaranImp = () => { setEditingPelanggaranImp(null); setPrefillSiswa(selectedSiswa); setPelanggaranImpOpen(true); };
  const handleTambahImprovement = () => { setEditingImprovement(null); setPrefillSiswa(selectedSiswa); setImprovementOpen(true); };

  const handleReset = () => { setSelectedKelas(''); setSelectedSiswa(null); };

  const categoryColors = {
    'Juara 1': 'bg-yellow-100 text-yellow-800',
    'Juara 2': 'bg-slate-100 text-slate-800',
    'Juara 3': 'bg-orange-100 text-orange-800',
    'Finalis': 'bg-blue-100 text-blue-800',
    'Peserta': 'bg-emerald-100 text-emerald-800'
  };

  const tabCount = (pelanggaranModuleAktif ? 1 : 0) + 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" />
            Cari Record Siswa
          </DialogTitle>
        </DialogHeader>

        {/* Filter Section */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Pilih Kelas</Label>
            <Select value={selectedKelas} onValueChange={(v) => { setSelectedKelas(v); setSelectedSiswa(null); }}>
              <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
              <SelectContent>
                {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pilih Siswa</Label>
            <Select value={selectedSiswa?.id || ''} onValueChange={(v) => setSelectedSiswa(siswaList.find(s => s.id === v))} disabled={!selectedKelas}>
              <SelectTrigger><SelectValue placeholder={selectedKelas ? "Pilih Siswa" : "Pilih kelas dulu"} /></SelectTrigger>
              <SelectContent>
                {filteredSiswa.map(s => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Student Info Card */}
        {selectedSiswa && (
          <Card className="mb-4 border-indigo-200 bg-indigo-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-indigo-900">{selectedSiswa.nama}</h3>
                    <p className="text-sm text-indigo-600">NIS: {selectedSiswa.nis} | Kelas: {selectedSiswa.nama_kelas}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <Trophy className="w-3 h-3 mr-1" />
                    {siswaRecords.prestasi.length} Prestasi
                  </Badge>
                  <Badge className={poinBersih.poinBersih > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}>
                    <TrendingDown className="w-3 h-3 mr-1" />
                    Poin Bersih: {poinBersih.poinBersih}
                  </Badge>
                  <Badge className="bg-rose-100 text-rose-700">
                    <Stethoscope className="w-3 h-3 mr-1" />
                    {siswaRecords.uks.length} UKS
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Records Tabs */}
        {selectedSiswa && (
          <Tabs defaultValue="prestasi" className="w-full">
            <TabsList className={`grid w-full ${tabCount === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="prestasi" className="flex items-center gap-1">
                <Trophy className="w-4 h-4" /> Prestasi ({siswaRecords.prestasi.length})
              </TabsTrigger>
              {pelanggaranModuleAktif && (
                <TabsTrigger value="pelanggaran" className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Pelanggaran ({siswaRecords.pelanggaran.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="improvement" className="flex items-center gap-1">
                <TrendingDown className="w-4 h-4" /> Improvement ({improvementRecords.pelanggaranImprovement.length + improvementRecords.improvement.length})
              </TabsTrigger>
              <TabsTrigger value="uks" className="flex items-center gap-1">
                <Stethoscope className="w-4 h-4" /> UKS ({siswaRecords.uks.length})
              </TabsTrigger>
            </TabsList>

            {/* Prestasi Tab */}
            <TabsContent value="prestasi" className="mt-4">
              {siswaRecords.prestasi.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Belum ada data prestasi</div>
              ) : (
                <div className="space-y-3">
                  {siswaRecords.prestasi.map(item => (
                    <Card key={item.id} className="border-emerald-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Award className="w-4 h-4 text-emerald-600" />
                              <span className="font-semibold">{item.nama_prestasi}</span>
                            </div>
                            <p className="text-sm text-slate-500">{item.penyelenggara}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={categoryColors[item.kategori]}>{item.kategori}</Badge>
                            <p className="text-xs text-slate-400 mt-1">{format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{item.jenis_prestasi}</Badge>
                          <Badge variant="outline">{item.tingkat}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Pelanggaran Tab — only if module aktif */}
            {pelanggaranModuleAktif && (
            <TabsContent value="pelanggaran" className="mt-4">
              {siswaRecords.pelanggaran.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Belum ada data pelanggaran</div>
              ) : (
                <div className="space-y-3">
                  {siswaRecords.pelanggaran.map(item => {
                    const itemTindakLanjut = getTindakLanjutByPelanggaran(item.id);
                    return (
                      <Card key={item.id} className="border-red-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <span className="font-semibold">{item.uraian}</span>
                              </div>
                              <p className="text-sm text-slate-500">Sanksi: {item.sanksi || '-'}</p>
                            </div>
                            <div className="text-right">
                              <Badge className={
                                item.jenis_pelanggaran === 'Sangat Berat' ? 'bg-red-600 text-white' :
                                item.jenis_pelanggaran === 'Berat' ? 'bg-red-100 text-red-700' :
                                item.jenis_pelanggaran === 'Sedang' ? 'bg-orange-100 text-orange-700' :
                                'bg-yellow-100 text-yellow-700'
                              }>
                                {item.poin} Poin
                              </Badge>
                              <p className="text-xs text-slate-400 mt-1">{format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="outline">{item.jenis_pelanggaran}</Badge>
                            <Badge variant="outline">{item.kategori}</Badge>
                            <Badge className={item.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{item.status}</Badge>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-slate-600 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                Tindak Lanjut ({itemTindakLanjut.length})
                              </span>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddTindakLanjut(item)}>
                                <Plus className="w-3 h-3 mr-1" /> Tambah Tindak Lanjut
                              </Button>
                            </div>
                            {itemTindakLanjut.length > 0 && (
                              <div className="space-y-2">
                                {itemTindakLanjut.map(tl => (
                                  <div key={tl.id} className="bg-slate-50 rounded-lg p-2 text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <Badge className={tl.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>{tl.status}</Badge>
                                        <span className="font-medium">{tl.dilaporkan_kepada}</span>
                                        <span className="text-slate-400">→</span>
                                        <span>{tl.nama_penerima}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">{format(new Date(tl.tanggal), 'dd/MM/yy')}</span>
                                        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => handleUpdateTindakLanjutStatus(tl)}>
                                          <CheckCircle className={`w-3 h-3 ${tl.status === 'Selesai' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        </Button>
                                      </div>
                                    </div>
                                    {tl.tindakan && <p className="text-slate-600"><strong>Tindakan:</strong> {tl.tindakan}</p>}
                                    {tl.catatan && <p className="text-slate-500 text-xs mt-1">{tl.catatan}</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            )}

            {/* Improvement Tab */}
            <TabsContent value="improvement" className="mt-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl p-3 bg-red-50">
                  <p className="text-xs font-medium text-red-600">Poin Pelanggaran</p>
                  <p className="text-2xl font-bold text-red-600">{poinBersih.poinPelanggaran}</p>
                </div>
                <div className="rounded-xl p-3 bg-emerald-50">
                  <p className="text-xs font-medium text-emerald-600">Total Pengurangan</p>
                  <p className="text-2xl font-bold text-emerald-600">{poinBersih.poinPengurangan}</p>
                </div>
                <div className={`rounded-xl p-3 ${poinBersih.poinBersih > 0 ? 'bg-amber-50' : 'bg-slate-100'}`}>
                  <p className={`text-xs font-medium ${poinBersih.poinBersih > 0 ? 'text-amber-600' : 'text-slate-600'}`}>Poin Bersih</p>
                  <p className={`text-2xl font-bold ${poinBersih.poinBersih > 0 ? 'text-amber-600' : 'text-slate-600'}`}>{poinBersih.poinBersih}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mb-4">
                <Button onClick={handleTambahPelanggaranImp} className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4 mr-1" /> Tambah Pelanggaran
                </Button>
                <Button onClick={handleTambahImprovement} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-1" /> Tambah Improvement
                </Button>
              </div>

              {/* Pelanggaran Improvement records */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Pelanggaran ({improvementRecords.pelanggaranImprovement.length + (akumulasiLama ? siswaRecords.pelanggaran.length : 0)})
                </h4>
                {improvementRecords.pelanggaranImprovement.length === 0 ? (
                  <p className="text-center py-4 text-slate-400 text-sm">Belum ada pelanggaran</p>
                ) : (
                  <div className="space-y-2">
                    {improvementRecords.pelanggaranImprovement.map(item => (
                      <Card key={item.id} className="border-red-200">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge className="bg-slate-700 text-white font-mono text-xs">{item.kode}</Badge>
                                <Badge variant="outline" className="text-xs">{item.kategori_utama}</Badge>
                              </div>
                              <p className="text-sm font-medium text-slate-800">{item.uraian_pelanggaran}</p>
                              {item.rincian && <p className="text-xs text-slate-500 mt-0.5">{item.rincian}</p>}
                              {item.tindak_lanjut && <p className="text-xs text-amber-600 mt-1">📋 {item.tindak_lanjut}</p>}
                              <p className="text-xs text-slate-400 mt-1">{format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })} · {item.pelapor_nama || '-'}</p>
                            </div>
                            <div className="text-right ml-2 shrink-0">
                              <Badge className="bg-red-100 text-red-700">{item.poin} poin</Badge>
                              <p className="mt-1"><Badge className={item.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{item.status}</Badge></p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Pelanggaran Lama (modul lama) — disatukan saat akumulasi poin lama aktif */}
              {akumulasiLama && siswaRecords.pelanggaran.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Pelanggaran Lama ({siswaRecords.pelanggaran.length})
                  </h4>
                  <div className="space-y-2">
                    {siswaRecords.pelanggaran.map(item => (
                      <Card key={item.id} className="border-amber-200 bg-amber-50">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge className="bg-amber-200 text-amber-800 text-xs">Lama</Badge>
                                {item.jenis_pelanggaran && <Badge variant="outline" className="text-xs">{item.jenis_pelanggaran}</Badge>}
                                {item.kategori && <Badge variant="outline" className="text-xs">{item.kategori}</Badge>}
                              </div>
                              <p className="text-sm font-medium text-slate-800">{item.uraian}</p>
                              {item.sanksi && <p className="text-xs text-slate-500 mt-0.5">Sanksi: {item.sanksi}</p>}
                              <p className="text-xs text-slate-400 mt-1">{format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}{item.status ? ` · ${item.status}` : ''}</p>
                            </div>
                            <div className="text-right ml-2 shrink-0">
                              <Badge className="bg-red-100 text-red-700">{item.poin} poin</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvement (Kegiatan Pembinaan) records */}
              <div>
                <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" /> Kegiatan Pembinaan ({improvementRecords.improvement.length})
                </h4>
                {improvementRecords.improvement.length === 0 ? (
                  <p className="text-center py-4 text-slate-400 text-sm">Belum ada kegiatan pembinaan</p>
                ) : (
                  <div className="space-y-2">
                    {improvementRecords.improvement.map(item => (
                      <Card key={item.id} className="border-emerald-200 bg-emerald-50">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs">{item.kategori}</Badge>
                              </div>
                              <p className="text-sm font-medium text-slate-800">{item.kegiatan_pembinaan_nama || item.uraian}</p>
                              {item.uraian && item.kegiatan_pembinaan_nama && <p className="text-xs text-slate-500 mt-0.5">{item.uraian}</p>}
                              <p className="text-xs text-slate-400 mt-1">{format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })} · {item.validator_nama || '-'}</p>
                            </div>
                            <div className="text-right ml-2 shrink-0">
                              <Badge className="bg-emerald-100 text-emerald-700">−{item.poin_pengurangan} poin</Badge>
                              <p className="mt-1"><Badge className={item.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>{item.status}</Badge></p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* UKS Tab */}
            <TabsContent value="uks" className="mt-4">
              {siswaRecords.uks.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Belum ada data kunjungan UKS</div>
              ) : (
                <div className="space-y-3">
                  {siswaRecords.uks.map(item => (
                    <Card key={item.id} className="border-rose-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Stethoscope className="w-4 h-4 text-rose-600" />
                              <span className="font-semibold">{item.keluhan}</span>
                            </div>
                            <p className="text-sm text-slate-500">Penanganan: {item.penanganan || '-'}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={
                              item.status === 'Di UKS' ? 'bg-amber-100 text-amber-700' :
                              item.status === 'Pulang' ? 'bg-red-100 text-red-700' :
                              'bg-emerald-100 text-emerald-700'
                            }>
                              {item.status}
                            </Badge>
                            <p className="text-xs text-slate-400 mt-1">{format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2 text-xs text-slate-500">
                          <span>Masuk: {item.jam_masuk}</span>
                          {item.jam_keluar && <span>| Keluar: {item.jam_keluar}</span>}
                          {item.suhu_badan && <span>| Suhu: {item.suhu_badan}°C</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {!selectedSiswa && (
          <div className="text-center py-12 text-slate-400">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Pilih kelas dan siswa untuk melihat record</p>
          </div>
        )}

        {/* Tindak Lanjut Form Dialog */}
        <Dialog open={showTindakLanjutForm} onOpenChange={setShowTindakLanjutForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Tambah Tindak Lanjut
              </DialogTitle>
            </DialogHeader>
            {selectedPelanggaran && (
              <div className="bg-red-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-red-700">{selectedPelanggaran.uraian}</p>
                <p className="text-xs text-red-500 mt-1">{selectedPelanggaran.nama_siswa} - {selectedPelanggaran.poin} Poin</p>
              </div>
            )}
            <form onSubmit={handleSubmitTindakLanjut} className="space-y-4">
              <div>
                <Label>Tanggal</Label>
                <Input type="date" value={tindakLanjutForm.tanggal} onChange={(e) => setTindakLanjutForm({ ...tindakLanjutForm, tanggal: e.target.value })} required />
              </div>
              <div>
                <Label>Dilaporkan Kepada</Label>
                <Select value={tindakLanjutForm.dilaporkan_kepada} onValueChange={(v) => setTindakLanjutForm({ ...tindakLanjutForm, dilaporkan_kepada: v, nama_penerima: '' })}>
                  <SelectTrigger><SelectValue placeholder="Pilih pihak yang menerima laporan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wali Kelas">Wali Kelas</SelectItem>
                    <SelectItem value="BP/BK">BP/BK</SelectItem>
                    <SelectItem value="Kepala Sekolah">Kepala Sekolah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tindakLanjutForm.dilaporkan_kepada && (
                <div>
                  <Label>Nama Penerima</Label>
                  <Select value={tindakLanjutForm.nama_penerima} onValueChange={(v) => setTindakLanjutForm({ ...tindakLanjutForm, nama_penerima: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih nama guru/pihak" /></SelectTrigger>
                    <SelectContent>
                      {getGuruByRole(tindakLanjutForm.dilaporkan_kepada).map(guru => (
                        <SelectItem key={guru.id} value={guru.nama}>{guru.nama} {guru.tugas_tambahan ? `(${guru.tugas_tambahan})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Tindakan yang Dilakukan</Label>
                <Textarea value={tindakLanjutForm.tindakan} onChange={(e) => setTindakLanjutForm({ ...tindakLanjutForm, tindakan: e.target.value })} placeholder="Jelaskan tindakan yang diambil..." rows={2} />
              </div>
              <div>
                <Label>Catatan</Label>
                <Textarea value={tindakLanjutForm.catatan} onChange={(e) => setTindakLanjutForm({ ...tindakLanjutForm, catatan: e.target.value })} placeholder="Catatan tambahan..." rows={2} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={tindakLanjutForm.status} onValueChange={(v) => setTindakLanjutForm({ ...tindakLanjutForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Proses">Proses</SelectItem>
                    <SelectItem value="Selesai">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowTindakLanjutForm(false)} className="flex-1">Batal</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Improvement Form Dialogs */}
        <ImprovementFormDialog
          open={improvementOpen}
          onOpenChange={setImprovementOpen}
          editing={editingImprovement}
          siswaList={siswaList}
          guruList={guruList}
          currentUser={currentUser}
          improvementList={improvementList}
          kegiatanList={kegiatanList}
          pengaturan={pengaturanImprovement}
          tahunAjaran={tahunAjaran}
          prefillSiswa={prefillSiswa}
        />
        <PelanggaranImprovementFormDialog
          open={pelanggaranImpOpen}
          onOpenChange={setPelanggaranImpOpen}
          editing={editingPelanggaranImp}
          siswaList={siswaList}
          kelasList={kelasList}
          guruList={guruList}
          currentUser={currentUser}
          kodePelanggaranList={kodePelanggaranList}
          tahunAjaran={tahunAjaran}
          prefillSiswa={prefillSiswa}
        />
      </DialogContent>
    </Dialog>
  );
}