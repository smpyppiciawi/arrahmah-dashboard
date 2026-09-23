import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Pencil, Trash2, LogOut as LogOutIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const JENIS_BADGE = {
  'Tamu Dinas': 'bg-blue-100 text-blue-700',
  'Tamu Orang Tua/Wali': 'bg-emerald-100 text-emerald-700',
  'Tamu Yayasan': 'bg-violet-100 text-violet-700',
  'Tamu Sekolah Lain': 'bg-amber-100 text-amber-700',
  'Tamu Umum': 'bg-slate-100 text-slate-700',
};

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
    <span className="text-xs text-slate-400 flex-none">{label}</span>
    <span className="text-xs text-slate-700 text-right font-medium min-w-0 break-words">{value || '-'}</span>
  </div>
);

// Bottom Sheet — detail kunjungan tamu + aksi (selesai / edit / hapus)
export default function BukuTamuDetailSheet({ tamu, open, onOpenChange, canEdit, onSelesai, onEdit, onDelete }) {
  if (!tamu) return null;
  const selesai = (tamu.status || 'Berkunjung') === 'Selesai';
  const nama = tamu.jenis_tamu === 'Tamu Orang Tua/Wali' ? (tamu.nama_ortu_wali || '-') : (tamu.nama_lengkap || '-');

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-5 pb-8 pt-2">
          <DrawerHeader className="p-0">
            <div className="flex justify-between items-center">
              <DrawerTitle className="text-lg font-bold text-slate-800">Detail Tamu</DrawerTitle>
              <button onClick={() => onOpenChange(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          </DrawerHeader>

          {/* Info utama */}
          <div className="mt-5 mb-4">
            <h3 className="font-bold text-base text-slate-900">{nama}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className={`text-xs ${JENIS_BADGE[tamu.jenis_tamu] || 'bg-slate-100 text-slate-600'}`}>{tamu.jenis_tamu}</Badge>
              <Badge className={`text-xs ${selesai ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{selesai ? 'Selesai' : 'Berkunjung'}</Badge>
              {tamu.tanggal && <Badge className="bg-slate-100 text-slate-600 text-xs">{format(parseISO(tamu.tanggal), 'd MMM yyyy', { locale: idLocale })}</Badge>}
            </div>
          </div>

          {/* Detail */}
          <div className="bg-slate-50 rounded-2xl px-4 py-1 mb-6">
            <Row label="Keperluan" value={tamu.keperluan} />
            <Row label="No HP/WA" value={tamu.no_hp_wa} />
            <Row label="Ingin Bertemu" value={tamu.ingin_bertemu} />
            {tamu.jenis_tamu === 'Tamu Dinas' && <Row label="Instansi" value={tamu.instansi} />}
            {tamu.jenis_tamu === 'Tamu Dinas' && <Row label="Jabatan" value={tamu.jabatan} />}
            {tamu.jenis_tamu === 'Tamu Dinas' && <Row label="Alamat Instansi" value={tamu.alamat_instansi} />}
            {tamu.jenis_tamu === 'Tamu Sekolah Lain' && <Row label="Sekolah Asal" value={tamu.nama_sekolah} />}
            {tamu.jenis_tamu === 'Tamu Sekolah Lain' && <Row label="Alamat Sekolah" value={tamu.alamat_sekolah} />}
            {tamu.jenis_tamu === 'Tamu Orang Tua/Wali' && <Row label="Ananda" value={tamu.nama_siswa ? `${tamu.nama_siswa} (${tamu.nama_kelas || '-'})` : ''} />}
            {tamu.jenis_tamu === 'Tamu Orang Tua/Wali' && <Row label="Hubungan" value={tamu.hubungan_ortu} />}
            {tamu.jenis_tamu === 'Tamu Orang Tua/Wali' && <Row label="Alamat Rumah" value={tamu.alamat_rumah} />}
            {tamu.jenis_tamu === 'Tamu Umum' && <Row label="No Identitas" value={tamu.no_identitas} />}
            {tamu.jenis_tamu === 'Tamu Umum' && <Row label="Alamat" value={tamu.alamat} />}
            {selesai && tamu.tanggal_keluar && <Row label="Selesai Pukul" value={new Date(tamu.tanggal_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} />}
          </div>

          {/* Aksi */}
          {canEdit && (
            <div className="flex gap-3">
              <button
                onClick={() => onDelete(tamu)}
                title="Hapus"
                className="flex-none w-14 h-14 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <Button
                onClick={() => onEdit(tamu)}
                variant="outline"
                className="flex-1 h-14 rounded-2xl font-bold text-base border-2 border-slate-200 text-slate-700 active:scale-[0.98] transition-transform gap-2"
              >
                <Pencil className="w-5 h-5" /> Edit
              </Button>
              {!selesai && (
                <Button
                  onClick={() => onSelesai(tamu)}
                  className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base shadow-[0_4px_12px_rgba(5,150,105,0.3)] active:scale-[0.98] transition-transform gap-2"
                >
                  <LogOutIcon className="w-5 h-5" /> Selesai
                </Button>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}