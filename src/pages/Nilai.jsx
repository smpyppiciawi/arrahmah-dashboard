import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Search, Edit2, Trash2 } from "lucide-react";

const MAPEL_LIST = [
  'Bahasa Indonesia', 'Matematika', 'IPA', 'IPS', 'Bahasa Inggris',
  'PKn', 'Pendidikan Agama', 'PJOK', 'Seni Budaya', 'Prakarya', 'TIK'
];

export default function Nilai() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [filterMapel, setFilterMapel] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
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
  const canEdit = ['admin', 'guru'].includes(userRole);

  const [formData, setFormData] = useState({
    siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
    mapel: '', semester: '', tahun_ajaran: '', jenis_penilaian: '',
    kompetensi_bab: '', nilai: '', kkm: 75, status_ketuntasan: ''
  });

  const { data: nilaiList = [], isLoading } = useQuery({
    queryKey: ['nilai'],
    queryFn: () => base44.entities.Nilai.list('-created_date'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Nilai.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nilai'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Nilai.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nilai'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Nilai.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nilai'] }),
  });

  const resetForm = () => {
    setFormData({
      siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
      mapel: '', semester: '', tahun_ajaran: '', jenis_penilaian: '',
      kompetensi_bab: '', nilai: '', kkm: 75, status_ketuntasan: ''
    });
    setEditingData(null);
    setIsOpen(false);
  };

  const handleSiswaChange = (siswaId) => {
    const siswa = siswaList.find(s => s.id === siswaId);
    if (siswa) {
      setFormData({
        ...formData,
        siswa_id: siswaId,
        nis: siswa.nis,
        nama_siswa: siswa.nama,
        kelas_id: siswa.kelas_id,
        nama_kelas: siswa.nama_kelas,
      });
    }
  };

  const handleNilaiChange = (nilai) => {
    const numNilai = Number(nilai);
    const kkm = formData.kkm || 75;
    setFormData({
      ...formData,
      nilai: numNilai,
      status_ketuntasan: numNilai >= kkm ? 'Tuntas' : 'Belum Tuntas'
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, nilai: Number(formData.nilai), kkm: Number(formData.kkm) };
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (data) => {
    setEditingData(data);
    setFormData(data);
    setIsOpen(true);
  };

  const filteredData = nilaiList.filter(item => {
    const matchSearch = item.nama_siswa?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.nis?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKelas = filterKelas === 'all' || item.kelas_id === filterKelas;
    const matchMapel = filterMapel === 'all' || item.mapel === filterMapel;
    return matchSearch && matchKelas && matchMapel;
  });

  // Stats
  const totalTuntas = nilaiList.filter(n => n.status_ketuntasan === 'Tuntas').length;
  const totalBelumTuntas = nilaiList.filter(n => n.status_ketuntasan === 'Belum Tuntas').length;
  const persentaseTuntas = nilaiList.length > 0 ? ((totalTuntas / nilaiList.length) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-amber-500" />
              Data Nilai
            </h1>
            <p className="text-slate-500 mt-1">Kelola nilai dan ketuntasan siswa</p>
          </div>
          
          {canEdit && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Nilai
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingData ? 'Edit Nilai' : 'Input Nilai Baru'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Siswa</Label>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mata Pelajaran</Label>
                    <Select value={formData.mapel} onValueChange={(v) => setFormData({...formData, mapel: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        {MAPEL_LIST.map(mapel => (
                          <SelectItem key={mapel} value={mapel}>{mapel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Jenis Penilaian</Label>
                    <Select value={formData.jenis_penilaian} onValueChange={(v) => setFormData({...formData, jenis_penilaian: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ulangan Harian">Ulangan Harian</SelectItem>
                        <SelectItem value="Tugas">Tugas</SelectItem>
                        <SelectItem value="PTS">PTS</SelectItem>
                        <SelectItem value="PAS">PAS</SelectItem>
                        <SelectItem value="Praktik">Praktik</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Semester</Label>
                    <Select value={formData.semester} onValueChange={(v) => setFormData({...formData, semester: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ganjil">Ganjil</SelectItem>
                        <SelectItem value="Genap">Genap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tahun Ajaran</Label>
                    <Input 
                      value={formData.tahun_ajaran} 
                      onChange={(e) => setFormData({...formData, tahun_ajaran: e.target.value})}
                      placeholder="2024/2025"
                    />
                  </div>
                </div>
                <div>
                  <Label>Kompetensi / Bab</Label>
                  <Input 
                    value={formData.kompetensi_bab} 
                    onChange={(e) => setFormData({...formData, kompetensi_bab: e.target.value})}
                    placeholder="Contoh: Bab 1 - Teks Narasi"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Nilai</Label>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      value={formData.nilai} 
                      onChange={(e) => handleNilaiChange(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>KKM</Label>
                    <Input 
                      type="number"
                      value={formData.kkm} 
                      onChange={(e) => setFormData({...formData, kkm: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className={`mt-2 px-3 py-2 rounded-lg text-center font-medium ${
                      formData.status_ketuntasan === 'Tuntas' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : formData.status_ketuntasan === 'Belum Tuntas'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {formData.status_ketuntasan || '-'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                  <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
                    {editingData ? 'Simpan' : 'Tambah'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm bg-emerald-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{totalTuntas}</p>
              <p className="text-sm text-emerald-600">Tuntas</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-red-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{totalBelumTuntas}</p>
              <p className="text-sm text-red-600">Belum Tuntas</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-blue-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{persentaseTuntas}%</p>
              <p className="text-sm text-blue-600">Ketuntasan</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Cari nama atau NIS..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterKelas} onValueChange={setFilterKelas}>
                <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Kelas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {kelasList.map(kelas => (
                    <SelectItem key={kelas.id} value={kelas.id}>{kelas.nama_kelas}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterMapel} onValueChange={setFilterMapel}>
                <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Mapel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Mapel</SelectItem>
                  {MAPEL_LIST.map(mapel => (
                    <SelectItem key={mapel} value={mapel}>{mapel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Siswa</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-center">Nilai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.nama_siswa}</p>
                          <p className="text-xs text-slate-400">{item.nis}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {item.nama_kelas}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.mapel}</TableCell>
                      <TableCell className="text-sm text-slate-500">{item.jenis_penilaian}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${item.nilai >= (item.kkm || 75) ? 'text-emerald-600' : 'text-red-600'}`}>
                          {item.nilai}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={item.status_ketuntasan === 'Tuntas' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                          {item.status_ketuntasan}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteMutation.mutate(item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                        {isLoading ? 'Memuat data...' : 'Belum ada data nilai'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}