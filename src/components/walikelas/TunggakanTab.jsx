import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardCheck, Search, CheckCircle2, XCircle, Clock, Tag, History } from 'lucide-react';
import { computeStatusKeuangan } from '@/lib/sppUtils';

const STATUS_STYLE = {
  Lunas: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Cicilan: 'bg-amber-100 text-amber-700 border-amber-200',
  Menunggak: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_ICON = { Lunas: CheckCircle2, Cicilan: Clock, Menunggak: XCircle };

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function TunggakanTab({ kelasWali, siswaKelas }) {
  const { activeAcademicYear } = useActiveAcademicYear();
  const [search, setSearch] = useState('');
  const [detailSiswa, setDetailSiswa] = useState(null);

  const { data: tarifList = [] } = useQuery({
    queryKey: ['tarifIuran'],
    queryFn: () => base44.entities.TarifIuran.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: keuanganList = [] } = useQuery({
    queryKey: ['keuangan-tunggakan', activeAcademicYear],
    queryFn: () => base44.entities.Keuangan.list('-tanggal', 2000),
    staleTime: 60 * 1000,
  });

  const { data: biayaKhususList = [] } = useQuery({
    queryKey: ['biayaKhusus'],
    queryFn: () => base44.entities.BiayaKhusus.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: arsipKeuanganList = [] } = useQuery({
    queryKey: ['arsipKeuangan', siswaKelas.map(s => s.id).join(',')],
    queryFn: () => base44.entities.ArsipKeuangan.list(),
    staleTime: 5 * 60 * 1000,
  });

  const siswaIds = useMemo(() => new Set(siswaKelas.map(s => s.id)), [siswaKelas]);

  // Transaksi kelas ini per siswa (TA aktif; data lama tanpa TA tetap dihitung)
  const keuanganBySiswa = useMemo(() => {
    const map = {};
    keuanganList.forEach(k => {
      if (!k.siswa_id || !siswaIds.has(k.siswa_id)) return;
      if (activeAcademicYear && k.tahun_ajaran && k.tahun_ajaran !== activeAcademicYear) return;
      if (!map[k.siswa_id]) map[k.siswa_id] = [];
      map[k.siswa_id].push(k);
    });
    return map;
  }, [keuanganList, siswaIds, activeAcademicYear]);

  // ===== Hitungan terpusat per siswa — identik dengan Laporan Bendahara & Akun Siswa =====
  const siswaStatusMap = useMemo(() => {
    const map = new Map();
    siswaKelas.forEach(s => {
      map.set(s.id, computeStatusKeuangan({
        siswa: s,
        keuanganList: keuanganBySiswa[s.id] || [],
        tarifList,
        biayaKhususList,
        kelasList: kelasWali ? [kelasWali] : [],
        tahunAjaran: activeAcademicYear || '',
      }));
    });
    return map;
  }, [siswaKelas, keuanganBySiswa, tarifList, biayaKhususList, kelasWali, activeAcademicYear]);

  const siswaArsipMap = useMemo(() => {
    const map = new Map();
    siswaIds.forEach(id => map.set(id, []));
    arsipKeuanganList.forEach(a => {
      if (map.has(a.siswa_id)) {
        map.get(a.siswa_id).push(a);
      }
    });
    return map;
  }, [arsipKeuanganList, siswaIds]);

  const siswaSummary = useMemo(() => {
    return siswaKelas.map(s => {
      const res = siswaStatusMap.get(s.id);
      let lunas = 0, cicil = 0, belum = 0;
      (res?.items || []).forEach(it => {
        if (it.status === 'Lunas') lunas++;
        else if (it.status === 'Cicilan') cicil++;
        else belum++;
      });
      return { siswa: s, belum, cicil, lunas };
    });
  }, [siswaKelas, siswaStatusMap]);

  const filtered = siswaSummary
    .filter(({ siswa }) =>
      siswa.nama?.toLowerCase().includes(search.toLowerCase()) || siswa.nis?.includes(search)
    )
    .sort((a, b) => (a.siswa?.nama || '').localeCompare(b.siswa?.nama || ''));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-purple-500" />
            Status Tunggakan Siswa Kelas {kelasWali?.nama_kelas}
          </CardTitle>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama/NIS..." className="pl-9 h-9 w-full sm:w-64" />
          </div>
        </div>
        {activeAcademicYear && <p className="text-xs text-slate-400 mt-1">Tahun Pelajaran {activeAcademicYear}</p>}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs w-8">No</TableHead>
                <TableHead className="text-xs">NIS</TableHead>
                <TableHead className="text-xs">Nama Siswa</TableHead>
                <TableHead className="text-xs text-center">Lunas</TableHead>
                <TableHead className="text-xs text-center">Cicilan</TableHead>
                <TableHead className="text-xs text-center">Tunggakan Thn Lalu</TableHead>
                <TableHead className="text-xs text-center">Menunggak</TableHead>
                <TableHead className="text-xs w-28">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-8">Tidak ada siswa</TableCell></TableRow>
              ) : filtered.map(({ siswa, belum, cicil, lunas }, i) => (
                <TableRow key={siswa.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-500">{siswa.nis}</TableCell>
                  <TableCell className="font-medium text-sm">{siswa.nama}</TableCell>
                  <TableCell className="text-center"><Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">{lunas}</Badge></TableCell>
                  <TableCell className="text-center"><Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{cicil}</Badge></TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const arsip = siswaArsipMap.get(siswa.id) || [];
                      const totalLalu = arsip.reduce((s, a) => s + (a.sisa_tunggakan || 0), 0);
                      return totalLalu > 0
                        ? <Badge className="bg-red-100 text-red-700 border-0 text-xs" title={formatRupiah(totalLalu)}>{arsip.length} ({formatRupiah(totalLalu)})</Badge>
                        : <Badge className="bg-slate-100 text-slate-400 border-0 text-xs">—</Badge>;
                    })()}
                  </TableCell>
                  <TableCell className="text-center"><Badge className={belum > 0 ? 'bg-red-100 text-red-700 border-0 text-xs' : 'bg-slate-100 text-slate-400 border-0 text-xs'}>{belum}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setDetailSiswa(siswa)}>
                      Detail Iuran
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!detailSiswa} onOpenChange={(v) => !v && setDetailSiswa(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-purple-500" />
              Detail Iuran — {detailSiswa?.nama}
            </DialogTitle>
          </DialogHeader>
          {detailSiswa && (() => {
            const res = siswaStatusMap.get(detailSiswa.id);
            const items = res?.items || [];
            const arsip = siswaArsipMap.get(detailSiswa.id) || [];
            const totalLalu = arsip.reduce((s, a) => s + (a.sisa_tunggakan || 0), 0);
            return (
              <div className="space-y-2">
                <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                  <span>NIS: <b className="font-mono text-slate-600">{detailSiswa.nis}</b></span>
                  <span>•</span>
                  <span>Kelas: <b className="text-slate-600">{detailSiswa.nama_kelas}</b></span>
                </div>
                {/* Tunggakan Tahun Lalu (Arsip Keuangan) */}
                {arsip.length > 0 && (
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                        <History className="w-4 h-4" /> Tunggakan Tahun Lalu
                      </p>
                      <Badge className="bg-red-100 text-red-700 border-0">{formatRupiah(totalLalu)}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      {arsip.map((a, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-600 font-medium">{a.nama_iuran || '-'}</span>
                            <span className="text-slate-400 ml-1.5">· {a.tahun_ajaran_asal}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 line-through mr-1">{formatRupiah(a.nominal_tagihan)}</span>
                            <span className="text-red-600 font-semibold">{formatRupiah(a.sisa_tunggakan)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {items.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-sm">Tidak ada iuran aktif untuk tahun pelajaran ini.</p>
                ) : items.map(item => {
                  const Icon = STATUS_ICON[item.status];
                  return (
                    <div key={item.key} className="flex items-center justify-between px-4 py-3 rounded-lg border bg-white">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.nama}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-slate-400">{item.detail || item.periode}</span>
                          {item.khusus && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                              <Tag className="w-3 h-3" />
                              {item.gratis ? 'Gratis' : `Khusus: ${item.khusus}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          {!item.gratis && item.tagihan > 0 && (
                            <div className="text-[10px] text-slate-400 leading-tight">
                              {item.dibayar > 0 && <div>Dibayar: <b className="text-emerald-600">{formatRupiah(item.dibayar)}</b></div>}
                              {item.sisa_jatuh_tempo > 0 && <div>Sisa: <b className="text-red-500">{formatRupiah(item.sisa_jatuh_tempo)}</b></div>}
                            </div>
                          )}
                          <Badge className={`border ${STATUS_STYLE[item.status]}`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Card>
  );
}