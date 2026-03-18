import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Building, Users, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";

export default function Kelas() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);
  const queryClient = useQueryClient();

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

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateResult(null);

    // Ambil semua data sekaligus
    const [semuaSiswa, existingKelas] = await Promise.all([
      base44.entities.Siswa.list(),
      base44.entities.Kelas.list(),
    ]);

    const siswaAktif = semuaSiswa.filter(s => s.nama_kelas && s.status === 'Aktif');

    // Map kelas yang sudah ada
    const kelasNamaMap = {};
    for (const k of existingKelas) {
      kelasNamaMap[k.nama_kelas] = k;
    }

    // Kelompokkan siswa berdasarkan nama_kelas
    const kelasMap = {};
    for (const siswa of siswaAktif) {
      if (!kelasMap[siswa.nama_kelas]) kelasMap[siswa.nama_kelas] = [];
      kelasMap[siswa.nama_kelas].push(siswa);
    }

    // Buat kelas baru yang belum ada (bulk)
    const namaKelasPerluDibuat = Object.keys(kelasMap).filter(n => !kelasNamaMap[n]);
    let kelasBaruDibuat = 0;

    if (namaKelasPerluDibuat.length > 0) {
      const newKelasData = namaKelasPerluDibuat.map(namaKelas => {
        const tingkatMatch = namaKelas.match(/^([789])/);
        return { nama_kelas: namaKelas, tingkat: tingkatMatch ? tingkatMatch[1] : '7' };
      });
      const createdKelas = await base44.entities.Kelas.bulkCreate(newKelasData);
      for (const k of createdKelas) {
        kelasNamaMap[k.nama_kelas] = k;
      }
      kelasBaruDibuat = createdKelas.length;
    }

    // Kumpulkan siswa yang perlu diupdate
    const siswaPerluUpdate = [];
    for (const [namaKelas, siswaDiKelas] of Object.entries(kelasMap)) {
      const targetKelas = kelasNamaMap[namaKelas];
      if (!targetKelas) continue;
      for (const siswa of siswaDiKelas) {
        if (siswa.kelas_id !== targetKelas.id) {
          siswaPerluUpdate.push({ id: siswa.id, kelas_id: targetKelas.id });
        }
      }
    }

    // Update siswa satu per satu dengan delay untuk menghindari rate limit
    for (const s of siswaPerluUpdate) {
      await base44.entities.Siswa.update(s.id, { kelas_id: s.kelas_id });
      await new Promise(res => setTimeout(res, 300));
    }

    queryClient.invalidateQueries({ queryKey: ['kelas'] });
    queryClient.invalidateQueries({ queryKey: ['siswa'] });
    setIsGenerating(false);
    setGenerateResult({ kelasBaruDibuat, siswadiupdate: siswaPerluUpdate.length });
  };

  const getSiswaCount = (kelasId) => {
    return siswaList.filter(s => s.kelas_id === kelasId).length;
  };

  const tingkatColors = {
    '7': 'from-blue-500 to-blue-600',
    '8': 'from-emerald-500 to-emerald-600',
    '9': 'from-purple-500 to-purple-600',
  };

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
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {isGenerating ? 'Memproses...' : 'Generate Siswa ke Kelas'}
            </Button>
            {generateResult && (
              <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                ✅ {generateResult.kelasBaruDibuat} kelas baru dibuat, {generateResult.siswadiupdate} siswa diperbarui.
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

        {/* Kelas Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kelasList.map((kelas, index) => (
            <motion.div
              key={kelas.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
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

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(kelas)}>
                      <Edit2 className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteClick(kelas.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {kelasList.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-12 text-slate-400">
              Belum ada data kelas. Klik "Tambah Kelas" untuk memulai.
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Hapus Data Kelas"
        description="Apakah Anda yakin ingin menghapus kelas ini? Data akan dihapus secara permanen."
      />
    </div>
  );
}