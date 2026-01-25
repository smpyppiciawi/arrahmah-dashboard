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
import { Plus, Search, Edit2, Trash2, Stethoscope } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";

export default function UKSTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
    jam_masuk: '', jam_keluar: '', keluhan: '', diagnosa: '',
    penanganan: '', suhu_badan: '', status: 'Di UKS', keterangan: ''
  });

  const { data: uksList = [] } = useQuery({
    queryKey: ['uks'],
    queryFn: () => base44.entities.UKS.list('-tanggal'),
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
    mutationFn: (data) => base44.entities.UKS.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uks'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UKS.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uks'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UKS.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['uks'] }),
  });

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
      jam_masuk: '', jam_keluar: '', keluhan: '', diagnosa: '',
      penanganan: '', suhu_badan: '', status: 'Di UKS', keterangan: ''
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

  const uksColumns = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'nama_siswa', label: 'Siswa' },
    { key: 'nama_kelas', label: 'Kelas', render: (row) => <Badge variant="secondary" className="bg-blue-100 text-blue-700">{row.nama_kelas}</Badge> },
    { key: 'jam_masuk', label: 'Jam Masuk' },
    { key: 'jam_keluar', label: 'Jam Keluar', render: (row) => row.jam_keluar || '-' },
    { key: 'keluhan', label: 'Keluhan', render: (row) => <span className="max-w-xs truncate block">{row.keluhan}</span> },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => (
        <Badge className={
          row.status === 'Di UKS' ? 'bg-amber-100 text-amber-700' :
          row.status === 'Pulang' ? 'bg-red-100 text-red-700' :
          'bg-emerald-100 text-emerald-700'
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
              <CardTitle className="flex items-center gap-2 text-rose-700">
                <Stethoscope className="w-5 h-5" />
                Data Kunjungan UKS
              </CardTitle>
            </div>
            <Button onClick={() => setIsOpen(true)} className="bg-rose-600 hover:bg-rose-700">
              <Plus className="w-4 h-4 mr-2" /> Tambah Kunjungan
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Data Kunjungan UKS</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={uksColumns} data={uksList} pageSize={5} />
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Kunjungan' : 'Tambah Kunjungan Baru'}</DialogTitle>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Jam Masuk</Label>
                <Input type="time" value={formData.jam_masuk} onChange={(e) => setFormData({...formData, jam_masuk: e.target.value})} required />
              </div>
              <div>
                <Label>Jam Keluar</Label>
                <Input type="time" value={formData.jam_keluar} onChange={(e) => setFormData({...formData, jam_keluar: e.target.value})} />
              </div>
              <div>
                <Label>Suhu Badan (°C)</Label>
                <Input value={formData.suhu_badan} onChange={(e) => setFormData({...formData, suhu_badan: e.target.value})} placeholder="36.5" />
              </div>
            </div>
            <div>
              <Label>Keluhan</Label>
              <Textarea value={formData.keluhan} onChange={(e) => setFormData({...formData, keluhan: e.target.value})} required />
            </div>
            <div>
              <Label>Diagnosa Awal</Label>
              <Textarea value={formData.diagnosa} onChange={(e) => setFormData({...formData, diagnosa: e.target.value})} />
            </div>
            <div>
              <Label>Penanganan</Label>
              <Textarea value={formData.penanganan} onChange={(e) => setFormData({...formData, penanganan: e.target.value})} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Di UKS">Di UKS</SelectItem>
                  <SelectItem value="Pulang">Pulang</SelectItem>
                  <SelectItem value="Kembali ke Kelas">Kembali ke Kelas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Keterangan</Label>
              <Textarea value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
              <Button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700">
                {editing ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}