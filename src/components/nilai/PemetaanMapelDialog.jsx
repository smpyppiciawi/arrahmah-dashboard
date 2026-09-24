import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Wand2, Save, Link2 } from 'lucide-react';
import { cariTemplate } from '@/lib/mapelTemplate';

/**
 * Dialog pemetaan Mapel database -> baris Mapel Rapor LHBS & kolom Legger.
 * Pemetaan disimpan pada entity Mapel (nama_di_rapor, kelompok_rapor, kode_legger, urutan_rapor).
 */
export default function PemetaanMapelDialog({ open, onOpenChange, mapelList }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

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
    }
  }, [open, mapelList]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4 text-amber-500" /> Pemetaan Mapel Database → Mapel Rapor (LHBS)
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 -mt-1">
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
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" className="gap-1.5 mr-auto" onClick={sinkronTemplate}>
            <Wand2 className="w-4 h-4" /> Sinkronkan Default Template
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white" disabled={saving} onClick={simpan}>
            <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Pemetaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}