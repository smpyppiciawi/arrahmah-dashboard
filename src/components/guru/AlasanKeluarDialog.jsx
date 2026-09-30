import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut } from "lucide-react";

const ALASAN_OPTIONS = ['Resign', 'Mutasi', 'Pensiun', 'Meninggal Dunia', 'Lainnya'];

export default function AlasanKeluarDialog({ open, onOpenChange, namaPegawai, onConfirm, saving }) {
  const [alasan, setAlasan] = useState('');
  const [alasanText, setAlasanText] = useState('');
  const [tanggal, setTanggal] = useState('');

  useEffect(() => {
    if (open) {
      setAlasan('');
      setAlasanText('');
      setTanggal(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const canSave = alasan && (alasan !== 'Lainnya' || alasanText.trim());

  const handleSimpan = () => {
    if (!canSave) return;
    onConfirm({
      alasan_keluar: alasan === 'Lainnya' ? alasanText.trim() : alasan,
      tanggal_keluar: tanggal,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5 text-rose-500" /> Alasan Keluar
          </DialogTitle>
          <DialogDescription>
            {namaPegawai ? `Pegawai: ${namaPegawai} — ` : ''}tentukan alasan dan tanggal efektif keluar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Alasan Keluar</Label>
            <Select value={alasan} onValueChange={setAlasan}>
              <SelectTrigger><SelectValue placeholder="Pilih alasan keluar" /></SelectTrigger>
              <SelectContent>
                {ALASAN_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {alasan === 'Lainnya' && (
            <div>
              <Label>Tuliskan Alasan</Label>
              <Input
                value={alasanText}
                onChange={(e) => setAlasanText(e.target.value)}
                placeholder="Ketik alasan keluar..."
                autoFocus
              />
            </div>
          )}
          <div>
            <Label>Tanggal Keluar</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="flex-1 bg-rose-600 hover:bg-rose-700"
              disabled={!canSave || saving}
              onClick={handleSimpan}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}