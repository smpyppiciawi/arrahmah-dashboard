import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { PiggyBank, Search, Loader2, Wallet, CheckCircle2 } from 'lucide-react';
import TerapkanMukaDialog from './TerapkanMukaDialog';
import IuranMukaDetailDialog from './IuranMukaDetailDialog';

const formatRupiah = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

/**
 * Tab Iuran Muka (Kelola Data Keuangan): daftar saldo iuran muka per siswa
 * per TA tujuan per iuran, riwayat setoran & penerapan, dan tombol
 * Terapkan sebagai Pembayaran (manual oleh Bendahara).
 */
export default function IuranMukaTab({ tarifIuranList, biayaKhususList }) {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [terapkanRecord, setTerapkanRecord] = useState(null);
  const [terapkanOpen, setTerapkanOpen] = useState(false);
  const [detailKey, setDetailKey] = useState(null);

  const { data: mukaList = [], isLoading } = useQuery({
    queryKey: ['iuran-muka'],
    queryFn: () => base44.entities.IuranMuka.list('-created_date'),
  });
  const { data: keuanganList = [] } = useQuery({
    queryKey: ['keuangan'],
    queryFn: () => base44.entities.Keuangan.list('-tanggal', 3000),
  });

  const rows = useMemo(() => {
    let list = mukaList.map(m => ({ ...m, sisa: Math.max(0, (m.nominal || 0) - (m.nominal_diterapkan || 0)) }));
    const q = (search || '').toLowerCase().trim();
    if (q) {
      list = list.filter(m => [m.nama_siswa, m.nis, m.nama_kelas, m.nama_iuran, m.tahun_ajaran_tujuan]
        .some(v => (v || '').toLowerCase().includes(q)));
    }
    return list.sort((a, b) =>
      b.sisa - a.sisa ||
      String(b.tanggal_setoran || '').localeCompare(String(a.tanggal_setoran || '')));
  }, [mukaList, search]);

  const totalSaldo = rows.reduce((s, m) => s + m.sisa, 0);
  const totalDiterapkan = mukaList.reduce((s, m) => s + (m.nominal_diterapkan || 0), 0);
  const jumlahSiswaSaldo = new Set(rows.filter(m => m.sisa > 0).map(m => m.siswa_id)).size;

  // Kelompokkan per siswa: satu kartu = satu siswa, berisi semua alokasi iuran mukanya
  const siswaGroups = useMemo(() => {
    const map = new Map();
    rows.forEach(m => {
      const key = m.siswa_id || `${m.nis}|${m.nama_siswa}`;
      if (!map.has(key)) {
        map.set(key, { key, siswa_id: m.siswa_id, nis: m.nis, nama_siswa: m.nama_siswa, nama_kelas: m.nama_kelas, records: [] });
      }
      const g = map.get(key);
      if (m.nama_kelas) g.nama_kelas = m.nama_kelas;
      g.records.push(m);
    });
    return [...map.values()].map(g => ({
      ...g,
      totalSaldo: g.records.reduce((s, r) => s + r.sisa, 0),
      totalSetoran: g.records.reduce((s, r) => s + (r.nominal || 0), 0),
      totalDiterapkan: g.records.reduce((s, r) => s + (r.nominal_diterapkan || 0), 0),
    })).sort((a, b) => b.totalSaldo - a.totalSaldo || String(a.nama_siswa).localeCompare(String(b.nama_siswa)));
  }, [rows]);
  const detailGroup = detailKey ? siswaGroups.find(g => g.key === detailKey) : null;

  return (
    <div className="space-y-4">
      {/* Ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 font-medium">Total Saldo Iuran Muka</p>
              <p className="text-xl font-bold text-purple-700">{formatRupiah(totalSaldo)}</p>
            </div>
            <PiggyBank className="w-8 h-8 text-purple-400" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium">Siswa dengan Saldo</p>
              <p className="text-xl font-bold text-blue-700">{jumlahSiswaSaldo} siswa</p>
            </div>
            <Wallet className="w-8 h-8 text-blue-400" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600 font-medium">Sudah Diterapkan</p>
              <p className="text-xl font-bold text-emerald-700">{formatRupiah(totalDiterapkan)}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </CardContent>
        </Card>
      </div>

      {/* Bantuan */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 text-xs text-slate-500">
          Setoran iuran muka dicatat lewat <b>Transaksi → Tambah → Siswa → Pembayaran Di Muka</b>. Uang sudah masuk kas saat setoran —
          gunakan tombol <b>Terapkan sebagai Pembayaran</b> untuk mengarahkan saldo menjadi transaksi pembayaran resmi saat tahun ajaran/iuran tujuan tiba.
        </CardContent>
      </Card>

      {/* Pencarian */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama / NIS / iuran / TA tujuan..."
          className="pl-9"
        />
      </div>

      {/* Daftar Saldo */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-10 text-center">
            <PiggyBank className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Belum ada setoran iuran muka</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {siswaGroups.map(g => {
            const selesai = g.records.every(r => r.sisa <= 0);
            const jenisIuran = [...new Set(g.records.map(r => r.nama_iuran).filter(Boolean))];
            return (
              <Card
                key={g.key}
                className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setDetailKey(g.key)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{g.nama_siswa}</p>
                      <p className="text-xs text-slate-400 truncate">{g.nis || '-'} · {g.nama_kelas || '-'}</p>
                    </div>
                    {selesai
                      ? <Badge className="bg-emerald-100 text-emerald-700 shrink-0">Selesai</Badge>
                      : <Badge className="bg-blue-100 text-blue-700 shrink-0">Menunggu Penerapan</Badge>}
                  </div>

                  <div className="p-2.5 rounded-lg bg-purple-50 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-purple-500 uppercase font-medium">Total Saldo Iuran Muka</p>
                      <p className="text-base font-bold text-purple-700 truncate">{formatRupiah(g.totalSaldo)}</p>
                    </div>
                    <PiggyBank className="w-6 h-6 text-purple-400 shrink-0" />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {jenisIuran.map(nm => (
                      <Badge key={nm} variant="outline" className="text-[10px] text-slate-600 bg-slate-50">{nm}</Badge>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-400">
                    {g.records.length} setoran · Setoran {formatRupiah(g.totalSetoran)} · Diterapkan {formatRupiah(g.totalDiterapkan)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <IuranMukaDetailDialog
        isOpen={!!detailGroup}
        onClose={() => setDetailKey(null)}
        group={detailGroup}
        onTerapkan={(m) => { setTerapkanRecord(m); setTerapkanOpen(true); }}
      />

      <TerapkanMukaDialog
        isOpen={terapkanOpen}
        onClose={() => { setTerapkanOpen(false); setTerapkanRecord(null); }}
        record={terapkanRecord}
        tarifIuranList={tarifIuranList}
        biayaKhususList={biayaKhususList}
        keuanganList={keuanganList}
        currentUser={currentUser}
      />
    </div>
  );
}