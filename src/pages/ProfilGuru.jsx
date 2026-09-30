import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  User, GraduationCap, Users, Phone, Mail, Edit2, Save, X,
  Building, Monitor, Smartphone, BookOpen, Home, LayoutDashboard,
  ChevronRight, Check, Plus, Trash2, School, Calendar, Menu
} from 'lucide-react';
import WaAssistantLink from '@/components/WaAssistantLink';
import ProfilePhotoUploader from '@/components/guru/ProfilePhotoUploader';

const MAPEL_LIST = [
  "PAI", "Bahasa Indonesia", "Matematika", "IPA", "IPS",
  "Bahasa Inggris", "PJOK", "Seni Musik", "Seni Rupa",
  "Akidah Akhlak", "BTAQ", "PKn", "TIK", "Prakarya"
];

const NAV_ITEMS = [
  { key: 'profil', icon: User, label: 'Profil' },
  { key: 'wali', icon: Users, label: 'Wali' },
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'absensi', icon: Calendar, label: 'Absensi' },
  { key: 'menu', icon: Menu, label: 'Menu' },
];

export default function ProfilGuru() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState('profil');
  const [viewMode, setViewMode] = useState('web'); // 'mobile' | 'web'

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const guruData = guruList.find(g => g.email === currentUser?.email) || null;
  const kelasWali = kelasList.find(k => k.wali_kelas === guruData?.nama);

  useEffect(() => {
    if (guruData) setFormData({ ...guruData });
  }, [guruData?.id]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Guru.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guru'] });
      setEditMode(false);
      toast({ title: '✅ Profil berhasil diperbarui!' });
    },
  });

  const handleSave = () => {
    if (guruData?.id) updateMutation.mutate({ id: guruData.id, data: formData });
  };
  const handleCancel = () => { setFormData({ ...guruData }); setEditMode(false); };

  if (!guruData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">Data guru tidak ditemukan</p>
          <p className="text-slate-400 text-sm mt-2">
            Pastikan email <strong>{currentUser?.email}</strong> sudah terdaftar di data guru oleh admin.
          </p>
        </div>
      </div>
    );
  }

  // ====== WEB / DESKTOP VIEW ======
  if (viewMode === 'web') {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Top bar with view toggle */}
        <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <School className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800">Profil Guru</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'mobile' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile
            </button>
            <button
              onClick={() => setViewMode('web')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'web' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Monitor className="w-3.5 h-3.5" /> Desktop
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-6 grid grid-cols-12 gap-6">
          {/* Sidebar Profile Card */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Avatar + Name */}
            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 text-white">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3">
                  <ProfilePhotoUploader guruId={guruData.id} fotoUrl={guruData.foto_url} nama={guruData.nama} avatarClass="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-3xl font-black text-white" />
                </div>
                <h2 className="font-bold text-xl leading-tight">{guruData.nama}</h2>
                <p className="text-violet-200 text-sm mt-1">{guruData.jabatan || 'Guru'}</p>
                {kelasWali && (
                  <div className="mt-2 px-3 py-1 bg-amber-400/80 rounded-full">
                    <span className="text-amber-900 text-xs font-bold">Wali Kelas {kelasWali.nama_kelas}</span>
                  </div>
                )}
              </div>
              <div className="mt-5 space-y-2">
                {guruData.nuptk && (
                  <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                    <Building className="w-4 h-4 text-violet-200 shrink-0" />
                    <div>
                      <p className="text-violet-300 text-[10px]">NUPTK</p>
                      <p className="text-white text-xs font-semibold">{guruData.nuptk}</p>
                    </div>
                  </div>
                )}
                {guruData.email && (
                  <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                    <Mail className="w-4 h-4 text-violet-200 shrink-0" />
                    <p className="text-white text-xs font-semibold truncate">{guruData.email}</p>
                  </div>
                )}
                {guruData.no_telp && (
                  <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                    <Phone className="w-4 h-4 text-violet-200 shrink-0" />
                    <p className="text-white text-xs font-semibold">{guruData.no_telp}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mapel Card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <p className="font-bold text-slate-800 mb-3 text-sm">📚 Mata Pelajaran</p>
              <div className="flex flex-wrap gap-2">
                {(guruData.mapel || []).length > 0
                  ? (guruData.mapel || []).map(m => (
                      <Badge key={m} className="bg-violet-100 text-violet-700 border-0">{m}</Badge>
                    ))
                  : <p className="text-slate-400 text-sm italic">Belum ada mapel</p>
                }
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-3xl p-5 shadow-sm flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Status Kepegawaian</span>
              <Badge className={guruData.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-slate-100 text-slate-600 border-0'}>
                {guruData.status || 'Aktif'}
              </Badge>
            </div>
            <WaAssistantLink agentName="wa_guru_bot" />
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            {/* Action bar */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Data Lengkap</h3>
              {!editMode ? (
                <Button onClick={() => setEditMode(true)} className="bg-violet-600 hover:bg-violet-700">
                  <Edit2 className="w-4 h-4 mr-2" /> Edit Profil
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel}><X className="w-4 h-4 mr-1" /> Batal</Button>
                  <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700" disabled={updateMutation.isPending}>
                    <Save className="w-4 h-4 mr-1" /> {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </div>
              )}
            </div>

            {/* Data Diri */}
            <WebSection title="Data Diri" icon={<User className="w-4 h-4 text-violet-500" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <WebField label="Nama Lengkap" editMode={editMode} value={formData.nama || ''} displayValue={guruData.nama}
                  onChange={v => setFormData({...formData, nama: v})} />
                <WebField label="NUPTK / NIP / NIK" editMode={editMode} value={formData.nuptk || ''} displayValue={guruData.nuptk}
                  onChange={v => setFormData({...formData, nuptk: v})} placeholder="NUPTK/NIP/NIK" />
                <div>
                  <Label className="text-xs text-slate-500 font-medium">Jenis Kelamin</Label>
                  {editMode ? (
                    <Select value={formData.jenis_kelamin || ''} onValueChange={v => setFormData({...formData, jenis_kelamin: v})}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                        <SelectItem value="Perempuan">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : <p className="font-semibold text-slate-800 mt-1 text-sm">{guruData.jenis_kelamin || '-'}</p>}
                </div>
                <div>
                  <Label className="text-xs text-slate-500 font-medium">Jabatan</Label>
                  {editMode ? (
                    <Select value={formData.jabatan || ''} onValueChange={v => setFormData({...formData, jabatan: v})}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        {["Guru Mata Pelajaran","Kepala Sekolah","Tata Usaha","Yayasan","DKM","Madrasah","Lainnya"].map(j => (
                          <SelectItem key={j} value={j}>{j}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : <p className="font-semibold text-slate-800 mt-1 text-sm">{guruData.jabatan || '-'}</p>}
                </div>
                <WebField label="Tugas Tambahan" editMode={editMode} value={formData.tugas_tambahan || ''} displayValue={guruData.tugas_tambahan}
                  onChange={v => setFormData({...formData, tugas_tambahan: v})} placeholder="Wali Kelas, Pembina OSIS, dll" />
                <WebField label="Email" editMode={editMode} value={formData.email || ''} displayValue={guruData.email}
                  onChange={v => setFormData({...formData, email: v})} type="email" />
                <WebField label="Nomor Telepon" editMode={editMode} value={formData.no_telp || ''} displayValue={guruData.no_telp}
                  onChange={v => setFormData({...formData, no_telp: v})} placeholder="08xx-xxxx-xxxx" />
                <div>
                  <Label className="text-xs text-slate-500 font-medium">Status</Label>
                  {editMode ? (
                    <Select value={formData.status || 'Aktif'} onValueChange={v => setFormData({...formData, status: v})}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aktif">Aktif</SelectItem>
                        <SelectItem value="Cuti">Cuti</SelectItem>
                                              </SelectContent>
                    </Select>
                  ) : <p className="font-semibold text-slate-800 mt-1 text-sm">{guruData.status || 'Aktif'}</p>}
                </div>
              </div>

              {/* Mapel edit */}
              <div className="mt-4">
                <Label className="text-xs text-slate-500 font-medium">Mata Pelajaran Diampu</Label>
                {editMode ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MAPEL_LIST.map(m => {
                      const selected = (formData.mapel || []).includes(m);
                      return (
                        <button key={m} type="button"
                          onClick={() => {
                            const cur = formData.mapel || [];
                            setFormData({...formData, mapel: selected ? cur.filter(x => x !== m) : [...cur, m]});
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-all ${selected ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-300 hover:border-violet-400'}`}
                        >
                          {selected && <Check className="w-3 h-3 inline mr-1" />}{m}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(guruData.mapel || []).length > 0
                      ? (guruData.mapel || []).map(m => <Badge key={m} className="bg-violet-100 text-violet-700 border-0">{m}</Badge>)
                      : <p className="text-slate-400 text-sm italic">Belum ada</p>}
                  </div>
                )}
              </div>
            </WebSection>

            {/* Data Anak */}
            <WebSection title="Data Anak" icon={<Users className="w-4 h-4 text-blue-500" />}>
              <DataAnakSection guruData={guruData} editMode={editMode} formData={formData} setFormData={setFormData} />
            </WebSection>

            {/* Riwayat Pendidikan */}
            <WebSection title="Riwayat Pendidikan" icon={<GraduationCap className="w-4 h-4 text-emerald-500" />}>
              <RiwayatPendidikanSection guruData={guruData} editMode={editMode} formData={formData} setFormData={setFormData} />
            </WebSection>
          </div>
        </div>
      </div>
    );
  }

  // ====== MOBILE VIEW ======
  return (
    <div className="min-h-screen bg-slate-100">

        {/* ====== PROFIL TAB ====== */}
        {activeTab === 'profil' && (
          <div className="pb-28">
            {/* Hero - centered layout like desktop preview */}
            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 px-5 pt-8 pb-16 relative overflow-hidden">
              {/* View Mode Toggle inside hero */}
              <div className="absolute top-4 right-4 z-10 bg-white/20 backdrop-blur-sm rounded-2xl p-1 flex gap-1">
                <button onClick={() => setViewMode('mobile')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${viewMode === 'mobile' ? 'bg-white text-violet-700' : 'text-white/70 hover:text-white'}`}>
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setViewMode('web')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${viewMode === 'web' ? 'bg-white text-violet-700' : 'text-white/70 hover:text-white'}`}>
                  <Monitor className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
              <div className="absolute bottom-0 left-10 w-28 h-28 bg-white/5 rounded-full translate-y-10" />

              {/* Centered avatar + info */}
              <div className="relative flex flex-col items-center text-center pt-2">
                <div className="mb-3">
                  <ProfilePhotoUploader guruId={guruData.id} fotoUrl={guruData.foto_url} nama={guruData.nama} avatarClass="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-3xl font-black text-white" />
                </div>
                <h1 className="text-white font-black text-xl leading-tight">{guruData.nama}</h1>
                <p className="text-violet-200 text-sm mt-1">{guruData.jabatan || 'Guru Mata Pelajaran'}</p>
                <div className="flex flex-wrap justify-center gap-1.5 mt-2.5">
                  {(guruData.mapel || []).slice(0, 2).map(m => (
                    <span key={m} className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full">{m}</span>
                  ))}
                  {(guruData.mapel || []).length > 2 && (
                    <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full">+{(guruData.mapel || []).length - 2}</span>
                  )}
                  {kelasWali && (
                    <span className="text-xs font-bold bg-amber-400 text-amber-900 px-3 py-1 rounded-full">Wali Kelas {kelasWali.nama_kelas}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Info Cards */}
            <div className="px-4 -mt-8 pb-4 space-y-3">
              {/* Contact Info */}
              <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-50">
                  <span className="font-bold text-slate-800 text-sm">Informasi Kontak</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {guruData.nuptk && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                        <Building className="w-4 h-4 text-violet-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">NUPTK</p>
                        <p className="text-slate-800 text-sm font-semibold">{guruData.nuptk}</p>
                      </div>
                    </div>
                  )}
                  {guruData.email && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-slate-400 font-medium">Email</p>
                        <p className="text-slate-800 text-sm font-semibold break-all">{guruData.email}</p>
                      </div>
                    </div>
                  )}
                  {guruData.no_telp && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">No. Telepon</p>
                        <p className="text-slate-800 text-sm font-semibold">{guruData.no_telp}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mapel list */}
              <div className="bg-white rounded-3xl shadow-sm p-5">
                <p className="font-bold text-slate-800 text-sm mb-3">📚 Mata Pelajaran Diampu</p>
                <div className="flex flex-wrap gap-2">
                  {(guruData.mapel || []).length > 0
                    ? (guruData.mapel || []).map(m => <Badge key={m} className="bg-violet-100 text-violet-700 border-0">{m}</Badge>)
                    : <p className="text-slate-400 text-sm italic">Belum ada mapel</p>}
                </div>
              </div>

              {/* Status + Edit */}
              <div className="bg-white rounded-3xl shadow-sm px-5 py-4 flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-sm">Status Kepegawaian</span>
                <Badge className={guruData.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-slate-100 text-slate-600 border-0'}>
                  {guruData.status || 'Aktif'}
                </Badge>
              </div>

              <WaAssistantLink agentName="wa_guru_bot" />

              {/* Nav to detail */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">Data Lengkap</span>
                <Button onClick={() => setActiveTab('data-diri')} className="bg-violet-600 hover:bg-violet-700 gap-2 rounded-2xl">
                  <Edit2 className="w-4 h-4" /> Edit Profil
                </Button>
              </div>

              {[
                { tab: 'data-anak', icon: '👨‍👩‍👧', label: 'Data Anak', sub: `${(guruData.data_anak || []).length} data anak` },
                { tab: 'pendidikan', icon: '🎓', label: 'Riwayat Pendidikan', sub: `${(guruData.riwayat_pendidikan || []).length} riwayat` },
              ].map(item => (
                <button key={item.tab} onClick={() => setActiveTab(item.tab)}
                  className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 text-left active:scale-98 transition-transform">
                  <div className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-xl shrink-0">{item.icon}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                    <p className="text-slate-400 text-xs">{item.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ====== DATA DIRI TAB ====== */}
        {activeTab === 'data-diri' && (
          <div className="pb-24">
            <MobileTabHeader title="Data Diri" emoji="👤" gradient="from-violet-500 to-indigo-600"
              onBack={() => { setActiveTab('profil'); setEditMode(false); }} />
            <div className="px-4 mt-4 space-y-3">
              <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">Informasi Pribadi</span>
                  {!editMode
                    ? <button onClick={() => setEditMode(true)} className="flex items-center gap-1 text-violet-600 text-sm font-medium"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                    : <div className="flex gap-2">
                        <button onClick={handleCancel} className="text-slate-500 text-sm font-medium">Batal</button>
                        <button onClick={handleSave} disabled={updateMutation.isPending} className="text-violet-600 text-sm font-bold">
                          {updateMutation.isPending ? 'Simpan...' : 'Simpan'}
                        </button>
                      </div>
                  }
                </div>
                <div className="divide-y divide-slate-50">
                  <MobileField label="Nama Lengkap" value={formData.nama} displayValue={guruData.nama} editMode={editMode} onChange={v => setFormData({...formData, nama: v})} />
                  <MobileField label="NUPTK / NIP / NIK" value={formData.nuptk} displayValue={guruData.nuptk} editMode={editMode} onChange={v => setFormData({...formData, nuptk: v})} placeholder="Masukkan NUPTK" />
                  <MobileField label="Email" value={formData.email} displayValue={guruData.email} editMode={editMode} onChange={v => setFormData({...formData, email: v})} type="email" />
                  <MobileField label="No. Telepon" value={formData.no_telp} displayValue={guruData.no_telp} editMode={editMode} onChange={v => setFormData({...formData, no_telp: v})} placeholder="08xx-xxxx-xxxx" />
                  <MobileField label="Tugas Tambahan" value={formData.tugas_tambahan} displayValue={guruData.tugas_tambahan} editMode={editMode} onChange={v => setFormData({...formData, tugas_tambahan: v})} placeholder="Wali Kelas, dll" />
                  <div className="px-5 py-3.5">
                    <p className="text-[11px] text-slate-400 font-medium mb-1.5">Jenis Kelamin</p>
                    {editMode ? (
                      <Select value={formData.jenis_kelamin || ''} onValueChange={v => setFormData({...formData, jenis_kelamin: v})}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                          <SelectItem value="Perempuan">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : <p className="text-slate-800 text-sm font-semibold">{guruData.jenis_kelamin || <span className="text-slate-300 italic font-normal">Belum diisi</span>}</p>}
                  </div>
                  <div className="px-5 py-3.5">
                    <p className="text-[11px] text-slate-400 font-medium mb-1.5">Jabatan</p>
                    {editMode ? (
                      <Select value={formData.jabatan || ''} onValueChange={v => setFormData({...formData, jabatan: v})}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
                        <SelectContent>
                          {["Guru Mata Pelajaran","Kepala Sekolah","Tata Usaha","Yayasan","DKM","Madrasah","Lainnya"].map(j => (
                            <SelectItem key={j} value={j}>{j}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : <p className="text-slate-800 text-sm font-semibold">{guruData.jabatan || <span className="text-slate-300 italic font-normal">Belum diisi</span>}</p>}
                  </div>
                  <div className="px-5 py-3.5">
                    <p className="text-[11px] text-slate-400 font-medium mb-1.5">Status</p>
                    {editMode ? (
                      <Select value={formData.status || 'Aktif'} onValueChange={v => setFormData({...formData, status: v})}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aktif">Aktif</SelectItem>
                          <SelectItem value="Cuti">Cuti</SelectItem>
                                                  </SelectContent>
                      </Select>
                    ) : <Badge className={guruData.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-slate-100 text-slate-600 border-0'}>{guruData.status || 'Aktif'}</Badge>}
                  </div>
                </div>
              </div>

              {/* Mata Pelajaran */}
              <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-50">
                  <span className="font-bold text-slate-800 text-sm">📚 Mata Pelajaran</span>
                </div>
                <div className="px-5 py-4">
                  {editMode ? (
                    <div className="flex flex-wrap gap-2">
                      {MAPEL_LIST.map(m => {
                        const selected = (formData.mapel || []).includes(m);
                        return (
                          <button key={m} type="button"
                            onClick={() => {
                              const cur = formData.mapel || [];
                              setFormData({...formData, mapel: selected ? cur.filter(x => x !== m) : [...cur, m]});
                            }}
                            className={`px-3 py-2 rounded-2xl text-xs border font-semibold transition-all ${selected ? 'bg-violet-600 text-white border-violet-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(guruData.mapel || []).length > 0
                        ? (guruData.mapel || []).map(m => <Badge key={m} className="bg-violet-100 text-violet-700 border-0 text-sm py-1">{m}</Badge>)
                        : <p className="text-slate-400 text-sm italic">Belum ada mapel</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Wali Kelas */}
              <div className="bg-amber-50 border border-amber-100 rounded-3xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-xl shrink-0">🏫</div>
                <div>
                  <p className="text-[10px] text-amber-500 font-semibold">WALI KELAS</p>
                  <p className="font-bold text-amber-800">{kelasWali ? kelasWali.nama_kelas : 'Bukan wali kelas'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====== DATA ANAK TAB ====== */}
        {activeTab === 'data-anak' && (
          <div className="pb-24">
            <MobileTabHeader title="Data Anak" emoji="👨‍👩‍👧" gradient="from-blue-500 to-indigo-500"
              onBack={() => { setActiveTab('profil'); setEditMode(false); }} />
            <div className="px-4 mt-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="font-bold text-slate-700 text-sm">{(guruData.data_anak || []).length} Anak Tercatat</span>
                {!editMode
                  ? <button onClick={() => setEditMode(true)} className="flex items-center gap-1 text-blue-600 text-sm font-medium"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                  : <div className="flex gap-3">
                      <button onClick={handleCancel} className="text-slate-500 text-sm font-medium">Batal</button>
                      <button onClick={handleSave} disabled={updateMutation.isPending} className="text-blue-600 text-sm font-bold">
                        {updateMutation.isPending ? 'Simpan...' : 'Simpan'}
                      </button>
                    </div>
                }
              </div>
              <DataAnakSection guruData={guruData} editMode={editMode} formData={formData} setFormData={setFormData} mobile />
            </div>
          </div>
        )}

        {/* ====== PENDIDIKAN TAB ====== */}
        {activeTab === 'pendidikan' && (
          <div className="pb-24">
            <MobileTabHeader title="Riwayat Pendidikan" emoji="🎓" gradient="from-emerald-500 to-teal-500"
              onBack={() => { setActiveTab('profil'); setEditMode(false); }} />
            <div className="px-4 mt-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="font-bold text-slate-700 text-sm">{(guruData.riwayat_pendidikan || []).length} Riwayat</span>
                {!editMode
                  ? <button onClick={() => setEditMode(true)} className="flex items-center gap-1 text-emerald-600 text-sm font-medium"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                  : <div className="flex gap-3">
                      <button onClick={handleCancel} className="text-slate-500 text-sm font-medium">Batal</button>
                      <button onClick={handleSave} disabled={updateMutation.isPending} className="text-emerald-600 text-sm font-bold">
                        {updateMutation.isPending ? 'Simpan...' : 'Simpan'}
                      </button>
                    </div>
                }
              </div>
              <RiwayatPendidikanSection guruData={guruData} editMode={editMode} formData={formData} setFormData={setFormData} mobile />
            </div>
          </div>
        )}

        {/* ====== BOTTOM NAVIGATION ====== */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-2xl">
          <div className="flex items-center justify-around px-2 py-2 pb-safe">
            {/* Profil - active */}
            <button onClick={() => { setActiveTab('profil'); setEditMode(false); }}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <User className="w-5 h-5 text-violet-600" />
              </div>
              <span className="text-[10px] font-semibold text-violet-600">Profil</span>
            </button>
            {/* Wali - link to WaliKelas page */}
            <Link to="/WaliKelas" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl opacity-50">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Wali</span>
            </Link>
            {/* Dashboard */}
            <Link to="/Dashboard" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl opacity-50">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Dashboard</span>
            </Link>
            {/* Absensi */}
            <Link to="/Absensi" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl opacity-50">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Absensi</span>
            </Link>
            {/* Menu - sub tabs */}
            <button onClick={() => setActiveTab('data-diri')}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl opacity-50">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                <Menu className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Menu</span>
            </button>
          </div>
        </div>
    </div>
  );
}

// ====== HELPER COMPONENTS ======
function MobileTabHeader({ title, emoji, gradient, onBack }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} px-5 pt-12 pb-10 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
      <button onClick={onBack} className="flex items-center gap-1.5 text-white/80 text-sm mb-4">
        <ChevronRight className="w-4 h-4 rotate-180" /> Kembali
      </button>
      <h2 className="text-white font-black text-2xl flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl">{emoji}</div>
        {title}
      </h2>
    </div>
  );
}

function MobileField({ label, value, displayValue, editMode, onChange, placeholder, type = 'text' }) {
  return (
    <div className="px-5 py-3.5">
      <p className="text-[11px] text-slate-400 font-medium mb-1.5">{label}</p>
      {editMode ? (
        <Input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 rounded-xl bg-slate-50 border-slate-200"
        />
      ) : (
        <p className="text-slate-800 text-sm font-semibold">
          {displayValue || <span className="text-slate-300 italic font-normal">Belum diisi</span>}
        </p>
      )}
    </div>
  );
}

function WebSection({ title, icon, children }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
        {icon}
        <span className="font-bold text-slate-800 text-sm">{title}</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function WebField({ label, value, displayValue, editMode, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <Label className="text-xs text-slate-500 font-medium">{label}</Label>
      {editMode ? (
        <Input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" placeholder={placeholder} />
      ) : (
        <p className="font-semibold text-slate-800 mt-1 text-sm">{displayValue || <span className="text-slate-300 italic font-normal">-</span>}</p>
      )}
    </div>
  );
}

function DataAnakSection({ guruData, editMode, formData, setFormData, mobile }) {
  const dataAnak = editMode ? (formData.data_anak || []) : (guruData.data_anak || []);
  const addAnak = () => setFormData({ ...formData, data_anak: [...(formData.data_anak || []), { nama: '', tanggal_lahir: '', jenis_kelamin: '', pendidikan: '' }] });
  const updateAnak = (idx, field, val) => setFormData({ ...formData, data_anak: (formData.data_anak || []).map((a, i) => i === idx ? { ...a, [field]: val } : a) });
  const removeAnak = (idx) => setFormData({ ...formData, data_anak: (formData.data_anak || []).filter((_, i) => i !== idx) });

  if (!editMode) {
    if (!dataAnak || dataAnak.length === 0) {
      return (
        <div className="text-center py-8">
          <span className="text-4xl block mb-2">👶</span>
          <p className="text-slate-400 text-sm">Belum ada data anak</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {dataAnak.map((anak, i) => (
          <div key={i} className={`${mobile ? 'bg-white rounded-2xl shadow-sm' : 'bg-slate-50 rounded-2xl border'} p-4`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center font-bold text-blue-600 text-sm">{i + 1}</div>
              <p className="font-bold text-slate-800">{anak.nama || '-'}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
              <div><p className="text-slate-400 mb-0.5">Lahir</p><p className="font-medium text-slate-700">{anak.tanggal_lahir || '-'}</p></div>
              <div><p className="text-slate-400 mb-0.5">JK</p><p className="font-medium text-slate-700">{anak.jenis_kelamin || '-'}</p></div>
              <div><p className="text-slate-400 mb-0.5">Pendidikan</p><p className="font-medium text-slate-700">{anak.pendidikan || '-'}</p></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dataAnak.map((anak, i) => (
        <div key={i} className={`${mobile ? 'bg-white rounded-2xl shadow-sm' : 'border rounded-2xl'} p-4 space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-600 text-xs">{i + 1}</div>
              <p className="text-sm font-semibold text-slate-700">Anak ke-{i + 1}</p>
            </div>
            <button onClick={() => removeAnak(i)} className="text-red-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nama</Label>
              <Input className="mt-1 rounded-xl" value={anak.nama || ''} onChange={e => updateAnak(i, 'nama', e.target.value)} placeholder="Nama anak" />
            </div>
            <div>
              <Label className="text-xs">Tanggal Lahir</Label>
              <Input className="mt-1 rounded-xl" type="date" value={anak.tanggal_lahir || ''} onChange={e => updateAnak(i, 'tanggal_lahir', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Jenis Kelamin</Label>
              <Select value={anak.jenis_kelamin || ''} onValueChange={v => updateAnak(i, 'jenis_kelamin', v)}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                  <SelectItem value="Perempuan">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Jenjang Pendidikan</Label>
              <Input className="mt-1 rounded-xl" value={anak.pendidikan || ''} onChange={e => updateAnak(i, 'pendidikan', e.target.value)} placeholder="SD, SMP, SMA, dll" />
            </div>
          </div>
        </div>
      ))}
      <button onClick={addAnak} className="w-full py-3 rounded-2xl border-2 border-dashed border-blue-200 text-blue-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
        <Plus className="w-4 h-4" /> Tambah Data Anak
      </button>
    </div>
  );
}

function RiwayatPendidikanSection({ guruData, editMode, formData, setFormData, mobile }) {
  const riwayat = editMode ? (formData.riwayat_pendidikan || []) : (guruData.riwayat_pendidikan || []);
  const addRiwayat = () => setFormData({ ...formData, riwayat_pendidikan: [...(formData.riwayat_pendidikan || []), { jenjang: '', nama_institusi: '', jurusan: '', tahun_lulus: '' }] });
  const updateRiwayat = (idx, field, val) => setFormData({ ...formData, riwayat_pendidikan: (formData.riwayat_pendidikan || []).map((r, i) => i === idx ? { ...r, [field]: val } : r) });
  const removeRiwayat = (idx) => setFormData({ ...formData, riwayat_pendidikan: (formData.riwayat_pendidikan || []).filter((_, i) => i !== idx) });

  if (!editMode) {
    if (!riwayat || riwayat.length === 0) {
      return (
        <div className="text-center py-8">
          <span className="text-4xl block mb-2">📜</span>
          <p className="text-slate-400 text-sm">Belum ada riwayat pendidikan</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {riwayat.map((r, i) => (
          <div key={i} className={`${mobile ? 'bg-white rounded-2xl shadow-sm' : 'bg-slate-50 rounded-2xl border'} p-4 flex items-start gap-3`}>
            <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">{r.jenjang}</Badge>
              </div>
              <p className="font-bold text-slate-800 text-sm">{r.nama_institusi || '-'}</p>
              {r.jurusan && <p className="text-slate-500 text-xs mt-0.5">{r.jurusan}</p>}
              <p className="text-[10px] text-slate-400 mt-1">Lulus: {r.tahun_lulus || '-'}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {riwayat.map((r, i) => (
        <div key={i} className={`${mobile ? 'bg-white rounded-2xl shadow-sm' : 'border rounded-2xl'} p-4 space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Riwayat {i + 1}</p>
            </div>
            <button onClick={() => removeRiwayat(i)} className="text-red-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Jenjang</Label>
              <Select value={r.jenjang || ''} onValueChange={v => updateRiwayat(i, 'jenjang', v)}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {["SD","SMP","SMA/SMK","D1","D2","D3","S1","S2","S3"].map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nama Institusi</Label>
              <Input className="mt-1 rounded-xl" value={r.nama_institusi || ''} onChange={e => updateRiwayat(i, 'nama_institusi', e.target.value)} placeholder="Nama Sekolah/Universitas" />
            </div>
            <div>
              <Label className="text-xs">Jurusan / Prodi</Label>
              <Input className="mt-1 rounded-xl" value={r.jurusan || ''} onChange={e => updateRiwayat(i, 'jurusan', e.target.value)} placeholder="Pendidikan Matematika, dll" />
            </div>
            <div>
              <Label className="text-xs">Tahun Lulus</Label>
              <Input className="mt-1 rounded-xl" value={r.tahun_lulus || ''} onChange={e => updateRiwayat(i, 'tahun_lulus', e.target.value)} placeholder="2010" />
            </div>
          </div>
        </div>
      ))}
      <button onClick={addRiwayat} className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-200 text-emerald-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors">
        <Plus className="w-4 h-4" /> Tambah Riwayat Pendidikan
      </button>
    </div>
  );
}