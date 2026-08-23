import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit2, Trash2, BookOpen, Search } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";

export default function KelolaKegiatanPembinaanDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    no: 0, kegiatan: '', ip: '', sesuai_penetapan: false, poin_default: 0, aktif: true
  });

  const { data: kegiatanList = [] } = useQuery({
    queryKey: ['kegiatan-pembinaan'],
    queryFn: () => base44.entities.KegiatanPembinaan.list('no'),
    enabled: open
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KegiatanPembinaan.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kegiatan-pembinaan'] }); resetForm(); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KegiatanPembinaan.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kegiatan-pembinaan'] }); resetForm(); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KegiatanPembinaan.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kegiatan-pembinaan'] }); toast({ title: "Kegiatan dihapus" }); setDeleteTarget(null); }
  });

  const resetForm = () => {
    setFormData({ no: 0, kegiatan: '', ip: '', sesuai_penetapan: false, poin_default: 0, aktif: true });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (item) => { setEditing(item); setFormData({ ...item }); setShowForm(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isSesuai = formData.sesuai_penetapan;
    const poinDef = isSesuai ? 0 : (Number(formData.poin_default) || 0);
    const ipValue = isSesuai ? 'Sesuai Penetapan' : (String(formData.ip || poinDef));
    const payload = {
      ...formData,
      no: Number(formData.no) || (kegiatanList.length + 1),
      ip: ipValue,
      poin_default: poinDef,
      sesuai_penetapan: isSesuai
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const filteredList = kegiatanList.filter(k => {
    if (!search) return true;
    const s = search.toLowerCase();
    return k.kegiatan?.toLowerCase().includes(s);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <BookOpen className="w-5 h-5" /> Database Kegiatan Pembinaan (Improvement)
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari kegiatan..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); setFormData({ no: kegiatanList.length + 1, kegiatan: '', ip: '', sesuai_penetapan: false, poin_default: 0, aktif: true }); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-1" /> Tambah
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 border rounded-xl p-4 bg-emerald-50 mb-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>No</Label>
                <Input type="number" min="0" value={formData.no} onChange={(e) => setFormData({ ...formData, no: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Kegiatan Pembinaan</Label>
                <Input value={formData.kegiatan} onChange={(e) => setFormData({ ...formData, kegiatan: e.target.value })} required placeholder="cth: Shalat Ashar berjamaah" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <Switch checked={formData.sesuai_penetapan} onCheckedChange={(v) => setFormData({ ...formData, sesuai_penetapan: v, ip: v ? 'Sesuai Penetapan' : '', poin_default: v ? 0 : (formData.poin_default || 0) })} />
              <div className="flex-1">
                <p className="text-sm font-medium">Sesuai Penetapan</p>
                <p className="text-xs text-slate-500">Jika aktif, poin default 0 dan petugas tentukan saat input improvement</p>
              </div>
            </div>
            {!formData.sesuai_penetapan && (
              <div>
                <Label>Improvement Point (IP)</Label>
                <Input type="number" min="0" value={formData.poin_default} onChange={(e) => setFormData({ ...formData, poin_default: e.target.value, ip: e.target.value })} placeholder="Angka poin tetap" />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">{editing ? 'Simpan' : 'Tambah'}</Button>
            </div>
          </form>
        )}

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredList.length === 0 ? (
            <p className="text-center py-8 text-slate-400">Belum ada data kegiatan pembinaan</p>
          ) : (
            filteredList.map(k => (
              <div key={k.id} className="border rounded-lg p-3 hover:bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xs font-mono text-slate-400 w-6 shrink-0">{k.no}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{k.kegiatan}</p>
                  </div>
                  <Badge className={k.sesuai_penetapan ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                    {k.sesuai_penetapan ? 'Sesuai Penetapan' : `${k.ip} IP`}
                  </Badge>
                  {!k.aktif && <Badge className="bg-slate-200 text-slate-500">Nonaktif</Badge>}
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(k)}><Edit2 className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleteTarget(k)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))
          )}
        </div>

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          title="Hapus Kegiatan Pembinaan"
          description={`Hapus "${deleteTarget?.kegiatan}"?`}
        />
      </DialogContent>
    </Dialog>
  );
}