import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SpmbGuard from '@/components/spmb/SpmbGuard';
import StatusBadge from '@/components/spmb/StatusBadge';
import PembayaranFormDialog from '@/components/spmb/PembayaranFormDialog';
import GelombangManager from '@/components/spmb/GelombangManager';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { Search, Wallet, CheckCircle2, Circle, Plus, Receipt } from 'lucide-react';
import { fmtRp } from '@/lib/spmbUtils';
import { bolehAksesSpmb, bolehKelolaPenuhSpmb } from '@/lib/spmbAkses';

const TABS = [
  { id: 'pendaftar', label: 'Pendaftar' },
  { id: 'riwayat', label: 'Riwayat Transaksi' },
  { id: 'gelombang', label: 'Gelombang' },
];

function PembayaranPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const bolehGelombang = bolehKelolaPenuhSpmb(user?.role);
  const canInput = bolehAksesSpmb(user?.role);

  const { data, isLoading } = useQuery({
    queryKey: ['SiswaSPMB'],
    queryFn: () => base44.entities.SiswaSPMB.list('-created_date', 200),
  });
  const gelombangQ = useQuery({ queryKey: ['GelombangSPMB'], queryFn: () => base44.entities.GelombangSPMB.list('nama') });
  const pengaturanQ = useQuery({ queryKey: ['PengaturanAplikasi'], queryFn: () => base44.entities.PengaturanAplikasi.list() });

  const [tab, setTab] = useState('pendaftar');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [target, setTarget] = useState(null);

  const list = data || [];
  const gelombangList = gelombangQ.data || [];
  const taAktif = (pengaturanQ.data || [])[0]?.tahun_ajaran_aktif || '';

  const q = search.toLowerCase();
  const filteredPendaftar = list.filter((d) => !q || (d.nama || '').toLowerCase().includes(q) || (d.reg_number || '').toLowerCase().includes(q));

  const rows = useMemo(() => {
    const out = [];
    for (const d of list) {
      for (const p of d.pembayaran || []) {
        out.push({ ...p, reg_number: d.reg_number, nama: d.nama });
      }
    }
    return out.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  }, [list]);

  const filteredRows = rows.filter((r) => !q || (r.nama || '').toLowerCase().includes(q) || (r.reg_number || '').toLowerCase().includes(q));

  const total = rows.reduce((a, r) => a + (Number(r.nominal) || 0), 0);
  const tercatat = rows.filter((r) => r.keuangan_id).length;

  const bukaInput = (d) => { setTarget(d || null); setFormOpen(true); };

  const tabs = bolehGelombang ? TABS : TABS.filter((t) => t.id !== 'gelombang');

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pembayaran SPMB</h1>
          <p className="text-sm text-slate-500">Pembayaran pendaftar — otomatis tercatat di buku kas Bendahara</p>
        </div>
        {canInput && (
          <Button onClick={() => bukaInput(null)} className="gap-2"><Plus className="w-4 h-4" /> Input Pembayaran</Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900 leading-none">{fmtRp(total)}</p>
            <p className="text-xs text-slate-500 mt-1">Total Pembayaran</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xl font-bold text-slate-900 leading-none">{rows.length}</p>
          <p className="text-xs text-slate-500 mt-1">Transaksi</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xl font-bold text-emerald-600 leading-none">{tercatat}</p>
          <p className="text-xs text-slate-500 mt-1">Masuk Buku Kas</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-slate-100 rounded-full p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab !== 'gelombang' && (
          <div className="relative max-w-xs flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cari nama / no. pendaftaran..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white" />
          </div>
        )}
      </div>

      {tab === 'gelombang' ? (
        <GelombangManager
          gelombangList={gelombangList}
          tahunAjaran={taAktif}
          onChanged={() => qc.invalidateQueries({ queryKey: ['GelombangSPMB'] })}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Memuat data...</div>
          ) : tab === 'pendaftar' ? (
            filteredPendaftar.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">Belum ada pendaftar.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 font-semibold">No. Pendaftaran</th>
                      <th className="px-4 py-3 font-semibold">Nama</th>
                      <th className="px-4 py-3 font-semibold">Gelombang</th>
                      <th className="px-4 py-3 font-semibold text-right">Biaya</th>
                      <th className="px-4 py-3 font-semibold text-right">Dibayar</th>
                      <th className="px-4 py-3 font-semibold text-right">Sisa</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      {canInput && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendaftar.map((d) => {
                      const biaya = Number(d.biaya_tertagih) || 0;
                      const sisa = biaya - (Number(d.total_dibayar) || 0);
                      return (
                        <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{d.reg_number}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-800">{d.nama}</td>
                          <td className="px-4 py-2.5 text-slate-600">{d.wave || '-'}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{biaya ? fmtRp(biaya) : '-'}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{fmtRp(d.total_dibayar)}</td>
                          <td className={`px-4 py-2.5 text-right font-semibold ${sisa > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{biaya ? fmtRp(sisa) : '-'}</td>
                          <td className="px-4 py-2.5"><StatusBadge status={d.status} /></td>
                          {canInput && (
                            <td className="px-4 py-2.5 text-right">
                              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => bukaInput(d)}>
                                <Receipt className="w-3.5 h-3.5" /> Bayar
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredRows.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">Belum ada pembayaran SPMB.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 font-semibold">Tanggal</th>
                    <th className="px-4 py-3 font-semibold">No. Pendaftaran</th>
                    <th className="px-4 py-3 font-semibold">Nama</th>
                    <th className="px-4 py-3 font-semibold">Jenis</th>
                    <th className="px-4 py-3 font-semibold text-right">Nominal</th>
                    <th className="px-4 py-3 font-semibold">Buku Kas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-600">{r.tanggal}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{r.reg_number}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{r.nama}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.jenis || r.catatan || '-'}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{fmtRp(r.nominal)}</td>
                      <td className="px-4 py-2.5">
                        {r.keuangan_id ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Tercatat
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                            <Circle className="w-3.5 h-3.5" /> Belum tertaut
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Setiap pembayaran yang diinput langsung dibuatkan transaksi Pemasukan di menu Transaksi (berlabel "SPMB" + nomor pendaftaran) — tanpa duplikat.
      </p>

      <PembayaranFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        pendaftar={target}
        pendaftarList={list}
        gelombangList={gelombangList}
        tahunAjaran={taAktif}
        picName={user?.full_name}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['SiswaSPMB'] });
          qc.invalidateQueries({ queryKey: ['Keuangan'] });
        }}
      />
    </div>
  );
}

export default function PembayaranSPMB() {
  return <SpmbGuard><PembayaranPage /></SpmbGuard>;
}