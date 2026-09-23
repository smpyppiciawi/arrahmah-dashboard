import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { PiggyBank, Search, ArrowRightLeft, Loader2, Wallet, CheckCircle2 } from 'lucide-react';
import TerapkanMukaDialog from './TerapkanMukaDialog';
import { formatDateID } from '@/lib/sppUtils';

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

  const statusBadge = (m) => {
    if (m.sisa <= 0) return <Badge className="bg-emerald-100 text-emerald-700">Selesai</Badge>;
    if ((m.nominal_diterapkan || 0) > 0) return <Badge className="bg-amber-100 text-amber-700">Sebagian Diterapkan</Badge>;
    return <Badge className="bg-blue-100 text-blue-700">Menunggu Penerapan</Badge>;
  };

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
        rows.map(m => (
          <Card key={m.id} className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {m.nama_siswa} <span className="font-normal text-slate-400">· {m.nis || '-'}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {m.nama_kelas || '-'} · Setoran {formatDateID(m.tanggal_setoran)}{m.pencatat ? ` · dicatat ${m.pencatat}` : ''}
                  </p>
                </div>
                {statusBadge(m)}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-50">
                  <p className="text-[10px] text-slate-400 uppercase">Iuran / TA Tujuan</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{m.nama_iuran}<br />TP {m.tahun_ajaran_tujuan || '-'}</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <p className="text-[10px] text-slate-400 uppercase">Setoran</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{formatRupiah(m.nominal)}</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50">
                  <p className="text-[10px] text-emerald-500 uppercase">Diterapkan</p>
                  <p className="text-xs font-bold text-emerald-700 mt-0.5">{formatRupiah(m.nominal_diterapkan)}</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-50">
                  <p className="text-[10px] text-purple-500 uppercase">Sisa Saldo</p>
                  <p className="text-xs font-bold text-purple-700 mt-0.5">{formatRupiah(m.sisa)}</p>
                </div>
              </div>

              {(m.penerapan || []).length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Riwayat Penerapan</p>
                  {m.penerapan.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-600 truncate">
                        {formatDateID(p.tanggal)} · {p.uraian}{p.pic ? ` · PIC ${p.pic}` : ''}
                      </span>
                      <span className="font-bold text-emerald-600 shrink-0">{formatRupiah(p.nominal)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={m.sisa <= 0}
                  onClick={() => { setTerapkanRecord(m); setTerapkanOpen(true); }}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Terapkan sebagai Pembayaran
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

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