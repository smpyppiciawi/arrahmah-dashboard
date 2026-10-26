import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Check } from 'lucide-react';
import { DOC_FIELDS, buatNomorPendaftaran, gelombangBerlaku } from '@/lib/spmbDaftar';

const STATUS = [
  { v: 'pending', l: 'Pending' },
  { v: 'verified', l: 'Terverifikasi' },
  { v: 'accepted', l: 'Diterima' },
  { v: 'tarik_berkas', l: 'Tarik Berkas' },
  { v: 'undur_diri', l: 'Undur Diri' },
];

const emptyForm = () => ({
  nama: '', nickname: '', gender: '', nisn: '', nik: '', birth_place: '', birth_date: '',
  religion: 'Islam', address: '', rt: '', rw: '', village: '', district: '', city: '', province: '', postal_code: '',
  previous_school: '', registration_officer: '', registration_date: new Date().toISOString().slice(0, 10),
  status: 'pending', gelombang_id: '', wave: '', biaya_tertagih: 0,
  father_name: '', father_phone: '', father_job: '', mother_name: '', mother_phone: '', mother_job: '',
  guardian_name: '', guardian_phone: '',
  ...Object.fromEntries(DOC_FIELDS.map((d) => [d.key, false])),
});

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">{title}</h4>
      {children}
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">{label}{required && <span className="text-rose-500"> *</span>}</Label>
      {children}
    </div>
  );
}

export default function PendaftarFormDialog({ open, onOpenChange, initial, gelombangList, tahunAjaran, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...emptyForm(), ...initial } : emptyForm());
    }
  }, [open, initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pilihGelombang = (id) => {
    const g = (gelombangList || []).find((x) => x.id === id);
    setForm((f) => ({ ...f, gelombang_id: id, wave: g?.nama || '', biaya_tertagih: Number(g?.biaya) || 0 }));
  };

  const handleSave = async () => {
    if (!form.nama.trim()) {
      toast({ title: 'Nama wajib diisi', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const payload = { ...form };
      delete payload.id; delete payload.created_date; delete payload.updated_date; delete payload.created_by_id;
      if (initial?.id) {
        await base44.entities.SiswaSPMB.update(initial.id, payload);
        toast({ title: 'Pendaftar diperbarui', description: form.nama });
      } else {
        const urut = (await base44.entities.SiswaSPMB.count()) + 1;
        await base44.entities.SiswaSPMB.create({
          ...payload,
          reg_number: buatNomorPendaftaran(urut),
          tahun_ajaran: tahunAjaran || '',
          total_dibayar: 0,
          pembayaran: [],
        });
        toast({ title: 'Pendaftar baru disimpan', description: form.nama });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Gagal menyimpan', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const autoGelombang = !form.gelombang_id ? gelombangBerlaku(gelombangList, form.registration_date) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Ubah Data Pendaftar' : 'Tambah Pendaftar Baru'}</DialogTitle>
          <DialogDescription>Lengkapi data pendaftar, orang tua, dan berkas yang diserahkan.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Section title="Informasi Pendaftaran">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Petugas Pendaftaran">
                <Input value={form.registration_officer} onChange={(e) => set('registration_officer', e.target.value)} placeholder="Nama petugas penerima" />
              </Field>
              <Field label="Tanggal Daftar">
                <Input type="date" value={form.registration_date} onChange={(e) => set('registration_date', e.target.value)} />
              </Field>
              <Field label="Gelombang">
                <Select value={form.gelombang_id || ''} onValueChange={pilihGelombang}>
                  <SelectTrigger><SelectValue placeholder={autoGelombang ? `${autoGelombang.nama} (otomatis)` : 'Pilih gelombang...'} /></SelectTrigger>
                  <SelectContent>
                    {(gelombangList || []).map((g) => <SelectItem key={g.id} value={g.id}>{g.nama}{g.biaya ? ` — Rp ${Number(g.biaya).toLocaleString('id-ID')}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status Pendaftaran">
                <Select value={form.status} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            {autoGelombang && (
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                Gelombang berlaku saat ini: <b>{autoGelombang.nama}</b> — biaya Rp {Number(autoGelombang.biaya || 0).toLocaleString('id-ID')}. Pilih gelombang untuk menetapkan biaya tertagih.
              </p>
            )}
          </Section>

          <Section title="Data Pribadi">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nama Lengkap" required>
                <Input value={form.nama} onChange={(e) => set('nama', e.target.value)} />
              </Field>
              <Field label="Nama Panggilan">
                <Input value={form.nickname} onChange={(e) => set('nickname', e.target.value)} />
              </Field>
              <Field label="Jenis Kelamin">
                <Select value={form.gender || ''} onValueChange={(v) => set('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Agama">
                <Select value={form.religion || 'Islam'} onValueChange={(v) => set('religion', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="NISN"><Input value={form.nisn} onChange={(e) => set('nisn', e.target.value)} /></Field>
              <Field label="NIK"><Input value={form.nik} onChange={(e) => set('nik', e.target.value)} /></Field>
              <Field label="Tempat Lahir"><Input value={form.birth_place} onChange={(e) => set('birth_place', e.target.value)} /></Field>
              <Field label="Tanggal Lahir"><Input type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} /></Field>
            </div>
            <Field label="Alamat"><Textarea rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="RT"><Input value={form.rt} onChange={(e) => set('rt', e.target.value)} /></Field>
              <Field label="RW"><Input value={form.rw} onChange={(e) => set('rw', e.target.value)} /></Field>
              <Field label="Kelurahan"><Input value={form.village} onChange={(e) => set('village', e.target.value)} /></Field>
              <Field label="Kecamatan"><Input value={form.district} onChange={(e) => set('district', e.target.value)} /></Field>
              <Field label="Kota/Kabupaten"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
              <Field label="Provinsi"><Input value={form.province} onChange={(e) => set('province', e.target.value)} /></Field>
              <Field label="Kode Pos"><Input value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} /></Field>
              <Field label="Sekolah Asal"><Input value={form.previous_school} onChange={(e) => set('previous_school', e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Data Orang Tua / Wali">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nama Ayah"><Input value={form.father_name} onChange={(e) => set('father_name', e.target.value)} /></Field>
              <Field label="No. HP Ayah"><Input value={form.father_phone} onChange={(e) => set('father_phone', e.target.value)} /></Field>
              <Field label="Pekerjaan Ayah"><Input value={form.father_job} onChange={(e) => set('father_job', e.target.value)} /></Field>
              <Field label="Nama Ibu"><Input value={form.mother_name} onChange={(e) => set('mother_name', e.target.value)} /></Field>
              <Field label="No. HP Ibu"><Input value={form.mother_phone} onChange={(e) => set('mother_phone', e.target.value)} /></Field>
              <Field label="Pekerjaan Ibu"><Input value={form.mother_job} onChange={(e) => set('mother_job', e.target.value)} /></Field>
              <Field label="Nama Wali"><Input value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} /></Field>
              <Field label="No. HP Wali"><Input value={form.guardian_phone} onChange={(e) => set('guardian_phone', e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Kelengkapan Berkas">
            <div className="grid sm:grid-cols-2 gap-2">
              {DOC_FIELDS.map((d) => {
                const on = !!form[d.key];
                return (
                  <button
                    type="button"
                    key={d.key}
                    onClick={() => set(d.key, !on)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-left transition-colors ${
                      on ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${on ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                      {on && <Check className="w-3.5 h-3.5 text-white" />}
                    </span>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </Section>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}