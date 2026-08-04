import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Clock, Plus, Pencil, Trash2, LogIn, LogOut, Coffee, Timer, CalendarClock, Loader2 } from 'lucide-react';

const HARI_OPTS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const JENIS_OPTS = [
  { value: 'Masuk', label: 'Jam Masuk', icon: LogIn, color: 'emerald' },
  { value: 'Pulang', label: 'Jam Pulang', icon: LogOut, color: 'blue' },
  { value: 'Istirahat Mulai', label: 'Istirahat Mulai', icon: Coffee, color: 'amber' },
  { value: 'Istirahat Selesai', label: 'Istirahat Selesai', icon: Timer, color: 'orange' },
  { value: 'Lainnya', label: 'Lainnya', icon: CalendarClock, color: 'slate' },
];
const PERSON_OPTS = ['Semua', 'Siswa', 'Pegawai'];

const emptyForm = {
  label: '', jenis: 'Masuk', jam: '07:00',
  hari: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
  toleransi_aktif: true, toleransi_menit: 0,
  person_type: 'Semua', keterangan: '', aktif: true,
};

const colorMap = {
  emerald: 'bg-emerald-100 text-emerald-600',
  blue: 'bg-blue-100 text-blue-600',
  amber: 'bg-amber-100 text-amber-600',
  orange: 'bg-orange-100 text-orange-600',
  slate: 'bg-slate-100 text-slate-600',
};

export default function JadwalAbsensiTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterPT, setFilterPT] = useState('Semua');

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['jadwal-absensi'],
    queryFn: () => base44.entities.JadwalAbsensi.list(),
  });

  const reload = () => queryClient.invalidateQueries({ queryKey: ['jadwal-absensi'] });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({
      label: r.label || '', jenis: r.jenis || 'Masuk', jam: r.jam || '07:00',
      hari: r.hari || [],
      toleransi_aktif: r.toleransi_aktif !== false,
      toleransi_menit: r.toleransi_menit || 0,
      person_type: r.person_type || 'Semua', keterangan: r.keterangan || '',
      aktif: r.aktif !== false,
    });
    setOpen(true);
  };

  const toggleHari = (h) => setForm(f => ({
    ...f, hari: (f.hari || []).includes(h) ? f.hari.filter(x => x !== h) : [...(f.hari || []), h],
  }));

  const save = async () => {
    if (!form.label.trim()) { toast({ title: 'Label wajib diisi', variant: 'destructive' }); return; }
    if (!form.jam) { toast({ title: 'Jam wajib diisi', variant: 'destructive' }); return; }
    if (!form.hari || form.hari.length === 0) { toast({ title: 'Pilih minimal satu hari', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        jenis: form.jenis,
        jam: form.jam,
        hari: form.hari,
        toleransi_menit: form.jenis === 'Masuk' ? Number(form.toleransi_menit) || 0 : 0,
        toleransi_aktif: form.jenis === 'Masuk' ? form.toleransi_aktif !== false : true,
        person_type: form.person_type,
        keterangan: form.keterangan,
        aktif: form.aktif,
      };
      if (editing) {
        await base44.entities.JadwalAbsensi.update(editing.id, payload);
        toast({ title: 'Jadwal diperbarui' });
      } else {
        await base44.entities.JadwalAbsensi.create(payload);
        toast({ title: 'Jadwal ditambahkan' });
      }
      setOpen(false);
      reload();
    } catch (e) {
      toast({ title: 'Gagal menyimpan', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Hapus jadwal "${r.label}"?`)) return;
    try {
      await base44.entities.JadwalAbsensi.delete(r.id);
      toast({ title: 'Jadwal dihapus' });
      reload();
    } catch (e) {
      toast({ title: 'Gagal menghapus', description: e.message, variant: 'destructive' });
    }
  };

  const toggleAktif = async (r) => {
    try {
      await base44.entities.JadwalAbsensi.update(r.id, { aktif: r.aktif === false });
      reload();
    } catch (e) {
      toast({ title: 'Gagal mengubah status', description: e.message, variant: 'destructive' });
    }
  };

  const filtered = (list || []).filter(r => filterPT === 'Semua' || r.person_type === 'Semua' || r.person_type === filterPT);
  const jenisMeta = (j) => JENIS_OPTS.find(o => o.value === j) || JENIS_OPTS[JENIS_OPTS.length - 1];

  return (
    <div className="space-y-4">
      <Card className="border-2 border-emerald-200 shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Jadwal Absensi</h3>
                <p className="text-xs text-slate-500">Atur jam masuk, pulang, istirahat & penanda lainnya</p>
              </div>
            </div>
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4" /> Tambah
            </Button>
          </div>

          <div className="flex gap-1.5 mb-4">
            {PERSON_OPTS.map(pt => (
              <button
                key={pt}
                onClick={() => setFilterPT(pt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterPT === pt ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {pt}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CalendarClock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Belum ada jadwal. Klik "Tambah" untuk membuat.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.sort((a, b) => (a.label || '').localeCompare(b.label || '')).map(r => {
                const m = jenisMeta(r.jenis);
                const Icon = m.icon;
                return (
                  <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border ${r.aktif === false ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200'}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[m.color]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">{r.label}</span>
                        <Badge variant="outline" className="text-[10px]">{m.label}</Badge>
                        {r.person_type && <Badge className="text-[10px] bg-slate-100 text-slate-600">{r.person_type}</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-slate-700">{r.jam}</span>
                        {r.jenis === 'Masuk' && r.toleransi_aktif === false
                          ? <span className="text-emerald-500">Toleransi Off</span>
                          : r.jenis === 'Masuk' && r.toleransi_menit > 0
                          ? <span className="text-orange-500">+{r.toleransi_menit}m toleransi</span>
                          : null}
                        <span className="text-slate-400">·</span>
                        <span className="truncate">{(r.hari || []).join(', ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={r.aktif !== false} onCheckedChange={() => toggleAktif(r)} />
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Jadwal' : 'Tambah Jadwal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Nama / Label</Label>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="cth: Jam Masuk Pagi, Jam Pulang Jumat..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jenis</Label>
                <Select value={form.jenis} onValueChange={v => setForm(f => ({ ...f, jenis: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{JENIS_OPTS.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jam</Label>
                <Input type="time" value={form.jam} onChange={e => setForm(f => ({ ...f, jam: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Berlaku untuk</Label>
              <Select value={form.person_type} onValueChange={v => setForm(f => ({ ...f, person_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERSON_OPTS.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hari Berlaku</Label>
              <div className="flex flex-wrap gap-1.5">
                {HARI_OPTS.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggleHari(h)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${(form.hari || []).includes(h) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            {form.jenis === 'Masuk' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Toleransi Terlambat</Label>
                  <Switch checked={form.toleransi_aktif !== false} onCheckedChange={v => setForm(f => ({ ...f, toleransi_aktif: v }))} />
                </div>
                {form.toleransi_aktif !== false ? (
                  <>
                    <Input type="number" min="0" value={form.toleransi_menit} onChange={e => setForm(f => ({ ...f, toleransi_menit: e.target.value }))} placeholder="0" />
                    <p className="text-[11px] text-slate-400 mt-1">Tambahan menit setelah jam masuk sebelum dinyatakan terlambat.</p>
                  </>
                ) : (
                  <p className="text-[11px] text-emerald-600 bg-emerald-50 rounded-lg p-2">Toleransi nonaktif — jam berapapun selama belum melewati jam pulang dinyatakan <b>Masuk</b>.</p>
                )}
              </div>
            )}
            <div>
              <Label>Keterangan</Label>
              <Input value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} placeholder="Opsional..." />
            </div>
            <div className="flex items-center justify-between">
              <Label>Status Aktif</Label>
              <Switch checked={form.aktif} onCheckedChange={v => setForm(f => ({ ...f, aktif: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{editing ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}