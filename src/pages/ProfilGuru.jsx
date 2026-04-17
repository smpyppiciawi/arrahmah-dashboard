import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { User, GraduationCap, Users, Phone, Mail, Edit2, Save, X, BookOpen, Building } from 'lucide-react';

const MAPEL_LIST = [
  "PAI", "Bahasa Indonesia", "Matematika", "IPA", "IPS",
  "Bahasa Inggris", "PJOK", "Seni Musik", "Seni Rupa",
  "Akidah Akhlak", "BTAQ", "PKn", "TIK", "Prakarya"
];

export default function ProfilGuru() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  // Cari data guru berdasarkan email
  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  // Cocokkan guru dengan user yang login (via email)
  const guruData = guruList.find(g => g.email === currentUser?.email) || null;

  // Kelas yang diampu sebagai wali kelas
  const kelasWali = kelasList.find(k => k.wali_kelas === guruData?.nama);

  useEffect(() => {
    if (guruData) {
      setFormData({ ...guruData });
    }
  }, [guruData?.id]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Guru.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guru'] });
      setEditMode(false);
      toast({ title: 'Berhasil', description: 'Profil berhasil diperbarui.' });
    },
  });

  const handleSave = () => {
    if (guruData?.id) {
      updateMutation.mutate({ id: guruData.id, data: formData });
    }
  };

  const handleCancel = () => {
    setFormData({ ...guruData });
    setEditMode(false);
  };

  if (!guruData) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Data guru tidak ditemukan</p>
            <p className="text-slate-400 text-sm mt-2">
              Pastikan email akun Anda ({currentUser?.email}) sudah terdaftar di data guru.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-indigo-600 p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {guruData.nama?.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">{guruData.nama}</h1>
                <p className="text-violet-200 mt-1">{guruData.jabatan || 'Guru'}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {guruData.mapel?.map(m => (
                    <Badge key={m} className="bg-white/20 text-white border-white/30 text-xs">{m}</Badge>
                  ))}
                  {kelasWali && (
                    <Badge className="bg-amber-400/80 text-amber-900 text-xs">
                      Wali Kelas {kelasWali.nama_kelas}
                    </Badge>
                  )}
                </div>
              </div>
              {!editMode && (
                <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => setEditMode(true)}>
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
              )}
            </div>
          </div>

          {/* Info strip */}
          <div className="px-6 py-3 bg-white border-t flex flex-wrap gap-6 text-sm text-slate-600">
            {guruData.nip && (
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-400" />
                NIP: <strong>{guruData.nip}</strong>
              </span>
            )}
            {guruData.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" />
                {guruData.email}
              </span>
            )}
            {guruData.no_telp && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-slate-400" />
                {guruData.no_telp}
              </span>
            )}
            <Badge className={guruData.status === 'Aktif' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
              {guruData.status || 'Aktif'}
            </Badge>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="data-diri">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="data-diri" className="gap-1.5">
              <User className="w-4 h-4" /> Data Diri
            </TabsTrigger>
            <TabsTrigger value="data-anak" className="gap-1.5">
              <Users className="w-4 h-4" /> Data Anak
            </TabsTrigger>
            <TabsTrigger value="riwayat-pendidikan" className="gap-1.5">
              <GraduationCap className="w-4 h-4" /> Riwayat Pendidikan
            </TabsTrigger>
          </TabsList>

          {/* Data Diri */}
          <TabsContent value="data-diri">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-5 h-5 text-violet-500" /> Data Diri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Nama Lengkap</Label>
                    {editMode ? (
                      <Input value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} className="mt-1" />
                    ) : (
                      <p className="font-medium text-slate-800 mt-1">{guruData.nama || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">NIP / NUPTK / NIK</Label>
                    {editMode ? (
                      <Input value={formData.nip || ''} onChange={e => setFormData({...formData, nip: e.target.value})} className="mt-1" placeholder="NIP/NUPTK/NIK" />
                    ) : (
                      <p className="font-medium text-slate-800 mt-1">{guruData.nip || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Jenis Kelamin</Label>
                    {editMode ? (
                      <Select value={formData.jenis_kelamin || ''} onValueChange={v => setFormData({...formData, jenis_kelamin: v})}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                          <SelectItem value="Perempuan">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium text-slate-800 mt-1">{guruData.jenis_kelamin || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Jabatan</Label>
                    {editMode ? (
                      <Select value={formData.jabatan || ''} onValueChange={v => setFormData({...formData, jabatan: v})}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
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
                    ) : (
                      <p className="font-medium text-slate-800 mt-1">{guruData.jabatan || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Tugas Tambahan</Label>
                    {editMode ? (
                      <Input value={formData.tugas_tambahan || ''} onChange={e => setFormData({...formData, tugas_tambahan: e.target.value})} className="mt-1" placeholder="Wali Kelas, Pembina OSIS, dll" />
                    ) : (
                      <p className="font-medium text-slate-800 mt-1">{guruData.tugas_tambahan || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Status</Label>
                    {editMode ? (
                      <Select value={formData.status || 'Aktif'} onValueChange={v => setFormData({...formData, status: v})}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aktif">Aktif</SelectItem>
                          <SelectItem value="Cuti">Cuti</SelectItem>
                          <SelectItem value="Pensiun">Pensiun</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={guruData.status === 'Aktif' ? 'mt-1 bg-green-100 text-green-700' : 'mt-1 bg-slate-100 text-slate-600'}>
                        {guruData.status || 'Aktif'}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Email</Label>
                    {editMode ? (
                      <Input value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1" type="email" />
                    ) : (
                      <p className="font-medium text-slate-800 mt-1">{guruData.email || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Nomor Telepon</Label>
                    {editMode ? (
                      <Input value={formData.no_telp || ''} onChange={e => setFormData({...formData, no_telp: e.target.value})} className="mt-1" />
                    ) : (
                      <p className="font-medium text-slate-800 mt-1">{guruData.no_telp || '-'}</p>
                    )}
                  </div>
                </div>

                {/* Mata Pelajaran */}
                <div>
                  <Label className="text-xs text-slate-500">Mata Pelajaran Diampu</Label>
                  {editMode ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {MAPEL_LIST.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            const current = formData.mapel || [];
                            const updated = current.includes(m) ? current.filter(x => x !== m) : [...current, m];
                            setFormData({...formData, mapel: updated});
                          }}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            (formData.mapel || []).includes(m)
                              ? 'bg-violet-600 text-white border-violet-600'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-violet-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(guruData.mapel || []).map(m => (
                        <Badge key={m} className="bg-violet-100 text-violet-700">{m}</Badge>
                      ))}
                      {(!guruData.mapel || guruData.mapel.length === 0) && <p className="text-slate-400 text-sm">-</p>}
                    </div>
                  )}
                </div>

                {/* Wali Kelas Info */}
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-xs text-amber-600 font-medium mb-1">Wali Kelas</p>
                  <p className="font-semibold text-amber-800">{kelasWali ? kelasWali.nama_kelas : 'Bukan wali kelas'}</p>
                </div>

                {editMode && (
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={handleCancel} className="flex-1">
                      <X className="w-4 h-4 mr-1" /> Batal
                    </Button>
                    <Button onClick={handleSave} className="flex-1 bg-violet-600 hover:bg-violet-700" disabled={updateMutation.isPending}>
                      <Save className="w-4 h-4 mr-1" /> Simpan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Anak */}
          <TabsContent value="data-anak">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" /> Data Anak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataAnakSection guruData={guruData} editMode={editMode} formData={formData} setFormData={setFormData} />
                {editMode && (
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={handleCancel} className="flex-1">
                      <X className="w-4 h-4 mr-1" /> Batal
                    </Button>
                    <Button onClick={handleSave} className="flex-1 bg-violet-600 hover:bg-violet-700" disabled={updateMutation.isPending}>
                      <Save className="w-4 h-4 mr-1" /> Simpan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Riwayat Pendidikan */}
          <TabsContent value="riwayat-pendidikan">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-500" /> Riwayat Pendidikan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RiwayatPendidikanSection guruData={guruData} editMode={editMode} formData={formData} setFormData={setFormData} />
                {editMode && (
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={handleCancel} className="flex-1">
                      <X className="w-4 h-4 mr-1" /> Batal
                    </Button>
                    <Button onClick={handleSave} className="flex-1 bg-violet-600 hover:bg-violet-700" disabled={updateMutation.isPending}>
                      <Save className="w-4 h-4 mr-1" /> Simpan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DataAnakSection({ guruData, editMode, formData, setFormData }) {
  const dataAnak = formData.data_anak || guruData.data_anak || [];

  const addAnak = () => {
    const updated = [...dataAnak, { nama: '', tanggal_lahir: '', jenis_kelamin: '', pendidikan: '' }];
    setFormData({ ...formData, data_anak: updated });
  };

  const updateAnak = (idx, field, val) => {
    const updated = dataAnak.map((a, i) => i === idx ? { ...a, [field]: val } : a);
    setFormData({ ...formData, data_anak: updated });
  };

  const removeAnak = (idx) => {
    const updated = dataAnak.filter((_, i) => i !== idx);
    setFormData({ ...formData, data_anak: updated });
  };

  if (!editMode) {
    if (!dataAnak || dataAnak.length === 0) {
      return <p className="text-slate-400 text-sm text-center py-8">Belum ada data anak yang diinput.</p>;
    }
    return (
      <div className="space-y-3">
        {dataAnak.map((anak, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-lg border">
            <p className="font-medium text-slate-800">{anak.nama || '-'}</p>
            <div className="grid grid-cols-3 gap-3 mt-2 text-sm text-slate-500">
              <span>Lahir: {anak.tanggal_lahir || '-'}</span>
              <span>{anak.jenis_kelamin || '-'}</span>
              <span>Pendidikan: {anak.pendidikan || '-'}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dataAnak.map((anak, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Anak ke-{i + 1}</p>
            <Button size="sm" variant="ghost" className="text-red-500 h-7" onClick={() => removeAnak(i)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nama</Label>
              <Input className="mt-1" value={anak.nama || ''} onChange={e => updateAnak(i, 'nama', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Tanggal Lahir</Label>
              <Input className="mt-1" type="date" value={anak.tanggal_lahir || ''} onChange={e => updateAnak(i, 'tanggal_lahir', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Jenis Kelamin</Label>
              <Select value={anak.jenis_kelamin || ''} onValueChange={v => updateAnak(i, 'jenis_kelamin', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                  <SelectItem value="Perempuan">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Jenjang Pendidikan</Label>
              <Input className="mt-1" value={anak.pendidikan || ''} onChange={e => updateAnak(i, 'pendidikan', e.target.value)} placeholder="SD, SMP, SMA, Kuliah, dll" />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" className="w-full" onClick={addAnak}>
        + Tambah Data Anak
      </Button>
    </div>
  );
}

function RiwayatPendidikanSection({ guruData, editMode, formData, setFormData }) {
  const riwayat = formData.riwayat_pendidikan || guruData.riwayat_pendidikan || [];

  const addRiwayat = () => {
    const updated = [...riwayat, { jenjang: '', nama_institusi: '', jurusan: '', tahun_lulus: '' }];
    setFormData({ ...formData, riwayat_pendidikan: updated });
  };

  const updateRiwayat = (idx, field, val) => {
    const updated = riwayat.map((r, i) => i === idx ? { ...r, [field]: val } : r);
    setFormData({ ...formData, riwayat_pendidikan: updated });
  };

  const removeRiwayat = (idx) => {
    const updated = riwayat.filter((_, i) => i !== idx);
    setFormData({ ...formData, riwayat_pendidikan: updated });
  };

  if (!editMode) {
    if (!riwayat || riwayat.length === 0) {
      return <p className="text-slate-400 text-sm text-center py-8">Belum ada riwayat pendidikan yang diinput.</p>;
    }
    return (
      <div className="space-y-3">
        {riwayat.map((r, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-lg border flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">{r.nama_institusi || '-'}</p>
              <p className="text-sm text-slate-500">{r.jenjang} {r.jurusan ? `• ${r.jurusan}` : ''}</p>
              <p className="text-xs text-slate-400 mt-1">Lulus: {r.tahun_lulus || '-'}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {riwayat.map((r, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Riwayat {i + 1}</p>
            <Button size="sm" variant="ghost" className="text-red-500 h-7" onClick={() => removeRiwayat(i)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Jenjang</Label>
              <Select value={r.jenjang || ''} onValueChange={v => updateRiwayat(i, 'jenjang', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SD">SD</SelectItem>
                  <SelectItem value="SMP">SMP</SelectItem>
                  <SelectItem value="SMA/SMK">SMA/SMK</SelectItem>
                  <SelectItem value="D1">D1</SelectItem>
                  <SelectItem value="D2">D2</SelectItem>
                  <SelectItem value="D3">D3</SelectItem>
                  <SelectItem value="S1">S1</SelectItem>
                  <SelectItem value="S2">S2</SelectItem>
                  <SelectItem value="S3">S3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nama Institusi</Label>
              <Input className="mt-1" value={r.nama_institusi || ''} onChange={e => updateRiwayat(i, 'nama_institusi', e.target.value)} placeholder="Nama Sekolah/Universitas" />
            </div>
            <div>
              <Label className="text-xs">Jurusan / Program Studi</Label>
              <Input className="mt-1" value={r.jurusan || ''} onChange={e => updateRiwayat(i, 'jurusan', e.target.value)} placeholder="Pendidikan Matematika, dll" />
            </div>
            <div>
              <Label className="text-xs">Tahun Lulus</Label>
              <Input className="mt-1" value={r.tahun_lulus || ''} onChange={e => updateRiwayat(i, 'tahun_lulus', e.target.value)} placeholder="2010" />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" className="w-full" onClick={addRiwayat}>
        + Tambah Riwayat Pendidikan
      </Button>
    </div>
  );
}