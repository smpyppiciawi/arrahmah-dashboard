import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Scale, Save, History, AlertTriangle, Loader2 } from "lucide-react";
import { normalizeRaporConfig } from '@/lib/raporStatus';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const FIELDS = [
  { key: 'kuning_poin', label: 'Poin Rapor Kuning', hint: 'Akumulasi poin bersih untuk status Kuning' },
  { key: 'merah_poin', label: 'Poin Rapor Merah', hint: 'Akumulasi poin bersih untuk status Merah' },
  { key: 'hitam_poin', label: 'Poin Rapor Hitam', hint: 'Akumulasi poin bersih untuk status Hitam' },
  { key: 'naik_kuning_merah', label: 'Kenaikan Kuning → Merah', hint: 'Poin baru selama masa Kuning' },
  { key: 'naik_merah_hitam', label: 'Kenaikan Merah → Hitam', hint: 'Poin baru selama masa Merah' },
  { key: 'kuning_hari', label: 'Masa Berlaku Kuning (hari)', hint: 'Dihitung sejak status ditetapkan' },
  { key: 'merah_hari', label: 'Masa Berlaku Merah (hari)', hint: 'Dihitung sejak status ditetapkan' },
];

function validate(v) {
  const errs = [];
  const num = (k) => Number(v[k]);
  FIELDS.forEach((f) => {
    const n = num(f.key);
    if (!Number.isFinite(n) || n < 1) errs.push(`${f.label} minimal 1`);
  });
  if (num('kuning_poin') >= num('merah_poin')) errs.push('Poin Rapor Kuning harus lebih kecil dari Poin Rapor Merah');
  if (num('merah_poin') >= num('hitam_poin')) errs.push('Poin Rapor Merah harus lebih kecil dari Poin Rapor Hitam');
  return errs;
}

export default function RaporLimitSettings({ canEdit = false, currentUser }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pengaturanId, setPengaturanId] = useState(null);
  const [riwayat, setRiwayat] = useState([]);
  const [form, setForm] = useState(() => normalizeRaporConfig(null));

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.PengaturanImprovement.list();
      const p = list?.[0] || null;
      setPengaturanId(p?.id || null);
      setForm(normalizeRaporConfig(p));
      const hist = await base44.entities.RiwayatPengaturanRapor.list('-tanggal');
      setRiwayat((Array.isArray(hist) ? hist : hist?.items) || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const errors = useMemo(() => validate(form), [form]);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (errors.length) return;
    setSaving(true);
    try {
      const sebelum = normalizeRaporConfig(await base44.entities.PengaturanImprovement.list().then((l) => l?.[0]));
      const payload = {
        rapor_kuning_poin: Number(form.kuning_poin),
        rapor_merah_poin: Number(form.merah_poin),
        rapor_hitam_poin: Number(form.hitam_poin),
        rapor_naik_kuning_merah_poin: Number(form.naik_kuning_merah),
        rapor_naik_merah_hitam_poin: Number(form.naik_merah_hitam),
        rapor_kuning_hari: Number(form.kuning_hari),
        rapor_merah_hari: Number(form.merah_hari),
        rapor_mode_kenaikan: form.mode_kenaikan,
      };
      if (pengaturanId) {
        await base44.entities.PengaturanImprovement.update(pengaturanId, payload);
      } else {
        const created = await base44.entities.PengaturanImprovement.create({ limit_mingguan_universal: 30, ...payload });
        setPengaturanId(created?.id || null);
      }
      const berubah = FIELDS.filter((f) => Number(sebelum[f.key]) !== Number(form[f.key]));
      const ringkasanBagian = berubah.map((f) => `${f.label}: ${sebelum[f.key]} → ${form[f.key]}`);
      if (sebelum.mode_kenaikan !== form.mode_kenaikan) {
        ringkasanBagian.push(`Mekanisme kenaikan: ${sebelum.mode_kenaikan} → ${form.mode_kenaikan}`);
      }
      if (ringkasanBagian.length) {
        await base44.entities.RiwayatPengaturanRapor.create({
          tanggal: new Date().toISOString(),
          diubah_oleh: currentUser?.full_name || '',
          ringkasan: ringkasanBagian.join(' · '),
          sebelum,
          sesudah: { ...form },
        });
      }
      queryClient.invalidateQueries({ queryKey: ['pengaturan-improvement'] });
      queryClient.invalidateQueries({ queryKey: ['pengaturan-improvement-pelanggaran'] });
      toast({ title: 'Pengaturan rapor disimpan', description: 'Aturan baru berlaku untuk perhitungan berikutnya.' });
      await load();
    } catch (e) {
      toast({ title: 'Gagal menyimpan pengaturan', variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="py-6 text-center text-slate-400 text-sm flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Memuat aturan rapor...</div>;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-amber-800 flex items-center gap-2"><Scale className="w-4 h-4" /> Atur Limit Rapor Tata Tertib</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Kenaikan status naik satu tingkat setiap kali poin baru selama masa rapor mencapai batas tambahan.
          </p>
        </div>
        <Badge className={form.mode_kenaikan === 'Otomatis' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}>
          {form.mode_kenaikan}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <Label className="text-xs text-slate-600">{f.label}</Label>
            <Input
              type="number"
              min="1"
              value={form[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              disabled={!canEdit}
              className="h-9 bg-white"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">{f.hint}</p>
          </div>
        ))}
        <div>
          <Label className="text-xs text-slate-600">Mekanisme Kenaikan Status</Label>
          <Select value={form.mode_kenaikan} onValueChange={(v) => set('mode_kenaikan', v)} disabled={!canEdit}>
            <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Otomatis">Otomatis — langsung diterapkan sistem</SelectItem>
              <SelectItem value="Persetujuan">Persetujuan — admin / kesiswaan / kurikulum</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-slate-500 mt-0.5">Mode persetujuan menahan kenaikan sampai disetujui</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 space-y-0.5">
          {errors.map((e) => (
            <p key={e} className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3 shrink-0" /> {e}</p>
          ))}
        </div>
      )}

      {canEdit && (
        <Button onClick={handleSave} disabled={saving || errors.length > 0} className="bg-amber-600 hover:bg-amber-700">
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Simpan Aturan Rapor
        </Button>
      )}

      {riwayat.length > 0 && (
        <div className="border-t border-amber-200 pt-3">
          <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1.5"><History className="w-3.5 h-3.5" /> Riwayat Perubahan Pengaturan</p>
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {riwayat.slice(0, 8).map((r) => (
              <div key={r.id} className="rounded-lg bg-white/80 border border-amber-100 px-2 py-1.5">
                <p className="text-[10px] text-slate-400">
                  {r.tanggal ? format(parseISO(r.tanggal), 'd MMM yyyy HH:mm', { locale: idLocale }) : '-'} · {r.diubah_oleh || '-'}
                </p>
                <p className="text-xs text-slate-600">{r.ringkasan}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}