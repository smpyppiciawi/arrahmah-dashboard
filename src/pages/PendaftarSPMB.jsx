import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SpmbGuard from '@/components/spmb/SpmbGuard';
import SpmbSyncButton from '@/components/spmb/SpmbSyncButton';
import StatusBadge from '@/components/spmb/StatusBadge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Users, UserCheck, Clock, XCircle, BadgeCheck } from 'lucide-react';
import { fmtRp } from '@/lib/spmbUtils';

const STATUS_OPTIONS = [
  { v: 'all', l: 'Semua Status' },
  { v: 'pending', l: 'Pending' },
  { v: 'verified', l: 'Terverifikasi' },
  { v: 'accepted', l: 'Diterima' },
  { v: 'tarik_berkas', l: 'Tarik Berkas' },
  { v: 'undur_diri', l: 'Undur Diri' },
];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-slate-500 w-36 shrink-0">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}

function PendaftarDetail({ d }) {
  const alamat = [d.address, d.rt && `RT ${d.rt}`, d.rw && `RW ${d.rw}`, d.village, d.district, d.city, d.province, d.postal_code].filter(Boolean).join(', ');
  return (
    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
      <section>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data Pribadi</h4>
        <div className="space-y-1.5">
          <DetailRow label="No. Pendaftaran" value={d.reg_number} />
          <DetailRow label="Nama" value={d.nama} />
          <DetailRow label="Panggilan" value={d.nickname} />
          <DetailRow label="Jenis Kelamin" value={d.gender} />
          <DetailRow label="NISN" value={d.nisn} />
          <DetailRow label="NIK" value={d.nik} />
          <DetailRow label="Tempat Lahir" value={d.birth_place} />
          <DetailRow label="Tanggal Lahir" value={d.birth_date} />
          <DetailRow label="Agama" value={d.religion} />
          <DetailRow label="Sekolah Asal" value={d.previous_school} />
          <DetailRow label="Alamat" value={alamat} />
        </div>
      </section>
      <section>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pendaftaran & Orang Tua</h4>
        <div className="space-y-1.5">
          <DetailRow label="Gelombang" value={d.wave} />
          <DetailRow label="Tgl Pendaftaran" value={d.registration_date} />
          <DetailRow label="Nama Ayah" value={[d.father_name, d.father_phone].filter(Boolean).join(' — ')} />
          <DetailRow label="Nama Ibu" value={[d.mother_name, d.mother_phone].filter(Boolean).join(' — ')} />
          <DetailRow label="Wali" value={[d.guardian_name, d.guardian_phone].filter(Boolean).join(' — ')} />
        </div>
      </section>
      <section>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Wawancara</h4>
        <div className="space-y-1.5">
          <DetailRow label="Status" value={d.interview_status || 'belum'} />
          <DetailRow label="Tanggal" value={d.interview_date} />
          <DetailRow label="Penguji" value={d.interview_officer} />
          <DetailRow label="Catatan" value={d.interview_notes} />
        </div>
      </section>
      <section>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Pembayaran SPMB {d.total_dibayar > 0 && <span className="text-slate-700">— Total {fmtRp(d.total_dibayar)}</span>}
        </h4>
        {(d.pembayaran || []).length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada pembayaran.</p>
        ) : (
          <div className="space-y-1">
            {d.pembayaran.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                <span>{p.tanggal} {p.catatan ? `— ${p.catatan}` : ''}</span>
                <span className="font-semibold text-slate-800">{fmtRp(p.nominal)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PendaftarPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['SiswaSPMB'],
    queryFn: () => base44.entities.SiswaSPMB.list('-created_date', 200),
  });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [wave, setWave] = useState('all');
  const [selected, setSelected] = useState(null);

  const list = data || [];
  const stats = useMemo(() => ({
    total: list.length,
    diterima: list.filter((d) => d.status === 'accepted').length,
    menunggu: list.filter((d) => ['pending', 'verified'].includes(d.status)).length,
    tidakLanjut: list.filter((d) => ['tarik_berkas', 'undur_diri'].includes(d.status)).length,
    finalisasi: list.filter((d) => d.finalized).length,
  }), [list]);

  const filtered = list.filter((d) => {
    const q = search.toLowerCase();
    const matchQ = !q || (d.nama || '').toLowerCase().includes(q) || (d.reg_number || '').toLowerCase().includes(q);
    const matchS = status === 'all' || d.status === status;
    const matchW = wave === 'all' || d.wave === wave;
    return matchQ && matchS && matchW;
  });

  const waves = [...new Set(list.map((d) => d.wave).filter(Boolean))];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pendaftar SPMB</h1>
          <p className="text-sm text-slate-500">Daftar pendaftar baru dari platform SPMB</p>
        </div>
        <SpmbSyncButton />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Total Pendaftar" value={stats.total} color="bg-blue-500" />
        <StatCard icon={UserCheck} label="Diterima" value={stats.diterima} color="bg-emerald-500" />
        <StatCard icon={Clock} label="Dalam Proses" value={stats.menunggu} color="bg-amber-500" />
        <StatCard icon={XCircle} label="Tidak Lanjut" value={stats.tidakLanjut} color="bg-rose-500" />
        <StatCard icon={BadgeCheck} label="Sudah Finalisasi" value={stats.finalisasi} color="bg-violet-500" />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cari nama / no. pendaftaran..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={wave} onValueChange={setWave}>
          <SelectTrigger className="w-40 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Gelombang</SelectItem>
            {waves.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Belum ada pendaftar. Tekan "Tarik Data SPMB" untuk menarik.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold">No. Pendaftaran</th>
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">Gelombang</th>
                  <th className="px-4 py-3 font-semibold">Wawancara</th>
                  <th className="px-4 py-3 font-semibold text-right">Dibayar</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Finalisasi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(d)}>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{d.reg_number}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{d.nama}</td>
                    <td className="px-4 py-2.5 text-slate-600">{d.wave}</td>
                    <td className="px-4 py-2.5 text-slate-600">{d.interview_status || 'belum'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{fmtRp(d.total_dibayar)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-2.5">
                      {d.finalized
                        ? <span className="text-[11px] font-semibold text-emerald-600">Sudah Finalisasi</span>
                        : <span className="text-[11px] text-slate-400">Belum</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selected?.nama}
              {selected && <StatusBadge status={selected.status} />}
            </DialogTitle>
          </DialogHeader>
          {selected && <PendaftarDetail d={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PendaftarSPMB() {
  return <SpmbGuard><PendaftarPage /></SpmbGuard>;
}