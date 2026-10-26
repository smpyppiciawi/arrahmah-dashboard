import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, Loader2, Save } from 'lucide-react';
import RupiahInput from '@/components/ui/RupiahInput';
import { fmtRp } from '@/lib/spmbUtils';

const empty = () => ({ nama: '', tanggal_mulai: '', tanggal_selesai: '', biaya: '', keterangan: '', status: 'Aktif' });

export default function GelombangManager({ gelombangList, tahunAjaran, onChanged }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(empty());
  const [busy, setBusy] = useState(false);
  const [hapus, setHapus] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const buka = (g) => {
    setEdit(g || null);
    setForm(g ? { ...g, biaya: String(g.biaya ?? '') } : empty());
    setOpen(true);
  };

  const simpan = async () => {
    if (!form.nama.trim()) { toast({ title: 'Nama gelombang wajib diisi', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const payload = { ...form, biaya: Number(form.biaya) || 0, tahun_ajaran: tahunAjaran || '' };
      if (edit?.id) await base44.entities.GelombangSPMB.update(edit.id, payload);
      else await base44.entities.GelombangSPMB.create(payload);
      toast({ title: 'Gelombang disimpan', description: form.nama });
      setOpen(false);
      onChanged?.();
    } catch (e) {
      toast({ title: 'Gagal menyimpan', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const hapusGelombang = async () => {
    if (!hapus) return;
    try {
      await base44.entities.GelombangSPMB.delete(hapus.id);
      toast({ title: 'Gelombang dihapus', description: hapus.nama });
      setHapus(null);
      onChanged?.();
    } catch (e) {
      toast({ title: 'Gagal menghapus', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Gelombang Pendaftaran</h2>
          <p className="text-sm text-slate-500">Atur jangka tanggal dan biaya tiap gelombang.</p>
        </div>
        <Button onClick={() => buka(null)} className="gap-2"><Plus className="w-4 h-4" /> Tambah Gelombang</Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {(!gelombangList || gelombangList.length === 0) ? (
          <div className="p-10 text-center text-slate-400 text-sm">Belum ada gelombang. Tambahkan gelombang pertama.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold">Gelombang</th>
                  <th className="px-4 py-3 font-semibold">Periode</th>
                  <th className="px-4 py-3 font-semibold text-right">Biaya</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {gelombangList.map((g) => (
                  <tr key={g.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{g.nama}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {g.tanggal_mulai || '-'}{g.tanggal_selesai ? ` s/d ${g.tanggal_selesai}` : ''}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{fmtRp(g.biaya)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${g.status === 'Tidak Aktif' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                        {g.status || 'Aktif'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => buka(g)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50" title="Ubah">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setHapus(g)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{edit ? 'Ubah Gelombang' : 'Tambah Gelombang'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Nama Gelombang</Label>
              <Input value={form.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Gelombang 1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Tanggal Mulai</Label>
                <Input type="date" value={form.tanggal_mulai} onChange={(e) => set('tanggal_mulai', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Tanggal Selesai</Label>
                <Input type="date" value={form.tanggal_selesai} onChange={(e) => set('tanggal_selesai', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Biaya Pendaftaran</Label>
              <RupiahInput value={form.biaya} onChange={(v) => set('biaya', v)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Keterangan</Label>
              <Input value={form.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={simpan} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        onConfirm={hapusGelombang}
        title="Hapus Gelombang"
        description={`Gelombang "${hapus?.nama}" akan dihapus. Lanjutkan?`}
      />
    </div>
  );
}