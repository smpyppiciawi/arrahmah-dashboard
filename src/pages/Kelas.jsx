import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, Trash2, Building, Users, Wand2, CheckCircle2, Loader2, ChevronDown, ChevronUp, BookOpen, CalendarDays, LayoutGrid, List, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import PembelajaranDialog from "@/components/kelas/PembelajaranDialog";
import InputPembelajaranGuru from "@/components/kelas/InputPembelajaranGuru";
import JadwalDialog from "@/components/kelas/JadwalDialog";
import DetailKelasDialog from "@/components/kelas/DetailKelasDialog";
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';

export default function Kelas() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ phase: '', current: 0, total: 0, log: [] });
  const [expandedKelas, setExpandedKelas] = useState({});
  const [pembelajaranOpen, setPembelajaranOpen] = useState(false);
  const [inputPembelajaranGuruOpen, setInputPembelajaranGuruOpen] = useState(false);
  const [jadwalOpen, setJadwalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedKelas, setSelectedKelas] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const queryClient = useQueryClient();
  const { activeAcademicYear } = useActiveAcademicYear();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try { const u = await base44.auth.me(); setCurrentUser(u); } catch {}
    };
    fetchUser();
  }, []);

  const userRole = currentUser?.role || 'guru';
  const canEdit = ['admin', 'tu'].includes(userRole);

  const [formData, setFormData] = useState({
    wali_kelas: '', tahun_ajaran: ''
  });

  const { data: kelasList = [], isLoading } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Kelas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelas'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Kelas.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelas'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Kelas.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelas'] });
      setDeleteConfirmOpen(false);
      setDeleteId(null);
    },
  });

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  const resetForm = () => {
    setFormData({ wali_kelas: '', tahun_ajaran: '' });
    setEditingKelas(null);
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingKelas) {
      updateMutation.mutate({ id: editingKelas.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (kelas) => {
    setEditingKelas(kelas);
    setFormData({ wali_kelas: kelas.wali_kelas || '', tahun_ajaran: kelas.tahun_ajaran || '' });
    setIsOpen(true);
  };

  const addLog = (msg, type = 'info') => {
    setGenerateProgress(prev => ({
      ...prev,
      log: [...prev.log, { msg, type, time: new Date().toLocaleTimeString() }]
    }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateResult(null);
    setGenerateModalOpen(true);
    setExpandedKelas({});
    setGenerateProgress({ phase: 'scan', current: 0, total: 0, log: [] });

    // Phase 1: Scanning
    setGenerateProgress(prev => ({ ...prev, phase: 'scan' }));
    const addLogLocal = (msg, type = 'info') => {
      setGenerateProgress(prev => ({
        ...prev,
        log: [...prev.log, { msg, type, time: new Date().toLocaleTimeString() }]
      }));
    };

    addLogLocal('🔍 Memindai data siswa dan kelas...', 'info');

    const [semuaSiswa, existingKelas] = await Promise.all([
      base44.entities.Siswa.list(),
      base44.entities.Kelas.list(),
    ]);

    const siswaAktif = semuaSiswa.filter(s => s.nama_kelas && s.status === 'Aktif');
    addLogLocal(`✅ Ditemukan ${siswaAktif.length} siswa aktif`, 'success');
    addLogLocal(`✅ Ditemukan ${existingKelas.length} kelas existing`, 'success');

    // Map kelas yang sudah ada
    const kelasNamaMap = {};
    for (const k of existingKelas) kelasNamaMap[k.nama_kelas] = k;

    // Kelompokkan siswa berdasarkan nama_kelas
    const kelasMap = {};
    for (const siswa of siswaAktif) {
      if (!kelasMap[siswa.nama_kelas]) kelasMap[siswa.nama_kelas] = [];
      kelasMap[siswa.nama_kelas].push(siswa);
    }

    const namaKelasList = Object.keys(kelasMap).sort();
    addLogLocal(`📋 ${namaKelasList.length} kelas terdeteksi: ${namaKelasList.join(', ')}`, 'info');

    // Phase 2: Buat kelas baru
    const namaKelasPerluDibuat = namaKelasList.filter(n => !kelasNamaMap[n]);
    let kelasBaruDibuat = 0;

    if (namaKelasPerluDibuat.length > 0) {
      addLogLocal(`🏫 Membuat ${namaKelasPerluDibuat.length} kelas baru: ${namaKelasPerluDibuat.join(', ')}`, 'info');
      setGenerateProgress(prev => ({ ...prev, phase: 'kelas' }));
      const newKelasData = namaKelasPerluDibuat.map(namaKelas => {
        const tingkatMatch = namaKelas.match(/^([789])/);
        return { nama_kelas: namaKelas, tingkat: tingkatMatch ? tingkatMatch[1] : '7', tahun_ajaran: activeAcademicYear || '' };
      });
      const createdKelas = await base44.entities.Kelas.bulkCreate(newKelasData);
      for (const k of createdKelas) {
        kelasNamaMap[k.nama_kelas] = k;
        addLogLocal(`✅ Kelas "${k.nama_kelas}" berhasil dibuat`, 'success');
      }
      kelasBaruDibuat = createdKelas.length;
    } else {
      addLogLocal('ℹ️ Semua kelas sudah ada, tidak perlu membuat kelas baru', 'info');
    }

    // Phase 3: Update siswa per kelas
    setGenerateProgress(prev => ({ ...prev, phase: 'siswa', current: 0, total: namaKelasList.length }));

    const kelasResult = {}; // namaKelas -> { updated: [], skipped: [] }
    let totalUpdated = 0;

    for (let ki = 0; ki < namaKelasList.length; ki++) {
      const namaKelas = namaKelasList[ki];
      const targetKelas = kelasNamaMap[namaKelas];
      const siswaDiKelas = kelasMap[namaKelas] || [];

      setGenerateProgress(prev => ({ ...prev, current: ki + 1 }));
      addLogLocal(`📂 Memproses kelas ${namaKelas} (${siswaDiKelas.length} siswa)...`, 'info');

      kelasResult[namaKelas] = { updated: [], skipped: [] };

      const perluUpdate = siswaDiKelas.filter(s => s.kelas_id !== targetKelas?.id);
      const sudahBenar = siswaDiKelas.filter(s => s.kelas_id === targetKelas?.id);

      for (const s of sudahBenar) kelasResult[namaKelas].skipped.push(s.nama);

      for (const s of perluUpdate) {
        await base44.entities.Siswa.update(s.id, { kelas_id: targetKelas.id });
        kelasResult[namaKelas].updated.push(s.nama);
        totalUpdated++;
        await new Promise(res => setTimeout(res, 700));
      }

      addLogLocal(`✅ Kelas ${namaKelas}: ${perluUpdate.length} diperbarui, ${sudahBenar.length} sudah benar`, 'success');

      // Jeda antar kelas untuk menghindari rate limit
      if (ki < namaKelasList.length - 1) {
        await new Promise(res => setTimeout(res, 500));
      }
    }

    queryClient.invalidateQueries({ queryKey: ['kelas'] });
    queryClient.invalidateQueries({ queryKey: ['siswa'] });
    setIsGenerating(false);
    setGenerateProgress(prev => ({ ...prev, phase: 'done' }));
    setGenerateResult({ kelasBaruDibuat, siswadiupdate: totalUpdated, kelasResult, namaKelasList });
    addLogLocal(`🎉 Selesai! ${kelasBaruDibuat} kelas dibuat, ${totalUpdated} siswa diperbarui.`, 'success');
  };

  const getSiswaCount = (kelasId) => {
    return siswaList.filter(s => s.kelas_id === kelasId).length;
  };

  const tingkatColors = {
    '7': 'from-blue-500 to-blue-600',
    '8': 'from-emerald-500 to-emerald-600',
    '9': 'from-purple-500 to-purple-600',
  };

  const tingkatBadgeColors = {
    '7': 'bg-blue-100 text-blue-700',
    '8': 'bg-emerald-100 text-emerald-700',
    '9': 'bg-purple-100 text-purple-700',
  };

  // Sort: by tingkat (7→8→9) then by nama_kelas alphabetically
  const sortedKelasList = [...kelasList]
    .filter(k => k.tahun_ajaran === activeAcademicYear)
    .sort((a, b) => {
    const tingkatA = parseInt(a.tingkat) || 0;
    const tingkatB = parseInt(b.tingkat) || 0;
    if (tingkatA !== tingkatB) return tingkatA - tingkatB;
    return (a.nama_kelas || '').localeCompare(b.nama_kelas || '');
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Building className="w-8 h-8 text-purple-500" />
              Data Kelas
            </h1>
            <p className="text-slate-500 mt-1">Kelola kelas dan wali kelas</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  <LayoutGrid className="w-4 h-4" /> Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  <List className="w-4 h-4" /> Detail
                </button>
              </div>
              {canEdit && (
                <>
                  <Button
                    onClick={() => setInputPembelajaranGuruOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Input Pembelajaran Guru
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                    {isGenerating ? 'Memproses...' : 'Generate Siswa ke Kelas'}
                  </Button>
                </>
              )}
            </div>
            {generateResult && !generateModalOpen && (
              <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 cursor-pointer" onClick={() => setGenerateModalOpen(true)}>
                ✅ {generateResult.kelasBaruDibuat} kelas baru, {generateResult.siswadiupdate} siswa diperbarui. <span className="underline">Lihat detail</span>
              </div>
            )}
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Kelas {editingKelas?.nama_kelas}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Wali Kelas</Label>
                  <Select value={formData.wali_kelas} onValueChange={(v) => setFormData({...formData, wali_kelas: v})}>
                    <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
                    <SelectContent>
                      {guruList.map(guru => (
                        <SelectItem key={guru.id} value={guru.nama}>{guru.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tahun Ajaran</Label>
                  <Input 
                    value={formData.tahun_ajaran} 
                    onChange={(e) => setFormData({...formData, tahun_ajaran: e.target.value})} 
                    placeholder="Contoh: 2024/2025"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                  <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                    Simpan
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* GRID VIEW */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedKelasList.map((kelas, index) => (
              <motion.div key={kelas.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className={`h-2 bg-gradient-to-r ${tingkatColors[kelas.tingkat] || 'from-slate-400 to-slate-500'}`} />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">{kelas.nama_kelas}</h3>
                        <p className="text-sm text-slate-500 mt-1">Tingkat {kelas.tingkat}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">{getSiswaCount(kelas.id)}</span>
                      </div>
                    </div>
                    {kelas.wali_kelas && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Wali Kelas</p>
                        <p className="text-sm font-medium text-slate-700">{kelas.wali_kelas}</p>
                      </div>
                    )}
                    {kelas.tahun_ajaran && (
                      <p className="text-xs text-slate-400 mt-3">TA {kelas.tahun_ajaran}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
                      <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => { setSelectedKelas(kelas); setPembelajaranOpen(true); }}>
                        <BookOpen className="w-3.5 h-3.5 mr-1" /> Pembelajaran
                      </Button>
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => { setSelectedKelas(kelas); setJadwalOpen(true); }}>
                        <CalendarDays className="w-3.5 h-3.5 mr-1" /> Jadwal
                      </Button>
                      <Button size="sm" variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50" onClick={() => { setSelectedKelas(kelas); setDetailOpen(true); }}>
                        <Users className="w-3.5 h-3.5 mr-1" /> Detail Kelas
                      </Button>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(kelas)}>
                            <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteClick(kelas.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {sortedKelasList.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-12 text-slate-400">Belum ada data kelas.</div>
            )}
          </div>
        )}

        {/* LIST / DETAIL VIEW */}
        {viewMode === 'list' && (
          <div className="space-y-2">
            {/* Header Row */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-100 rounded-lg">
              <div className="col-span-2">Kelas</div>
              <div className="col-span-1 text-center">Tingkat</div>
              <div className="col-span-1 text-center">Siswa</div>
              <div className="col-span-2">Wali Kelas</div>
              <div className="col-span-2">Tahun Ajaran</div>
              <div className="col-span-4 text-center">Aksi</div>
            </div>

            {sortedKelasList.map((kelas, index) => (
              <motion.div key={kelas.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                  <div className={`w-1 absolute left-0 top-0 bottom-0 bg-gradient-to-b ${tingkatColors[kelas.tingkat] || 'from-slate-400 to-slate-500'}`} style={{position: 'relative', display: 'none'}} />
                  <CardContent className="p-0">
                    <div className={`w-full border-l-4 ${kelas.tingkat === '7' ? 'border-blue-500' : kelas.tingkat === '8' ? 'border-emerald-500' : 'border-purple-500'}`}>
                      {/* Mobile layout */}
                      <div className="md:hidden p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-slate-800">{kelas.nama_kelas}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tingkatBadgeColors[kelas.tingkat] || 'bg-slate-100 text-slate-600'}`}>Tingkat {kelas.tingkat}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full text-sm text-slate-600">
                            <Users className="w-3.5 h-3.5" />{getSiswaCount(kelas.id)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-slate-400 text-xs">Wali Kelas</span><p className="font-medium text-slate-700 truncate">{kelas.wali_kelas || '-'}</p></div>
                          <div><span className="text-slate-400 text-xs">Tahun Ajaran</span><p className="font-medium text-slate-700">{kelas.tahun_ajaran || '-'}</p></div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 text-xs" onClick={() => { setSelectedKelas(kelas); setPembelajaranOpen(true); }}><BookOpen className="w-3 h-3 mr-1" />Pembelajaran</Button>
                          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 text-xs" onClick={() => { setSelectedKelas(kelas); setJadwalOpen(true); }}><CalendarDays className="w-3 h-3 mr-1" />Jadwal</Button>
                          <Button size="sm" variant="outline" className="text-purple-600 border-purple-200 text-xs" onClick={() => { setSelectedKelas(kelas); setDetailOpen(true); }}><Users className="w-3 h-3 mr-1" />Detail</Button>
                          {canEdit && (
                            <>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => handleEdit(kelas)}><Edit2 className="w-3 h-3 mr-1" />Edit</Button>
                              <Button size="sm" variant="outline" className="text-red-500 text-xs" onClick={() => handleDeleteClick(kelas.id)}><Trash2 className="w-3 h-3" /></Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden md:grid grid-cols-12 gap-3 items-center px-4 py-3">
                        <div className="col-span-2">
                          <p className="font-bold text-slate-800 text-base">{kelas.nama_kelas}</p>
                        </div>
                        <div className="col-span-1 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${tingkatBadgeColors[kelas.tingkat] || 'bg-slate-100 text-slate-600'}`}>{kelas.tingkat}</span>
                        </div>
                        <div className="col-span-1 text-center">
                          <div className="flex items-center justify-center gap-1 bg-slate-100 px-2 py-1 rounded-full text-sm text-slate-600 w-fit mx-auto">
                            <Users className="w-3.5 h-3.5" />{getSiswaCount(kelas.id)}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-slate-700 truncate">{kelas.wali_kelas || <span className="text-slate-300">-</span>}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-slate-600">{kelas.tahun_ajaran || <span className="text-slate-300">-</span>}</p>
                        </div>
                        <div className="col-span-4 flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs" onClick={() => { setSelectedKelas(kelas); setPembelajaranOpen(true); }}><BookOpen className="w-3.5 h-3.5 mr-1" />Pembelajaran</Button>
                          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs" onClick={() => { setSelectedKelas(kelas); setJadwalOpen(true); }}><CalendarDays className="w-3.5 h-3.5 mr-1" />Jadwal</Button>
                          <Button size="sm" variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50 text-xs" onClick={() => { setSelectedKelas(kelas); setDetailOpen(true); }}><Users className="w-3.5 h-3.5 mr-1" />Detail</Button>
                          {canEdit && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleEdit(kelas)}><Edit2 className="w-3.5 h-3.5" /></Button>
                              <Button size="sm" variant="outline" className="text-red-500" onClick={() => handleDeleteClick(kelas.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {sortedKelasList.length === 0 && !isLoading && (
              <div className="text-center py-12 text-slate-400">Belum ada data kelas.</div>
            )}
          </div>
        )}
      </div>

      {/* Generate Progress Modal */}
      <Dialog open={generateModalOpen} onOpenChange={(o) => { if (!isGenerating) setGenerateModalOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {isGenerating ? 'Sedang Proses Generate...' : 'Generate Selesai'}
            </DialogTitle>
          </DialogHeader>

          {/* Progress Bar */}
          {generateProgress.phase === 'siswa' && (
            <div className="px-1">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Memproses kelas ({generateProgress.current}/{generateProgress.total})</span>
                <span>{Math.round((generateProgress.current / generateProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(generateProgress.current / generateProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Log Stream */}
          <div className="flex-1 overflow-y-auto bg-slate-900 rounded-lg p-3 font-mono text-xs space-y-1 min-h-[150px] max-h-[220px]">
            {generateProgress.log.map((entry, i) => (
              <div key={i} className={`${entry.type === 'success' ? 'text-green-400' : entry.type === 'error' ? 'text-red-400' : 'text-slate-300'}`}>
                <span className="text-slate-500 mr-2">[{entry.time}]</span>{entry.msg}
              </div>
            ))}
            {isGenerating && <div className="text-amber-400 animate-pulse">▌</div>}
          </div>

          {/* Result Detail per Kelas */}
          {generateResult && (
            <div className="overflow-y-auto max-h-[250px] space-y-2">
              <p className="text-sm font-semibold text-slate-700">Detail per Kelas:</p>
              {generateResult.namaKelasList.map(namaKelas => {
                const r = generateResult.kelasResult[namaKelas];
                const isExpanded = expandedKelas[namaKelas];
                return (
                  <div key={namaKelas} className="border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700"
                      onClick={() => setExpandedKelas(prev => ({ ...prev, [namaKelas]: !prev[namaKelas] }))}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-bold text-purple-700">{namaKelas}</span>
                        <span className="text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full">{r.updated.length} diperbarui</span>
                        <span className="text-slate-400 text-xs bg-slate-100 px-2 py-0.5 rounded-full">{r.skipped.length} sudah benar</span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {isExpanded && (
                      <div className="px-3 py-2 bg-white text-xs text-slate-600 space-y-1">
                        {r.updated.length > 0 && (
                          <div><span className="text-green-600 font-semibold">Diperbarui:</span> {r.updated.join(', ')}</div>
                        )}
                        {r.skipped.length > 0 && (
                          <div><span className="text-slate-400 font-semibold">Sudah benar:</span> {r.skipped.join(', ')}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!isGenerating && (
            <Button onClick={() => setGenerateModalOpen(false)} className="mt-2">Tutup</Button>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Hapus Data Kelas"
        description="Apakah Anda yakin ingin menghapus kelas ini? Data akan dihapus secara permanen."
      />

      <PembelajaranDialog open={pembelajaranOpen} onOpenChange={setPembelajaranOpen} kelas={selectedKelas} />
      <InputPembelajaranGuru open={inputPembelajaranGuruOpen} onOpenChange={setInputPembelajaranGuruOpen} />
      <JadwalDialog open={jadwalOpen} onOpenChange={setJadwalOpen} kelas={selectedKelas} />
      <DetailKelasDialog open={detailOpen} onOpenChange={setDetailOpen} kelas={selectedKelas} />
    </div>
  );
}