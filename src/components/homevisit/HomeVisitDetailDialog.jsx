import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, MapPin, Home, Clock, CheckCircle2, X } from "lucide-react";

const FIELD_LABELS = {
  tinggal_dengan: 'Tinggal Dengan',
  keadaan_orang_tua: 'Keadaan Orang Tua',
  pekerjaan_orang_tua: 'Pekerjaan Orang Tua',
  status_tempat_tinggal: 'Status Tempat Tinggal',
  keadaan_lingkungan: 'Keadaan Lingkungan',
  keadaan_rumah: 'Keadaan Rumah',
  kendaraan: 'Kendaraan',
  kendaraan_jenis: 'Jenis Kendaraan',
  transportasi_sekolah: 'Transportasi ke Sekolah',
  siswa_mengaji: 'Siswa Mengaji',
  tempat_mengaji: 'Tempat Mengaji',
  orang_tua_merokok: 'Orang Tua Merokok',
  perokok: 'Perokok',
  koordinat_rumah: 'Koordinat Rumah',
  punya_hp_pribadi: 'Punya HP Pribadi',
  frekuensi_cek_hp: 'Frekuensi Cek HP',
  ada_wifi: 'Ada Wifi',
  merk_internet: 'Merk Internet',
  jaringan_internet: 'Jaringan Internet',
  pembiayaan_sekolah: 'Pembiayaan Sekolah',
  penghasilan_orang_tua: 'Penghasilan Orang Tua',
  penghasilan_tambahan: 'Penghasilan Tambahan',
  keterangan_penghasilan_tambahan: 'Keterangan Penghasilan Tambahan',
  periode_uang_jajan: 'Periode Uang Jajan',
  nominal_uang_jajan: 'Nominal Uang Jajan',
  catatan_tambahan: 'Catatan Tambahan',
  tanggal_homevisit: 'Tanggal Home Visit',
  nama_guru: 'Petugas/Wali Kelas',
};

const formatRupiah = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function HomeVisitDetailDialog({ data, onClose, onEdit, onDelete, canEdit, canDelete }) {
  if (!data) return null;

  const renderValue = (key) => {
    const val = data[key];
    if (val === null || val === undefined || val === '') return <span className="text-slate-300 italic text-xs">Belum diisi</span>;
    if (Array.isArray(val)) return val.join(', ') || <span className="text-slate-300 italic text-xs">Belum diisi</span>;
    if (key === 'penghasilan_orang_tua' || key === 'nominal_uang_jajan') return formatRupiah(val);
    if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
    return String(val);
  };

  const displayFields = Object.keys(FIELD_LABELS).filter(k => k !== 'koordinat_rumah');
  const photos = [
    { field: 'foto_rumah_dalam', label: 'Foto Rumah Dalam' },
    { field: 'foto_rumah_luar', label: 'Foto Rumah Luar' },
    { field: 'foto_bersama', label: 'Foto Bersama' },
    { field: 'foto_hp_url', label: 'Foto HP' },
  ].filter(p => data[p.field]);

  return (
    <Dialog open={!!data} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-indigo-600" />
            Detail Home Visit
          </DialogTitle>
        </DialogHeader>

        {/* Student header */}
        <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
            {data.nama_siswa?.charAt(0) || 'S'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800 truncate">{data.nama_siswa}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge className="bg-blue-100 text-blue-700">{data.nama_kelas}</Badge>
              <span className="text-xs text-slate-500">NIS: {data.nis}</span>
            </div>
          </div>
          {data.keadaan_orang_tua?.includes('Yatim') && (
            <Badge className="bg-purple-100 text-purple-700 shrink-0">Yatim/Piatu</Badge>
          )}
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {data.keadaan_rumah && (
            <Badge className={data.keadaan_rumah === 'Layak Huni' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
              {data.keadaan_rumah}
            </Badge>
          )}
          {data.tanggal_homevisit && (
            <Badge className="bg-slate-100 text-slate-600">{data.tanggal_homevisit}</Badge>
          )}
        </div>

        {/* Data fields */}
        <div className="space-y-2">
          {displayFields.map(key => {
            const val = data[key];
            if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) return null;
            return (
              <div key={key} className="flex items-start gap-2 text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-400 w-44 shrink-0 text-xs font-medium">{FIELD_LABELS[key]}</span>
                <span className="text-slate-700 font-medium flex-1">{renderValue(key)}</span>
              </div>
            );
          })}
        </div>

        {/* Koordinat */}
        {data.koordinat_rumah && (
          <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
            <p className="text-xs font-semibold text-violet-700 mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Titik Koordinat Rumah</p>
            <p className="text-sm text-slate-700 font-mono">{data.koordinat_rumah}</p>
            <a href={`https://www.google.com/maps?q=${data.koordinat_rumah}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-medium mt-1 inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Buka di Google Maps
            </a>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Foto Dokumentasi</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {photos.map(p => (
                <a key={p.field} href={data[p.field]} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={data[p.field]} alt={p.label} className="h-20 w-full object-cover rounded-lg border" />
                  <p className="text-[10px] text-slate-500 text-center mt-1">{p.label}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {canEdit && (
            <Button variant="outline" className="flex-1" onClick={() => { onEdit(data); }}>
              <Edit2 className="w-4 h-4 mr-1" /> Ubah
            </Button>
          )}
          {data.koordinat_rumah && (
            <a href={`https://www.google.com/maps?q=${data.koordinat_rumah}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="flex-1">
                <MapPin className="w-4 h-4 mr-1 text-blue-500" /> Koordinat
              </Button>
            </a>
          )}
          {canDelete && (
            <Button variant="outline" className="text-red-600 hover:bg-red-50 border-red-200 flex-1" onClick={() => { onDelete(data); }}>
              <Trash2 className="w-4 h-4 mr-1" /> Hapus
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}