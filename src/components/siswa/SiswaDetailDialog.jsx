import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAlamatLengkap } from '@/lib/dapodikConstants';
import { MapPin, User, Users, Home, Phone, Calendar, FileText } from "lucide-react";

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

export default function SiswaDetailDialog({ siswa, onClose }) {
  if (!siswa) return null;

  const contacts = [];
  if (siswa.kontak_list?.length > 0) siswa.kontak_list.forEach(k => { if (k.no_telp) contacts.push(k); });
  if (siswa.no_telp_ortu && !contacts.find(c => c.no_telp === siswa.no_telp_ortu)) contacts.push({ no_telp: siswa.no_telp_ortu, hubungan: 'Ortu' });

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
              {siswa.nama?.[0]?.toUpperCase()}
            </div>
            <div>
              <span className="text-lg">{siswa.nama}</span>
              <p className="text-xs text-slate-400 font-normal">NIS: {siswa.nis} • NISN: {siswa.nisn || '-'}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mb-2">
          <Badge className={siswa.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{siswa.status}</Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">{siswa.nama_kelas}</Badge>
          <Badge variant="secondary">{siswa.jenis_kelamin}</Badge>
          {siswa.penerima_kip === 'Ya' && <Badge className="bg-amber-100 text-amber-700">Penerima KIP</Badge>}
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
              <Field label="Tanggal Lahir" value={siswa.tanggal_lahir} />
              <Field label="NIK" value={siswa.nik} />
              <Field label="Penerima KIP" value={siswa.penerima_kip} />
            </div>
            {contacts.length > 0 && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-emerald-700"><Phone className="w-4 h-4" /> Kontak WA</h4>
                <div className="flex flex-wrap gap-2">
                  {contacts.map((c, i) => (
                    <Badge key={i} variant="secondary" className="bg-white">{c.hubungan}: {c.no_telp}</Badge>
                  ))}
                </div>
              </div>
            )}
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

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}