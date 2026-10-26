import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SpmbGuard from '@/components/spmb/SpmbGuard';
import StatusBadge from '@/components/spmb/StatusBadge';
import WawancaraFormDialog from '@/components/spmb/WawancaraFormDialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { MessagesSquare, CalendarDays, UserRound, ChevronDown, ChevronUp, Home, Loader2, Pencil } from 'lucide-react';
import { buatDrafHomeVisit } from '@/lib/spmbUtils';
import { WAWANCARA_QUESTIONS } from '@/lib/spmbWawancara';
import { bolehAksesSpmb } from '@/lib/spmbAkses';

function InterviewCard({ d, onEdit, onMakeDraft, busyId, canManage }) {
  const [open, setOpen] = useState(false);
  const answers = d.interview_answers || [];
  const sudah = d.interview_status && d.interview_status !== 'belum';
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{d.nama}</p>
          <p className="font-mono text-xs text-slate-500">{d.reg_number}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={d.status} />
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sudah ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {sudah ? 'Sudah Wawancara' : 'Belum Wawancara'}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        {d.interview_date && <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{d.interview_date}</span>}
        {d.interview_officer && <span className="inline-flex items-center gap-1"><UserRound className="w-3.5 h-3.5" />{d.interview_officer}</span>}
      </div>
      {d.interview_notes && <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{d.interview_notes}</p>}
      {answers.length > 0 && (
        <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {answers.length} jawaban wawancara
        </button>
      )}
      {open && (
        <div className="space-y-1.5 bg-slate-50 rounded-lg p-3 max-h-72 overflow-y-auto">
          {answers.map((a) => (
            <div key={a.no} className="text-xs text-slate-600">
              <span className="font-mono text-slate-400">{a.no}</span>
              {WAWANCARA_QUESTIONS[a.no] ? ` — ${WAWANCARA_QUESTIONS[a.no].label}` : ''}
              <p className="text-slate-800 font-medium">{a.jawaban}</p>
            </div>
          ))}
        </div>
      )}
      <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-2">
        {canManage ? (
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => onEdit(d)}>
            <Pencil className="w-3.5 h-3.5" /> {sudah ? 'Ubah Hasil' : 'Isi Wawancara'}
          </Button>
        ) : <span className="text-[11px] text-slate-400">Hanya lihat</span>}
        {d.finalized && !d.homevisit_id && (answers.length > 0 || d.interview_notes) && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8" disabled={busyId === d.id} onClick={() => onMakeDraft(d)}>
            {busyId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Home className="w-3.5 h-3.5" />}
            Draf Home Visit
          </Button>
        )}
      </div>
    </div>
  );
}

function WawancaraPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = bolehAksesSpmb(user?.role);

  const { data, isLoading } = useQuery({
    queryKey: ['SiswaSPMB'],
    queryFn: () => base44.entities.SiswaSPMB.list('-created_date', 200),
  });
  const pengaturanQ = useQuery({ queryKey: ['PengaturanAplikasi'], queryFn: () => base44.entities.PengaturanAplikasi.list() });

  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const list = data || [];
  const taAktif = (pengaturanQ.data || [])[0]?.tahun_ajaran_aktif || '';

  const filtered = list.filter((d) => {
    if (filter === 'sudah') return d.interview_status && d.interview_status !== 'belum';
    if (filter === 'belum') return !d.interview_status || d.interview_status === 'belum';
    return true;
  });
  const stats = useMemo(() => ({
    total: list.length,
    sudah: list.filter((d) => d.interview_status && d.interview_status !== 'belum').length,
    draf: list.filter((d) => d.homevisit_id).length,
  }), [list]);

  const bukaForm = (d) => { setEditing(d); setFormOpen(true); };

  const handleDraft = async (d) => {
    setBusyId(d.id);
    try {
      await buatDrafHomeVisit(d, null, taAktif);
      await qc.invalidateQueries({ queryKey: ['SiswaSPMB'] });
      toast({ title: 'Draf Home Visit dibuat', description: `${d.nama} — terisi dari hasil wawancara SPMB.` });
    } catch (e) {
      toast({ title: 'Gagal membuat draf', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Wawancara SPMB</h1>
          <p className="text-sm text-slate-500">Isi hasil wawancara orang tua/wali untuk setiap pendaftar</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="bg-white border border-slate-200 rounded-full px-3 py-1">Total: <b>{stats.total}</b></span>
        <span className="bg-white border border-slate-200 rounded-full px-3 py-1">Sudah wawancara: <b className="text-emerald-600">{stats.sudah}</b></span>
        <span className="bg-white border border-slate-200 rounded-full px-3 py-1">Draf Home Visit: <b className="text-violet-600">{stats.draf}</b></span>
      </div>

      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-48 bg-white"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Pendaftar</SelectItem>
          <SelectItem value="sudah">Sudah Wawancara</SelectItem>
          <SelectItem value="belum">Belum Wawancara</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="p-10 text-center text-slate-400 text-sm">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">Belum ada data wawancara.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((d) => (
            <InterviewCard key={d.id} d={d} onEdit={bukaForm} onMakeDraft={handleDraft} busyId={busyId} canManage={canManage} />
          ))}
        </div>
      )}

      <WawancaraFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        pendaftar={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ['SiswaSPMB'] })}
      />
    </div>
  );
}

export default function WawancaraSPMB() {
  return <SpmbGuard><WawancaraPage /></SpmbGuard>;
}