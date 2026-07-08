import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Search, Edit2, Trash2, TrendingUp, Calculator, CheckCircle, XCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import AnalisisNilai from "@/components/nilai/AnalisisNilai";
import PengelolaanNilai from "@/components/nilai/PengelolaanNilai";
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';

const MAPEL_LIST = [
  "PAI", "Bahasa Indonesia", "Matematika", "IPA", "IPS",
  "Bahasa Inggris", "PJOK", "Seni Musik", "Seni Rupa",
  "Akidah Akhlak", "BTAQ"
];

const TABS = [
  { key: 'input', label: 'Input Nilai', icon: BookOpen },
  { key: 'analisis', label: 'Analisis', icon: TrendingUp },
  { key: 'pengelolaan', label: 'Pengelolaan', icon: Calculator },
];

export default function Nilai() {
  const [activeTab, setActiveTab] = useState('input');
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [filterMapel, setFilterMapel] = useState('all');
  const [filterJenisPenilaian, setFilterJenisPenilaian] = useState('all');
  const [filterKelasInput, setFilterKelasInput] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [kelasInputOpen, setKelasInputOpen] = useState(false);
  const [kelasFormData, setKelasFormData] = useState({
    kelas_id: '', mapel: '', jenis_penilaian: '', kompetensi_bab: '',
    semester: '', tahun_ajaran: '', kkm: 75, nama_guru: ''
  });
  const [kelasNilaiData, setKelasNilaiData] = useState([]);
  const queryClient = useQueryClient();
  const { activeAcademicYear } = useActiveAcademicYear();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  // Default tahun_ajaran ke tahun ajaran aktif
  useEffect(() => {
    if (activeAcademicYear) {
      setFormData(prev => prev.tahun_ajaran ? prev : { ...prev, tahun_ajaran: activeAcademicYear });
      setKelasFormData(prev => prev.tahun_ajaran ? prev : { ...prev, tahun_ajaran: activeAcademicYear });
    }
  }, [activeAcademicYear]);

  const userRole = currentUser?.role || 'guru';
  const canEdit = ['admin', 'guru', 'tu', 'kepsek', 'operator'].includes(userRole);
  const isGuruRole = userRole === 'guru';

  const [formData, setFormData] = useState({
    siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
    mapel: '', semester: '', tahun_ajaran: '', jenis_penilaian: '',
    kompetensi_bab: '', nilai: '', kkm: 75, status_ketuntasan: ''
  });

  const { data: siswaList = [] } = useQuery({ queryKey: ['siswa'], queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }) });
  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list('nama'), staleTime: 60000 });

  const guruData = guruList.find(g => g.email === currentUser?.email);

  const { data: nilaiList = [], isLoading } = useQuery({
    queryKey: ['nilai', currentUser?.email, userRole],
    queryFn: async () => {
      const all = await base44.entities.Nilai.list('-created_date');
      if (isGuruRole && guruData) return all.filter(n => (guruData.mapel || []).includes(n.mapel));
      return all;
    },
    enabled: !isGuruRole || !!currentUser,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Nilai.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['nilai'] }); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Nilai.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['nilai'] }); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Nilai.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['nilai'] }); setDeleteConfirmOpen(false); setDeleteId(null); },
  });

  const resetForm = () => {
    setFormData({ siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '', mapel: '', semester: '', tahun_ajaran: activeAcademicYear || '', jenis_penilaian: '', kompetensi_bab: '', nilai: '', kkm: 75, status_ketuntasan: '' });
    setEditingData(null);
    setIsOpen(false);
  };

  const handleSiswaChange = (siswaId) => {
    const siswa = siswaList.find(s => s.id === siswaId);
    if (siswa) setFormData({ ...formData, siswa_id: siswaId, nis: siswa.nis, nama_siswa: siswa.nama, kelas_id: siswa.kelas_id, nama_kelas: siswa.nama_kelas });
  };

  const handleNilaiChange = (nilai) => {
    const numNilai = Number(nilai);
    setFormData({ ...formData, nilai: numNilai, status_ketuntasan: numNilai >= (formData.kkm || 75) ? 'Tuntas' : 'Belum Tuntas' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, nilai: Number(formData.nilai), kkm: Number(formData.kkm), tahun_ajaran: formData.tahun_ajaran || activeAcademicYear || '' };
    if (editingData) updateMutation.mutate({ id: editingData.id, data: payload });
    else createMutation.mutate(payload);
  };

  const handleEdit = (data) => { setEditingData(data); setFormData(data); setIsOpen(true); };

  const handleKelasChange = (kelasId) => {
    const kelas = kelasList.find(k => k.id === kelasId);
    const siswaInKelas = siswaList.filter(s => s.kelas_id === kelasId).sort((a, b) => a.nama.localeCompare(b.nama));
    setKelasFormData(prev => ({ ...prev, kelas_id: kelasId, tahun_ajaran: kelas?.tahun_ajaran || '' }));
    setKelasNilaiData(siswaInKelas.map(s => ({ siswa_id: s.id, nis: s.nis, nama_siswa: s.nama, nama_kelas: kelas?.nama_kelas || '', nilai: 0 })));
  };

  const handleMapelChange = (mapel) => {
    const guru = guruList.find(g => g.mapel && g.mapel.includes(mapel));
    setKelasFormData(prev => ({ ...prev, mapel, nama_guru: guru?.nama || prev.nama_guru }));
  };

  const handleKelasNilaiChange = (siswaId, nilai) => {
    setKelasNilaiData(prev => prev.map(item => item.siswa_id === siswaId ? { ...item, nilai: Number(nilai) } : item));
  };

  const handleKelasSubmit = async (e) => {
    e.preventDefault();
    const finalTahunAjaran = kelasFormData.tahun_ajaran || activeAcademicYear || '';
    const records = kelasNilaiData.map(item => ({
      ...item, ...kelasFormData, kelas_id: kelasFormData.kelas_id,
      tahun_ajaran: finalTahunAjaran,
      kkm: Number(kelasFormData.kkm),
      status_ketuntasan: item.nilai >= Number(kelasFormData.kkm) ? 'Tuntas' : 'Belum Tuntas'
    }));
    await base44.entities.Nilai.bulkCreate(records);
    queryClient.invalidateQueries({ queryKey: ['nilai'] });
    setKelasInputOpen(false);
    setKelasFormData({ kelas_id: '', mapel: '', jenis_penilaian: '', kompetensi_bab: '', semester: '', tahun_ajaran: activeAcademicYear || '', kkm: 75, nama_guru: '' });
    setKelasNilaiData([]);
  };

  const filteredData = nilaiList.filter(item => {
    const matchSearch = item.nama_siswa?.toLowerCase().includes(searchQuery.toLowerCase()) || item.nis?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKelas = filterKelas === 'all' || item.kelas_id === filterKelas;
    const matchMapel = filterMapel === 'all' || item.mapel === filterMapel;
    const matchJenis = filterJenisPenilaian === 'all' || item.jenis_penilaian === filterJenisPenilaian;
    return matchSearch && matchKelas && matchMapel && matchJenis;
  });

  const totalSiswa = filteredData.length;
  const totalTuntas = filteredData.filter(n => n.status_ketuntasan === 'Tuntas').length;
  const totalBelumTuntas = filteredData.filter(n => n.status_ketuntasan === 'Belum Tuntas').length;
  const persentaseTuntas = totalSiswa > 0 ? ((totalTuntas / totalSiswa) * 100).toFixed(1) : 0;

  const filteredSiswaForInput = filterKelasInput
    ? siswaList.filter(s => s.kelas_id === filterKelasInput).sort((a, b) => a.nama.localeCompare(b.nama))
    : siswaList.sort((a, b) => a.nama.localeCompare(b.nama));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-amber-500" />
            Nilai
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">Input, analisis, dan pengelolaan nilai siswa</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-white border border-slate-200 p-1 rounded-xl shadow-sm w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'analisis' && <AnalisisNilai />}
        {activeTab === 'pengelolaan' && <PengelolaanNilai />}

        {activeTab === 'input' && (
          <div className="space-y-5">
            {/* Action Buttons */}
            {canEdit && (
              <div className="flex gap-2 justify-end">
                <Dialog open={kelasInputOpen} onOpenChange={setKelasInputOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 shadow-sm">
                      <Plus className="w-4 h-4" /> Input Per Kelas
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Input Nilai Per Kelas</DialogTitle></DialogHeader>
                    <form onSubmit={handleKelasSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Kelas</Label>
                          <Select value={kelasFormData.kelas_id} onValueChange={handleKelasChange}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                            <SelectContent>{kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Mata Pelajaran</Label>
                          <Select value={kelasFormData.mapel} onValueChange={handleMapelChange}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>{MAPEL_LIST.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Jenis Penilaian</Label>
                          <Select value={kelasFormData.jenis_penilaian} onValueChange={(v) => setKelasFormData({...kelasFormData, jenis_penilaian: v})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>
                              {['Ulangan Harian','Tugas','PTS','PAS','Praktik'].map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Semester</Label>
                          <Select value={kelasFormData.semester} onValueChange={(v) => setKelasFormData({...kelasFormData, semester: v})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent><SelectItem value="Ganjil">Ganjil</SelectItem><SelectItem value="Genap">Genap</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">KKM</Label>
                          <Input type="number" value={kelasFormData.kkm} onChange={(e) => setKelasFormData({...kelasFormData, kkm: e.target.value})} className="mt-1" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Nama Guru</Label>
                          <Input value={kelasFormData.nama_guru} onChange={(e) => setKelasFormData({...kelasFormData, nama_guru: e.target.value})} placeholder="Otomatis dari Mapel" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Kompetensi/Bab</Label>
                          <Input value={kelasFormData.kompetensi_bab} onChange={(e) => setKelasFormData({...kelasFormData, kompetensi_bab: e.target.value})} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Tahun Ajaran</Label>
                          <Select value={kelasFormData.tahun_ajaran} onValueChange={(v) => setKelasFormData({...kelasFormData, tahun_ajaran: v})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>{[...new Set(kelasList.map(k => k.tahun_ajaran).filter(Boolean))].map(ta => <SelectItem key={ta} value={ta}>{ta}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      {kelasNilaiData.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                            <p className="text-sm font-semibold text-slate-700">Daftar Siswa ({kelasNilaiData.length})</p>
                          </div>
                          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                            {kelasNilaiData.map((item) => (
                              <div key={item.siswa_id} className="flex items-center gap-3 px-4 py-2.5">
                                <span className="flex-1 text-sm text-slate-700">{item.nama_siswa}</span>
                                <Input
                                  type="number" min="0" max="100"
                                  className={`w-20 text-center h-8 text-sm font-medium ${item.nilai >= Number(kelasFormData.kkm) ? 'border-emerald-300 text-emerald-700' : item.nilai > 0 ? 'border-red-300 text-red-700' : ''}`}
                                  value={item.nilai}
                                  onChange={(e) => handleKelasNilaiChange(item.siswa_id, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setKelasInputOpen(false)} className="flex-1">Batal</Button>
                        <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" disabled={kelasNilaiData.length === 0}>
                          Simpan Semua Nilai
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 gap-2">
                      <Plus className="w-4 h-4" /> Input Per Siswa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editingData ? 'Edit Nilai' : 'Input Nilai Baru'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label className="text-xs text-slate-500">Filter Kelas</Label>
                        <Select value={filterKelasInput} onValueChange={setFilterKelasInput}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                          <SelectContent>
                            {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Siswa</Label>
                        <Select value={formData.siswa_id} onValueChange={handleSiswaChange}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Siswa" /></SelectTrigger>
                          <SelectContent>
                            {filteredSiswaForInput.map(s => <SelectItem key={s.id} value={s.id}>{s.nama} - {s.nama_kelas}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Mata Pelajaran</Label>
                          <Select value={formData.mapel} onValueChange={(v) => setFormData({...formData, mapel: v})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>{MAPEL_LIST.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Jenis Penilaian</Label>
                          <Select value={formData.jenis_penilaian} onValueChange={(v) => setFormData({...formData, jenis_penilaian: v})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>{['Ulangan Harian','Tugas','PTS','PAS','Praktik'].map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Semester</Label>
                          <Select value={formData.semester} onValueChange={(v) => setFormData({...formData, semester: v})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent><SelectItem value="Ganjil">Ganjil</SelectItem><SelectItem value="Genap">Genap</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Tahun Ajaran</Label>
                          <Select value={formData.tahun_ajaran} onValueChange={(v) => setFormData({...formData, tahun_ajaran: v})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>{[...new Set(kelasList.map(k => k.tahun_ajaran).filter(Boolean))].map(ta => <SelectItem key={ta} value={ta}>{ta}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Kompetensi / Bab</Label>
                        <Input className="mt-1" value={formData.kompetensi_bab} onChange={(e) => setFormData({...formData, kompetensi_bab: e.target.value})} placeholder="Contoh: Bab 1 - Teks Narasi" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Nilai</Label>
                          <Input type="number" min="0" max="100" value={formData.nilai} onChange={(e) => handleNilaiChange(e.target.value)} required className="mt-1 text-center font-bold text-lg" />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">KKM</Label>
                          <Input type="number" value={formData.kkm} onChange={(e) => setFormData({...formData, kkm: Number(e.target.value)})} className="mt-1 text-center" />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Status</Label>
                          <div className={`mt-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold ${
                            formData.status_ketuntasan === 'Tuntas' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : formData.status_ketuntasan === 'Belum Tuntas' ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-50 text-slate-400 border border-slate-200'
                          }`}>
                            {formData.status_ketuntasan === 'Tuntas' ? <CheckCircle className="w-3.5 h-3.5" /> : formData.status_ketuntasan === 'Belum Tuntas' ? <XCircle className="w-3.5 h-3.5" /> : null}
                            {formData.status_ketuntasan || '-'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                        <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
                          {editingData ? 'Simpan' : 'Tambah'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Data', val: totalSiswa, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { label: 'Tuntas', val: totalTuntas, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                { label: 'Belum Tuntas', val: totalBelumTuntas, color: 'bg-red-50 border-red-200 text-red-700' },
                { label: '% Ketuntasan', val: `${persentaseTuntas}%`, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
                  <p className="text-2xl font-bold">{s.val}</p>
                  <p className="text-xs font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Cari nama atau NIS..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={filterKelas} onValueChange={setFilterKelas}>
                    <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="Kelas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kelas</SelectItem>
                      {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterMapel} onValueChange={setFilterMapel}>
                    <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Mapel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Mapel</SelectItem>
                      {MAPEL_LIST.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterJenisPenilaian} onValueChange={setFilterJenisPenilaian}>
                    <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Jenis Penilaian" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Jenis</SelectItem>
                      {['Ulangan Harian','Tugas','PTS','PAS','Praktik'].map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <DataTable
                  columns={[
                    { key: 'nama_siswa', label: 'Siswa', render: (row) => (
                      <div>
                        <p className="font-medium text-sm text-slate-800">{row.nama_siswa}</p>
                        <p className="text-xs text-slate-400 font-mono">{row.nis}</p>
                      </div>
                    )},
                    { key: 'nama_kelas', label: 'Kelas', render: (row) => (
                      <Badge className="bg-blue-50 text-blue-700 text-xs border-0">{row.nama_kelas}</Badge>
                    )},
                    { key: 'mapel', label: 'Mapel', render: (row) => <span className="text-sm text-slate-700">{row.mapel}</span> },
                    { key: 'jenis_penilaian', label: 'Jenis', render: (row) => <span className="text-xs text-slate-500">{row.jenis_penilaian}</span> },
                    { key: 'nilai', label: 'Nilai', render: (row) => (
                      <span className={`text-lg font-bold ${row.nilai >= (row.kkm || 75) ? 'text-emerald-600' : 'text-red-600'}`}>
                        {row.nilai}
                      </span>
                    )},
                    { key: 'status_ketuntasan', label: 'Status', render: (row) => (
                      <Badge className={`text-xs border-0 ${row.status_ketuntasan === 'Tuntas' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {row.status_ketuntasan}
                      </Badge>
                    )},
                    { key: 'aksi', label: 'Aksi', sortable: false, filterable: false, render: (row) => canEdit ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(row)} className="h-7 w-7 p-0 hover:bg-amber-50 hover:text-amber-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setDeleteId(row.id); setDeleteConfirmOpen(true); }} className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : <span className="text-xs text-slate-300">-</span> }
                  ]}
                  data={filteredData}
                  pageSize={10}
                />
              </CardContent>
            </Card>

            <ConfirmDialog
              open={deleteConfirmOpen}
              onOpenChange={setDeleteConfirmOpen}
              onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
              title="Hapus Data Nilai"
              description="Apakah Anda yakin ingin menghapus data nilai ini?"
            />
          </div>
        )}
      </div>
    </div>
  );
}