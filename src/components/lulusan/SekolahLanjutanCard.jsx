import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { GraduationCap, Loader2 } from "lucide-react";

export default function SekolahLanjutanCard({ siswa }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    jenis_sekolah_lanjutan: siswa?.jenis_sekolah_lanjutan || '',
    nama_sekolah_lanjutan: siswa?.nama_sekolah_lanjutan || '',
    npsn_sekolah_lanjutan: siswa?.npsn_sekolah_lanjutan || '',
    alamat_sekolah_lanjutan: siswa?.alamat_sekolah_lanjutan || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.DataLulusan.update(siswa.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataLulusan'] });
      queryClient.invalidateQueries({ queryKey: ['riwayat'] });
      toast({ title: "Data sekolah lanjutan disimpan" });
      setEditing(false);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const hasData = siswa?.nama_sekolah_lanjutan || siswa?.jenis_sekolah_lanjutan;

  return (
    <div className="border border-indigo-200 bg-indigo-50/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-500" />
          <p className="text-sm font-semibold text-slate-700">Sekolah Lanjutan</p>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-7 text-xs">
            {hasData ? 'Edit' : 'Tambah'}
          </Button>
        )}
      </div>

      {!editing ? (
        hasData ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div><p className="text-xs text-slate-500">Jenis Sekolah</p><p className="text-sm text-slate-800">{siswa.jenis_sekolah_lanjutan || '-'}</p></div>
            <div><p className="text-xs text-slate-500">Nama Sekolah</p><p className="text-sm text-slate-800">{siswa.nama_sekolah_lanjutan || '-'}</p></div>
            <div><p className="text-xs text-slate-500">NPSN</p><p className="text-sm text-slate-800">{siswa.npsn_sekolah_lanjutan || '-'}</p></div>
            <div className="col-span-2"><p className="text-xs text-slate-500">Alamat Sekolah</p><p className="text-sm text-slate-800">{siswa.alamat_sekolah_lanjutan || '-'}</p></div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Belum ada data sekolah lanjutan.</p>
        )
      ) : (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Jenis Sekolah</Label>
            <Select value={form.jenis_sekolah_lanjutan} onValueChange={(v) => setForm({ ...form, jenis_sekolah_lanjutan: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SMA">SMA</SelectItem>
                <SelectItem value="SMK">SMK</SelectItem>
                <SelectItem value="MA">MA</SelectItem>
                <SelectItem value="PONPES">PONPES</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Nama Sekolah</Label><Input value={form.nama_sekolah_lanjutan} onChange={(e) => setForm({ ...form, nama_sekolah_lanjutan: e.target.value })} placeholder="Nama sekolah lanjutan" /></div>
          <div><Label className="text-xs">NPSN Sekolah</Label><Input value={form.npsn_sekolah_lanjutan} onChange={(e) => setForm({ ...form, npsn_sekolah_lanjutan: e.target.value })} placeholder="NPSN" /></div>
          <div><Label className="text-xs">Alamat Sekolah</Label><Input value={form.alamat_sekolah_lanjutan} onChange={(e) => setForm({ ...form, alamat_sekolah_lanjutan: e.target.value })} placeholder="Alamat sekolah" /></div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Batal</Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              Simpan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}