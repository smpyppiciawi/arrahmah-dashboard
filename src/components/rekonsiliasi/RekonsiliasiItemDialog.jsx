import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Link2, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function RekonsiliasiItemDialog({ item, onClose }) {
  const [kandidatId, setKandidatId] = useState(
    item.jenis === 'NIS Tidak Sesuai' && (item.kandidat || []).length > 0 ? item.kandidat[0].siswa_id : ''
  );
  const [catatan, setCatatan] = useState('');
  const [tutup] = useState(false);

  const terapkan = useMutation({
    mutationFn: (payload) => base44.functions.invoke('terapkanRekonsiliasi', payload),
    onSuccess: (res) => {
      toast({ title: 'Berhasil', description: `Status item: ${res?.status || 'diperbarui'}.` });
      onClose();
    },
    onError: (err) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  });

  const isNisDup = item.jenis === 'NIS Duplikat';
  const bisaTaut = !isNisDup && (item.kandidat || []).length > 0;

  return (
    <Dialog open={!tutup} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">{item.jenis}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bukti temuan */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge className="bg-white border border-slate-200 text-slate-700">{item.status}</Badge>
              {item.jumlah > 0 && <span className="font-semibold">{formatRupiah(item.jumlah)}</span>}
            </div>
            <p className="text-sm font-medium text-slate-800">{item.nama || '-'}{item.nis ? ` · NIS ${item.nis}` : ''}</p>
            <p className="text-xs text-slate-600">{item.uraian}</p>
            {item.detail && <p className="text-xs text-slate-500">{item.detail}</p>}
            <p className="text-[11px] text-slate-400">Sumber: {item.ref_entity} · ID {item.ref_id}</p>
          </div>

          {isNisDup && (
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                NIS duplikat diperbaiki manual lewat menu Siswa (verifikasi identitas via Riwayat UID, lalu ubah NIS salah satu).
                Tutup item ini setelah NIS diperbaiki.
              </p>
            </div>
          )}

          {item.jenis === 'NIS Tidak Sesuai' && (item.kandidat || []).length > 0 && (() => {
            const k = item.kandidat[0];
            const cocokNama = (k.nama || '').toLowerCase() === (item.nama || '').toLowerCase();
            const cocokKelas = (k.nama_kelas || '') === (item.nama_kelas || '');
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-blue-900">Perbandingan Data Transaksi vs Siswa Saat Ini</p>
                <div className="text-xs text-blue-900 space-y-0.5">
                  <p>NIS Transaksi: <span className="font-semibold">{item.nis || '-'}</span> · NIS Siswa: <span className="font-semibold">{k.nis || '-'}</span></p>
                  <p>Nama: {item.nama || '-'} {cocokNama ? '✓' : '✗'} · Kelas: {item.nama_kelas || '-'} / {k.nama_kelas || '-'} {cocokKelas ? '✓' : '✗'}</p>
                </div>
                <p className="text-[11px] text-blue-700">
                  Jika data lainnya (nama/kelas) cocok dan hanya NIS-nya berbeda, tekan "Siswa Sama". Seluruh riwayat transaksi siswa ini akan otomatis disamakan dengan NIS/Nama/Kelas saat ini.
                </p>
              </div>
            );
          })()}

          {/* Kandidat */}
          {bisaTaut && (
            <div>
              <Label className="text-xs font-semibold text-slate-700">Kandidat Siswa — pilih satu lalu konfirmasi</Label>
              <div className="mt-2 space-y-1.5">
                {item.kandidat.map((k) => (
                  <label
                    key={k.siswa_id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      kandidatId === k.siswa_id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="kandidat"
                      className="mt-0.5"
                      checked={kandidatId === k.siswa_id}
                      onChange={() => setKandidatId(k.siswa_id)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{k.nama}{k.nis ? ` · NIS ${k.nis}` : ''} <span className="text-slate-400 text-xs">{k.nama_kelas}</span></p>
                      <p className="text-[11px] text-slate-500">Cocok: {k.alasan}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-slate-700">Catatan Admin</Label>
            <Textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan penanganan (opsional)"
              className="mt-1.5"
              rows={2}
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => terapkan.mutate({ queue_id: item.id, tindakan: 'tunda', catatan })} disabled={terapkan.isPending}>
              <Clock className="w-3.5 h-3.5 mr-1" /> Tunda
            </Button>
            <Button size="sm" variant="outline" onClick={() => terapkan.mutate({ queue_id: item.id, tindakan: 'selesai', catatan })} disabled={terapkan.isPending}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Tutup Tanpa Taut
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => terapkan.mutate({ queue_id: item.id, tindakan: 'taut', siswa_id: kandidatId, catatan })}
              disabled={terapkan.isPending || (bisaTaut && !kandidatId)}
            >
              {terapkan.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Link2 className="w-3.5 h-3.5 mr-1" />}
              {item.jenis === 'NIS Tidak Sesuai' ? 'Siswa Sama — Perbarui NIS & Riwayat' : 'Konfirmasi Tautan'}
            </Button>
          </div>
          {bisaTaut && !kandidatId && (
            <p className="text-[11px] text-slate-400 text-right">Pilih kandidat siswa untuk mengaktifkan tautan.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}