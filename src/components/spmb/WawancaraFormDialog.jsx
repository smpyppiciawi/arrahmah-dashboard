import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';
import {
  WAWANCARA_SECTIONS, WAWANCARA_QUESTIONS, WAWANCARA_BOOL,
  answersToMap, mapToAnswers,
} from '@/lib/spmbWawancara';

const STATUS = [
  { v: 'belum', l: 'Belum' },
  { v: 'lulus', l: 'Lulus' },
  { v: 'tidak_lulus', l: 'Tidak Lulus' },
];

export default function WawancaraFormDialog({ open, onOpenChange, pendaftar, onSaved }) {
  const { toast } = useToast();
  const [status, setStatus] = useState('belum');
  const [tanggal, setTanggal] = useState('');
  const [penguji, setPenguji] = useState('');
  const [catatan, setCatatan] = useState('');
  const [jawaban, setJawaban] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && pendaftar) {
      setStatus(pendaftar.interview_status || 'belum');
      setTanggal(pendaftar.interview_date || new Date().toISOString().slice(0, 10));
      setPenguji(pendaftar.interview_officer || '');
      setCatatan(pendaftar.interview_notes || '');
      setJawaban(answersToMap(pendaftar.interview_answers));
    }
  }, [open, pendaftar]);

  const set = (k, v) => setJawaban((j) => ({ ...j, [k]: v }));

  const handleSave = async () => {
    if (!pendaftar) return;
    setBusy(true);
    try {
      await base44.entities.SiswaSPMB.update(pendaftar.id, {
        interview_status: status,
        interview_date: tanggal,
        interview_officer: penguji,
        interview_notes: catatan,
        interview_answers: mapToAnswers(jawaban),
      });
      toast({ title: 'Hasil wawancara disimpan', description: pendaftar.nama });
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Gagal menyimpan', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wawancara — {pendaftar?.nama}</DialogTitle>
          <DialogDescription>{pendaftar?.reg_number} · Isi hasil wawancara orang tua/wali.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Status Wawancara</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Tanggal</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Pewawancara</Label>
              <Input value={penguji} onChange={(e) => setPenguji(e.target.value)} placeholder="Nama pewawancara" />
            </div>
          </section>

          {WAWANCARA_SECTIONS.map((sec) => (
            <section key={sec.title} className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">{sec.title}</h4>
              <div className="space-y-3">
                {sec.fields.map((no) => {
                  const q = WAWANCARA_QUESTIONS[no];
                  if (!q) return null;
                  const isBool = WAWANCARA_BOOL.includes(no);
                  return (
                    <div key={no} className="space-y-1">
                      <Label className="text-xs text-slate-600">{q.label}</Label>
                      {isBool ? (
                        <div className="flex gap-2">
                          {['Ya', 'Tidak'].map((opt) => (
                            <button
                              type="button"
                              key={opt}
                              onClick={() => set(no, jawaban[no] === opt ? '' : opt)}
                              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                jawaban[no] === opt ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Textarea rows={2} value={jawaban[no] || ''} onChange={(e) => set(no, e.target.value)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="space-y-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">Catatan Tambahan</h4>
            <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan hasil wawancara..." />
          </section>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Hasil
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}