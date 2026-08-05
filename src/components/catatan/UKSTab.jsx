import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Stethoscope, Filter, GraduationCap, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";
import SiswaLulusRecordsDialog from './SiswaLulusRecordsDialog';
import WaSendDialog, { buildWaTargets } from './WaSendDialog';

export default function UKSTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [lulusOpen, setLulusOpen] = useState(false);
  const [waTarget, setWaTarget] = useState(null);
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
    queryFn: () => base44.entities.Siswa.list(),
  });

  const siswaMap = useMemo(() => {
    const map = {};
    siswaList.forEach(s => { map[s.id] = s; });
    return map;
  }, [siswaList]);

  const activeSiswaIds = useMemo(() => new Set(siswaList.filter(s => s.status === 'Aktif').map(s => s.id)), [siswaList]);

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
    staleTime: 60000,
  });

  // Filter siswa berdasarkan kelas yang dipilih, urut abjad
  const filteredSiswa = useMemo(() => {
    if (!selectedKelas) return [];
    return siswaList
      .filter(s => s.kelas_id === selectedKelas && s.status === 'Aktif')
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaList, selectedKelas]);

  // Filter UKS berdasarkan tanggal
  const filteredUksList = useMemo(() => {
    return uksList.filter(u => {
      if (!activeSiswaIds.has(u.siswa_id)) return false;
      if (filterDateFrom && u.tanggal < filterDateFrom) return false;
      if (filterDateTo && u.tanggal > filterDateTo) return false;
      return true;
    });
  }, [uksList, filterDateFrom, filterDateTo]);

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
    setSelectedKelas('');
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
    setSelectedKelas(item.kelas_id);
    setFormData(item);
    setIsOpen(true);
  };

  const handleKelasChange = (kelasId) => {
    setSelectedKelas(kelasId);
    setFormData({
      ...formData,
      siswa_id: '', nis: '', nama_siswa: '', kelas_id: kelasId,
      nama_kelas: kelasList.find(k => k.id === kelasId)?.nama_kelas || ''
    });
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

  const buildUksMessage = (r) => {
    return `*NOTIFIKASI KUNJUNGAN UKS*\n\nNama: ${r.nama_siswa}\nKelas: ${r.nama_kelas}\nTanggal: ${r.tanggal}\nJam Masuk: ${r.jam_masuk || '-'}\nJam Keluar: ${r.jam_keluar || '-'}\nKeluhan: ${r.keluhan || '-'}\nDiagnosa: ${r.diagnosa || '-'}\nPenanganan: ${r.penanganan || '-'}\nSuhu Badan: ${r.suhu_badan ? r.suhu_badan + '°C' : '-'}\nStatus: ${r.status}\nKeterangan: ${r.keterangan || '-'}`;
  };

  const handleSendWa = (row) => {
    const siswa = siswaMap[row.siswa_id];
    const kelas = kelasList.find(k => k.id === row.kelas_id);
    setWaTarget({ row, targets: buildWaTargets(siswa, kelas, guruList), message: buildUksMessage(row) });
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
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="text-green-600" onClick={() => handleSendWa(row)} title="Kirim WA Gateway">
            <Send className="w-4 h-4" />
          </Button>
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
            <div className="flex gap-2">
              <Button onClick={() => setLulusOpen(true)} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                <GraduationCap className="w-4 h-4 mr-2" /> Siswa Lulus/Keluar
              </Button>
              <Button onClick={() => setIsOpen(true)} className="bg-rose-600 hover:bg-rose-700">
                <Plus className="w-4 h-4 mr-2" /> Tambah Kunjungan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">Filter Tanggal:</span>
            <Input 
              type="date" 
              value={filterDateFrom} 
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-40"
              placeholder="Dari"
            />
            <span className="text-slate-400">s/d</span>
            <Input 
              type="date" 
              value={filterDateTo} 
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-40"
              placeholder="Sampai"
            />
            {(filterDateFrom || filterDateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}>
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Data Kunjungan UKS</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={uksColumns} data={filteredUksList} pageSize={5} />
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
                <Label>Pilih Kelas</Label>
                <Select value={selectedKelas} onValueChange={handleKelasChange}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kelas Dulu" /></SelectTrigger>
                  <SelectContent>
                    {kelasList.map(kelas => (
                      <SelectItem key={kelas.id} value={kelas.id}>
                        {kelas.nama_kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Pilih Siswa</Label>
              <Select value={formData.siswa_id} onValueChange={handleSiswaChange} disabled={!selectedKelas}>
                <SelectTrigger><SelectValue placeholder={selectedKelas ? "Pilih Siswa" : "Pilih kelas terlebih dahulu"} /></SelectTrigger>
                <SelectContent>
                  {filteredSiswa.map(siswa => (
                    <SelectItem key={siswa.id} value={siswa.id}>
                      {siswa.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <SiswaLulusRecordsDialog
        open={lulusOpen}
        onOpenChange={setLulusOpen}
        entityName="UKS"
        queryKey="uks-lulus"
        title="Data UKS Siswa Lulus/Keluar"
        extraColumns={[
          { key: 'keluhan', label: 'Keluhan', render: (row) => <span className="max-w-xs truncate block">{row.keluhan}</span> },
          { key: 'status', label: 'Status' },
        ]}
      />

      {waTarget && (
        <WaSendDialog
          open={!!waTarget}
          onOpenChange={(open) => !open && setWaTarget(null)}
          targets={waTarget.targets}
          message={waTarget.message}
          onSent={() => {
            queryClient.invalidateQueries({ queryKey: ['uks'] });
          }}
        />
      )}
    </div>
  );
}