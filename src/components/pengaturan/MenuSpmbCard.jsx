import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { ClipboardList } from 'lucide-react';

export default function MenuSpmbCard({ pengaturan, isAdmin }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const aktif = pengaturan?.spmb_menu_aktif !== false;

  const simpan = useMutation({
    mutationFn: (val) =>
      pengaturan?.id
        ? base44.entities.PengaturanAplikasi.update(pengaturan.id, { spmb_menu_aktif: val })
        : base44.entities.PengaturanAplikasi.create({
            tahun_ajaran_aktif: pengaturan?.tahun_ajaran_aktif || '',
            spmb_menu_aktif: val,
          }),
    onSuccess: (_d, val) => {
      qc.invalidateQueries({ queryKey: ['pengaturan-aplikasi'] });
      toast({
        title: val ? 'Menu SPMB diaktifkan' : 'Menu SPMB dimatikan',
        description: val
          ? 'Menu SPMB kembali tampil di navigasi seluruh akun.'
          : 'Menu SPMB disembunyikan dari navigasi akun Guru & Operator. Akun Admin, TU, Kepala Sekolah, dan Bendahara tetap melihat menu SPMB.',
      });
    },
    onError: () => toast({ title: 'Gagal menyimpan', description: 'Coba lagi.', variant: 'destructive' }),
  });

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="w-5 h-5 text-rose-500" />
          Menu SPMB
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Tampilkan Menu SPMB</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Saat dimatikan, menu SPMB disembunyikan dari navigasi akun Guru &amp; Operator. Akun Admin, TU, Kepala Sekolah, dan Bendahara tetap melihat menu SPMB. Halaman SPMB tetap dapat dibuka lewat tautan langsung.
            </p>
          </div>
          <Switch checked={aktif} disabled={simpan.isPending} onCheckedChange={(v) => simpan.mutate(v)} />
        </div>
        <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 leading-relaxed">
          <b>Admin, TU, Kepala Sekolah, Bendahara</b> — seluruh submenu dan fitur (termasuk pengaturan Gelombang &amp; Biaya serta Finalisasi).<br />
          <b>Guru &amp; Operator</b> — Pendaftar, Wawancara, dan Pembayaran SPMB saja (dapat menambah dan mengubah data).
        </div>
      </CardContent>
    </Card>
  );
}