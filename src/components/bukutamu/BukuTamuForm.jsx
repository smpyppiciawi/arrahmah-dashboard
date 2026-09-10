import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import Autocomplete from './Autocomplete';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';

const JENIS_TAMU = ['Tamu Dinas', 'Tamu Orang Tua/Wali', 'Tamu Yayasan', 'Tamu Sekolah Lain', 'Tamu Umum'];

const DEFAULT_FORM = {
  tanggal: format(new Date(), 'yyyy-MM-dd'),
  jenis_tamu: 'Tamu Dinas',
  nama_lengkap: '', instansi: '', jabatan: '', no_hp_wa: '', keperluan: '',
  ingin_bertemu: '', ingin_bertemu_pegawai_id: '', alamat_instansi: '',
  nama_sekolah: '', alamat_sekolah: '',
  no_identitas: '', alamat: '',
  siswa_id: '', nama_siswa: '', nama_kelas: '', nama_ortu_wali: '', hubungan_ortu: '', alamat_rumah: '',
};

export default function BukuTamuForm({ isOpen, onClose, editingData, siswaList, guruList }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeAcademicYear } = useActiveAcademicYear();
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [ortuOptions, setOrtuOptions] = useState([]);
  const [kontakOptions, setKontakOptions] = useState([]);
  const [showOrtu, setShowOrtu] = useState(false);
  const [showKontak, setShowKontak] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(editingData ? { ...DEFAULT_FORM, ...editingData } : DEFAULT_FORM);
      setOrtuOptions([]); setKontakOptions([]);
    }
  }, [isOpen, editingData]);

  const set = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  const handleSiswaPick = (siswa) => {
    const ortu = [
      { label: 'Ayah', nama: siswa.nama_ayah_kandung },
      { label: 'Ibu', nama: siswa.nama_ibu_kandung },
      { label: 'Wali', nama: siswa.nama_wali },
    ].filter(o => o.nama);
    const kontak = [
      ...(siswa.kontak_list || []).map(k => ({ label: k.hubungan, no: k.no_telp })),
      ...(siswa.no_telp_ortu && !(siswa.kontak_list || []).length ? [{ label: 'Ortu', no: siswa.no_telp_ortu }] : []),
    ].filter(k => k.no);
    const alamatRumah = [siswa.alamat, siswa.rt && `RT ${siswa.rt}`, siswa.rw && `RW ${siswa.rw}`, siswa.kelurahan, siswa.kecamatan].filter(Boolean).join(', ');
    setOrtuOptions(ortu); setKontakOptions(kontak);
    setFormData(p => ({ ...p, siswa_id: siswa.id, nama_siswa: siswa.nama, nama_kelas: siswa.nama_kelas, alamat_rumah: alamatRumah, nama_ortu_wali: '', hubungan_ortu: '', no_hp_wa: '' }));
  };

  const handlePegawaiPick = (guru) => {
    set('ingin_bertemu', guru.nama);
    set('ingin_bertemu_pegawai_id', guru.id);
  };

  const validate = () => {
    const j = formData.jenis_tamu;
    if (!formData.tanggal) return 'Tanggal wajib diisi';
    if (!formData.keperluan) return 'Keperluan wajib diisi';
    if (j !== 'Tamu Orang Tua/Wali' && !formData.nama_lengkap) return 'Nama lengkap wajib diisi';
    if (j === 'Tamu Orang Tua/Wali') {
      if (!formData.nama_siswa) return 'Nama siswa wajib diisi';
      if (!formData.nama_ortu_wali) return 'Nama orang tua/wali wajib diisi';
    }
    if (j === 'Tamu Dinas' && !formData.instansi) return 'Instansi wajib diisi';
    if (j === 'Tamu Sekolah Lain' && !formData.nama_sekolah) return 'Nama sekolah wajib diisi';
    return null;
  };

  const saveMutation = useMutation({
    mutationFn: (data) => editingData
      ? base44.entities.BukuTamu.update(editingData.id, data)
      : base44.entities.BukuTamu.create({ ...data, tahun_ajaran: activeAcademicYear }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bukuTamu'] });
      toast({ title: editingData ? 'Data tamu diperbarui' : 'Tamu tercatat' });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast({ title: err, variant: 'destructive' }); return; }
    saveMutation.mutate(formData);
  };

  const j = formData.jenis_tamu;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingData ? 'Edit Data Tamu' : 'Catat Tamu Baru'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Tanggal *</Label><Input type="date" value={formData.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></div>
            <div><Label className="text-xs">Jenis Tamu *</Label>
              <Select value={formData.jenis_tamu} onValueChange={(v) => set('jenis_tamu', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{JENIS_TAMU.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {j === 'Tamu Dinas' && (
            <Section title="Data Tamu Dinas">
              <Field label="Nama Lengkap *"><Input value={formData.nama_lengkap} onChange={(e) => set('nama_lengkap', e.target.value)} /></Field>
              <Field label="Instansi *"><Input value={formData.instansi} onChange={(e) => set('instansi', e.target.value)} /></Field>
              <Field label="Jabatan"><Input value={formData.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></Field>
              <Field label="No. HP/WA"><Input value={formData.no_hp_wa} onChange={(e) => set('no_hp_wa', e.target.value)} /></Field>
              <Field label="Ingin Bertemu" full>
                <Autocomplete value={formData.ingin_bertemu} onChange={(v) => { set('ingin_bertemu', v); set('ingin_bertemu_pegawai_id', ''); }} onPick={handlePegawaiPick} placeholder="Ketik nama pegawai..." suggestions={guruList} getLabel={g => g.nama} getKey={g => g.id} />
              </Field>
              <Field label="Keperluan *" full><Textarea value={formData.keperluan} onChange={(e) => set('keperluan', e.target.value)} rows={2} /></Field>
              <Field label="Alamat Instansi" full><Textarea value={formData.alamat_instansi} onChange={(e) => set('alamat_instansi', e.target.value)} rows={2} /></Field>
            </Section>
          )}

          {j === 'Tamu Orang Tua/Wali' && (
            <Section title="Data Tamu Orang Tua/Wali">
              <Field label="Nama Siswa *" full>
                <Autocomplete value={formData.nama_siswa} onChange={(v) => { set('nama_siswa', v); set('siswa_id', ''); set('nama_kelas', ''); }} onPick={handleSiswaPick} placeholder="Ketik nama siswa..." suggestions={siswaList} getLabel={s => s.nama} getKey={s => s.id} />
              </Field>
              <Field label="Kelas"><Input value={formData.nama_kelas} readOnly className="bg-slate-50" /></Field>
              <Field label="Nama Orang Tua/Wali *">
                <div className="relative">
                  <Input value={formData.nama_ortu_wali} onChange={(e) => { set('nama_ortu_wali', e.target.value); set('hubungan_ortu', ''); }} onFocus={() => setShowOrtu(true)} onBlur={() => setTimeout(() => setShowOrtu(false), 150)} />
                  {showOrtu && ortuOptions.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg">
                      {ortuOptions.map((o, i) => (
                        <button type="button" key={i} onMouseDown={(e) => { e.preventDefault(); set('nama_ortu_wali', o.nama); set('hubungan_ortu', o.label); setShowOrtu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-b border-slate-100 last:border-0">{o.label}: {o.nama}</button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
              <Field label="No. HP/WA">
                <div className="relative">
                  <Input value={formData.no_hp_wa} onChange={(e) => set('no_hp_wa', e.target.value)} onFocus={() => setShowKontak(true)} onBlur={() => setTimeout(() => setShowKontak(false), 150)} />
                  {showKontak && kontakOptions.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg">
                      {kontakOptions.map((o, i) => (
                        <button type="button" key={i} onMouseDown={(e) => { e.preventDefault(); set('no_hp_wa', o.no); setShowKontak(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-b border-slate-100 last:border-0">{o.label}: {o.no}</button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Keperluan *" full><Textarea value={formData.keperluan} onChange={(e) => set('keperluan', e.target.value)} rows={2} /></Field>
              <Field label="Alamat Rumah" full><Textarea value={formData.alamat_rumah} onChange={(e) => set('alamat_rumah', e.target.value)} rows={2} /></Field>
            </Section>
          )}

          {j === 'Tamu Yayasan' && (
            <Section title="Data Tamu Yayasan">
              <Field label="Nama Lengkap *"><Input value={formData.nama_lengkap} onChange={(e) => set('nama_lengkap', e.target.value)} /></Field>
              <Field label="Jabatan di Yayasan"><Input value={formData.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></Field>
              <Field label="No. HP/WA"><Input value={formData.no_hp_wa} onChange={(e) => set('no_hp_wa', e.target.value)} /></Field>
              <Field label="Agenda/Keperluan *" full><Textarea value={formData.keperluan} onChange={(e) => set('keperluan', e.target.value)} rows={2} /></Field>
            </Section>
          )}

          {j === 'Tamu Sekolah Lain' && (
            <Section title="Data Tamu Sekolah Lain">
              <Field label="Nama Lengkap *"><Input value={formData.nama_lengkap} onChange={(e) => set('nama_lengkap', e.target.value)} /></Field>
              <Field label="Nama Sekolah *"><Input value={formData.nama_sekolah} onChange={(e) => set('nama_sekolah', e.target.value)} /></Field>
              <Field label="Jabatan"><Input value={formData.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></Field>
              <Field label="No. HP/WA"><Input value={formData.no_hp_wa} onChange={(e) => set('no_hp_wa', e.target.value)} /></Field>
              <Field label="Ingin Bertemu" full>
                <Autocomplete value={formData.ingin_bertemu} onChange={(v) => { set('ingin_bertemu', v); set('ingin_bertemu_pegawai_id', ''); }} onPick={handlePegawaiPick} placeholder="Ketik nama pegawai..." suggestions={guruList} getLabel={g => g.nama} getKey={g => g.id} />
              </Field>
              <Field label="Keperluan *" full><Textarea value={formData.keperluan} onChange={(e) => set('keperluan', e.target.value)} rows={2} /></Field>
              <Field label="Alamat Sekolah" full><Textarea value={formData.alamat_sekolah} onChange={(e) => set('alamat_sekolah', e.target.value)} rows={2} /></Field>
            </Section>
          )}

          {j === 'Tamu Umum' && (
            <Section title="Data Tamu Umum">
              <Field label="Nama Lengkap *"><Input value={formData.nama_lengkap} onChange={(e) => set('nama_lengkap', e.target.value)} /></Field>
              <Field label="No. Identitas (KTP/SIM)"><Input value={formData.no_identitas} onChange={(e) => set('no_identitas', e.target.value)} /></Field>
              <Field label="No. HP/WA"><Input value={formData.no_hp_wa} onChange={(e) => set('no_hp_wa', e.target.value)} /></Field>
              <Field label="Keperluan *" full><Textarea value={formData.keperluan} onChange={(e) => set('keperluan', e.target.value)} rows={2} /></Field>
              <Field label="Alamat Lengkap" full><Textarea value={formData.alamat} onChange={(e) => set('alamat', e.target.value)} rows={2} /></Field>
            </Section>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={saveMutation.isPending}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
      <Label className="text-xs text-slate-700 uppercase tracking-wide font-semibold">{title}</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}