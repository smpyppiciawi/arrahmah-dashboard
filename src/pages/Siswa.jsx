import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Users, Plus, Download, Upload, Edit2, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";

export default function Siswa() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const userRole = currentUser?.role || 'guru';
  const canEdit = ['admin'].includes(userRole);

  const [formData, setFormData] = useState({
    nis: '',
    nama: '',
    jenis_kelamin: 'Laki-laki',
    kelas_id: '',
    nama_kelas: '',
    tanggal_lahir: '',
    alamat: '',
    nama_ortu: '',
    no_telp_ortu: '',
    status: 'Aktif'
  });

  const { data: siswaList = [], isLoading } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.list('nama'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Siswa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Siswa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Hapus semua data terkait siswa secara cascade
      const [absensiData, nilaiData, pelanggaranData, prestasiData, uksData] = await Promise.all([
        base44.entities.Absensi.filter({ siswa_id: id }),
        base44.entities.Nilai.filter({ siswa_id: id }),
        base44.entities.Pelanggaran.filter({ siswa_id: id }),
        base44.entities.Prestasi.filter({ siswa_id: id }),
        base44.entities.UKS.filter({ siswa_id: id }),
      ]);
      await Promise.all([
        ...absensiData.map(r => base44.entities.Absensi.delete(r.id)),
        ...nilaiData.map(r => base44.entities.Nilai.delete(r.id)),
        ...pelanggaranData.map(r => base44.entities.Pelanggaran.delete(r.id)),
        ...prestasiData.map(r => base44.entities.Prestasi.delete(r.id)),
        ...uksData.map(r => base44.entities.UKS.delete(r.id)),
      ]);
      return base44.entities.Siswa.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      queryClient.invalidateQueries({ queryKey: ['absensi'] });
      queryClient.invalidateQueries({ queryKey: ['nilai'] });
      queryClient.invalidateQueries({ queryKey: ['pelanggaran'] });
      queryClient.invalidateQueries({ queryKey: ['prestasi'] });
      queryClient.invalidateQueries({ queryKey: ['uks'] });
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

  const handleDownloadTemplate = () => {
    const headers = ['NIS', 'Nama', 'Jenis Kelamin', 'Kelas', 'Tanggal Lahir', 'Alamat', 'Nama Orang Tua', 'No Telp Orang Tua'];
    const csvContent = headers.join(',') + '\n' + '12345,Contoh Siswa,Laki-laki,7A,2010-01-01,Jl. Contoh,Nama Ortu,08123456789';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_siswa.csv';
    a.click();
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvImporting(true);
    const text = await file.text();
    const rows = text.split('\n').slice(1).filter(row => row.trim());

    // Ambil data kelas terbaru
    const currentKelas = await base44.entities.Kelas.list('nama_kelas');
    const classMap = new Map();
    currentKelas.forEach(k => classMap.set(k.nama_kelas, k.id));

    for (const row of rows) {
      const [nis, nama, jenis_kelamin, nama_kelas, tanggal_lahir, alamat, nama_ortu, no_telp_ortu] = row.split(',').map(s => s.trim());

      // Jika kelas belum ada, buat otomatis
      if (nama_kelas && !classMap.has(nama_kelas)) {
        // Ekstrak tingkat dari nama kelas (misal: "7A" -> "7", "8B" -> "8")
        const tingkat = nama_kelas.match(/\d+/)?.[0] || '7';
        const newClass = await base44.entities.Kelas.create({
          nama_kelas,
          tingkat,
          tahun_ajaran: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1)
        });
        classMap.set(nama_kelas, newClass.id);
      }

      await createMutation.mutateAsync({
        nis, nama, jenis_kelamin, nama_kelas,
        kelas_id: classMap.get(nama_kelas) || '',
        tanggal_lahir, alamat, nama_ortu, no_telp_ortu,
        status: 'Aktif'
      });
    }

    setCsvImporting(false);
    queryClient.invalidateQueries({ queryKey: ['siswa'] });
    queryClient.invalidateQueries({ queryKey: ['kelas'] });
  };

  const resetForm = () => {
    setFormData({
      nis: '',
      nama: '',
      jenis_kelamin: 'Laki-laki',
      kelas_id: '',
      nama_kelas: '',
      tanggal_lahir: '',
      alamat: '',
      nama_ortu: '',
      no_telp_ortu: '',
      status: 'Aktif'
    });
    setEditingData(null);
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (siswa) => {
    setEditingData(siswa);
    setFormData(siswa);
    setIsOpen(true);
  };

  const handleKelasChange = (kelasId) => {
    const kelas = kelasList.find(k => k.id === kelasId);
    if (kelas) {
      setFormData({ ...formData, kelas_id: kelasId, nama_kelas: kelas.nama_kelas });
    }
  };

  const siswaColumns = [
    { key: 'nis', label: 'NIS' },
    { key: 'nama', label: 'Nama Siswa' },
    { 
      key: 'nama_kelas', 
      label: 'Kelas',
      render: (row) => (
        <Badge className={
          row.nama_kelas?.startsWith('7') ? 'bg-blue-100 text-blue-700' :
          row.nama_kelas?.startsWith('8') ? 'bg-purple-100 text-purple-700' :
          'bg-emerald-100 text-emerald-700'
        }>
          {row.nama_kelas}
        </Badge>
      )
    },
    { key: 'jenis_kelamin', label: 'JK' },
    { key: 'nama_ortu', label: 'Nama Orang Tua', render: (row) => row.nama_ortu || '-' },
    { key: 'no_telp_ortu', label: 'No. Telp', render: (row) => row.no_telp_ortu || '-' },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => (
        <Badge className={
          row.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' :
          row.status === 'Lulus' ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-700'
        }>
          {row.status}
        </Badge>
      )
    },
    {
      key: 'aksi',
      label: 'Aksi',
      sortable: false,
      filterable: false,
      render: (row) => canEdit ? (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteClick(row.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <span className="text-xs text-slate-400">-</span>
      )
    }
  ];

  return (
    <>
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Hapus Data Siswa"
        description="Apakah Anda yakin ingin menghapus data siswa ini? Data akan dihapus secara permanen."
      />
      
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              Data Siswa
            </h1>
            <p className="text-slate-500 mt-1">Kelola data siswa aktif</p>
          </div>
          
          {canEdit && (
            <div className="flex gap-2">
              <Button onClick={handleDownloadTemplate} variant="outline">
                <Download className="w-4 h-4 mr-2" /> Template
              </Button>
              <label>
                <Button variant="outline" disabled={csvImporting} asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" /> 
                    {csvImporting ? 'Importing...' : 'Import CSV'}
                  </span>
                </Button>
                <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
              </label>
              <Button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Tambah Siswa
              </Button>
            </div>
          )}
        </div>

        {/* Table with DataTable */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Data Siswa</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={siswaColumns} data={siswaList} pageSize={5} />
          </CardContent>
        </Card>

        {/* Dialog Form */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingData ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>NIS</Label>
                  <Input value={formData.nis} onChange={(e) => setFormData({...formData, nis: e.target.value})} required />
                </div>
                <div>
                  <Label>Nama Lengkap</Label>
                  <Input value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Jenis Kelamin</Label>
                  <Select value={formData.jenis_kelamin} onValueChange={(v) => setFormData({...formData, jenis_kelamin: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kelas</Label>
                  <Select value={formData.kelas_id} onValueChange={handleKelasChange}>
                    <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                    <SelectContent>
                      {kelasList.map(kelas => (
                        <SelectItem key={kelas.id} value={kelas.id}>{kelas.nama_kelas}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!editingData && (
                    <p className="text-xs text-slate-500 mt-1">Pilih kelas yang tersedia. Tambah kelas di Menu Kelas.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal Lahir</Label>
                  <Input type="date" value={formData.tanggal_lahir} onChange={(e) => setFormData({...formData, tanggal_lahir: e.target.value})} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aktif">Aktif</SelectItem>
                      <SelectItem value="Lulus">Lulus</SelectItem>
                      <SelectItem value="Pindah">Pindah</SelectItem>
                      <SelectItem value="Keluar">Keluar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Alamat</Label>
                <Input value={formData.alamat} onChange={(e) => setFormData({...formData, alamat: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Orang Tua/Wali</Label>
                  <Input value={formData.nama_ortu} onChange={(e) => setFormData({...formData, nama_ortu: e.target.value})} />
                </div>
                <div>
                  <Label>No. Telp Orang Tua</Label>
                  <Input value={formData.no_telp_ortu} onChange={(e) => setFormData({...formData, no_telp_ortu: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {editingData ? 'Simpan Perubahan' : 'Tambah Siswa'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </>
  );
}