import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { GraduationCap, Plus, Edit2, Trash2, Download, Upload, LogOut, Undo2, DatabaseZap } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import AlasanKeluarDialog from "@/components/guru/AlasanKeluarDialog";
import FloatingAddButton from "@/components/ui/FloatingAddButton";
import { useToast } from "@/components/ui/use-toast";

const fmtTanggal = (d) => {
  if (!d) return '-';
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return y && m && day ? `${day}/${m}/${y}` : d;
};

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
  const [activeTab, setActiveTab] = useState('aktif');
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [keluarDialogOpen, setKeluarDialogOpen] = useState(false);
  const [reactivateConfirmOpen, setReactivateConfirmOpen] = useState(false);
  const [reactivateId, setReactivateId] = useState(null);
  const [backfilling, setBackfilling] = useState(false);
  const { toast } = useToast();
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
  const isAdmin = userRole === 'admin';

  const [formData, setFormData] = useState({
    nuptk: '',
    nrks: '',
    nama: '',
    gelar_depan: '',
    gelar_belakang: '',
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

  // Pegawai Aktif vs Pegawai Keluar dipisah berdasarkan status
  const aktifList = guruList.filter(g => g.status !== 'Keluar');
  const keluarList = guruList.filter(g => g.status === 'Keluar');

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

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await base44.functions.invoke('backfillGuruId', {});
      const summary = res.data?.summary;
      toast({
        title: 'Backfill Relasi Pegawai Selesai',
        description: `Kelas disinkronkan: ${summary?.entities?.Kelas || 0} record. Detail lengkap di log.`,
      });
    } catch (error) {
      toast({
        title: 'Backfill Gagal',
        description: error.message || 'Terjadi kesalahan saat backfill.',
        variant: 'destructive',
      });
    }
    setBackfilling(false);
  };

  const handleDownloadTemplate = () => {
    const headers = ['NUPTK', 'Nama', 'Jenis Kelamin', 'Jabatan', 'Mata Pelajaran', 'No Telp', 'Email'];
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
      const [nuptk, nama, jenis_kelamin, jabatan, mapel, no_telp, email] = row.split(',').map(s => s.trim());
      await createMutation.mutateAsync({
        nuptk, nama, jenis_kelamin, jabatan: jabatan || 'Guru Mata Pelajaran',
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
      nuptk: '',
      nrks: '',
      nama: '',
      gelar_depan: '',
      gelar_belakang: '',
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

  // Simpan form: jika status berubah menjadi Keluar -> tampilkan popup Alasan Keluar dulu
  const handleSubmit = (e) => {
    e.preventDefault();
    // Nama & gelar disatukan menjadi 1 kalimat Nama Lengkap — dipakai seluruh sistem (Rapor, Legger, dll.)
    const namaLengkap = [formData.gelar_depan?.trim(), formData.nama?.trim(), formData.gelar_belakang?.trim()].filter(Boolean).join(' ');
    const dataToSubmit = { ...formData, nama: namaLengkap, mapel: selectedMapel };
    if (editingData?.status === 'Keluar' && dataToSubmit.status !== 'Keluar') {
      // Kembali dari Keluar ke aktif: bersihkan data keluar
      dataToSubmit.alasan_keluar = '';
      dataToSubmit.tanggal_keluar = '';
    }
    if (dataToSubmit.status === 'Keluar' && editingData?.status !== 'Keluar') {
      setPendingSubmit(dataToSubmit);
      setKeluarDialogOpen(true);
      setIsOpen(false);
      return;
    }
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  // Konfirmasi popup Alasan Keluar -> simpan dengan alasan & tanggal keluar
  const handleKeluarConfirm = (keluarData) => {
    if (!pendingSubmit) return;
    const finalData = { ...pendingSubmit, ...keluarData };
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: finalData });
    } else {
      createMutation.mutate(finalData);
    }
    setPendingSubmit(null);
    setKeluarDialogOpen(false);
  };

  const handleEdit = (guru) => {
    setEditingData(guru);
    // Pisahkan gelar yang sudah tergabung di Nama Lengkap agar bisa diedit terpisah
    let namaInti = guru.nama || '';
    const gd = guru.gelar_depan || '';
    const gb = guru.gelar_belakang || '';
    if (gd && namaInti.startsWith(gd + ' ')) namaInti = namaInti.slice(gd.length + 1);
    if (gb && namaInti.endsWith(' ' + gb)) namaInti = namaInti.slice(0, namaInti.length - gb.length - 1);
    setFormData({ ...guru, nama: namaInti, gelar_depan: gd, gelar_belakang: gb });
    setSelectedMapel(guru.mapel || []);
    setIsOpen(true);
  };

  const handleReactivateClick = (id) => {
    setReactivateId(id);
    setReactivateConfirmOpen(true);
  };

  const confirmReactivate = () => {
    if (reactivateId) {
      updateMutation.mutate({
        id: reactivateId,
        data: { status: 'Aktif', alasan_keluar: '', tanggal_keluar: '' }
      });
    }
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
    { key: 'nuptk', label: 'NUPTK', render: (row) => row.nuptk || '-' },
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
          'bg-slate-200 text-slate-600'
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

  const keluarColumns = [
    { key: 'nuptk', label: 'NUPTK', render: (row) => row.nuptk || '-' },
    { key: 'nama', label: 'Nama' },
    {
      key: 'jabatan',
      label: 'Jabatan',
      render: (row) => row.jabatan || 'Guru Mata Pelajaran'
    },
    { key: 'tanggal_keluar', label: 'Tanggal Keluar', render: (row) => fmtTanggal(row.tanggal_keluar) },
    {
      key: 'alasan_keluar',
      label: 'Alasan Keluar',
      render: (row) => row.alasan_keluar ? (
        <Badge className="bg-rose-100 text-rose-700">{row.alasan_keluar}</Badge>
      ) : <span className="text-slate-400 text-xs">-</span>
    },
    {
      key: 'aksi',
      label: 'Aksi',
      sortable: false,
      filterable: false,
      render: (row) => canEdit ? (
        <Button
          size="sm"
          variant="outline"
          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          onClick={() => handleReactivateClick(row.id)}
        >
          <Undo2 className="w-3.5 h-3.5 mr-1" /> Kembali Aktif
        </Button>
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
      <ConfirmDialog
        open={reactivateConfirmOpen}
        onOpenChange={setReactivateConfirmOpen}
        onConfirm={confirmReactivate}
        title="Kembalikan Pegawai Menjadi Aktif"
        description="Pegawai ini akan dikembalikan ke daftar Pegawai Aktif. Lanjutkan?"
      />
      <AlasanKeluarDialog
        open={keluarDialogOpen}
        onOpenChange={setKeluarDialogOpen}
        namaPegawai={pendingSubmit?.nama}
        onConfirm={handleKeluarConfirm}
        saving={createMutation.isPending || updateMutation.isPending}
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
              {isAdmin && (
                <Button onClick={handleBackfill} variant="outline" size="sm" disabled={backfilling}>
                  <DatabaseZap className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{backfilling ? 'Menyinkronkan...' : 'Sinkron Relasi'}</span>
                </Button>
              )}
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

            </div>
          )}
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Data Guru & Pegawai</CardTitle>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="aktif" className="gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Pegawai Aktif
                    <Badge variant="secondary" className="ml-1">{aktifList.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="keluar" className="gap-2">
                    <LogOut className="w-4 h-4" />
                    Pegawai Keluar
                    <Badge variant="secondary" className="ml-1">{keluarList.length}</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === 'aktif' ? (
              <DataTable columns={guruColumns} data={aktifList} pageSize={5} />
            ) : (
              keluarList.length > 0 ? (
                <DataTable columns={keluarColumns} data={keluarList} pageSize={5} />
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Belum ada pegawai keluar.
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Dialog Form */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingData ? 'Edit Data' : 'Tambah Data Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>NUPTK</Label>
                  <Input value={formData.nuptk} onChange={(e) => setFormData({...formData, nuptk: e.target.value})} />
                </div>
                {formData.jabatan === 'Kepala Sekolah' && (
                  <div>
                    <Label>NRKS</Label>
                    <Input value={formData.nrks || ''} onChange={(e) => setFormData({...formData, nrks: e.target.value})} placeholder="Nomor Register Kepala Sekolah" />
                  </div>
                )}
                <div>
                  <Label>Nama Lengkap</Label>
                  <Input value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} required />
                </div>
                <div>
                  <Label>Gelar Depan</Label>
                  <Input value={formData.gelar_depan || ''} onChange={(e) => setFormData({...formData, gelar_depan: e.target.value})} placeholder="cth: H., Hj., Dr." />
                </div>
                <div>
                  <Label>Gelar Belakang</Label>
                  <Input value={formData.gelar_belakang || ''} onChange={(e) => setFormData({...formData, gelar_belakang: e.target.value})} placeholder="cth: S.Pd., M.Pd." />
                </div>
              </div>
              {[formData.gelar_depan?.trim(), formData.nama?.trim(), formData.gelar_belakang?.trim()].filter(Boolean).length > 1 && (
                <p className="text-xs text-violet-600 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                  Nama Lengkap gabungan yang tersimpan: <span className="font-semibold">{[formData.gelar_depan?.trim(), formData.nama?.trim(), formData.gelar_belakang?.trim()].filter(Boolean).join(' ')}</span>
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <SelectItem value="Keluar">Keluar</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.status === 'Keluar' && editingData?.status !== 'Keluar' && (
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 mt-2">
                      Saat disimpan, popup Alasan Keluar akan muncul untuk melengkapi data.
                    </p>
                  )}
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
                <Select
                  value={formData.tugas_tambahan === '' || !['Waka Kurikulum','Waka Kesiswaan','Pembina Osis','BP/BK','Bendahara','Operator'].includes(formData.tugas_tambahan) && formData.tugas_tambahan ? 'Lainnya' : (formData.tugas_tambahan || '_none')}
                  onValueChange={(v) => {
                    if (v === '_none') setFormData({...formData, tugas_tambahan: ''});
                    else if (v === 'Lainnya') setFormData({...formData, tugas_tambahan: 'Lainnya'});
                    else setFormData({...formData, tugas_tambahan: v});
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih jika ada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Tidak Ada</SelectItem>
                    <SelectItem value="Waka Kurikulum">Waka Kurikulum</SelectItem>
                    <SelectItem value="Waka Kesiswaan">Waka Kesiswaan</SelectItem>
                    <SelectItem value="Pembina Osis">Pembina Osis</SelectItem>
                    <SelectItem value="BP/BK">BP/BK</SelectItem>
                    <SelectItem value="Bendahara">Bendahara</SelectItem>
                    <SelectItem value="Operator">Operator</SelectItem>
                    <SelectItem value="Lainnya">Lainnya...</SelectItem>
                  </SelectContent>
                </Select>
                {(formData.tugas_tambahan === 'Lainnya' || (formData.tugas_tambahan && !['','Waka Kurikulum','Waka Kesiswaan','Pembina Osis','BP/BK','Bendahara','Operator'].includes(formData.tugas_tambahan))) && (
                  <Input
                    className="mt-2"
                    placeholder="Isi tugas tambahan..."
                    value={formData.tugas_tambahan === 'Lainnya' ? '' : formData.tugas_tambahan}
                    onChange={(e) => setFormData({...formData, tugas_tambahan: e.target.value})}
                  />
                )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    {canEdit && <FloatingAddButton onClick={() => setIsOpen(true)} label="Tambah Data" color="purple" icon={Plus} />}
    </>
  );
}