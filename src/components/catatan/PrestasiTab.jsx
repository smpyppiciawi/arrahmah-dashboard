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
import { Plus, Search, Edit2, Trash2, Trophy, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";

export default function PrestasiTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
    jenis_prestasi: 'Akademik', kategori: 'Juara 1', nama_prestasi: '',
    tingkat: 'Sekolah', penyelenggara: '', keterangan: '', file_sertifikat: ''
  });

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: prestasiList = [] } = useQuery({
    queryKey: ['prestasi'],
    queryFn: () => base44.entities.Prestasi.list('-tanggal'),
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
    mutationFn: (data) => base44.entities.Prestasi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prestasi'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Prestasi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prestasi'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Prestasi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prestasi'] }),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, file_sertifikat: file_url });
    }
  };

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
      jenis_prestasi: 'Akademik', kategori: 'Juara 1', nama_prestasi: '',
      tingkat: 'Sekolah', penyelenggara: '', keterangan: '', file_sertifikat: ''
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

  const categoryColors = {
    'Juara 1': 'bg-yellow-100 text-yellow-800',
    'Juara 2': 'bg-slate-100 text-slate-800',
    'Juara 3': 'bg-orange-100 text-orange-800',
    'Finalis': 'bg-blue-100 text-blue-800',
    'Peserta': 'bg-emerald-100 text-emerald-800'
  };

  const prestasiColumns = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'nama_siswa', label: 'Siswa' },
    { key: 'nama_kelas', label: 'Kelas', render: (row) => <Badge variant="secondary" className="bg-blue-100 text-blue-700">{row.nama_kelas}</Badge> },
    { key: 'nama_prestasi', label: 'Prestasi' },
    { key: 'jenis_prestasi', label: 'Jenis', render: (row) => <Badge className={row.jenis_prestasi === 'Akademik' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}>{row.jenis_prestasi}</Badge> },
    { key: 'kategori', label: 'Kategori', render: (row) => <Badge className={categoryColors[row.kategori]}>{row.kategori}</Badge> },
    { key: 'tingkat', label: 'Tingkat' },
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
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <Trophy className="w-5 h-5" />
                Data Prestasi Siswa
              </CardTitle>
            </div>
            <Button onClick={() => setIsOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Tambah Prestasi
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Data Prestasi Siswa</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={prestasiColumns} data={prestasiList} pageSize={5} />
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Prestasi' : 'Tambah Prestasi Baru'}</DialogTitle>
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
                <Label>Jenis Prestasi</Label>
                <Select value={formData.jenis_prestasi} onValueChange={(v) => setFormData({...formData, jenis_prestasi: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Akademik">Akademik</SelectItem>
                    <SelectItem value="Non-Akademik">Non-Akademik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kategori</Label>
                <Select value={formData.kategori} onValueChange={(v) => setFormData({...formData, kategori: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Juara 1">Juara 1</SelectItem>
                    <SelectItem value="Juara 2">Juara 2</SelectItem>
                    <SelectItem value="Juara 3">Juara 3</SelectItem>
                    <SelectItem value="Finalis">Finalis</SelectItem>
                    <SelectItem value="Peserta">Peserta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Nama Prestasi/Lomba</Label>
              <Input value={formData.nama_prestasi} onChange={(e) => setFormData({...formData, nama_prestasi: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tingkat</Label>
                <Select value={formData.tingkat} onValueChange={(v) => setFormData({...formData, tingkat: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sekolah">Sekolah</SelectItem>
                    <SelectItem value="Kecamatan">Kecamatan</SelectItem>
                    <SelectItem value="Kabupaten">Kabupaten</SelectItem>
                    <SelectItem value="Provinsi">Provinsi</SelectItem>
                    <SelectItem value="Nasional">Nasional</SelectItem>
                    <SelectItem value="Internasional">Internasional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Penyelenggara</Label>
                <Input value={formData.penyelenggara} onChange={(e) => setFormData({...formData, penyelenggara: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Keterangan</Label>
              <Textarea value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} />
            </div>
            <div>
              <Label>Upload Sertifikat</Label>
              <Input type="file" onChange={handleFileUpload} accept="image/*,.pdf" />
              {formData.file_sertifikat && (
                <p className="text-xs text-emerald-600 mt-1">File berhasil diupload</p>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {editing ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}