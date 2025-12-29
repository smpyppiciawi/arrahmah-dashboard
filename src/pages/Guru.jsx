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
import { GraduationCap, Plus, Search, Edit2, Trash2, Mail, Phone } from "lucide-react";

const MAPEL_LIST = [
  'Bahasa Indonesia', 'Matematika', 'IPA', 'IPS', 'Bahasa Inggris',
  'PKn', 'Pendidikan Agama', 'PJOK', 'Seni Budaya', 'Prakarya', 'TIK'
];

export default function Guru() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMapel, setSelectedMapel] = useState([]);
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
  const canEdit = userRole === 'admin';

  const [formData, setFormData] = useState({
    nip: '', nama: '', jenis_kelamin: '', mapel: [],
    no_telp: '', email: '', status: 'Aktif'
  });

  const { data: guruList = [], isLoading } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('-created_date'),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guru'] }),
  });

  const resetForm = () => {
    setFormData({
      nip: '', nama: '', jenis_kelamin: '', mapel: [],
      no_telp: '', email: '', status: 'Aktif'
    });
    setSelectedMapel([]);
    setEditingData(null);
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, mapel: selectedMapel };
    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (data) => {
    setEditingData(data);
    setFormData(data);
    setSelectedMapel(data.mapel || []);
    setIsOpen(true);
  };

  const toggleMapel = (mapel) => {
    if (selectedMapel.includes(mapel)) {
      setSelectedMapel(selectedMapel.filter(m => m !== mapel));
    } else {
      setSelectedMapel([...selectedMapel, mapel]);
    }
  };

  const filteredData = guruList.filter(item => {
    return item.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.nip?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-violet-500" />
              Data Guru
            </h1>
            <p className="text-slate-500 mt-1">Kelola data guru dan pegawai</p>
          </div>
          
          {canEdit && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Guru
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingData ? 'Edit Guru' : 'Tambah Guru Baru'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>NIP</Label>
                    <Input 
                      value={formData.nip} 
                      onChange={(e) => setFormData({...formData, nip: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Nama Lengkap</Label>
                    <Input 
                      value={formData.nama} 
                      onChange={(e) => setFormData({...formData, nama: e.target.value})} 
                      required 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Jenis Kelamin</Label>
                    <Select value={formData.jenis_kelamin} onValueChange={(v) => setFormData({...formData, jenis_kelamin: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
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
                  <Label>Mata Pelajaran yang Diampu</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {MAPEL_LIST.map(mapel => (
                      <Badge 
                        key={mapel}
                        variant={selectedMapel.includes(mapel) ? "default" : "outline"}
                        className={`cursor-pointer ${selectedMapel.includes(mapel) ? 'bg-violet-600' : ''}`}
                        onClick={() => toggleMapel(mapel)}
                      >
                        {mapel}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>No. Telepon</Label>
                    <Input 
                      value={formData.no_telp} 
                      onChange={(e) => setFormData({...formData, no_telp: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                  <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700">
                    {editingData ? 'Simpan' : 'Tambah'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Cari nama atau NIP..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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
                    <TableHead>NIP</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((guru) => (
                    <TableRow key={guru.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{guru.nip || '-'}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{guru.nama}</p>
                          <p className="text-xs text-slate-400">{guru.jenis_kelamin}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {guru.mapel?.slice(0, 2).map(m => (
                            <Badge key={m} variant="secondary" className="text-xs bg-violet-100 text-violet-700">
                              {m}
                            </Badge>
                          ))}
                          {guru.mapel?.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{guru.mapel.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {guru.no_telp && (
                            <p className="text-xs flex items-center gap-1 text-slate-500">
                              <Phone className="w-3 h-3" /> {guru.no_telp}
                            </p>
                          )}
                          {guru.email && (
                            <p className="text-xs flex items-center gap-1 text-slate-500">
                              <Mail className="w-3 h-3" /> {guru.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          guru.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' :
                          guru.status === 'Cuti' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {guru.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(guru)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteMutation.mutate(guru.id)}>
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
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        {isLoading ? 'Memuat data...' : 'Belum ada data guru'}
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