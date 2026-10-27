import React, { useEffect, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RupiahInput from '@/components/ui/RupiahInput';
import { Plus, Save, X } from 'lucide-react';
import { JENIS_ITEM } from '@/lib/catatanKeuanganUtils';

const kosong = (tanggal) => ({ tanggal, jenis: 'Pemasukan', nama_item: '', nominal: '' });

export default function ItemForm({ editing, defaultTanggal, saving, onSimpan, onBatal }) {
  const [form, setForm] = useState(kosong(defaultTanggal));

  useEffect(() => {
    setForm(editing ? { ...editing } : kosong(defaultTanggal));
  }, [editing, defaultTanggal]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const valid = form.nama_item.trim() && Number(form.nominal) > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSimpan({ ...form, nama_item: form.nama_item.trim(), nominal: Number(form.nominal) });
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Tanggal</Label>
          <Input type="date" value={form.tanggal || ''} onChange={(e) => set({ tanggal: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Jenis</Label>
          <Select value={form.jenis} onValueChange={(v) => set({ jenis: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JENIS_ITEM.map((j) => (
                <SelectItem key={j} value={j}>{j}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs text-slate-500">Nama Item</Label>
          <Input
            placeholder="Contoh: SPP bulan ini / Beli ATK"
            value={form.nama_item}
            onChange={(e) => set({ nama_item: e.target.value })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs text-slate-500">Nominal</Label>
          <RupiahInput value={form.nominal} onChange={(v) => set({ nominal: v })} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={!valid || saving}>
          {editing ? <><Save className="w-4 h-4 mr-1.5" /> Simpan Perubahan</> : <><Plus className="w-4 h-4 mr-1.5" /> Tambah Item</>}
        </Button>
        {editing && (
          <Button type="button" size="sm" variant="outline" onClick={onBatal}>
            <X className="w-4 h-4 mr-1.5" /> Batal
          </Button>
        )}
        {saving && <span className="text-xs text-slate-400">Menyimpan...</span>}
      </div>
    </form>
  );
}