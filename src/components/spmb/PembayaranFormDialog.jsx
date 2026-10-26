import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';
import RupiahInput from '@/components/ui/RupiahInput';
import { JENIS_PEMBIAYAAN } from '@/lib/spmbDaftar';
import { fmtRp } from '@/lib/spmbUtils';

export default function PembayaranFormDialog({ open, onOpenChange, pendaftar, pendaftarList, gelombangList, tahunAjaran, picName, onSaved }) {
  const { toast } = useToast();
  const [pendaftarId, setPendaftarId] = useState('');
  const [gelombangId, setGelombangId] = useState('');
  const [jenis, setJenis] = useState('Biaya Pendaftaran');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [nominal, setNominal] = useState('');
  const [catatan, setCatatan] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPendaftarId(pendaftar?.id || '');
      setGelombangId(pendaftar?.gelombang_id || '');
      setJenis('Biaya Pendaftaran');
      setTanggal(new Date().toISOString().slice(0, 10));
      setNominal(pendaftar?.biaya_tertagih ? String(pendaftar.biaya_tertagih) : '');
      setCatatan('');
    }
  }, [open, pendaftar]);

  const pilihGelombang = (id) => {
    setGelombangId(id);
    const g = (gelombangList || []).find((x) => x.id === id);
    if (g?.biaya) setNominal(String(g.biaya));
  };

  const handleSave = async () => {
    const target = pendaftar?.id ? pendaftar : (pendaftarList || []).find((p) => p.id === pendaftarId);
    if (!target) { toast({ title: 'Pilih pendaftar dulu', variant: 'destructive' }); return; }
    const jml = Number(nominal) || 0;
    if (jml <= 0) { toast({ title: 'Nominal wajib diisi', variant: 'destructive' }); return; }

    setBusy(true);
    try {
      const paymentId = `SPMB-${target.reg_number}-${Date.now()}`;
      const gelombang = (gelombangList || []).find((x) => x.id === gelombangId);
      const keu = await base44.entities.Keuangan.create({
        tanggal,
        jenis: 'Pemasukan',
        tipe_transaksi: 'Daftar Ulang',
        kategori: 'Daftar Ulang',
        uraian: `SPMB ${target.reg_number} — ${target.nama} (${jenis}${gelombang ? ' · ' + gelombang.nama : ''})${catatan ? ' — ' + catatan : ''}`,
        jumlah: jml,
        siswa_id: target.finalized && target.siswa_id ? target.siswa_id : '',
        ref_payment_id: paymentId,
        nama_siswa: target.nama,
        sumber_rekening: 'SPMB',
        pic: picName || 'Petugas SPMB',
        status_bayar: 'Lunas',
        tahun_ajaran: tahunAjaran || '',
      });

      const list = Array.isArray(target.pembayaran) ? [...target.pembayaran] : [];
      list.push({ payment_id: paymentId, tanggal, jenis, nominal: jml, catatan, keuangan_id: keu.id });
      const total = list.reduce((a, p) => a + (Number(p.nominal) || 0), 0);
      await base44.entities.SiswaSPMB.update(target.id, {
        pembayaran: list,
        total_dibayar: total,
        payment_status: total >= (Number(target.biaya_tertagih) || 0) && (Number(target.biaya_tertagih) || 0) > 0 ? 'Lunas' : target.payment_status || '',
      });

      toast({ title: 'Pembayaran tercatat', description: `${fmtRp(jml)} — ${target.nama} (masuk Buku Kas)` });
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Gagal menyimpan pembayaran', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Input Pembayaran SPMB</DialogTitle>
          <DialogDescription>Pembayaran otomatis tercatat pada Transaksi Bendahara.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!pendaftar?.id && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Pendaftar</Label>
              <Select value={pendaftarId} onValueChange={setPendaftarId}>
                <SelectTrigger><SelectValue placeholder="Pilih pendaftar..." /></SelectTrigger>
                <SelectContent>
                  {(pendaftarList || []).map((p) => <SelectItem key={p.id} value={p.id}>{p.nama} — {p.reg_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {pendaftar?.id && (
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <p className="font-semibold text-slate-800">{pendaftar.nama}</p>
              <p className="text-xs text-slate-500 font-mono">{pendaftar.reg_number} · dibayar {fmtRp(pendaftar.total_dibayar)}</p>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Gelombang</Label>
            <Select value={gelombangId} onValueChange={pilihGelombang}>
              <SelectTrigger><SelectValue placeholder="Pilih gelombang..." /></SelectTrigger>
              <SelectContent>
                {(gelombangList || []).map((g) => <SelectItem key={g.id} value={g.id}>{g.nama}{g.biaya ? ` — ${fmtRp(g.biaya)}` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Jenis Pembiayaan</Label>
              <Select value={jenis} onValueChange={setJenis}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{JENIS_PEMBIAYAAN.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Tanggal</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Nominal</Label>
            <RupiahInput value={nominal} onChange={setNominal} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Catatan</Label>
            <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Opsional" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}