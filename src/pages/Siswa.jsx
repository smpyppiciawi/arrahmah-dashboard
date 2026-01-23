import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit2, Trash2, Users, Upload } from "lucide-react";

export default function Siswa() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);
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
  const canEdit = ['admin', 'kepsek'].includes(userRole);

  const [formData, setFormData] = useState({
    nis: '', nama: '', jenis_kelamin: '', kelas_id: '', nama_kelas: '',
    tanggal_lahir: '', alamat: '', nama_ortu: '', no_telp_ortu: '', status: 'Aktif'
  });

  const { data: siswaList = [], isLoading } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.list('-created_date'),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list(),
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
    mutationFn: (id) => base44.entities.Siswa.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['siswa'] }),
  });

  const downloadSiswaTemplate = () => {
    const csvContent = "nis,nama,jenis_kelamin,nama_kelas,tanggal_lahir,alamat,nama_ortu,no_telp_ortu\n12345,Ahmad Budi,Laki-laki,7A,2010-01-15,Jl. Merdeka No. 10,Budi Santoso,081234567890\n12346,Siti Nurhaliza,Perempuan,7A,2010-03-20,Jl. Sudirman No. 5,Ahmad Yani,081298765432";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_siswa.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;
    
    try {
      setImporting(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: csvFile });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nis: { type: "string" },
                  nama: { type: "string" },
                  jenis_kelamin: { type: "string" },
                  nama_kelas: { type: "string" },
                  tanggal_lahir: { type: "string" },
                  alamat: { type: "string" },
                  nama_ortu: { type: "string" },
                  no_telp_ortu: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output?.data) {
        const importedData = result.output.data;
        const classMap = new Map();
        
        // Extract unique classes
        importedData.forEach(siswa => {
          if (siswa.nama_kelas && !classMap.has(siswa.nama_kelas)) {
            classMap.set(siswa.nama_kelas, {
              nama_kelas: siswa.nama_kelas,
              tingkat: siswa.nama_kelas.charAt(0)
            });
          }
        });
        
        // Check and create new classes
        const existingClasses = kelasList.map(k => k.nama_kelas);
        const newClasses = Array.from(classMap.values()).filter(
          k => !existingClasses.includes(k.nama_kelas)
        );
        
        if (newClasses.length > 0) {
          await base44.entities.Kelas.bulkCreate(newClasses);
        }
        
        // Refresh class list
        const updatedKelasList = await base44.entities.Kelas.list();
        
        // Map students with kelas_id
        const studentsWithKelasId = importedData.map(siswa => ({
          nis: siswa.nis || '',
          nama: siswa.nama || '',
          jenis_kelamin: siswa.jenis_kelamin || '',
          nama_kelas: siswa.nama_kelas || '',
          kelas_id: updatedKelasList.find(k => k.nama_kelas === siswa.nama_kelas)?.id || '',
          tanggal_lahir: siswa.tanggal_lahir || '',
          alamat: siswa.alamat || '',
          nama_ortu: siswa.nama_ortu || '',
          no_telp_ortu: siswa.no_telp_ortu || '',
          status: 'Aktif'
        }));
        
        await base44.entities.Siswa.bulkCreate(studentsWithKelasId);
        queryClient.invalidateQueries({ queryKey: ['siswa', 'kelas'] });
        setCsvDialogOpen(false);
        setCsvFile(null);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Gagal import data. Pastikan format CSV sesuai dengan template.');
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nis: '', nama: '', jenis_kelamin: '', kelas_id: '', nama_kelas: '',
      tanggal_lahir: '', alamat: '', nama_ortu: '', no_telp_ortu: '', status: 'Aktif'
    });
    setEditingSiswa(null);
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSiswa) {
      updateMutation.mutate({ id: editingSiswa.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (siswa) => {
    setEditingSiswa(siswa);
    setFormData(siswa);
    setIsOpen(true);
  };

  const handleKelasChange = (kelasId) => {
    const kelas = kelasList.find(k => k.id === kelasId);
    setFormData({
      ...formData,
      kelas_id: kelasId,
      nama_kelas: kelas?.nama_kelas || ''
    });
  };

  const filteredSiswa = siswaList.filter(siswa => {
    const matchSearch = siswa.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       siswa.nis?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKelas = filterKelas === 'all' || siswa.kelas_id === filterKelas;
    return matchSearch && matchKelas;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              Data Siswa
            </h1>
            <p className="text-slate-500 mt-1">Kelola data siswa sekolah</p>
          </div>
          
          {canEdit && (
            <div className="flex gap-2">
              <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" /> Import CSV
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Data Siswa dari CSV</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-sm font-semibold text-blue-800 mb-2">Format CSV yang diperlukan:</p>
                      <p className="text-xs text-blue-600">nis, nama, jenis_kelamin, nama_kelas, tanggal_lahir, alamat, nama_ortu, no_telp_ortu</p>
                      <Button 
                        type="button" 
                        variant="link" 
                        size="sm" 
                        onClick={downloadSiswaTemplate}
                        className="text-blue-600 p-0 h-auto mt-2"
                      >
                        Download Template CSV
                      </Button>
                    </div>
                    <div>
                      <Label>Upload File CSV</Label>
                      <Input 
                        type="file" 
                        accept=".csv"
                        onChange={(e) => setCsvFile(e.target.files[0])}
                        disabled={importing}
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Kolom kosong akan diisi otomatis. Kelas baru akan dibuat otomatis.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={() => setCsvDialogOpen(false)} className="flex-1">
                        Batal
                      </Button>
                      <Button onClick={handleCsvImport} disabled={!csvFile || importing} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        {importing ? 'Mengimport...' : 'Import'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" /> Tambah Siswa
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSiswa ? 'Edit Siswa' : 'Tambah Siswa Baru'}</DialogTitle>
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
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
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
                  </div>
                </div>
                <div>
                  <Label>Tanggal Lahir</Label>
                  <Input type="date" value={formData.tanggal_lahir} onChange={(e) => setFormData({...formData, tanggal_lahir: e.target.value})} />
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
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                    {editingSiswa ? 'Simpan Perubahan' : 'Tambah Siswa'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
          )}
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
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {kelasList.map(kelas => (
                    <SelectItem key={kelas.id} value={kelas.id}>{kelas.nama_kelas}</SelectItem>
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
                    <TableHead>NIS</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Jenis Kelamin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSiswa.map((siswa) => (
                    <TableRow key={siswa.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{siswa.nis}</TableCell>
                      <TableCell>{siswa.nama}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {siswa.nama_kelas}
                        </Badge>
                      </TableCell>
                      <TableCell>{siswa.jenis_kelamin}</TableCell>
                      <TableCell>
                        <Badge className={
                          siswa.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' :
                          siswa.status === 'Lulus' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {siswa.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(siswa)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => deleteMutation.mutate(siswa.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSiswa.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        {isLoading ? 'Memuat data...' : 'Belum ada data siswa'}
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