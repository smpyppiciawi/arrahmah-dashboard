import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SpmbGuard from '@/components/spmb/SpmbGuard';
import SpmbSyncButton from '@/components/spmb/SpmbSyncButton';
import StatusBadge from '@/components/spmb/StatusBadge';
import { Input } from '@/components/ui/input';
import { Search, Wallet, CheckCircle2, Circle } from 'lucide-react';
import { fmtRp } from '@/lib/spmbUtils';

function PembayaranPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['SiswaSPMB'],
    queryFn: () => base44.entities.SiswaSPMB.list('-created_date', 200),
  });
  const [search, setSearch] = useState('');

  const list = data || [];
  const rows = useMemo(() => {
    const out = [];
    for (const d of list) {
      for (const p of d.pembayaran || []) {
        out.push({ ...p, reg_number: d.reg_number, nama: d.nama, status: d.status });
      }
    }
    return out.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  }, [list]);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || (r.nama || '').toLowerCase().includes(q) || (r.reg_number || '').toLowerCase().includes(q);
  });

  const total = filtered.reduce((a, r) => a + (Number(r.nominal) || 0), 0);
  const tercatat = filtered.filter((r) => r.keuangan_id).length;

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pembayaran SPMB</h1>
          <p className="text-sm text-slate-500">Pembayaran pendaftar — otomatis tercatat di buku kas Bendahara</p>
        </div>
        <SpmbSyncButton />
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
          <p className="text-xl font-bold text-slate-900 leading-none">{filtered.length}</p>
          <p className="text-xs text-slate-500 mt-1">Transaksi</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xl font-bold text-emerald-600 leading-none">{tercatat}</p>
          <p className="text-xs text-slate-500 mt-1">Masuk Buku Kas</p>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Cari nama / no. pendaftaran..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Belum ada pembayaran SPMB.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">No. Pendaftaran</th>
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">Catatan</th>
                  <th className="px-4 py-3 font-semibold text-right">Nominal</th>
                  <th className="px-4 py-3 font-semibold">Buku Kas</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600">{r.tanggal}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{r.reg_number}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.nama}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.catatan || '-'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{fmtRp(r.nominal)}</td>
                    <td className="px-4 py-2.5">
                      {r.keuangan_id ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Tercatat
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                          <Circle className="w-3.5 h-3.5" /> Menunggu sinkron
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

      <p className="text-xs text-slate-400">
        Setiap pembayaran baru dari SPMB otomatis dibuatkan transaksi Pemasukan di menu Transaksi (berlabel "SPMB" + nomor pendaftaran) — tanpa duplikat.
      </p>
    </div>
  );
}

export default function PembayaranSPMB() {
  return <SpmbGuard><PembayaranPage /></SpmbGuard>;
}