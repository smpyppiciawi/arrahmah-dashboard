import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/lib/AuthContext';
import { ClipboardCheck, CheckCircle, BookOpen, User, Calendar, MapPin } from "lucide-react";

export default function TugasPiketTab() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [detail, setDetail] = useState(null);

  const { data: tugasList = [] } = useQuery({
    queryKey: ['tugas-materi'],
    queryFn: () => base44.entities.TugasMateri.list('-tanggal', 200),
  });

  const verifyMutation = useMutation({
    mutationFn: async (tugas) => {
      await base44.entities.TugasMateri.update(tugas.id, {
        status_verifikasi: 'Sudah Diverifikasi',
        verifikator_id: currentUser?.id || '',
        verifikator_nama: currentUser?.full_name || '',
        verifikasi_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({ title: 'Tugas terverifikasi', description: 'Tugas sudah disampaikan ke kelas tujuan.' });
      setDetail(null);
      queryClient.invalidateQueries({ queryKey: ['tugas-materi'] });
    },
    onError: (err) => toast({ title: 'Gagal verifikasi', description: err.message, variant: 'destructive' }),
  });

  const belumVerifikasi = tugasList.filter(t => t.status_verifikasi !== 'Sudah Diverifikasi');
  const sudahVerifikasi = tugasList.filter(t => t.status_verifikasi === 'Sudah Diverifikasi');

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-500" /> Tugas Belum Diverifikasi ({belumVerifikasi.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {belumVerifikasi.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-4">Tidak ada tugas menunggu verifikasi</p>
          ) : belumVerifikasi.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800 truncate">{t.nama_guru}</p>
                  {t.jenis_izin && <Badge className="bg-blue-100 text-blue-700">{t.jenis_izin}</Badge>}
                </div>
                <p className="text-xs text-slate-500">{t.jabatan} · {format(new Date(t.tanggal), 'd MMM yyyy', { locale: idLocale })}</p>
                <p className="text-xs text-slate-600 mt-0.5">Izin: "{t.keterangan_izin || '-'}"</p>
                <p className="text-xs text-slate-700 mt-0.5">Mapel: {t.mapel || '-'} · Kelas: {t.kelas_tujuan}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setDetail(t)}>Detail</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> Sudah Diverifikasi ({sudahVerifikasi.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sudahVerifikasi.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-4">Belum ada tugas terverifikasi</p>
          ) : sudahVerifikasi.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-700 truncate">{t.nama_guru}</p>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                </div>
                <p className="text-xs text-slate-500">{format(new Date(t.tanggal), 'd MMM yyyy', { locale: idLocale })} · {t.kelas_tujuan}</p>
                {t.verifikator_nama && <p className="text-[10px] text-slate-400 mt-0.5">Diverifikasi oleh {t.verifikator_nama}</p>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setDetail(t)}>Detail</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-emerald-500" /> Detail Tugas Materi
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{detail.nama_guru}</p>
                  <p className="text-xs text-slate-500">{detail.jabatan} · {detail.nip || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700">{detail.hari}, {format(new Date(detail.tanggal), 'd MMM yyyy', { locale: idLocale })}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-slate-500">Keterangan Izin Absensi</p>
                <p className="text-sm text-slate-700">{detail.keterangan_izin || '-'} {detail.jenis_izin ? `(${detail.jenis_izin})` : ''}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600">Mata Pelajaran</p>
                  <p className="text-sm font-medium text-blue-800">{detail.mapel || '-'}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-600">Kelas Tujuan</p>
                  <p className="text-sm font-medium text-emerald-800 flex items-center gap-1"><MapPin className="w-3 h-3" />{detail.kelas_tujuan}</p>
                </div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-amber-600 mb-1">Keterangan Tugas</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{detail.keterangan_tugas}</p>
              </div>
              <div>
                <Badge className={detail.status_verifikasi === 'Sudah Diverifikasi' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                  {detail.status_verifikasi}
                </Badge>
                {detail.verifikator_nama && <p className="text-[10px] text-slate-400 mt-1">Oleh {detail.verifikator_nama}</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            {detail && detail.status_verifikasi !== 'Sudah Diverifikasi' && (
              <Button onClick={() => verifyMutation.mutate(detail)} disabled={verifyMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="w-4 h-4 mr-1" /> Terverifikasi
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetail(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}