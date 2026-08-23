import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { IMPROVEMENT_LIMIT_MINGGUAN_DEFAULT, getMingguKey } from '@/lib/dapodikConstants';

const KATEGORI_OPTIONS = ["Akademik", "Perilaku", "Kepedulian", "Kebersihan", "Lainnya"];

const defaultForm = () => ({
  tanggal: new Date().toISOString().split('T')[0],
  siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
  kategori: 'Perilaku', uraian: '', poin_pengurangan: 5,
  limit_mingguan: IMPROVEMENT_LIMIT_MINGGUAN_DEFAULT,
  validator_id: '', validator_nama: '', catatan: '', status: 'Aktif'
});

export default function ImprovementFormDialog({ open, onOpenChange, editing, kelasList, siswaList, guruList, currentUser, improvementList }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedKelas, setSelectedKelas] = useState('');
  const [formData, setFormData] = useState(defaultForm());

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setFormData({ ...defaultForm(), ...editing });
      setSelectedKelas(editing.kelas_id || '');
    } else {
      const f = defaultForm();
      if (currentUser) { f.validator_id = currentUser.id; f.validator_nama = currentUser.full_name; }
      setFormData(f);
      setSelectedKelas('');
    }
  }, [open, editing, currentUser]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Improvement.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['improvement'] }); handleClose(); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Improvement.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['improvement'] }); handleClose(); }
  });

  const handleClose = () => { setFormData(defaultForm()); setSelectedKelas(''); onOpenChange(false); };

  const handleKelasChange = (kelasId) => {
    setSelectedKelas(kelasId);
    setFormData({ ...formData, siswa_id: '', nis: '', nama_siswa: '', kelas_id: kelasId, nama_kelas: kelasList.find(k => k.id === kelasId)?.nama_kelas || '' });
  };
  const handleSiswaChange = (siswaId) => {
    const s = siswaList.find(x => x.id === siswaId);
    if (s) setFormData(f => ({ ...f, siswa_id: s.id, nis: s.nis, nama_siswa: s.nama, kelas_id: s.kelas_id, nama_kelas: s.nama_kelas }));
  };
  const handleValidatorChange = (guruId) => {
    const g = guruList.find(x => x.id === guruId);
    if (g) setFormData(f => ({ ...f, validator_id: g.id, validator_nama: g.nama }));
  };

  const filteredSiswa = (siswaList || []).filter(s => s.status === 'Aktif' && s.kelas_id === selectedKelas).sort((a, b) => a.nama.localeCompare(b.nama));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.siswa_id) { toast({ title: "Pilih siswa terlebih dahulu", variant: "destructive" }); return; }
    const minggu_key = getMingguKey(new Date(formData.tanggal));
    const used = (improvementList || [])
      .filter(i => i.siswa_id === formData.siswa_id && i.minggu_key === minggu_key && i.status === 'Aktif' && i.id !== editing?.id)
      .reduce((s, i) => s + (Number(i.poin_pengurangan) || 0), 0);
    const poin = Number(formData.poin_pengurangan) || 0;
    const limit = Number(formData.limit_mingguan) || 0;
    if (used + poin > limit) {
      toast({ title: "Limit mingguan terlampaui", description: `Terpakai ${used} + ${poin} = ${used + poin} poin melebihi limit ${limit}/minggu`, variant: "destructive" });
      return;
    }
    const payload = { ...formData, poin_pengurangan: poin, limit_mingguan: limit, minggu_key };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-emerald-700">{editing ? 'Edit Improvement' : 'Tambah Improvement'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} required />
            </div>
            <div>
              <Label>Pilih Kelas</Label>
              <Select value={selectedKelas} onValueChange={handleKelasChange}>
                <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                <SelectContent>
                  {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Pilih Siswa</Label>
            <Select value={formData.siswa_id} onValueChange={handleSiswaChange} disabled={!selectedKelas}>
              <SelectTrigger><SelectValue placeholder={selectedKelas ? "Pilih Siswa" : "Pilih kelas terlebih dahulu"} /></SelectTrigger>
              <SelectContent>
                {filteredSiswa.map(s => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kategori</Label>
              <Select value={formData.kategori} onValueChange={(v) => setFormData({ ...formData, kategori: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KATEGORI_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Poin Pengurangan</Label>
              <Input type="number" min="1" value={formData.poin_pengurangan} onChange={(e) => setFormData({ ...formData, poin_pengurangan: e.target.value })} required />
            </div>
          </div>
          <div>
            <Label>Uraian Aktivitas Improvement</Label>
            <Textarea value={formData.uraian} onChange={(e) => setFormData({ ...formData, uraian: e.target.value })} required placeholder="Contoh: Aktif membantu teman, rajin sholat berjamaah, dsb." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Limit Mingguan <span className="text-xs text-slate-400">(default 30, bisa custom)</span></Label>
              <Input type="number" min="1" value={formData.limit_mingguan} onChange={(e) => setFormData({ ...formData, limit_mingguan: e.target.value })} required />
            </div>
            <div>
              <Label>Validator</Label>
              <Select value={formData.validator_id} onValueChange={handleValidatorChange}>
                <SelectTrigger><SelectValue placeholder="Pilih Validator" /></SelectTrigger>
                <SelectContent>
                  {guruList.map(g => <SelectItem key={g.id} value={g.id}>{g.nama} - {g.jabatan || 'Guru'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Catatan (opsional)</Label>
            <Textarea value={formData.catatan} onChange={(e) => setFormData({ ...formData, catatan: e.target.value })} rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Batal</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">{editing ? 'Simpan' : 'Tambah'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}