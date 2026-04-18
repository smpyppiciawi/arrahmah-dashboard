import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Megaphone, Plus, Trash2, Users, User, School } from "lucide-react";
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function PengumumanBendahara() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [targetType, setTargetType] = useState('semua'); // 'semua' | 'kelas' | 'siswa'
  const [formData, setFormData] = useState({
    judul: '',
    isi: '',
    penting: false,
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    kelas_id: '',
    nama_kelas: '',
    siswa_id: '',
    nama_siswa: '',
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-aktif'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: pengumumanList = [], isLoading } = useQuery({
    queryKey: ['pengumuman-bendahara'],
    queryFn: async () => {
      const all = await base44.entities.Pengumuman.list('-tanggal');
      // Hanya tampilkan yang dibuat bendahara (nama_guru kosong atau berisi nama bendahara)
      return all.filter(p => !p.guru_id || p.nama_guru?.toLowerCase().includes('bendahara') || p.kelas_id === 'all');
    },
  });

  const filteredSiswaList = formData.kelas_id
    ? siswaList.filter(s => s.kelas_id === formData.kelas_id)
    : siswaList;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pengumuman.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengumuman-bendahara'] });
      queryClient.invalidateQueries({ queryKey: ['siswa-pengumuman'] });
      setIsOpen(false);
      resetForm();
      toast({ title: 'Pengumuman berhasil dikirim' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pengumuman.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengumuman-bendahara'] });
      queryClient.invalidateQueries({ queryKey: ['siswa-pengumuman'] });
      toast({ title: 'Pengumuman dihapus' });
    },
  });

  const resetForm = () => {
    setFormData({
      judul: '', isi: '', penting: false,
      tanggal: format(new Date(), 'yyyy-MM-dd'),
      kelas_id: '', nama_kelas: '', siswa_id: '', nama_siswa: '',
    });
    setTargetType('semua');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let payload = {
      judul: formData.judul,
      isi: formData.isi,
      penting: formData.penting,
      tanggal: formData.tanggal,
      nama_guru: 'Bendahara',
    };

    if (targetType === 'semua') {
      payload.kelas_id = 'all';
      payload.nama_kelas = 'Semua Siswa';
    } else if (targetType === 'kelas') {
      const kelas = kelasList.find(k => k.id === formData.kelas_id);
      payload.kelas_id = formData.kelas_id;
      payload.nama_kelas = kelas?.nama_kelas || '';
    } else if (targetType === 'siswa') {
      const siswa = siswaList.find(s => s.id === formData.siswa_id);
      payload.kelas_id = formData.siswa_id; // simpan siswa_id di kelas_id untuk match di portal siswa
      payload.nama_kelas = siswa?.nama || '';
      payload.nama_guru = 'Bendahara';
    }

    createMutation.mutate(payload);
  };

  const getTargetBadge = (p) => {
    if (p.kelas_id === 'all') return <Badge className="bg-blue-100 text-blue-700 border-0 text-xs"><School className="w-3 h-3 mr-1" />Semua Siswa</Badge>;
    if (p.nama_kelas) return <Badge className="bg-purple-100 text-purple-700 border-0 text-xs"><Users className="w-3 h-3 mr-1" />{p.nama_kelas}</Badge>;
    return <Badge className="bg-slate-100 text-slate-700 border-0 text-xs"><User className="w-3 h-3 mr-1" />{p.nama_kelas}</Badge>;
  };

  return (
    <div>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-teal-500" /> Pengumuman Keuangan
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" /> Buat Pengumuman
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Buat Pengumuman Keuangan</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Tujuan Pengumuman</Label>
                  <div className="flex gap-2 mt-2">
                    {[
                      { val: 'semua', label: 'Semua Siswa', icon: School },
                      { val: 'kelas', label: 'Per Kelas', icon: Users },
                      { val: 'siswa', label: 'Per Siswa', icon: User },
                    ].map(({ val, label, icon: Icon }) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTargetType(val)}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                          targetType === val
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {targetType === 'kelas' && (
                  <div>
                    <Label>Pilih Kelas</Label>
                    <Select value={formData.kelas_id} onValueChange={(v) => setFormData({...formData, kelas_id: v})}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                      <SelectContent>
                        {kelasList.map(k => (
                          <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {targetType === 'siswa' && (
                  <div className="space-y-3">
                    <div>
                      <Label>Filter Kelas (opsional)</Label>
                      <Select value={formData.kelas_id} onValueChange={(v) => setFormData({...formData, kelas_id: v, siswa_id: ''})}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Semua Kelas</SelectItem>
                          {kelasList.map(k => (
                            <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Pilih Siswa</Label>
                      <Select value={formData.siswa_id} onValueChange={(v) => setFormData({...formData, siswa_id: v})}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Siswa" /></SelectTrigger>
                        <SelectContent>
                          {filteredSiswaList.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.nama} - {s.nama_kelas}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Judul Pengumuman</Label>
                  <Input
                    value={formData.judul}
                    onChange={(e) => setFormData({...formData, judul: e.target.value})}
                    placeholder="Contoh: Reminder Pembayaran SPP Bulan April"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Isi Pengumuman</Label>
                  <Textarea
                    value={formData.isi}
                    onChange={(e) => setFormData({...formData, isi: e.target.value})}
                    placeholder="Tulis isi pengumuman di sini..."
                    rows={4}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Tanggal</Label>
                  <Input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                  <Switch
                    checked={formData.penting}
                    onCheckedChange={(v) => setFormData({...formData, penting: v})}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Tandai sebagai Penting</p>
                    <p className="text-xs text-slate-400">Akan ditampilkan dengan highlight merah di portal siswa</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1">Batal</Button>
                  <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={createMutation.isPending}>
                    Kirim Pengumuman
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-slate-400 py-6">Memuat data...</p>
          ) : pengumumanList.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Belum ada pengumuman keuangan. Klik "Buat Pengumuman" untuk mulai.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pengumumanList.map((p) => (
                <div key={p.id} className={`p-4 rounded-xl border ${p.penting ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        {p.penting && <Badge className="bg-red-100 text-red-700 border-0 text-xs">PENTING</Badge>}
                        {getTargetBadge(p)}
                        <span className="text-xs text-slate-400">{p.tanggal}</span>
                      </div>
                      <p className="font-semibold text-slate-800">{p.judul}</p>
                      <p className="text-sm text-slate-600 mt-1">{p.isi}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                      onClick={() => deleteMutation.mutate(p.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}