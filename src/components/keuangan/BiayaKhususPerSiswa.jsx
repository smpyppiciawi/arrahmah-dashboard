import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Trash2, ChevronRight, Gift } from "lucide-react";
import { matchIuranItemTransactions } from "@/lib/sppUtils";

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function BiayaKhususPerSiswa({ biayaKhususList, kelasList, onDelete, activeAcademicYear }) {
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [detailSiswa, setDetailSiswa] = useState(null);

  // Transaksi & tarif untuk hitungan "Sudah Bayar" otomatis dari transaksi
  const { data: keuanganList = [] } = useQuery({
    queryKey: ['keuangan'],
    queryFn: () => base44.entities.Keuangan.list('-tanggal', 3000),
  });
  const { data: tarifList = [] } = useQuery({
    queryKey: ['tarif-iuran'],
    queryFn: () => base44.entities.TarifIuran.list('nama'),
  });

  const keuanganBySiswa = useMemo(() => {
    const map = {};
    keuanganList.forEach(k => {
      if (k.siswa_id && k.jenis !== 'Pengeluaran') {
        if (!map[k.siswa_id]) map[k.siswa_id] = [];
        map[k.siswa_id].push(k);
      }
    });
    return map;
  }, [keuanganList]);

  // Sudah Bayar = transaksi tercatat + isian manual (pembayaran di luar transaksi)
  const hitungBayar = (b) => {
    const tarif = tarifList.find(t => t.id === b.tarif_iuran_id);
    let dibayarTrans = 0;
    if (tarif) {
      dibayarTrans = matchIuranItemTransactions(tarif, keuanganBySiswa[b.siswa_id] || [], tarifList)
        .reduce((s, k) => s + (k.jumlah || 0), 0);
    }
    const manual = b.sudah_bayar || 0;
    return { dibayarTrans, manual, total: dibayarTrans + manual };
  };

  const getStatusInfo = (b, dibayar) => {
    if (b.is_gratis) return { label: 'GRATIS', cls: 'bg-emerald-100 text-emerald-700' };
    const tagihan = b.nominal_khusus || 0;
    if (tagihan <= 0 || dibayar >= tagihan) return { label: 'Lunas', cls: 'bg-emerald-100 text-emerald-700' };
    if (dibayar > 0) return { label: 'Cicilan', cls: 'bg-amber-100 text-amber-700' };
    return { label: 'Menunggak', cls: 'bg-red-100 text-red-700' };
  };

  // Group by siswa_id
  const grouped = useMemo(() => {
    const map = {};
    biayaKhususList.forEach(b => {
      if (!b.siswa_id) return;
      if (activeAcademicYear && b.tahun_ajaran && b.tahun_ajaran !== activeAcademicYear) return;
      if (!map[b.siswa_id]) {
        map[b.siswa_id] = {
          siswa_id: b.siswa_id,
          nama_siswa: b.nama_siswa || '-',
          nama_kelas: b.nama_kelas || '-',
          records: [],
        };
      }
      map[b.siswa_id].records.push(b);
    });
    return Object.values(map);
  }, [biayaKhususList, activeAcademicYear]);

  const filtered = useMemo(() => {
    let list = grouped;
    if (filterKelas !== 'all') {
      list = list.filter(g => g.nama_kelas === filterKelas);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g =>
        (g.nama_siswa || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (a.nama_siswa || '').localeCompare(b.nama_siswa || ''));
  }, [grouped, filterKelas, search]);

  const kelasOptions = useMemo(() => {
    const set = new Set(grouped.map(g => g.nama_kelas).filter(Boolean));
    return [...set].sort();
  }, [grouped]);

  const totalNominal = (records) =>
    records.reduce((sum, r) => sum + (r.is_gratis ? 0 : (r.nominal_khusus || 0)), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="sm:w-56">
          <Select value={filterKelas} onValueChange={setFilterKelas}>
            <SelectTrigger><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {kelasOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama siswa..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Student List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Belum ada data biaya khusus</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-2.5">Nama Siswa</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-2.5">Kelas</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-2.5">Jumlah Iuran</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-2.5">Total Nominal</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-2.5">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, i) => (
                <tr key={g.siswa_id} className={`border-b last:border-0 hover:bg-purple-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                        {g.nama_siswa?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm font-medium text-slate-800">{g.nama_siswa}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{g.nama_kelas || '-'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">{g.records.length} iuran</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-amber-600">
                    {formatRupiah(totalNominal(g.records))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => setDetailSiswa(g)}
                    >
                      Detail <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">{filtered.length} siswa ditemukan</p>

      {/* Detail Dialog */}
      <Dialog open={!!detailSiswa} onOpenChange={(v) => !v && setDetailSiswa(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Biaya Khusus — {detailSiswa?.nama_siswa}
            </DialogTitle>
          </DialogHeader>
          {detailSiswa && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                <span>Kelas: <b className="text-slate-600">{detailSiswa.nama_kelas || '-'}</b></span>
                <span>•</span>
                <span>{detailSiswa.records.length} iuran khusus</span>
                <span>•</span>
                <span>Total: <b className="text-amber-600">{formatRupiah(totalNominal(detailSiswa.records))}</b></span>
              </div>

              {detailSiswa.records.map(b => {
                const { dibayarTrans, manual, total } = hitungBayar(b);
                const st = getStatusInfo(b, total);
                const tagihan = b.nominal_khusus || 0;
                const sisa = Math.max(0, tagihan - total);
                return (
                  <div key={b.id} className="flex items-start justify-between p-3 rounded-lg border bg-white">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-medium text-slate-800">{b.nama_iuran || '-'}</p>
                        <Badge className={`border-0 text-[10px] ${st.cls}`}>{st.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] text-pink-700 border-pink-200 bg-pink-50">{b.kategori || '-'}</Badge>
                        {b.is_gratis ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                            <Gift className="w-3 h-3" /> GRATIS
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Tagihan: {formatRupiah(tagihan)}
                            {total > 0 && ` · Dibayar: ${formatRupiah(total)}`}
                            {dibayarTrans > 0 && manual > 0 && ` (transaksi ${formatRupiah(dibayarTrans)} + manual ${formatRupiah(manual)})`}
                            {sisa > 0 && total > 0 && ` · Sisa: ${formatRupiah(sisa)}`}
                          </span>
                        )}
                      </div>
                      {b.keterangan && <p className="text-xs text-slate-400 mt-1">{b.keterangan}</p>}
                    </div>
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 h-8 w-8 p-0"
                        onClick={() => onDelete(b.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}