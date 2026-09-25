import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Wand2, Save, Link2, Target } from 'lucide-react';
import { cariTemplate } from '@/lib/mapelTemplate';

/**
 * Pengaturan PTS — 2 tab:
 * 1. Pemetaan Mapel: Mapel database -> baris Rapor LHBS & kolom Legger (entity Mapel)
 * 2. KKM PTS: KKM seluruh mapel untuk perhitungan Predikat & status ketuntasan (entity PengaturanAplikasi)
 */
export default function PemetaanMapelDialog({ open, onOpenChange, mapelList, kkmPts, onSaveKkm }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [kkmLocal, setKkmLocal] = useState(75);
  const [savingKkm, setSavingKkm] = useState(false);

  useEffect(() => {
    if (open) {
      setRows(mapelList.map(m => ({
        id: m.id,
        nama: m.nama,
        nama_di_rapor: m.nama_di_rapor || '',
        kelompok_rapor: m.kelompok_rapor || 'Nasional',
        kode_legger: m.kode_legger || '',
        urutan_rapor: m.urutan_rapor || '',
      })));
      setKkmLocal(Number(kkmPts) || 75);
    }
  }, [open, mapelList, kkmPts]);

  const set = (id, field, val) => setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: val } : r)));

  const sinkronTemplate = () => {
    let cocok = 0;
    setRows(prev => prev.map(r => {
      const t = cariTemplate(r.nama);
      if (!t) return r;
      cocok++;
      return { ...r, nama_di_rapor: t.label, kelompok_rapor: t.kelompok, kode_legger: t.kode, urutan_rapor: t.urutan };
    }));
    toast({
      title: `Template diterapkan pada ${cocok} mapel`,
      description: 'Periksa hasilnya lalu tekan Simpan Pemetaan agar tersimpan permanen.',
    });
  };

  const simpan = async () => {
    setSaving(true);
    try {
      await base44.entities.Mapel.bulkUpdate(rows.map(r => ({
        id: r.id,
        nama_di_rapor: (r.nama_di_rapor || '').trim(),
        kelompok_rapor: (r.nama_di_rapor || '').trim() ? r.kelompok_rapor : '',
        kode_legger: (r.kode_legger || '').trim(),
        urutan_rapor: r.urutan_rapor !== '' && r.urutan_rapor != null ? Number(r.urutan_rapor) : 0,
      })));
      await queryClient.invalidateQueries({ queryKey: ['mapel-list'] });
      toast({ title: 'Pemetaan mapel tersimpan' });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Gagal menyimpan pemetaan', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const simpanKkm = async () => {
    const v = Number(kkmLocal);
    if (!v || v < 0 || v > 100) {
      toast({ title: 'KKM tidak valid', description: 'Isi angka 0-100.', variant: 'destructive' });
      return;
    }
    setSavingKkm(true);
    try {
      await onSaveKkm(v);
      toast({ title: `KKM PTS disimpan: ${v}` });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Gagal menyimpan KKM', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setSavingKkm(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4 text-amber-500" /> Pengaturan PTS
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="pemetaan" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="pemetaan">Pemetaan Mapel</TabsTrigger>
            <TabsTrigger value="kkm">KKM PTS</TabsTrigger>
          </TabsList>

          {/* Tab 1: Pemetaan Mapel */}
          <TabsContent value="pemetaan" className="flex-1 min-h-0 flex flex-col mt-3">
            <p className="text-xs text-slate-500 mb-2">
              Petakan setiap mapel database ke baris Rapor resmi. Mapel yang dipetakan ke baris yang sama akan digabung (rata-rata) — contoh: Seni Musik + Seni Rupa → Seni Budaya. Kosongkan Nama di Rapor untuk mengecualikan mapel.
            </p>
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Mapel Database</th>
                    <th className="px-2 py-2 font-medium">Nama di Rapor</th>
                    <th className="px-2 py-2 font-medium">Kelompok</th>
                    <th className="px-2 py-2 font-medium">Kode Legger</th>
                    <th className="px-2 py-2 font-medium w-16">Urutan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Belum ada data mapel.</td></tr>
                  )}
                  {rows.map(r => (
                    <tr key={r.id} className={r.nama_di_rapor ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-3 py-1.5 font-semibold text-slate-700 whitespace-nowrap">{r.nama}</td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={r.nama_di_rapor}
                          onChange={(e) => set(r.id, 'nama_di_rapor', e.target.value)}
                          placeholder="(tidak tampil)"
                          className="h-7 text-xs rounded-lg"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select value={r.kelompok_rapor || 'Nasional'} onValueChange={(v) => set(r.id, 'kelompok_rapor', v)}>
                          <SelectTrigger className="h-7 text-xs rounded-lg w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Nasional">Nasional</SelectItem>
                            <SelectItem value="Mulok">Mulok</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={r.kode_legger}
                          onChange={(e) => set(r.id, 'kode_legger', e.target.value.toUpperCase())}
                          placeholder="cth: PAI"
                          className="h-7 text-xs rounded-lg w-20"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          value={r.urutan_rapor}
                          onChange={(e) => set(r.id, 'urutan_rapor', e.target.value)}
                          className="h-7 text-xs rounded-lg"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 pt-3">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={sinkronTemplate}>
                <Wand2 className="w-4 h-4" /> Sinkronkan Default Template
              </Button>
              <Button size="sm" className="gap-1.5 ml-auto bg-amber-500 hover:bg-amber-600 text-white" disabled={saving} onClick={simpan}>
                <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Pemetaan'}
              </Button>
            </div>
          </TabsContent>

          {/* Tab 2: KKM PTS */}
          <TabsContent value="kkm" className="mt-3">
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">KKM PTS — Seluruh Mata Pelajaran</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dipakai untuk kolom KKM Rapor LHBS, status Tuntas/Belum Tuntas, dan hitungan Predikat (Baik &gt; 80, Cukup mulai KKM, Kurang di bawah KKM).
                </p>
              </div>
            </div>
            <div className="mt-4 max-w-xs">
              <Label className="text-xs text-slate-500">KKM PTS</Label>
              <Input
                type="number" min="0" max="100"
                value={kkmLocal}
                onChange={(e) => setKkmLocal(e.target.value)}
                className="mt-1 text-center text-lg font-bold"
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white" disabled={savingKkm} onClick={simpanKkm}>
                <Save className="w-4 h-4" /> {savingKkm ? 'Menyimpan...' : 'Simpan KKM PTS'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}