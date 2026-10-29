import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { compressImage } from '@/lib/imageCompress';
import { Camera, Loader2, UserRound, Edit2, Trash2, History, Phone, Mail } from 'lucide-react';

function Row({ label, value }) {
  return (
    <div className="flex min-w-0 gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <span className="w-32 flex-shrink-0 text-xs text-slate-400">{label}</span>
      <span className="text-sm text-slate-700 break-words">{value || '-'}</span>
    </div>
  );
}

/**
 * Detail Pegawai dalam popup: identitas lengkap + unggah foto + menu aksi.
 */
export default function GuruDetailDialog({ guru, open, onClose, canEdit, onEdit, onRiwayat, onArsip }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [foto, setFoto] = useState(null);
  const inputRef = useRef(null);

  if (!guru) return null;
  const fotoUrl = foto || guru.foto_url;

  const handlePick = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const processed = await compressImage(file, 900, 0.8);
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: processed });
      await base44.entities.Guru.update(guru.id, { foto_url: file_url });
      setFoto(file_url);
      queryClient.invalidateQueries({ queryKey: ['guru'] });
      toast({ title: 'Foto tersimpan', description: `Foto ${guru.nama} berhasil diperbarui.` });
    } catch (err) {
      toast({ title: 'Gagal mengunggah foto', description: err.message || 'Silakan coba lagi.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="w-5 h-5 text-violet-500" /> Detail Pegawai
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-32 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
              {fotoUrl ? (
                <img src={fotoUrl} alt={guru.nama} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                  <UserRound className="w-7 h-7" />
                  <span className="text-[10px]">Belum ada foto</span>
                </div>
              )}
            </div>
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg hover:bg-violet-700 disabled:opacity-70"
                  title="Unggah / ganti foto"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePick(f); e.target.value = ''; }}
                />
              </>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800 leading-snug">{guru.nama}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <Badge className={
                guru.jabatan === 'Kepala Sekolah' ? 'bg-purple-100 text-purple-700 border-0' :
                guru.jabatan === 'Guru Mata Pelajaran' ? 'bg-blue-100 text-blue-700 border-0' :
                'bg-slate-100 text-slate-700 border-0'
              }>{guru.jabatan || 'Guru Mata Pelajaran'}</Badge>
              <Badge className={
                guru.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700 border-0' :
                guru.status === 'Cuti' ? 'bg-amber-100 text-amber-700 border-0' :
                'bg-slate-200 text-slate-600 border-0'
              }>{guru.status || 'Aktif'}</Badge>
            </div>
            <div className="mt-2 space-y-1 text-xs text-slate-500">
              {guru.no_telp && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {guru.no_telp}</p>}
              {guru.email && <p className="flex items-center gap-1.5 break-all"><Mail className="w-3.5 h-3.5" /> {guru.email}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1">
          <Row label="Nama Lengkap" value={guru.nama} />
          <Row label="Jenis Kelamin" value={guru.jenis_kelamin} />
          <Row label="NUPTK / NIP" value={guru.nuptk} />
          {guru.nrks && <Row label="NRKS" value={guru.nrks} />}
          <Row label="Jabatan" value={guru.jabatan} />
          <Row label="Mata Pelajaran" value={guru.mapel?.length ? guru.mapel.join(', ') : '-'} />
          <Row label="Tugas Tambahan" value={guru.tugas_tambahan} />
          <Row label="No. Telepon" value={guru.no_telp} />
          <Row label="Email" value={guru.email} />
          <Row label="Status" value={guru.status || 'Aktif'} />
          {guru.status === 'Keluar' && (
            <>
              <Row label="Tanggal Keluar" value={guru.tanggal_keluar} />
              <Row label="Alasan Keluar" value={guru.alasan_keluar} />
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {canEdit && (
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => onEdit(guru)}>
              <Edit2 className="w-4 h-4 mr-1.5" /> Edit Data
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onRiwayat(guru)}>
            <History className="w-4 h-4 mr-1.5" /> Riwayat
          </Button>
          {canEdit && (
            <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => onArsip(guru)}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Arsipkan
            </Button>
          )}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={onClose}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}