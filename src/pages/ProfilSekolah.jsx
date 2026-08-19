import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { School, Edit2, MapPin, Users, GraduationCap, Package, Wallet, Building, Phone, Globe, Mail, Award, Save, Loader2, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MapPicker from "@/components/ui/MapPicker";

const SECTION_IDENTITY = [
  { field: 'nama_sekolah', label: 'Nama Sekolah', required: true },
  { field: 'npsn', label: 'NPSN' },
  { field: 'nss', label: 'NSS' },
  { field: 'bentuk_pendidikan', label: 'Bentuk Pendidikan' },
  { field: 'status_sekolah', label: 'Status Sekolah', type: 'select', options: ['Negeri', 'Swasta'] },
  { field: 'akreditasi', label: 'Akreditasi', type: 'select', options: ['A', 'B', 'C', 'Belum Terakreditasi'] },
  { field: 'tahun_berdiri', label: 'Tahun Berdiri' },
  { field: 'kurikulum', label: 'Kurikulum' },
  { field: 'nama_kepala_sekolah', label: 'Nama Kepala Sekolah' },
  { field: 'nip_kepala_sekolah', label: 'NIP Kepala Sekolah' },
  { field: 'nama_yayasan', label: 'Nama Yayasan' },
  { field: 'nama_komite', label: 'Nama Komite Sekolah' },
];

const SECTION_CONTACT = [
  { field: 'telepon', label: 'Nomor Telepon' },
  { field: 'email', label: 'Email' },
  { field: 'website', label: 'Website' },
];

const SECTION_ADDRESS = [
  { field: 'alamat_jalan', label: 'Jalan' },
  { field: 'rt', label: 'RT' },
  { field: 'rw', label: 'RW' },
  { field: 'dusun', label: 'Dusun' },
  { field: 'desa_kelurahan', label: 'Desa/Kelurahan' },
  { field: 'kecamatan', label: 'Kecamatan' },
  { field: 'kab_kota', label: 'Kabupaten/Kota' },
  { field: 'provinsi', label: 'Provinsi' },
  { field: 'kode_pos', label: 'Kode Pos' },
];

const SECTION_FINANCE = [
  { field: 'rekening_bank', label: 'Nomor Rekening' },
  { field: 'nama_bank', label: 'Nama Bank' },
  { field: 'nama_pemilik_rekening', label: 'Nama Pemilik Rekening' },
];

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 w-40 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value || <span className="text-slate-400 font-normal italic">Belum diisi</span>}</span>
    </div>
  );
}

export default function ProfilSekolah() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  const [formData, setFormData] = useState({});

  const { data: profilList = [], isLoading } = useQuery({
    queryKey: ['profil-sekolah'],
    queryFn: () => base44.entities.ProfilSekolah.list(),
  });
  const profil = profilList[0] || null;

  const { data: siswaList = [] } = useQuery({ queryKey: ['siswa'], queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }) });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list('nama') });
  const { data: sarprasList = [] } = useQuery({ queryKey: ['sarpras'], queryFn: () => base44.entities.Sarpras.list() });
  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });

  // Quick stats from live data
  const stats = useMemo(() => ({
    siswaAktif: siswaList.length,
    pegawai: guruList.filter(g => g.status === 'Aktif').length,
    kelas: kelasList.length,
    sarpras: sarprasList.filter(s => s.status === 'Aktif').length,
    sarprasBaik: sarprasList.filter(s => s.kondisi === 'Baik').length,
    sarprasRusak: sarprasList.filter(s => s.kondisi !== 'Baik').length,
  }), [siswaList, guruList, sarprasList, kelasList]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (profil) return base44.entities.ProfilSekolah.update(profil.id, data);
      return base44.entities.ProfilSekolah.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profil-sekolah'] });
      toast({ title: 'Profil sekolah disimpan' });
      setEditOpen(false);
    },
  });

  const openEdit = () => {
    setFormData(profil || {});
    setMapMounted(false);
    setTimeout(() => setMapMounted(true), 300);
    setEditOpen(true);
  };

  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));

  const renderField = (f) => {
    if (f.type === 'select') {
      return (
        <div key={f.field}>
          <Label className="text-xs">{f.label}</Label>
          <Select value={formData[f.field] || ''} onValueChange={v => set(f.field, v)}>
            <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
            <SelectContent>{f.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      );
    }
    return (
      <div key={f.field}>
        <Label className="text-xs">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</Label>
        <Input value={formData[f.field] || ''} onChange={e => set(f.field, e.target.value)} />
      </div>
    );
  };

  if (isLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-xl"><School className="w-7 h-7 text-blue-600" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Profil Sekolah</h1>
              <p className="text-slate-500 text-sm">Data lengkap sekolah & rekapitulasi</p>
            </div>
          </div>
          <Button onClick={openEdit} className="bg-blue-600 hover:bg-blue-700">
            <Edit2 className="w-4 h-4 mr-2" /> {profil ? 'Edit Profil' : 'Isi Profil'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Users, label: 'Siswa Aktif', value: stats.siswaAktif, color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: GraduationCap, label: 'Pegawai Aktif', value: stats.pegawai, color: 'text-purple-600', bg: 'bg-purple-50' },
            { icon: Building, label: 'Kelas', value: stats.kelas, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: Package, label: 'Sarpras Aktif', value: stats.sarpras, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((s, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!profil ? (
          <Card className="border-2 border-dashed border-slate-200">
            <CardContent className="py-16 text-center">
              <School className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Profil sekolah belum diisi</p>
              <p className="text-slate-400 text-sm mb-4">Klik "Isi Profil" untuk mengisi data sekolah</p>
              <Button onClick={openEdit} className="bg-blue-600 hover:bg-blue-700"><Edit2 className="w-4 h-4 mr-2" /> Isi Profil Sekolah</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><School className="w-4 h-4 text-blue-600" />Identitas Sekolah</CardTitle></CardHeader>
              <CardContent>
                {SECTION_IDENTITY.map(f => <InfoRow key={f.field} label={f.label} value={profil[f.field]} />)}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-600" />Alamat</CardTitle></CardHeader>
              <CardContent>
                {SECTION_ADDRESS.map(f => <InfoRow key={f.field} label={f.label} value={profil[f.field]} />)}
                <div className="pt-2 mt-1">
                  <InfoRow label="Koordinat Sekolah" value={profil.koordinat} />
                  <InfoRow label="Radius Absensi" value={profil.radius_absensi_meter ? `${profil.radius_absensi_meter} meter` : null} />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Phone className="w-4 h-4 text-green-600" />Kontak</CardTitle></CardHeader>
              <CardContent>
                {SECTION_CONTACT.map(f => <InfoRow key={f.field} label={f.label} value={profil[f.field]} />)}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4 text-teal-600" />Rekening Bendahara</CardTitle></CardHeader>
              <CardContent>
                {SECTION_FINANCE.map(f => <InfoRow key={f.field} label={f.label} value={profil[f.field]} />)}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dialog Edit */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Profil Sekolah</DialogTitle></DialogHeader>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Identitas Sekolah</h3>
                <div className="grid grid-cols-2 gap-3">{SECTION_IDENTITY.map(renderField)}</div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Alamat</h3>
                <div className="grid grid-cols-2 gap-3">{SECTION_ADDRESS.map(renderField)}</div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Titik Koordinat Sekolah</h3>
                <p className="text-xs text-slate-500 mb-2">Koordinat ini digunakan sebagai acuan jarak pada Absensi Pegawai.</p>
                {mapMounted ? (
                  <MapPicker value={formData.koordinat || ''} onChange={(v) => set('koordinat', v)} />
                ) : (
                  <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm">Memuat peta...</div>
                )}
                <div className="mt-2">
                  <Label className="text-xs">Radius Toleransi Absensi (meter)</Label>
                  <Input type="number" value={formData.radius_absensi_meter || 1000} onChange={e => set('radius_absensi_meter', Number(e.target.value))} />
                  <p className="text-xs text-slate-400 mt-1">Default 1000m = 1km. Pegawai di luar radius tidak bisa absen.</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Kontak</h3>
                <div className="grid grid-cols-2 gap-3">{SECTION_CONTACT.map(renderField)}</div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Rekening Bendahara</h3>
                <div className="grid grid-cols-2 gap-3">{SECTION_FINANCE.map(renderField)}</div>
              </div>
              <div>
                <Label className="text-xs">Keterangan Tambahan</Label>
                <Textarea value={formData.keterangan || ''} onChange={e => set('keterangan', e.target.value)} rows={3} />
              </div>
              <div className="flex gap-3 pt-2 border-t">
                <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">Batal</Button>
                <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : <><Save className="w-4 h-4 mr-2" />Simpan</>}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}