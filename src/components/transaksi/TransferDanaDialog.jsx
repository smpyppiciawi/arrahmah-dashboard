import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeftRight, Wallet } from "lucide-react";
import RupiahInput from '@/components/ui/RupiahInput';
import { format } from 'date-fns';

export default function TransferDanaDialog({ open, onOpenChange, sumberDanaList, keuanganList, transferDanaList, currentUser }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    dari_sumber_dana: '',
    ke_sumber_dana: '',
    nominal: '',
    keterangan: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        tanggal: format(new Date(), 'yyyy-MM-dd'),
        dari_sumber_dana: '',
        ke_sumber_dana: '',
        nominal: '',
        keterangan: '',
      });
    }
  }, [open]);

  const saldoPerSumberDana = useMemo(() => {
    const map = {};
    sumberDanaList.forEach(s => { map[s.nama] = 0; });
    keuanganList.forEach(k => {
      if (!k.sumber_rekening) return;
      if (!map[k.sumber_rekening]) map[k.sumber_rekening] = 0;
      map[k.sumber_rekening] += k.jenis === 'Pemasukan' ? (k.jumlah || 0) : -(k.jumlah || 0);
    });
    transferDanaList.forEach(t => {
      if (!map[t.dari_sumber_dana]) map[t.dari_sumber_dana] = 0;
      if (!map[t.ke_sumber_dana]) map[t.ke_sumber_dana] = 0;
      map[t.dari_sumber_dana] -= (t.nominal || 0);
      map[t.ke_sumber_dana] += (t.nominal || 0);
    });
    return map;
  }, [sumberDanaList, keuanganList, transferDanaList]);

  const formatRupiah = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

  const selectedDariSaldo = form.dari_sumber_dana ? (saldoPerSumberDana[form.dari_sumber_dana] || 0) : 0;
  const nominalNum = Number(form.nominal) || 0;
  const isInsufficient = nominalNum > selectedDariSaldo;
  const isSameAccount = form.dari_sumber_dana && form.dari_sumber_dana === form.ke_sumber_dana;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TransferDana.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-dana'] });
      queryClient.invalidateQueries({ queryKey: ['keuangan'] });
      toast({ title: "Transfer dana berhasil" });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.dari_sumber_dana || !form.ke_sumber_dana) {
      toast({ title: "Pilih sumber dana asal dan tujuan", variant: "destructive" });
      return;
    }
    if (isSameAccount) {
      toast({ title: "Sumber dana asal dan tujuan tidak boleh sama", variant: "destructive" });
      return;
    }
    if (nominalNum <= 0) {
      toast({ title: "Nominal harus lebih dari 0", variant: "destructive" });
      return;
    }
    if (isInsufficient) {
      toast({ title: "Saldo tidak mencukupi", description: `Saldo ${form.dari_sumber_dana}: ${formatRupiah(selectedDariSaldo)}`, variant: "destructive" });
      return;
    }
    createMutation.mutate({
      ...form,
      nominal: nominalNum,
      pencatat: currentUser?.full_name || '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-teal-600" />
            Transfer Dana Antar Sumber Dana
          </DialogTitle>
        </DialogHeader>

        {/* Saldo per Sumber Dana */}
        <div className="mb-4">
          <Label className="text-xs text-slate-500 uppercase font-semibold">Saldo Sumber Dana Saat Ini</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {sumberDanaList.map(s => {
              const saldo = saldoPerSumberDana[s.nama] || 0;
              const isSelectedDari = form.dari_sumber_dana === s.nama;
              return (
                <div key={s.id} className={`rounded-lg p-2.5 border ${isSelectedDari ? 'bg-teal-50 border-teal-300' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Wallet className="w-3 h-3 text-teal-500" />
                    <p className="text-xs text-slate-500 truncate">{s.nama}</p>
                  </div>
                  <p className={`text-sm font-bold ${saldo >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatRupiah(saldo)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dari (Asal)</Label>
              <Select value={form.dari_sumber_dana} onValueChange={(v) => setForm({ ...form, dari_sumber_dana: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih sumber dana" /></SelectTrigger>
                <SelectContent>
                  {sumberDanaList.map(s => (
                    <SelectItem key={s.id} value={s.nama}>{s.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.dari_sumber_dana && (
                <p className={`text-xs mt-1 ${selectedDariSaldo >= 0 ? 'text-slate-500' : 'text-red-500'}`}>
                  Saldo: {formatRupiah(selectedDariSaldo)}
                </p>
              )}
            </div>
            <div>
              <Label>Ke (Tujuan)</Label>
              <Select value={form.ke_sumber_dana} onValueChange={(v) => setForm({ ...form, ke_sumber_dana: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih sumber dana" /></SelectTrigger>
                <SelectContent>
                  {sumberDanaList.filter(s => s.nama !== form.dari_sumber_dana).map(s => (
                    <SelectItem key={s.id} value={s.nama}>{s.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isSameAccount && (
            <p className="text-xs text-red-500">Sumber dana asal dan tujuan tidak boleh sama</p>
          )}

          <div>
            <Label>Tanggal</Label>
            <Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required />
          </div>

          <div>
            <Label>Nominal Transfer</Label>
            <RupiahInput value={form.nominal} onChange={(val) => setForm({ ...form, nominal: val })} placeholder="0" required />
            {isInsufficient && nominalNum > 0 && (
              <p className="text-xs text-red-500 mt-1">Saldo tidak mencukupi! Sisa saldo: {formatRupiah(selectedDariSaldo)}</p>
            )}
          </div>

          <div>
            <Label>Keterangan</Label>
            <Textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} rows={2} placeholder="Keterangan transfer (opsional)" />
          </div>

          <div>
            <Label>Pencatat</Label>
            <Input value={currentUser?.full_name || ''} readOnly className="bg-slate-50" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Batal</Button>
            <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={isInsufficient || isSameAccount || nominalNum <= 0 || !form.dari_sumber_dana || !form.ke_sumber_dana}>
              <ArrowLeftRight className="w-4 h-4 mr-2" /> Transfer Dana
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}