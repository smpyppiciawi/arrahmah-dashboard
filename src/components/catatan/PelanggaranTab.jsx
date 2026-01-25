import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit2, Trash2, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";

export default function PelanggaranTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
    jenis_pelanggaran: 'Ringan', kategori: 'Keterlambatan', uraian: '',
    poin: 5, sanksi: '', pelapor: '', status: 'Proses'
  });

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setFormData(prev => ({ ...prev, pelapor: user.full_name }));
    };
    fetchUser();
  }, []);

  const { data: pelanggaranList = [] } = useQuery({
    queryKey: ['pelanggaran'],
    queryFn: () => base44.entities.Pelanggaran.list('-tanggal'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pelanggaran.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pelanggaran'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pelanggaran.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pelanggaran'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pelanggaran.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pelanggaran'] }),
  });

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
      jenis_pelanggaran: 'Ringan', kategori: 'Keterlambatan', uraian: '',
      poin: 5, sanksi: '', pelapor: currentUser?.full_name || '', status: 'Proses'
    });
    setEditing(null);
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setFormData(item);
    setIsOpen(true);
  };

  const handleSiswaChange = (siswaId) => {
    const siswa = siswaList.find(s => s.id === siswaId);
    if (siswa) {
      setFormData({
        ...formData,
        siswa_id: siswa.id,
        nis: siswa.nis,
        nama_siswa: siswa.nama,
        kelas_id: siswa.kelas_id,
        nama_kelas: siswa.nama_kelas
      });
    }
  };

  const totalPoinBySiswa = {};
  pelanggaranList.forEach(item => {
    if (item.siswa_id) {
      totalPoinBySiswa[item.siswa_id] = (totalPoinBySiswa[item.siswa_id] || 0) + (item.poin || 0);
    }
  });

  const pelanggaranColumns = [
    { key: 'tanggal', label: 'Tanggal' },
    { 
      key: 'nama_siswa', 
      label: 'Siswa',
      render: (row) => (
        <div>
          {row.nama_siswa}
          {totalPoinBySiswa[row.siswa_id] >= 100 && (
            <Badge className="ml-2 bg-red-100 text-red-700">⚠ {totalPoinBySiswa[row.siswa_id]} poin</Badge>
          )}
        </div>
      )
    },
    { key: 'nama_kelas', label: 'Kelas', render: (row) => <Badge variant="secondary" className="bg-blue-100 text-blue-700">{row.nama_kelas}</Badge> },
    { 
      key: 'kategori', 
      label: 'Kategori',
      render: (row) => (
        <Badge className={
          row.jenis_pelanggaran === 'Berat' ? 'bg-red-100 text-red-700' :
          row.jenis_pelanggaran === 'Sedang' ? 'bg-orange-100 text-orange-700' :
          'bg-yellow-100 text-yellow-700'
        }>
          {row.kategori}
        </Badge>
      )
    },
    { key: 'uraian', label: 'Uraian', render: (row) => <span className="max-w-xs truncate block">{row.uraian}</span> },
    { key: 'poin', label: 'Poin', render: (row) => <Badge className="bg-slate-100 text-slate-700">{row.poin} poin</Badge> },
    { key: 'status', label: 'Status', render: (row) => <Badge className={row.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{row.status}</Badge> },
    {
      key: 'aksi',
      label: 'Aksi',
      sortable: false,
      filterable: false,
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteMutation.mutate(row.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                Data Pelanggaran Siswa
              </CardTitle>
            </div>
            <Button onClick={() => setIsOpen(true)} className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" /> Tambah Pelanggaran
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Data Pelanggaran Siswa</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={pelanggaranColumns} data={pelanggaranList} pageSize={5} />
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Pelanggaran' : 'Tambah Pelanggaran Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal</Label>
                <Input type="date" value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} required />
              </div>
              <div>
                <Label>Pilih Siswa</Label>
                <Select value={formData.siswa_id} onValueChange={handleSiswaChange}>
                  <SelectTrigger><SelectValue placeholder="Pilih Siswa" /></SelectTrigger>
                  <SelectContent>
                    {siswaList.map(siswa => (
                      <SelectItem key={siswa.id} value={siswa.id}>
                        {siswa.nama} - {siswa.nama_kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jenis Pelanggaran</Label>
                <Select value={formData.jenis_pelanggaran} onValueChange={(v) => setFormData({...formData, jenis_pelanggaran: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ringan">Ringan</SelectItem>
                    <SelectItem value="Sedang">Sedang</SelectItem>
                    <SelectItem value="Berat">Berat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kategori</Label>
                <Select value={formData.kategori} onValueChange={(v) => setFormData({...formData, kategori: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Keterlambatan">Keterlambatan</SelectItem>
                    <SelectItem value="Pakaian/Atribut">Pakaian/Atribut</SelectItem>
                    <SelectItem value="Sikap/Perilaku">Sikap/Perilaku</SelectItem>
                    <SelectItem value="Akademik">Akademik</SelectItem>
                    <SelectItem value="Absensi">Absensi</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Uraian Pelanggaran</Label>
              <Textarea value={formData.uraian} onChange={(e) => setFormData({...formData, uraian: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Poin</Label>
                <Input type="number" value={formData.poin} onChange={(e) => setFormData({...formData, poin: parseInt(e.target.value)})} required />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Proses">Proses</SelectItem>
                    <SelectItem value="Selesai">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Sanksi</Label>
              <Textarea value={formData.sanksi} onChange={(e) => setFormData({...formData, sanksi: e.target.value})} />
            </div>
            <div>
              <Label>Pelapor</Label>
              <Input value={formData.pelapor} onChange={(e) => setFormData({...formData, pelapor: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">
                {editing ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}