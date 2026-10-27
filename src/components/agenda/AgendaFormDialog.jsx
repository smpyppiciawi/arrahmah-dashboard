import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Loader2, Lock, FileText, Users, Clock } from 'lucide-react';
import {
  STATUS_AGENDA, statusChip, formatTanggal, getHari, getMingguKe,
} from '@/lib/agendaUtils';

const emptyForm = { materi_pokok: '', uraian_kegiatan: '', deskripsi: '', file_urls: [], link_materi: '' };

export default function AgendaFormDialog({
  open, onClose, jadwal, agenda, tanggal, siswaList = [], absensiMap = {}, tahunAjaran, onSaved,
}) {
  const [tab, setTab] = useState('materi');
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const kelasId = jadwal?.kelas_id || agenda?.kelas_id;
  const namaKelas = jadwal?.nama_kelas || agenda?.nama_kelas || '';
  const mapel = jadwal?.mapel || agenda?.mapel || '';
  const jamMulai = jadwal?.jam_mulai || agenda?.jam_mulai || '';
  const jamSelesai = jadwal?.jam_selesai || agenda?.jam_selesai || '';

  useEffect(() => {
    if (!open) return;
    setTab('materi');
    setError('');
    setForm({
      materi_pokok: agenda?.materi_pokok || '',
      uraian_kegiatan: agenda?.uraian_kegiatan || '',
      deskripsi: agenda?.deskripsi || '',
      file_urls: agenda?.file_urls || [],
      link_materi: agenda?.link_materi || '',
    });
    const tersimpan = new Map((agenda?.absensi_agenda || []).map((a) => [a.siswa_id, a.status_agenda]));
    setRows(siswaList.map((s) => {
      const piket = absensiMap[s.id] || '';
      const sesuai = STATUS_AGENDA.some((x) => x.value === piket);
      return {
        siswa_id: s.id,
        nis: s.nis || '',
        nama_siswa: s.nama,
        status_agenda: tersimpan.get(s.id) || (sesuai ? piket : 'Hadir'),
      };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agenda?.id, jadwal?.id, siswaList.length]);

  const setStatus = (siswaId, status) => {
    setRows((prev) => prev.map((r) => (r.siswa_id === siswaId ? { ...r, status_agenda: status } : r)));
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const res = await base44.integrations.Core.UploadPublicFile({ file });
      if (res?.file_url) urls.push(res.file_url);
    }
    setForm((prev) => ({ ...prev, file_urls: [...prev.file_urls, ...urls] }));
    setUploading(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.materi_pokok.trim()) {
      setError('Materi pokok wajib diisi.');
      setTab('materi');
      return;
    }
    setError('');
    setSaving(true);
    const payload = {
      tanggal,
      hari: getHari(tanggal),
      minggu_ke: getMingguKe(tanggal),
      jadwal_id: jadwal?.id || agenda?.jadwal_id || '',
      kelas_id: kelasId || '',
      nama_kelas: namaKelas,
      mapel,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
      guru_id: jadwal?.guru_id || agenda?.guru_id || '',
      nama_guru: jadwal?.nama_guru || agenda?.nama_guru || '',
      jumlah_siswa: siswaList.length,
      tahun_ajaran: tahunAjaran || agenda?.tahun_ajaran || '',
      materi_pokok: form.materi_pokok.trim(),
      uraian_kegiatan: form.uraian_kegiatan,
      deskripsi: form.deskripsi,
      file_urls: form.file_urls,
      link_materi: form.link_materi,
      sumber: 'Agenda',
      absensi_agenda: rows.map((r) => ({ ...r, status_petugas: absensiMap[r.siswa_id] || '' })),
    };
    if (agenda?.id) {
      await base44.entities.AgendaKelas.update(agenda.id, payload);
    } else {
      await base44.entities.AgendaKelas.create(payload);
    }
    setSaving(false);
    onSaved?.();
    onClose?.();
  };

  const jumlah = (status) => rows.filter((r) => r.status_agenda === status).length;
  const absensiTersedia = rows.some((r) => absensiMap[r.siswa_id]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose?.()}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Agenda Kelas — {namaKelas}
            <Badge variant="secondary" className="text-[11px]">{mapel}</Badge>
          </DialogTitle>
          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
            <span>{formatTanggal(tanggal)}</span>
            {jamMulai && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{jamMulai} – {jamSelesai}</span>}
            <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{siswaList.length} siswa</span>
          </p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="materi">Materi</TabsTrigger>
            <TabsTrigger value="absensi">Absensi</TabsTrigger>
          </TabsList>

          <TabsContent value="materi" className="space-y-3 pt-3">
            <div>
              <Label>Materi Pokok <span className="text-rose-500">*</span></Label>
              <Input
                value={form.materi_pokok}
                onChange={(e) => setForm({ ...form, materi_pokok: e.target.value })}
                placeholder="Contoh: Teks deskripsi — struktur dan ciri kebahasaan"
              />
            </div>
            <div>
              <Label>Uraian Kegiatan KBM</Label>
              <Textarea
                value={form.uraian_kegiatan}
                onChange={(e) => setForm({ ...form, uraian_kegiatan: e.target.value })}
                placeholder="Kegiatan pembelajaran: pembukaan, inti, penutup..."
                rows={3}
              />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={form.deskripsi}
                onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                placeholder="Catatan tambahan untuk kelas / wali kelas"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Upload File / Link Materi</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <label className={`flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-dashed text-sm cursor-pointer ${uploading ? 'opacity-60' : 'hover:border-indigo-300 text-slate-600'}`}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Mengunggah...' : 'Pilih File'}
                  <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
                <Input
                  className="flex-1"
                  value={form.link_materi}
                  onChange={(e) => setForm({ ...form, link_materi: e.target.value })}
                  placeholder="https:// tautan materi (opsional)"
                />
              </div>
              {form.file_urls.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.file_urls.map((url) => (
                    <span key={url} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 max-w-[220px]">
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                      <a href={url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                        {decodeURIComponent(url.split('/').pop().split('?')[0])}
                      </a>
                      <button type="button" onClick={() => setForm((p) => ({ ...p, file_urls: p.file_urls.filter((u) => u !== url) }))}>
                        <X className="w-3 h-3 text-slate-400 hover:text-rose-500" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="absensi" className="pt-3 space-y-3">
            {!absensiTersedia && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                Absensi petugas piket untuk tanggal ini belum tersedia. Anda tetap dapat mengisi absensi agenda KBM.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 font-medium"><Lock className="w-3 h-3" /> Absen Petugas Piket terkunci</span>
              <span>·</span>
              <span>Absen Agenda dapat diubah guru mapel</span>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sticky top-0">
                <span>Nama Siswa</span>
                <span className="w-[74px] text-center">Petugas Piket</span>
                <span className="w-[136px] text-center">Absen Agenda</span>
              </div>
              <div className="max-h-[45vh] overflow-y-auto divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-slate-400">Belum ada data siswa aktif pada kelas ini.</p>
                ) : rows.map((row) => {
                  const piket = absensiMap[row.siswa_id] || '';
                  return (
                    <div key={row.siswa_id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-1.5">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800 truncate">{row.nama_siswa}</p>
                        {row.nis && <p className="text-[10px] text-slate-400">{row.nis}</p>}
                      </div>
                      <div className="w-[74px] flex justify-center">
                        <Badge variant="outline" className={`text-[11px] ${statusChip(piket)}`}>
                          {piket || '—'}
                        </Badge>
                      </div>
                      <div className="w-[136px] flex justify-center gap-1">
                        {STATUS_AGENDA.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            title={s.value}
                            onClick={() => setStatus(row.siswa_id, s.value)}
                            className={`w-7 h-7 rounded-md border text-[11px] font-bold transition ${
                              row.status_agenda === s.value ? s.chip : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {s.letter}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]">
              {STATUS_AGENDA.map((s) => (
                <span key={s.value} className={`rounded-md border px-2 py-0.5 ${s.chip}`}>
                  {s.value}: {jumlah(s.value)}
                </span>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <div className="flex gap-2 pt-2 border-t">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button
            type="button"
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSave}
            disabled={saving || uploading}
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Agenda'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}