import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, BarChart3, History, Search } from "lucide-react";
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { sumPoinPelanggaranAktif, getRaporStatus, RAPOR_BADGE_CLASS } from '@/lib/raporStatus';

// Rentang akumulasi Poin Bersih
const RENTANG_POIN = [
  { key: 'bersih', label: '0 (Bersih)', min: -Infinity, max: 0, color: 'bg-emerald-500' },
  { key: '1-99', label: '1 – 99', min: 1, max: 99, color: 'bg-sky-500' },
  { key: '100-299', label: '100 – 299', min: 100, max: 299, color: 'bg-yellow-500' },
  { key: '300-599', label: '300 – 599', min: 300, max: 599, color: 'bg-orange-500' },
  { key: '600-999', label: '600 – 999', min: 600, max: 999, color: 'bg-red-500' },
  { key: '1000+', label: '1000+', min: 1000, max: Infinity, color: 'bg-slate-900' },
];

export default function RekapPoinTab({ pelanggaranImprovementList, improvementList, siswaList, kelasList, pengaturan }) {
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [riwayatSiswa, setRiwayatSiswa] = useState(null);

  const akumulasiLama = pengaturan?.akumulasi_poin_lama_aktif;
  const { data: pelanggaranLamaList = [] } = useQuery({
    queryKey: ['pelanggaran'],
    queryFn: () => base44.entities.Pelanggaran.list('-tanggal'),
    enabled: !!akumulasiLama,
  });

  // Poin per siswa aktif: pelanggaran, improvement (pengurangan), bersih
  const rows = useMemo(() => {
    return (siswaList || []).filter(s => s.status === 'Aktif').map(s => {
      const pelBaru = sumPoinPelanggaranAktif((pelanggaranImprovementList || []).filter(p => p.siswa_id === s.id));
      const pelLama = akumulasiLama
        ? (pelanggaranLamaList || []).filter(p => p.siswa_id === s.id).reduce((sum, p) => sum + (Number(p.poin) || 0), 0)
        : 0;
      const poinPelanggaran = pelBaru + pelLama;
      const poinImprovement = (improvementList || []).filter(i => i.siswa_id === s.id && i.status === 'Aktif').reduce((sum, i) => sum + (Number(i.poin_pengurangan) || 0), 0);
      return { ...s, poinPelanggaran, poinImprovement, poinBersih: poinPelanggaran - poinImprovement };
    });
  }, [siswaList, pelanggaranImprovementList, improvementList, akumulasiLama, pelanggaranLamaList]);

  // 1. Distribusi rentang poin
  const rentangRows = useMemo(() =>
    RENTANG_POIN.map(r => ({ ...r, count: rows.filter(x => x.poinBersih >= r.min && x.poinBersih <= r.max).length })),
    [rows]);
  const maxRentang = Math.max(...rentangRows.map(r => r.count), 1);

  // 2. Rekap per kelas
  const kelasRows = useMemo(() => (kelasList || []).map(k => {
    const members = rows.filter(x => x.kelas_id === k.id);
    const poinPelanggaran = members.reduce((s, m) => s + m.poinPelanggaran, 0);
    const poinImprovement = members.reduce((s, m) => s + m.poinImprovement, 0);
    return {
      kelas: k.nama_kelas, jumlahSiswa: members.length, poinPelanggaran, poinImprovement,
      poinBersih: poinPelanggaran - poinImprovement,
      rataBersih: members.length ? Math.round((poinPelanggaran - poinImprovement) / members.length) : 0,
    };
  }).sort((a, b) => b.poinBersih - a.poinBersih), [kelasList, rows]);

  // 3. Rekap per siswa (dengan filter)
  const filteredRows = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    return rows
      .filter(r => (!filterKelas || r.kelas_id === filterKelas) && (!q || r.nama.toLowerCase().includes(q) || (r.nis || '').includes(q)))
      .sort((a, b) => b.poinBersih - a.poinBersih || a.nama.localeCompare(b.nama, 'id'));
  }, [rows, search, filterKelas]);

  // Riwayat pelanggaran & improvement siswa terpilih
  const riwayat = useMemo(() => {
    if (!riwayatSiswa) return { pelanggaran: [], improvement: [] };
    return {
      pelanggaran: (pelanggaranImprovementList || []).filter(p => p.siswa_id === riwayatSiswa.id && p.status !== 'Dibatalkan').sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')),
      improvement: (improvementList || []).filter(i => i.siswa_id === riwayatSiswa.id && i.status === 'Aktif').sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')),
    };
  }, [riwayatSiswa, pelanggaranImprovementList, improvementList]);

  // Cetak seluruh rekap (rentang, per kelas, per siswa sesuai filter aktif)
  const handlePrint = () => {
    const now = format(new Date(), 'd MMMM yyyy HH:mm', { locale: idLocale });
    const rentangHtml = rentangRows.map(r => `<tr><td>${r.label}</td><td style="text-align:right">${r.count}</td></tr>`).join('');
    const kelasHtml = kelasRows.map(k => `<tr><td>${k.kelas}</td><td style="text-align:right">${k.jumlahSiswa}</td><td style="text-align:right">${k.poinPelanggaran}</td><td style="text-align:right">${k.poinImprovement}</td><td style="text-align:right">${k.poinBersih}</td><td style="text-align:right">${k.rataBersih}</td></tr>`).join('');
    const siswaHtml = filteredRows.map(r => `<tr><td>${r.nis || '-'}</td><td>${r.nama}</td><td>${r.nama_kelas || '-'}</td><td style="text-align:right">${r.poinPelanggaran}</td><td style="text-align:right">${r.poinImprovement}</td><td style="text-align:right">${r.poinBersih}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>Rekap Poin Siswa</title><style>
      body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
      h1 { font-size: 18px; text-align: center; margin: 0 0 2px; }
      h2 { font-size: 13px; margin: 18px 0 6px; }
      .meta { text-align: center; font-size: 11px; color: #64748b; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #cbd5e1; padding: 4px 8px; }
      th { background: #f1f5f9; text-align: left; }
    </style></head><body>
      <h1>REKAP AKUMULASI POIN SISWA</h1>
      <div class="meta">Dicetak: ${now} · ${filteredRows.length} siswa${filterKelas ? ' · filter kelas aktif' : ''}</div>
      <h2>1. Distribusi Rentang Poin Bersih</h2>
      <table><tr><th>Rentang Poin</th><th style="width:100px">Jumlah Siswa</th></tr>${rentangHtml}</table>
      <h2>2. Rekap Akumulasi Poin per Kelas</h2>
      <table><tr><th>Kelas</th><th>Siswa</th><th>Poin Pelanggaran</th><th>Poin Improvement</th><th>Total Bersih</th><th>Rata-rata Bersih</th></tr>${kelasHtml}</table>
      <h2>3. Rekap Poin per Siswa</h2>
      <table><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Poin Pelanggaran</th><th>Poin Improvement</th><th>Poin Bersih</th></tr>${siswaHtml}</table>
    </body></html>`;
    const w = window.open('', '', 'width=1000,height=700');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-indigo-700">
            <BarChart3 className="w-5 h-5" /> Rekap Akumulasi Poin
          </CardTitle>
          <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700">
            <Printer className="w-4 h-4 mr-1" /> Cetak Rekap
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 1. Distribusi Rentang Poin Bersih */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Distribusi Rentang Poin Bersih</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {rentangRows.map(r => (
              <div key={r.key} className="rounded-xl border border-slate-200 p-2.5 bg-white">
                <p className="text-[10px] text-slate-500">{r.label}</p>
                <p className="text-xl font-bold text-slate-800">{r.count}</p>
                <div className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                  <div className={`h-full ${r.color}`} style={{ width: `${Math.max(3, (r.count / maxRentang) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Rekap per Kelas */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Rekap Akumulasi Poin per Kelas</h4>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">Kelas</TableHead>
                  <TableHead className="text-xs text-center">Siswa</TableHead>
                  <TableHead className="text-xs text-center">Poin Pelanggaran</TableHead>
                  <TableHead className="text-xs text-center">Poin Improvement</TableHead>
                  <TableHead className="text-xs text-center">Total Bersih</TableHead>
                  <TableHead className="text-xs text-center">Rata-rata Bersih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kelasRows.map(k => (
                  <TableRow key={k.kelas} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{k.kelas}</TableCell>
                    <TableCell className="text-center">{k.jumlahSiswa}</TableCell>
                    <TableCell className="text-center text-red-600">{k.poinPelanggaran}</TableCell>
                    <TableCell className="text-center text-emerald-600">{k.poinImprovement}</TableCell>
                    <TableCell className={`text-center font-semibold ${k.poinBersih > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{k.poinBersih}</TableCell>
                    <TableCell className="text-center text-slate-500">{k.rataBersih}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 3. Rekap per Siswa */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Rekap Poin per Siswa</h4>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / NIS..."
                className="w-full h-9 text-sm rounded-md border border-slate-200 pl-8 pr-3" />
            </div>
            <Select value={filterKelas || 'all'} onValueChange={(v) => setFilterKelas(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {(kelasList || []).sort((a, b) => (a.nama_kelas || '').localeCompare(b.nama_kelas || '', 'id')).map(k => (
                  <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">NIS</TableHead>
                  <TableHead className="text-xs">Nama</TableHead>
                  <TableHead className="text-xs">Kelas</TableHead>
                  <TableHead className="text-xs text-center">Pelanggaran</TableHead>
                  <TableHead className="text-xs text-center">Improvement</TableHead>
                  <TableHead className="text-xs text-center">Bersih</TableHead>
                  <TableHead className="text-xs">Rapor</TableHead>
                  <TableHead className="text-xs text-center">Riwayat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-6 text-slate-400 text-sm">Tidak ada data</TableCell></TableRow>
                ) : filteredRows.map(r => {
                  const st = getRaporStatus(r, r.poinBersih);
                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50">
                      <TableCell className="text-xs font-mono text-slate-500">{r.nis || '-'}</TableCell>
                      <TableCell className="font-medium text-sm">{r.nama}</TableCell>
                      <TableCell className="text-xs">{r.nama_kelas || '-'}</TableCell>
                      <TableCell className="text-center text-xs text-red-600">{r.poinPelanggaran}</TableCell>
                      <TableCell className="text-center text-xs text-emerald-600">{r.poinImprovement}</TableCell>
                      <TableCell className={`text-center text-xs font-semibold ${r.poinBersih > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{r.poinBersih}</TableCell>
                      <TableCell>{st.level !== 'normal' ? <Badge className={RAPOR_BADGE_CLASS[st.level]}>{st.label}</Badge> : <span className="text-xs text-slate-400">Normal</span>}</TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => setRiwayatSiswa(r)} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                          <History className="w-3.5 h-3.5" /> Lihat
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      <RiwayatDialog siswa={riwayatSiswa} riwayat={riwayat} onClose={() => setRiwayatSiswa(null)} />
    </Card>
  );
}

function RiwayatDialog({ siswa, riwayat, onClose }) {
  return (
    <Dialog open={!!siswa} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Riwayat — {siswa?.nama} ({siswa?.nama_kelas})</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg bg-red-50 p-2 text-center">
            <p className="text-lg font-bold text-red-600">{siswa?.poinPelanggaran ?? 0}</p>
            <p className="text-[10px] text-red-500">Poin Pelanggaran</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2 text-center">
            <p className="text-lg font-bold text-emerald-600">{siswa?.poinImprovement ?? 0}</p>
            <p className="text-[10px] text-emerald-500">Poin Improvement</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-2 text-center">
            <p className="text-lg font-bold text-amber-600">{siswa?.poinBersih ?? 0}</p>
            <p className="text-[10px] text-amber-500">Poin Bersih</p>
          </div>
        </div>

        <h4 className="text-xs font-semibold text-red-600 mb-1.5">Riwayat Pelanggaran ({riwayat?.pelanggaran?.length || 0})</h4>
        <div className="space-y-1.5 mb-4">
          {(riwayat?.pelanggaran || []).length === 0 ? (
            <p className="text-xs text-slate-400">Tidak ada pelanggaran tercatat</p>
          ) : (riwayat?.pelanggaran || []).map(p => (
            <div key={p.id} className="flex items-start justify-between gap-2 rounded-lg border border-red-100 bg-red-50/50 p-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className="bg-slate-700 text-white font-mono text-[10px]">{p.kode}</Badge>
                  <span className="text-[10px] text-slate-400">{p.tanggal}</span>
                  <Badge className="bg-blue-100 text-blue-700 text-[10px]">{p.status}</Badge>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{p.uraian_pelanggaran}</p>
              </div>
              <Badge className="bg-red-100 text-red-700 text-[10px] shrink-0">{p.poin} poin</Badge>
            </div>
          ))}
        </div>

        <h4 className="text-xs font-semibold text-emerald-600 mb-1.5">Riwayat Improvement ({riwayat?.improvement?.length || 0})</h4>
        <div className="space-y-1.5">
          {(riwayat?.improvement || []).length === 0 ? (
            <p className="text-xs text-slate-400">Tidak ada improvement tercatat</p>
          ) : (riwayat?.improvement || []).map(i => (
            <div key={i.id} className="flex items-start justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 p-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">{i.tanggal}</span>
                  <span className="text-[10px] text-slate-400">Validator: {i.validator_nama || '-'}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{i.kegiatan_pembinaan_nama || i.uraian}</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 text-[10px] shrink-0">−{i.poin_pengurangan} poin</Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}