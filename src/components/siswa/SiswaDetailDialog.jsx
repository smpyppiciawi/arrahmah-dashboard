import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAlamatLengkap } from '@/lib/dapodikConstants';
import { getFotoAktif } from '@/lib/fotoSiswa';
import SiswaKontakRow, { kontakUtama } from '@/components/siswa/SiswaKontakRow';
import {
  MapPin, User, Home, Phone, Edit2, History, LogOut, Trash2, MessageCircle,
  Maximize2, UserCircle,
} from "lucide-react";
import { format as formatDateFns, parseISO } from 'date-fns';

const formatTanggalLahir = (val) => {
  if (!val) return '';
  try {
    const d = typeof val === 'string' ? parseISO(val) : new Date(val);
    if (isNaN(d.getTime())) return val;
    return formatDateFns(d, 'dd-MM-yyyy');
  } catch { return val; }
};

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-400 font-medium">{label}</p>
    <p className="text-sm text-slate-700 mt-0.5">{value || <span className="text-slate-300">-</span>}</p>
  </div>
);

const OrtuSection = ({ title, data, prefix, color }) => (
  <div className={`p-4 rounded-xl border ${color}`}>
    <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><User className="w-4 h-4" /> {title}</h4>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Nama" value={data[`nama_${prefix === 'ayah' ? 'ayah_kandung' : prefix === 'ibu' ? 'ibu_kandung' : 'wali'}`]} />
      <Field label="Tahun Lahir" value={data[`tahun_lahir_${prefix}`]} />
      <Field label="Pendidikan" value={data[`pendidikan_${prefix}`]} />
      <Field label="Pekerjaan" value={data[`pekerjaan_${prefix}`]} />
      <Field label="Penghasilan" value={data[`penghasilan_${prefix}`]} />
      <Field label="NIK" value={data[`nik_${prefix}`]} />
    </div>
  </div>
);

export default function SiswaDetailDialog({
  siswa, onClose, onEdit, onRiwayat, onKeluar, onArsipkan, onPilihKontak, onLihatFoto, canEdit = false,
}) {
  if (!siswa) return null;
  const foto = getFotoAktif(siswa);
  const nomorWA = (nomor) => window.open(`https://wa.me/${String(nomor).replace(/\D/g, '').replace(/^0/, '62')}`, '_blank');

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onLihatFoto?.(siswa)}
              className="relative w-16 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 group"
              title="Lihat foto lebih besar"
            >
              {foto ? (
                <img src={foto} alt={siswa.nama} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-slate-300">
                  <UserCircle className="w-8 h-8" />
                </span>
              )}
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <Maximize2 className="w-4 h-4 text-white" />
              </span>
            </button>
            <div className="min-w-0">
              <span className="text-lg block truncate">{siswa.nama}</span>
              <p className="text-xs text-slate-400 font-normal">NIS: {siswa.nis} • NISN: {siswa.nisn || '-'}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mb-1">
          <Badge className={siswa.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{siswa.status}</Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">{siswa.nama_kelas}</Badge>
          <Badge variant="secondary">{siswa.jenis_kelamin}</Badge>
          {siswa.penerima_kip === 'Ya' && <Badge className="bg-amber-100 text-amber-700">Penerima KIP</Badge>}
        </div>

        {/* Kontak WA — nomor bergaris emas = penerima notifikasi gateway, klik untuk mengganti */}
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h4 className="text-xs font-bold flex items-center gap-1.5 text-emerald-700"><Phone className="w-3.5 h-3.5" /> Kontak WA Orang Tua/Wali</h4>
            <Button
              size="sm" variant="outline"
              className="h-7 text-[11px] bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              onClick={() => {
                const nomor = kontakUtama(siswa);
                if (nomor) nomorWA(nomor);
              }}
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chat WA
            </Button>
          </div>
          <SiswaKontakRow siswa={siswa} onPilih={(phone) => onPilihKontak?.(siswa, phone)} aktifkan={canEdit} max={3} />
          <p className="text-[10px] text-emerald-700/70 mt-1.5">
            Nomor bertanda hijau adalah penerima notifikasi gateway{canEdit ? ' — klik nomor lain untuk mengganti.' : '.'}
          </p>
        </div>

        <Tabs defaultValue="diri" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="diri">Data Diri</TabsTrigger>
            <TabsTrigger value="alamat">Alamat</TabsTrigger>
            <TabsTrigger value="ortu">Orang Tua/Wali</TabsTrigger>
          </TabsList>

          <TabsContent value="diri" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl">
              <Field label="NIS" value={siswa.nis} />
              <Field label="NISN" value={siswa.nisn} />
              <Field label="Nama Lengkap" value={siswa.nama} />
              <Field label="Jenis Kelamin" value={siswa.jenis_kelamin} />
              <Field label="Kelas" value={siswa.nama_kelas} />
              <Field label="Agama" value={siswa.agama} />
              <Field label="Tempat Lahir" value={siswa.tempat_lahir} />
              <Field label="Tanggal Lahir" value={formatTanggalLahir(siswa.tanggal_lahir)} />
              <Field label="NIK" value={siswa.nik} />
              <Field label="Penerima KIP" value={siswa.penerima_kip} />
            </div>
          </TabsContent>

          <TabsContent value="alamat" className="space-y-3 mt-3">
            <div className="p-4 bg-slate-50 rounded-xl">
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-slate-700"><Home className="w-4 h-4" /> Alamat Lengkap</h4>
              <p className="text-sm text-slate-700 mb-4 p-3 bg-white rounded-lg border">{formatAlamatLengkap(siswa)}</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Alamat (Jalan)" value={siswa.alamat} />
                <Field label="RT / RW" value={siswa.rt || siswa.rw ? `${siswa.rt || '-'}/${siswa.rw || '-'}` : ''} />
                <Field label="Kelurahan/Desa" value={siswa.kelurahan} />
                <Field label="Kecamatan" value={siswa.kecamatan} />
              </div>
            </div>
            {siswa.koordinat && (
              <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
                <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-violet-700"><MapPin className="w-4 h-4" /> Koordinat Rumah</h4>
                <p className="text-sm font-mono text-slate-600">{siswa.koordinat}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ortu" className="space-y-3 mt-3">
            <OrtuSection title="Data Ayah" data={siswa} prefix="ayah" color="bg-blue-50 border-blue-100 text-blue-700" />
            <OrtuSection title="Data Ibu" data={siswa} prefix="ibu" color="bg-pink-50 border-pink-100 text-pink-700" />
            <OrtuSection title="Data Wali" data={siswa} prefix="wali" color="bg-amber-50 border-amber-100 text-amber-700" />
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap gap-2">
            {canEdit && onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(siswa)}>
                <Edit2 className="w-4 h-4 mr-1.5" /> Edit
              </Button>
            )}
            {canEdit && onRiwayat && (
              <Button size="sm" variant="outline" onClick={() => onRiwayat(siswa)}>
                <History className="w-4 h-4 mr-1.5" /> Riwayat
              </Button>
            )}
            {canEdit && onKeluar && (
              <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => onKeluar(siswa)}>
                <LogOut className="w-4 h-4 mr-1.5" /> Keluarkan
              </Button>
            )}
            {canEdit && onArsipkan && (
              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => onArsipkan(siswa)}>
                <Trash2 className="w-4 h-4 mr-1.5" /> Arsipkan
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}