import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, User, Trophy, AlertCircle, Stethoscope, X, Calendar, Award, Plus, MessageSquare, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function CariRecordSiswa({ open, onOpenChange }) {
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

  const queryClient = useQueryClient();

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: prestasiList = [] } = useQuery({
    queryKey: ['prestasi'],
    queryFn: () => base44.entities.Prestasi.list('-tanggal'),
  });

  const { data: pelanggaranList = [] } = useQuery({
    queryKey: ['pelanggaran'],
    queryFn: () => base44.entities.Pelanggaran.list('-tanggal'),
  });

  const { data: uksList = [] } = useQuery({
    queryKey: ['uks'],
    queryFn: () => base44.entities.UKS.list('-tanggal'),
  });

  const { data: tindakLanjutList = [] } = useQuery({
    queryKey: ['tindak-lanjut'],
    queryFn: () => base44.entities.TindakLanjut.list('-tanggal'),
  });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
  });

  const createTindakLanjutMutation = useMutation({
    mutationFn: (data) => base44.entities.TindakLanjut.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tindak-lanjut'] });
      setShowTindakLanjutForm(false);
      setSelectedPelanggaran(null);
      setTindakLanjutForm({
        tanggal: new Date().toISOString().split('T')[0],
        dilaporkan_kepada: '',
        nama_penerima: '',
        catatan: '',
        tindakan: '',
        status: 'Proses'
      });
    },
  });

  const updateTindakLanjutMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TindakLanjut.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tindak-lanjut'] });
    },
  });

  const filteredSiswa = useMemo(() => {
    if (!selectedKelas) return [];
    return siswaList
      .filter(s => s.kelas_id === selectedKelas)
      .sort((a, b) => a.nama.localeCompare(b.nama));
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

  // Get tindak lanjut for a specific pelanggaran
  const getTindakLanjutByPelanggaran = (pelanggaranId) => {
    return tindakLanjutList.filter(t => t.pelanggaran_id === pelanggaranId);
  };

  const handleAddTindakLanjut = (pelanggaran) => {
    setSelectedPelanggaran(pelanggaran);
    setShowTindakLanjutForm(true);
  };

  const handleSubmitTindakLanjut = (e) => {
    e.preventDefault();
    createTindakLanjutMutation.mutate({
      ...tindakLanjutForm,
      pelanggaran_id: selectedPelanggaran.id,
      siswa_id: selectedPelanggaran.siswa_id,
      nama_siswa: selectedPelanggaran.nama_siswa
    });
  };

  const handleUpdateTindakLanjutStatus = (tindakLanjut) => {
    updateTindakLanjutMutation.mutate({
      id: tindakLanjut.id,
      data: { status: tindakLanjut.status === 'Proses' ? 'Selesai' : 'Proses' }
    });
  };

  // Get guru list filtered by role for tindak lanjut
  const getGuruByRole = (role) => {
    if (role === 'Wali Kelas') {
      return guruList.filter(g => g.jabatan === 'Guru Mata Pelajaran');
    } else if (role === 'BP/BK') {
      return guruList.filter(g => g.tugas_tambahan === 'BP/BK' || g.jabatan === 'Guru Mata Pelajaran');
    } else if (role === 'Kepala Sekolah') {
      return guruList.filter(g => g.jabatan === 'Kepala Sekolah');
    }
    return guruList;
  };

  const totalPoin = siswaRecords.pelanggaran.reduce((sum, p) => sum + (p.poin || 0), 0);

  const handleReset = () => {
    setSelectedKelas('');
    setSelectedSiswa(null);
  };

  const categoryColors = {
    'Juara 1': 'bg-yellow-100 text-yellow-800',
    'Juara 2': 'bg-slate-100 text-slate-800',
    'Juara 3': 'bg-orange-100 text-orange-800',
    'Finalis': 'bg-blue-100 text-blue-800',
    'Peserta': 'bg-emerald-100 text-emerald-800'
  };

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
                {kelasList.map(k => (
                  <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pilih Siswa</Label>
            <Select 
              value={selectedSiswa?.id || ''} 
              onValueChange={(v) => setSelectedSiswa(siswaList.find(s => s.id === v))}
              disabled={!selectedKelas}
            >
              <SelectTrigger><SelectValue placeholder={selectedKelas ? "Pilih Siswa" : "Pilih kelas dulu"} /></SelectTrigger>
              <SelectContent>
                {filteredSiswa.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Student Info Card */}
        {selectedSiswa && (
          <Card className="mb-4 border-indigo-200 bg-indigo-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-indigo-900">{selectedSiswa.nama}</h3>
                    <p className="text-sm text-indigo-600">NIS: {selectedSiswa.nis} | Kelas: {selectedSiswa.nama_kelas}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <Trophy className="w-3 h-3 mr-1" />
                    {siswaRecords.prestasi.length} Prestasi
                  </Badge>
                  <Badge className={totalPoin >= 100 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {totalPoin} Poin
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prestasi" className="flex items-center gap-1">
                <Trophy className="w-4 h-4" /> Prestasi ({siswaRecords.prestasi.length})
              </TabsTrigger>
              <TabsTrigger value="pelanggaran" className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Pelanggaran ({siswaRecords.pelanggaran.length})
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
                            <p className="text-xs text-slate-400 mt-1">
                              {format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}
                            </p>
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

            {/* Pelanggaran Tab */}
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
                              <p className="text-xs text-slate-400 mt-1">
                                {format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="outline">{item.jenis_pelanggaran}</Badge>
                            <Badge variant="outline">{item.kategori}</Badge>
                            <Badge className={item.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                              {item.status}
                            </Badge>
                          </div>

                          {/* Tindak Lanjut Section */}
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-slate-600 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                Tindak Lanjut ({itemTindakLanjut.length})
                              </span>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-xs"
                                onClick={() => handleAddTindakLanjut(item)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Tambah Tindak Lanjut
                              </Button>
                            </div>
                            
                            {itemTindakLanjut.length > 0 && (
                              <div className="space-y-2">
                                {itemTindakLanjut.map(tl => (
                                  <div key={tl.id} className="bg-slate-50 rounded-lg p-2 text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <Badge className={tl.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>
                                          {tl.status}
                                        </Badge>
                                        <span className="font-medium">{tl.dilaporkan_kepada}</span>
                                        <span className="text-slate-400">→</span>
                                        <span>{tl.nama_penerima}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">
                                          {format(new Date(tl.tanggal), 'dd/MM/yy')}
                                        </span>
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          className="h-6 px-2"
                                          onClick={() => handleUpdateTindakLanjutStatus(tl)}
                                        >
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
                            <p className="text-xs text-slate-400 mt-1">
                              {format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}
                            </p>
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
                <p className="text-xs text-red-500 mt-1">
                  {selectedPelanggaran.nama_siswa} - {selectedPelanggaran.poin} Poin
                </p>
              </div>
            )}

            <form onSubmit={handleSubmitTindakLanjut} className="space-y-4">
              <div>
                <Label>Tanggal</Label>
                <Input 
                  type="date" 
                  value={tindakLanjutForm.tanggal}
                  onChange={(e) => setTindakLanjutForm({...tindakLanjutForm, tanggal: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label>Dilaporkan Kepada</Label>
                <Select 
                  value={tindakLanjutForm.dilaporkan_kepada} 
                  onValueChange={(v) => setTindakLanjutForm({...tindakLanjutForm, dilaporkan_kepada: v, nama_penerima: ''})}
                >
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
                  <Select 
                    value={tindakLanjutForm.nama_penerima} 
                    onValueChange={(v) => setTindakLanjutForm({...tindakLanjutForm, nama_penerima: v})}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih nama guru/pihak" /></SelectTrigger>
                    <SelectContent>
                      {getGuruByRole(tindakLanjutForm.dilaporkan_kepada).map(guru => (
                        <SelectItem key={guru.id} value={guru.nama}>
                          {guru.nama} {guru.tugas_tambahan ? `(${guru.tugas_tambahan})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Tindakan yang Dilakukan</Label>
                <Textarea 
                  value={tindakLanjutForm.tindakan}
                  onChange={(e) => setTindakLanjutForm({...tindakLanjutForm, tindakan: e.target.value})}
                  placeholder="Jelaskan tindakan yang diambil..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Catatan</Label>
                <Textarea 
                  value={tindakLanjutForm.catatan}
                  onChange={(e) => setTindakLanjutForm({...tindakLanjutForm, catatan: e.target.value})}
                  placeholder="Catatan tambahan..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select 
                  value={tindakLanjutForm.status} 
                  onValueChange={(v) => setTindakLanjutForm({...tindakLanjutForm, status: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Proses">Proses</SelectItem>
                    <SelectItem value="Selesai">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowTindakLanjutForm(false)} className="flex-1">
                  Batal
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Simpan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}