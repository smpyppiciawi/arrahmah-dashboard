import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Camera, Loader2, User } from 'lucide-react';
import { processFotoSiswa } from '@/lib/imageCompress';
import {
  getTingkatAktif, getFotoAktif, getFotoPerJenjang, getFotoOrtu,
  ORTU_SLOTS, slotLabel,
} from '@/lib/fotoSiswa';

function FotoSlot({ label, sub, src, onPick, uploading, large }) {
  const inputRef = useRef(null);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-100 hover:border-blue-400 transition-colors group ${large ? 'w-40 h-52' : 'w-24 h-32'}`}
      >
        {src ? (
          <img src={src} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
            <User className="w-6 h-6" />
            <span className="text-[10px] px-1 text-center">Unggah foto</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }}
      />
      <p className="text-xs font-medium text-slate-700">{label}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

export default function FotoPeroranganTab({ siswaList, kelasList }) {
  const [kelasId, setKelasId] = useState('');
  const [siswaId, setSiswaId] = useState('');
  const [overrides, setOverrides] = useState({});
  const [uploadingField, setUploadingField] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const siswaOptions = kelasId ? siswaList.filter((s) => s.kelas_id === kelasId) : [];
  const baseSiswa = siswaList.find((s) => s.id === siswaId);
  const siswa = baseSiswa ? { ...baseSiswa, ...overrides } : null;
  const tingkatAktif = siswa ? getTingkatAktif(siswa) : null;

  const handlePick = async (file, field) => {
    if (!siswa || !field) return;
    setUploadingField(field);
    try {
      const processed = await processFotoSiswa(file);
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: processed });
      await base44.entities.Siswa.update(siswa.id, { [field]: file_url });
      setOverrides((prev) => ({ ...prev, [field]: file_url }));
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      toast({ title: 'Foto tersimpan', description: `Foto ${slotLabel(field)} — ${siswa.nama} berhasil diperbarui.` });
    } catch (err) {
      toast({ title: 'Gagal mengunggah foto', description: err.message || 'Silakan coba lagi.', variant: 'destructive' });
    } finally {
      setUploadingField(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={kelasId} onValueChange={(v) => { setKelasId(v); setSiswaId(''); setOverrides({}); }}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
          <SelectContent>
            {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={siswaId} onValueChange={(v) => { setSiswaId(v); setOverrides({}); }} disabled={!kelasId}>
          <SelectTrigger className="w-full sm:w-80"><SelectValue placeholder="Pilih Siswa" /></SelectTrigger>
          <SelectContent>
            {siswaOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.nis} — {s.nama}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!siswa ? (
        <div className="text-center py-16 text-slate-400">
          <Camera className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Pilih kelas dan siswa untuk mengelola fotonya</p>
        </div>
      ) : (
        <Tabs defaultValue="siswa">
          <TabsList>
            <TabsTrigger value="siswa">Foto Siswa</TabsTrigger>
            <TabsTrigger value="ortu">Foto Ayah / Ibu / Wali</TabsTrigger>
          </TabsList>
          <TabsContent value="siswa" className="pt-4">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10">
              <div className="flex flex-col items-center gap-2">
                <FotoSlot
                  large
                  label={`Foto Jenjang ${tingkatAktif || '-'} (Aktif)`}
                  src={getFotoAktif(siswa)}
                  uploading={tingkatAktif ? uploadingField === `foto_${tingkatAktif}` : false}
                  onPick={(f) => tingkatAktif && handlePick(f, `foto_${tingkatAktif}`)}
                />
                <p className="text-[11px] text-slate-400 max-w-[10rem] text-center">
                  {tingkatAktif
                    ? `Tersimpan ke slot jenjang ${tingkatAktif} — foto jenjang lain tetap utuh.`
                    : 'Jenjang aktif tidak terdeteksi; gunakan slot jenjang di samping.'}
                </p>
              </div>
              <div className="flex gap-5 flex-wrap justify-center">
                {['7', '8', '9'].map((t) => (
                  <FotoSlot
                    key={t}
                    label={`Jenjang ${t}`}
                    sub={t === tingkatAktif ? 'Slot aktif' : 'Arsip'}
                    src={getFotoPerJenjang(siswa, t)}
                    uploading={uploadingField === `foto_${t}`}
                    onPick={(f) => handlePick(f, `foto_${t}`)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="ortu" className="pt-4">
            <div className="flex gap-5 flex-wrap justify-center py-4">
              {ORTU_SLOTS.map((slot) => (
                <FotoSlot
                  key={slot.key}
                  label={`Foto ${slot.label}`}
                  src={getFotoOrtu(siswa, slot.key.replace('foto_', ''))}
                  uploading={uploadingField === slot.key}
                  onPick={(f) => handlePick(f, slot.key)}
                />
              ))}
            </div>
            <p className="text-center text-[11px] text-slate-400">
              Foto orang tua/wali bersifat opsional — slot tetap tersedia dan siap dipakai kapan pun dibutuhkan (mis. Buku Induk).
            </p>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}