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
import { GraduationCap, Plus, Edit2, Trash2, Download, Upload } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";

// Default Mapel list - akan diambil dari database

export default function Guru() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMapel, setFilterMapel] = useState('all');
  const [selectedMapel, setSelectedMapel] = useState([]);
  const [newMapel, setNewMapel] = useState('');
  const [customMapelList, setCustomMapelList] = useState([]);
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
  const canEdit = ['admin', 'tu'].includes(userRole);

  const [formData, setFormData] = useState({
    nip: '',
    nama: '',
    jenis_kelamin: 'Laki-laki',
    jabatan: 'Guru Mata Pelajaran',
    tugas_tambahan: '',
    mapel: [],
    no_telp: '',
    email: '',
    status: 'Aktif'
  });

  const { data: guruList = [], isLoading } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: mapelList = [] } = useQuery({
    queryKey: ['mapel'],
    queryFn: () => base44.entities.Mapel.list('nama'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Guru.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guru'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Guru.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guru'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Guru.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guru'] });
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
    const headers = ['NIP', 'Nama', 'Jenis Kelamin', 'Jabatan', 'Mata Pelajaran', 'No Telp', 'Email'];
    const csvContent = headers.join(',') + '\n' + '123456,Contoh Guru,Laki-laki,Guru Mata Pelajaran,Matematika;IPA,08123456789,guru@email.com';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_guru.csv';
    a.click();
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvImporting(true);
    const text = await file.text();
    const rows = text.split('\n').slice(1).filter(row => row.trim());

    for (const row of rows) {
      const [nip, nama, jenis_kelamin, jabatan, mapel, no_telp, email] = row.split(',').map(s => s.trim());
      await createMutation.mutateAsync({
        nip, nama, jenis_kelamin, jabatan: jabatan || 'Guru Mata Pelajaran',
        mapel: mapel ? mapel.split(';') : [],
        no_telp, email,
        status: 'Aktif'
      });
    }

    setCsvImporting(false);
    queryClient.invalidateQueries({ queryKey: ['guru'] });
  };

  const resetForm = () => {
    setFormData({
      nip: '',
      nama: '',
      jenis_kelamin: 'Laki-laki',
      jabatan: 'Guru Mata Pelajaran',
      tugas_tambahan: '',
      mapel: [],
      no_telp: '',
      email: '',
      status: 'Aktif'
    });
    setEditingData(null);
    setIsOpen(false);
    setSelectedMapel([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = { ...formData, mapel: selectedMapel };
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleEdit = (guru) => {
    setEditingData(guru);
    setFormData(guru);
    setSelectedMapel(guru.mapel || []);
    setIsOpen(true);
  };

  const handleMapelToggle = (mapel) => {
    setSelectedMapel(prev =>
      prev.includes(mapel) ? prev.filter(m => m !== mapel) : [...prev, mapel]
    );
  };

  const handleAddNewMapel = async () => {
    const mapelName = newMapel.trim();
    if (mapelName) {
      // Cek apakah sudah ada di database
      const existingMapel = mapelList.find(m => m.nama.toLowerCase() === mapelName.toLowerCase());
      if (!existingMapel) {
        await base44.entities.Mapel.create({ nama: mapelName, is_default: false });
        queryClient.invalidateQueries({ queryKey: ['mapel'] });
      }
      
      setSelectedMapel(prev => [...prev, mapelName]);
      setNewMapel('');
    }
  };

  const guruColumns = [
    { key: 'nip', label: 'NIP', render: (row) => row.nip || '-' },
    { key: 'nama', label: 'Nama' },
    { key: 'jenis_kelamin', label: 'JK' },
    { 
      key: 'jabatan', 
      label: 'Jabatan',
      render: (row) => (
        <Badge className={
          row.jabatan === 'Kepala Sekolah' ? 'bg-purple-100 text-purple-700' :
          row.jabatan === 'Guru Mata Pelajaran' ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-700'
        }>
          {row.jabatan || 'Guru Mata Pelajaran'}
        </Badge>
      )
    },
    { 
      key: 'tugas_tambahan', 
      label: 'Tugas Tambahan',
      render: (row) => row.tugas_tambahan ? (
        <Badge className="bg-indigo-100 text-indigo-700">{row.tugas_tambahan}</Badge>
      ) : <span className="text-slate-400 text-xs">-</span>
    },
    { 
      key: 'mapel', 
      label: 'Mata Pelajaran',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.mapel && row.mapel.length > 0 ? (
            row.mapel.slice(0, 2).map((m, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
            ))
          ) : (
            <span className="text-slate-400 text-xs">-</span>
          )}
          {row.mapel && row.mapel.length > 2 && (
            <Badge variant="secondary" className="text-xs">+{row.mapel.length - 2}</Badge>
          )}
        </div>
      )
    },
    { key: 'no_telp', label: 'No. Telp', render: (row) => row.no_telp || '-' },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => (
        <Badge className={
          row.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' :
          row.status === 'Cuti' ? 'bg-amber-100 text-amber-700' :
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
        title="Hapus Data Guru/Pegawai"
        description="Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan."
      />
      
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-violet-500" />
              Data Guru & Pegawai
            </h1>
            <p className="text-slate-500 mt-1">Kelola data guru dan pegawai</p>
          </div>
          
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
                <Download className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Template</span>
              </Button>
              <label>
                <Button variant="outline" disabled={csvImporting} size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">{csvImporting ? 'Importing...' : 'Import CSV'}</span>
                  </span>
                </Button>
                <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
              </label>
              <Button onClick={() => setIsOpen(true)} className="bg-violet-600 hover:bg-violet-700" size="sm">
                <Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Tambah Data</span>
              </Button>
            </div>
          )}
        </div>

        {/* Table with DataTable */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Data Guru & Pegawai</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={guruColumns} data={guruList} pageSize={5} />
          </CardContent>
        </Card>

        {/* Dialog Form */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingData ? 'Edit Data' : 'Tambah Data Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>NIP</Label>
                  <Input value={formData.nip} onChange={(e) => setFormData({...formData, nip: e.target.value})} />
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
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aktif">Aktif</SelectItem>
                      <SelectItem value="Cuti">Cuti</SelectItem>
                      <SelectItem value="Pensiun">Pensiun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Jabatan</Label>
                <Select value={formData.jabatan} onValueChange={(v) => setFormData({...formData, jabatan: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Guru Mata Pelajaran">Guru Mata Pelajaran</SelectItem>
                    <SelectItem value="Kepala Sekolah">Kepala Sekolah</SelectItem>
                    <SelectItem value="Tata Usaha">Tata Usaha</SelectItem>
                    <SelectItem value="Yayasan">Yayasan</SelectItem>
                    <SelectItem value="DKM">DKM</SelectItem>
                    <SelectItem value="Madrasah">Madrasah</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tugas Tambahan</Label>
                <Select value={formData.tugas_tambahan} onValueChange={(v) => setFormData({...formData, tugas_tambahan: v})}>
                  <SelectTrigger><SelectValue placeholder="Pilih jika ada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Tidak Ada</SelectItem>
                    <SelectItem value="Waka Kurikulum">Waka Kurikulum</SelectItem>
                    <SelectItem value="Waka Kesiswaan">Waka Kesiswaan</SelectItem>
                    <SelectItem value="Pembina Osis">Pembina Osis</SelectItem>
                    <SelectItem value="BP/BK">BP/BK</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.jabatan === 'Guru Mata Pelajaran' && (
                <div>
                  <Label>Mata Pelajaran yang Diampu</Label>
                  <div className="border rounded-lg p-3 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {mapelList.map(mapel => (
                        <label key={mapel.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedMapel.includes(mapel.nama)}
                            onChange={() => handleMapelToggle(mapel.nama)}
                            className="rounded"
                          />
                          <span className="text-sm">{mapel.nama}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <Label className="text-xs text-slate-500">Tambah Mata Pelajaran Baru</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={newMapel}
                          onChange={(e) => setNewMapel(e.target.value)}
                          placeholder="Nama Mapel..."
                          className="text-sm"
                        />
                        <Button type="button" size="sm" onClick={handleAddNewMapel} className="bg-slate-600">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>No. Telepon</Label>
                  <Input value={formData.no_telp} onChange={(e) => setFormData({...formData, no_telp: e.target.value})} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700">
                  {editingData ? 'Simpan Perubahan' : 'Tambah Data'}
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