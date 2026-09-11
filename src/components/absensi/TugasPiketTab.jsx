import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { ClipboardCheck, CheckCircle, BookOpen, Calendar, MapPin, ChevronRight } from "lucide-react";

export default function TugasPiketTab() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [detailGuru, setDetailGuru] = useState(null);
  const [activeTugasId, setActiveTugasId] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: tugasList = [] } = useQuery({ queryKey: ['tugas-materi'], queryFn: () => base44.entities.TugasMateri.list('-tanggal', 200) });

  const todayTugas = useMemo(() => (tugasList || []).filter(t => t.tanggal === today), [tugasList, today]);

  const grouped = useMemo(() => {
    const map = new Map();
    todayTugas.forEach(t => {
      const key = t.guru_id || t.nama_guru;
      if (!map.has(key)) map.set(key, { nama_guru: t.nama_guru, jabatan: t.jabatan, nip: t.nip, tugas: [] });
      map.get(key).tugas.push(t);
    });
    return [...map.values()];
  }, [todayTugas]);

  const belumCount = todayTugas.filter(t => t.status_verifikasi !== 'Sudah Diverifikasi').length;

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
      queryClient.invalidateQueries({ queryKey: ['tugas-materi'] });
    },
    onError: (err) => toast({ title: 'Gagal verifikasi', description: err.message, variant: 'destructive' }),
  });

  const openDetail = (g) => { setDetailGuru(g); setActiveTugasId(g.tugas[0]?.id || ''); };
  const detailTugas = detailGuru?.tugas.find(t => t.id === activeTugasId) || detailGuru?.tugas[0];

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-emerald-500" /> Ajuan Tugas Hari Ini — Per Guru</CardTitle>
            <Badge className="bg-amber-50 text-amber-700">{belumCount} belum verifikasi</Badge>
          </div>
          <p className="text-xs text-slate-400">Hanya tugas hari ini. Rekap hari sebelumnya tersimpan di Menu Tugas Guru.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {grouped.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6">Tidak ada ajuan tugas hari ini</p>
          ) : grouped.map((g, idx) => {
            const blm = g.tugas.filter(t => t.status_verifikasi !== 'Sudah Diverifikasi').length;
            return (
              <div key={idx} className="flex items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800 truncate">{g.nama_guru}</p>
                    <Badge className="bg-blue-100 text-blue-700">{g.tugas.length} tugas</Badge>
                    {blm > 0 ? <Badge className="bg-amber-100 text-amber-700">{blm} belum</Badge> : <Badge className="bg-emerald-100 text-emerald-700">Lengkap</Badge>}
                  </div>
                  <p className="text-xs text-slate-500">{g.jabatan || '-'} · {g.tugas.map(t => t.kelas_tujuan).join(', ')}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openDetail(g)}>Detail</Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="text-center">
        <Link to="/TugasGuru" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">Lihat Rekap di Menu Tugas Guru <ChevronRight className="w-3 h-3" /></Link>
      </div>

      <Dialog open={!!detailGuru} onOpenChange={(v) => !v && setDetailGuru(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm"><BookOpen className="w-4 h-4 text-emerald-500" /> Detail Tugas — {detailGuru?.nama_guru}</DialogTitle>
          </DialogHeader>
          {detailGuru && detailTugas && (
            <Tabs value={activeTugasId} onValueChange={setActiveTugasId}>
              <TabsList className="mb-3 flex-wrap h-auto">
                {detailGuru.tugas.map((t, i) => (
                  <TabsTrigger key={t.id} value={t.id} className="text-xs">Tugas {i + 1}{t.status_verifikasi === 'Sudah Diverifikasi' ? ' ✓' : ''}</TabsTrigger>
                ))}
              </TabsList>
              {detailGuru.tugas.map(t => (
                <TabsContent key={t.id} value={t.id}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{t.hari}, {format(new Date(t.tanggal), 'd MMM yyyy', { locale: idLocale })}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                      <p className="text-xs text-slate-500">Keterangan Izin Absensi</p>
                      <p className="text-sm text-slate-700">{t.keterangan_izin || '-'} {t.jenis_izin ? `(${t.jenis_izin})` : ''}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-blue-600">Mata Pelajaran</p>
                        <p className="text-sm font-medium text-blue-800">{t.mapel || '-'}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3">
                        <p className="text-xs text-emerald-600">Kelas Tujuan</p>
                        <p className="text-sm font-medium text-emerald-800 flex items-center gap-1"><MapPin className="w-3 h-3" />{t.kelas_tujuan}</p>
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs text-amber-600 mb-1">Keterangan Tugas</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{t.keterangan_tugas}</p>
                    </div>
                    <div>
                      <Badge className={t.status_verifikasi === 'Sudah Diverifikasi' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{t.status_verifikasi}</Badge>
                      {t.verifikator_nama && <p className="text-[10px] text-slate-400 mt-1">Oleh {t.verifikator_nama}</p>}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
          <DialogFooter>
            {detailTugas && detailTugas.status_verifikasi !== 'Sudah Diverifikasi' && (
              <Button onClick={() => verifyMutation.mutate(detailTugas)} disabled={verifyMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="w-4 h-4 mr-1" /> Verifikasi Tugas Ini
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailGuru(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}