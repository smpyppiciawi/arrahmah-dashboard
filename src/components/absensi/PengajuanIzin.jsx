import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/lib/AuthContext';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { ClipboardList, CheckCircle, XCircle, Clock, Send, UserCheck, BookOpen, Eye } from "lucide-react";
import TugasMateriDialog from './TugasMateriDialog';
import DetailTugasDialog from './DetailTugasDialog';

export default function PengajuanIzin() {
  const { user: currentUser } = useAuth();
  const { activeAcademicYear } = useActiveAcademicYear();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userRole = currentUser?.role || 'guru';
  const canApprove = ['admin', 'tu', 'kepsek'].includes(userRole);

  const [currentGuru, setCurrentGuru] = useState(null);
  const [form, setForm] = useState({ guru_id: '', tanggal: format(new Date(), 'yyyy-MM-dd'), jenis: 'Izin', keterangan: '' });
  const [submitting, setSubmitting] = useState(false);
  const [tugasDialogIzin, setTugasDialogIzin] = useState(null);
  const [detailDialogIzin, setDetailDialogIzin] = useState(null);

  useEffect(() => {
    const fetchGuru = async () => {
      if (currentUser?.email) {
        try {
          const gurus = await base44.entities.Guru.filter({ email: currentUser.email });
          if (gurus.length > 0) {
            setCurrentGuru(gurus[0]);
            setForm(f => ({ ...f, guru_id: gurus[0].id }));
          }
        } catch (e) { /* not found */ }
      }
    };
    fetchGuru();
  }, [currentUser]);

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.filter({ status: 'Aktif' }),
  });

  const { data: izinList = [] } = useQuery({
    queryKey: ['izin-pegawai'],
    queryFn: () => base44.entities.IzinPegawai.list('-tanggal', 200),
  });

  const { data: tugasList = [] } = useQuery({
    queryKey: ['tugas-materi-saya', currentUser?.id],
    queryFn: () => base44.entities.TugasMateri.list('-tanggal', 200),
  });
  const myTugasMap = useMemo(() => {
    const m = new Map();
    tugasList.forEach(t => { if (t.izin_pegawai_id) { if (!m.has(t.izin_pegawai_id)) m.set(t.izin_pegawai_id, []); m.get(t.izin_pegawai_id).push(t); } });
    return m;
  }, [tugasList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const guru = guruList.find(g => g.id === form.guru_id);
    if (!form.guru_id || !guru) {
      toast({ title: 'Pilih pegawai terlebih dahulu', variant: 'destructive' });
      return;
    }
    if (!form.keterangan.trim()) {
      toast({ title: 'Keterangan wajib diisi', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.IzinPegawai.create({
        tanggal: form.tanggal,
        guru_id: guru.id,
        nip: guru.nuptk || '',
        nama_pegawai: guru.nama,
        jabatan: guru.jabatan || '',
        jenis: form.jenis,
        keterangan: form.keterangan.trim(),
        pengaju_id: currentUser?.id || '',
        pengaju_nama: currentUser?.full_name || guru.nama,
        status_approval: 'Pending',
        tahun_ajaran: activeAcademicYear || '',
      });
      toast({ title: 'Pengajuan terkirim', description: 'Menunggu persetujuan.' });
      setForm({ guru_id: currentGuru?.id || '', tanggal: format(new Date(), 'yyyy-MM-dd'), jenis: 'Izin', keterangan: '' });
      queryClient.invalidateQueries({ queryKey: ['izin-pegawai'] });
    } catch (err) {
      toast({ title: 'Gagal mengajukan', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (izin) => {
    try {
      const existing = await base44.entities.AbsensiPegawai.filter({ guru_id: izin.guru_id, tanggal: izin.tanggal });
      if (existing.length > 0) {
        await base44.entities.AbsensiPegawai.update(existing[0].id, {
          status: izin.jenis,
          keterangan: izin.keterangan || `Diizinkan (${izin.jenis})`,
          metode: 'Manual',
        });
      } else {
        await base44.entities.AbsensiPegawai.create({
          tanggal: izin.tanggal,
          guru_id: izin.guru_id,
          nip: izin.nip || '',
          nama_pegawai: izin.nama_pegawai,
          jabatan: izin.jabatan || '',
          status: izin.jenis,
          metode: 'Manual',
          keterangan: izin.keterangan || '',
        });
      }
      await base44.entities.IzinPegawai.update(izin.id, {
        status_approval: 'Disetujui',
        approver_id: currentUser?.id || '',
        approver_nama: currentUser?.full_name || '',
        approved_at: new Date().toISOString(),
      });
      toast({ title: 'Disetujui', description: `${izin.nama_pegawai} — ${izin.jenis}` });
      queryClient.invalidateQueries({ queryKey: ['izin-pegawai'] });
      queryClient.invalidateQueries({ queryKey: ['absensi-pegawai-rekap'] });
    } catch (err) {
      toast({ title: 'Gagal menyetujui', description: err.message, variant: 'destructive' });
    }
  };

  const handleReject = async (izin) => {
    const catatan = window.prompt('Alasan penolakan (opsional):') || '';
    try {
      await base44.entities.IzinPegawai.update(izin.id, {
        status_approval: 'Ditolak',
        approver_id: currentUser?.id || '',
        approver_nama: currentUser?.full_name || '',
        catatan_approver: catatan,
      });
      toast({ title: 'Ditolak' });
      queryClient.invalidateQueries({ queryKey: ['izin-pegawai'] });
    } catch (err) {
      toast({ title: 'Gagal menolak', description: err.message, variant: 'destructive' });
    }
  };

  const pendingList = izinList.filter(i => i.status_approval === 'Pending');
  const myList = izinList.filter(i => i.pengaju_id === currentUser?.id || i.guru_id === currentGuru?.id);

  const statusBadge = (s) => (
    <Badge className={
      s === 'Disetujui' ? 'bg-emerald-100 text-emerald-700' :
      s === 'Ditolak' ? 'bg-red-100 text-red-700' :
      'bg-amber-100 text-amber-700'
    }>{s}</Badge>
  );

  return (
    <div className="space-y-4">
      {/* Form Pengajuan */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-500" /> Pengajuan Tidak Masuk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Pegawai</Label>
                {currentGuru ? (
                  <Input value={currentGuru.nama} readOnly className="bg-slate-50" />
                ) : (
                  <Select value={form.guru_id} onValueChange={(v) => setForm(f => ({ ...f, guru_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Pilih pegawai" /></SelectTrigger>
                    <SelectContent>
                      {guruList.map(g => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Tanggal Tidak Masuk</Label>
                <Input type="date" value={form.tanggal} onChange={(e) => setForm(f => ({ ...f, tanggal: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Jenis</Label>
              <Select value={form.jenis} onValueChange={(v) => setForm(f => ({ ...f, jenis: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Izin">Izin</SelectItem>
                  <SelectItem value="Sakit">Sakit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Keterangan</Label>
              <Textarea value={form.keterangan} onChange={(e) => setForm(f => ({ ...f, keterangan: e.target.value }))} placeholder="Alasan / keterangan ketidakhadiran" rows={3} />
            </div>
            <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Perlu Approval (approver) */}
      {canApprove && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-500" /> Perlu Approval ({pendingList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingList.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">Tidak ada pengajuan menunggu</p>
            ) : pendingList.map(iz => (
              <div key={iz.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{iz.nama_pegawai}</p>
                    <Badge className={iz.jenis === 'Sakit' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>{iz.jenis}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{iz.jabatan} · {format(new Date(iz.tanggal), 'd MMM yyyy', { locale: idLocale })}</p>
                  <p className="text-xs text-slate-600 mt-0.5">"{iz.keterangan}"</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Diajukan oleh: {iz.pengaju_nama}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(iz)} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle className="w-4 h-4 mr-1" /> Setujui
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(iz)} className="text-red-600 border-red-200 hover:bg-red-50">
                    <XCircle className="w-4 h-4 mr-1" /> Tolak
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pengajuan Saya */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500" /> Pengajuan Saya ({myList.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {myList.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-4">Belum ada pengajuan</p>
          ) : myList.map(iz => {
            const tugasArr = myTugasMap.get(iz.id) || [];
            const hasTugas = tugasArr.length > 0;
            const allVerified = hasTugas && tugasArr.every(t => t.status_verifikasi === 'Sudah Diverifikasi');
            return (
              <div key={iz.id} className="p-3 bg-slate-50 rounded-xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-700">{format(new Date(iz.tanggal), 'd MMM yyyy', { locale: idLocale })}</p>
                      <Badge className={iz.jenis === 'Sakit' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>{iz.jenis}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{iz.keterangan}</p>
                    {iz.status_approval === 'Ditolak' && iz.catatan_approver && (
                      <p className="text-xs text-red-500 mt-0.5">Ditolak: {iz.catatan_approver}</p>
                    )}
                    {iz.approver_nama && iz.status_approval !== 'Pending' && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{iz.status_approval} oleh {iz.approver_nama}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {statusBadge(iz.status_approval)}
                    {iz.status_approval === 'Pending' && <Clock className="w-3 h-3 text-amber-500" />}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  {hasTugas ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs">
                        {allVerified ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 font-medium">Tugas Terverifikasi</span>
                            <span className="text-slate-400">· {tugasArr.length} tugas</span>
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-amber-600 font-medium">Tugas Menunggu Verifikasi</span>
                            <span className="text-slate-400">· {tugasArr.length} tugas</span>
                          </>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDetailDialogIzin(iz)}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Detail Tugas
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-slate-400">Belum ada tugas materi</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setTugasDialogIzin(iz)}>
                        <BookOpen className="w-3.5 h-3.5 mr-1" /> Tugas Materi
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {tugasDialogIzin && (
        <TugasMateriDialog
          open={!!tugasDialogIzin}
          onClose={() => setTugasDialogIzin(null)}
          izin={tugasDialogIzin}
          currentGuru={currentGuru}
        />
      )}
      {detailDialogIzin && (
        <DetailTugasDialog
          open={!!detailDialogIzin}
          onClose={() => setDetailDialogIzin(null)}
          izin={detailDialogIzin}
          currentGuru={currentGuru}
        />
      )}
    </div>
  );
}