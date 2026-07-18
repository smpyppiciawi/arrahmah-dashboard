import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FolderOpen, Plus, Search, Edit2, Trash2, 
  FileText, FileImage, Video, Link2, ExternalLink,
  Download
} from "lucide-react";
import { motion } from "framer-motion";
import FloatingAddButton from "@/components/ui/FloatingAddButton";

const MAPEL_LIST = [
  'Bahasa Indonesia', 'Matematika', 'IPA', 'IPS', 'Bahasa Inggris',
  'PKn', 'Pendidikan Agama', 'PJOK', 'Seni Budaya', 'Prakarya', 'TIK',
  'Bahasa Sunda', 'Seni Rupa', 'Seni Musik', 'BTAQ', 'Akidah Akhlak'
];

export default function Materi() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('all');
  const [filterMapel, setFilterMapel] = useState('all');
  const [uploading, setUploading] = useState(false);
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
  const canEdit = ['admin', 'guru', 'tu', 'kepsek', 'operator'].includes(userRole);
  const isGuruRole = userRole === 'guru';

  const [formData, setFormData] = useState({
    judul: '', mapel: '', tingkat_kelas: '', semester: '',
    bab: '', pertemuan_ke: '', jenis_file: '', file_url: '',
    guru_pengampu: '', deskripsi: ''
  });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
    staleTime: 60000,
  });

  // Cari data guru yang login
  const guruData = guruList.find(g => g.email === currentUser?.email);

  const { data: materiList = [], isLoading } = useQuery({
    queryKey: ['materi', currentUser?.email, userRole],
    queryFn: async () => {
      const all = await base44.entities.Materi.list('-created_date');
      if (isGuruRole && guruData) {
        return all.filter(m => (guruData.mapel || []).includes(m.mapel) || m.guru_pengampu === guruData.nama);
      }
      return all;
    },
    enabled: !isGuruRole || !!currentUser,
  });

  const filteredGuruList = formData.mapel 
    ? guruList.filter(guru => guru.mapel?.includes(formData.mapel))
    : guruList;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Materi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materi'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Materi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materi'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Materi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materi'] }),
  });

  const resetForm = () => {
    setFormData({
      judul: '', mapel: '', tingkat_kelas: '', semester: '',
      bab: '', pertemuan_ke: '', jenis_file: '', file_url: '',
      guru_pengampu: '', deskripsi: ''
    });
    setEditingData(null);
    setIsOpen(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, file_url });
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { 
      ...formData, 
      pertemuan_ke: formData.pertemuan_ke ? Number(formData.pertemuan_ke) : null 
    };
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

  const filteredData = materiList.filter(item => {
    const matchSearch = item.judul?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.bab?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTingkat = filterTingkat === 'all' || item.tingkat_kelas === filterTingkat;
    const matchMapel = filterMapel === 'all' || item.mapel === filterMapel;
    return matchSearch && matchTingkat && matchMapel;
  });

  const getFileIcon = (jenis) => {
    const icons = {
      'Word': FileText,
      'PPT': FileImage,
      'PDF': FileText,
      'Video': Video,
      'Link': Link2,
    };
    return icons[jenis] || FileText;
  };

  const getFileColor = (jenis) => {
    const colors = {
      'Word': 'bg-blue-100 text-blue-600',
      'PPT': 'bg-orange-100 text-orange-600',
      'PDF': 'bg-red-100 text-red-600',
      'Video': 'bg-purple-100 text-purple-600',
      'Link': 'bg-teal-100 text-teal-600',
    };
    return colors[jenis] || 'bg-slate-100 text-slate-600';
  };

  // Group by mapel for display
  const groupedByMapel = filteredData.reduce((acc, item) => {
    if (!acc[item.mapel]) acc[item.mapel] = [];
    acc[item.mapel].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-indigo-500" />
              Bank Materi
            </h1>
            <p className="text-slate-500 mt-1">Kelola materi pembelajaran</p>
          </div>
          
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingData ? 'Edit Materi' : 'Tambah Materi Baru'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Judul Materi</Label>
                  <Input 
                    value={formData.judul} 
                    onChange={(e) => setFormData({...formData, judul: e.target.value})} 
                    placeholder="Masukkan judul materi"
                    required 
                  />
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
                    <Label>Tingkat Kelas</Label>
                    <Select value={formData.tingkat_kelas} onValueChange={(v) => setFormData({...formData, tingkat_kelas: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Kelas 7</SelectItem>
                        <SelectItem value="8">Kelas 8</SelectItem>
                        <SelectItem value="9">Kelas 9</SelectItem>
                        <SelectItem value="Semua">Semua Kelas</SelectItem>
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
                    <Label>Pertemuan Ke</Label>
                    <Input 
                      type="number"
                      value={formData.pertemuan_ke} 
                      onChange={(e) => setFormData({...formData, pertemuan_ke: e.target.value})}
                      placeholder="1, 2, 3..."
                    />
                  </div>
                </div>
                <div>
                  <Label>Bab / Topik</Label>
                  <Input 
                    value={formData.bab} 
                    onChange={(e) => setFormData({...formData, bab: e.target.value})}
                    placeholder="Contoh: Bab 1 - Teks Deskripsi"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Jenis File</Label>
                    <Select value={formData.jenis_file} onValueChange={(v) => setFormData({...formData, jenis_file: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Word">Word</SelectItem>
                        <SelectItem value="PPT">PPT</SelectItem>
                        <SelectItem value="PDF">PDF</SelectItem>
                        <SelectItem value="Video">Video</SelectItem>
                        <SelectItem value="Link">Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Guru Pengampu</Label>
                    <Select value={formData.guru_pengampu} onValueChange={(v) => setFormData({...formData, guru_pengampu: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
                      <SelectContent>
                        {filteredGuruList.map(guru => (
                          <SelectItem key={guru.id} value={guru.nama}>{guru.nama}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Upload File atau Link</Label>
                  {formData.jenis_file === 'Link' ? (
                    <Input 
                      value={formData.file_url} 
                      onChange={(e) => setFormData({...formData, file_url: e.target.value})}
                      placeholder="https://..."
                    />
                  ) : (
                    <div className="space-y-2">
                      <Input 
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      {uploading && <p className="text-sm text-slate-500">Mengupload...</p>}
                      {formData.file_url && (
                        <p className="text-sm text-emerald-600">File berhasil diupload</p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Deskripsi</Label>
                  <Input 
                    value={formData.deskripsi} 
                    onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                    placeholder="Deskripsi singkat materi"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                  <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={uploading}>
                    {editingData ? 'Simpan' : 'Tambah'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Cari judul atau bab..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterTingkat} onValueChange={setFilterTingkat}>
                <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Kelas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  <SelectItem value="7">Kelas 7</SelectItem>
                  <SelectItem value="8">Kelas 8</SelectItem>
                  <SelectItem value="9">Kelas 9</SelectItem>
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

        {/* Materi Grid */}
        {Object.entries(groupedByMapel).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedByMapel).map(([mapel, items]) => (
              <div key={mapel}>
                <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-indigo-500" />
                  {mapel}
                  <Badge variant="secondary" className="ml-2">{items.length}</Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((materi, index) => {
                    const FileIcon = getFileIcon(materi.jenis_file);
                    return (
                      <motion.div
                        key={materi.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-3 rounded-lg ${getFileColor(materi.jenis_file)}`}>
                                <FileIcon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-slate-800 truncate">{materi.judul}</h3>
                                <p className="text-sm text-slate-500 mt-1">{materi.bab}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    Kelas {materi.tingkat_kelas}
                                  </Badge>
                                  {materi.semester && (
                                    <Badge variant="outline" className="text-xs">
                                      {materi.semester}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {materi.guru_pengampu && (
                              <p className="text-xs text-slate-400 mt-3">
                                Oleh: {materi.guru_pengampu}
                              </p>
                            )}

                            <div className="flex gap-2 mt-4 pt-3 border-t">
                              {materi.file_url && (
                                <Button size="sm" variant="outline" className="flex-1" asChild>
                                  <a href={materi.file_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-1" /> Buka
                                  </a>
                                </Button>
                              )}
                              {canEdit && (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => handleEdit(materi)}>
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteMutation.mutate(materi.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400">
                {isLoading ? 'Memuat data...' : 'Belum ada materi. Klik "Tambah Materi" untuk memulai.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      {canEdit && <FloatingAddButton onClick={() => setIsOpen(true)} label="Tambah Materi" color="indigo" icon={Plus} />}
    </div>
  );
}