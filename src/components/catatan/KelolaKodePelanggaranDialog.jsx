import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit2, Trash2, Database, Search } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";

const KATEGORI_UTAMA_OPTIONS = [
  "Hukum & Keselamatan",
  "Kesusilaan & Pergaulan",
  "Penampilan & Seragam",
  "Kebersihan & Lingkungan",
  "Ibadah & Adab Islami",
  "Izin & Kehadiran",
  "Sikap & Etika",
  "Lainnya"
];

const TINDAK_LANJUT_OPTIONS = [
  "Investigasi & Audiensi",
  "Pembinaan & Teguran",
  "Teguran Lisan",
  "Teguran Tertulis",
  "Panggilan Orang Tua",
  "Sanksi & Pembinaan"
];

export default function KelolaKodePelanggaranDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    kategori_utama: '', kode: '', uraian: '', rincian: '',
    tindak_lanjut: 'Teguran Lisan', poin_min: 5, poin_max: 10, aktif: true
  });

  const { data: kodeList = [] } = useQuery({
    queryKey: ['kode-pelanggaran-improvement'],
    queryFn: () => base44.entities.KodePelanggaranImprovement.list('kode'),
    enabled: open
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KodePelanggaranImprovement.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kode-pelanggaran-improvement'] }); resetForm(); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KodePelanggaranImprovement.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kode-pelanggaran-improvement'] }); resetForm(); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KodePelanggaranImprovement.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kode-pelanggaran-improvement'] }); toast({ title: "Kode pelanggaran dihapus" }); setDeleteTarget(null); }
  });

  const resetForm = () => {
    setFormData({ kategori_utama: '', kode: '', uraian: '', rincian: '', tindak_lanjut: 'Teguran Lisan', poin_min: 5, poin_max: 10, aktif: true });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setEditing(item);
    setFormData({ ...item });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, poin_min: Number(formData.poin_min) || 0, poin_max: Number(formData.poin_max) || 0 };
    if (payload.poin_max < payload.poin_min) { toast({ title: "Poin maksimum tidak boleh < minimum", variant: "destructive" }); return; }
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const filteredList = kodeList.filter(k => {
    if (!search) return true;
    const s = search.toLowerCase();
    return k.kode?.toLowerCase().includes(s) || k.uraian?.toLowerCase().includes(s) || k.kategori_utama?.toLowerCase().includes(s);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-700">
            <Database className="w-5 h-5" /> Database Kode Pelanggaran
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari kode/uraian/kategori..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); setFormData({ kategori_utama: '', kode: '', uraian: '', rincian: '', tindak_lanjut: 'Teguran Lisan', poin_min: 5, poin_max: 10, aktif: true }); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-1" /> Tambah
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 border rounded-xl p-4 bg-slate-50 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kategori Utama</Label>
                <select className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm" value={formData.kategori_utama} onChange={(e) => setFormData({ ...formData, kategori_utama: e.target.value })} required>
                  <option value="">Pilih Kategori</option>
                  {KATEGORI_UTAMA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Label>Kode</Label>
                <Input value={formData.kode} onChange={(e) => setFormData({ ...formData, kode: e.target.value })} placeholder="A-01, B-02.a, dll" required />
              </div>
            </div>
            <div>
              <Label>Uraian Pelanggaran</Label>
              <Input value={formData.uraian} onChange={(e) => setFormData({ ...formData, uraian: e.target.value })} required />
            </div>
            <div>
              <Label>Rincian</Label>
              <Textarea value={formData.rincian} onChange={(e) => setFormData({ ...formData, rincian: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tindak Lanjut</Label>
                <select className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm" value={formData.tindak_lanjut} onChange={(e) => setFormData({ ...formData, tindak_lanjut: e.target.value })}>
                  {TINDAK_LANJUT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Label>Poin Min</Label>
                <Input type="number" min="0" value={formData.poin_min} onChange={(e) => setFormData({ ...formData, poin_min: e.target.value })} required />
              </div>
              <div>
                <Label>Poin Max</Label>
                <Input type="number" min="0" value={formData.poin_max} onChange={(e) => setFormData({ ...formData, poin_max: e.target.value })} required />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">{editing ? 'Simpan' : 'Tambah'}</Button>
            </div>
          </form>
        )}

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredList.length === 0 ? (
            <p className="text-center py-8 text-slate-400">Belum ada data kode pelanggaran</p>
          ) : (
            filteredList.map(k => (
              <div key={k.id} className="border rounded-lg p-3 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className="bg-slate-700 text-white font-mono">{k.kode}</Badge>
                      <Badge variant="outline" className="text-xs">{k.kategori_utama}</Badge>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{k.poin_min}–{k.poin_max} poin</Badge>
                      <Badge variant="outline" className="text-xs">{k.tindak_lanjut}</Badge>
                      {!k.aktif && <Badge className="bg-slate-200 text-slate-500 text-xs">Nonaktif</Badge>}
                    </div>
                    <p className="text-sm font-medium text-slate-800">{k.uraian}</p>
                    {k.rincian && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{k.rincian}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(k)}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleteTarget(k)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          title="Hapus Kode Pelanggaran"
          description={`Hapus kode "${deleteTarget?.kode} - ${deleteTarget?.uraian}"?`}
        />
      </DialogContent>
    </Dialog>
  );
}