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
import { ClipboardCheck, Search, CheckCircle2, XCircle, Clock, Tag } from 'lucide-react';

const STATUS_STYLE = {
  Lunas: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Cicil: 'bg-amber-100 text-amber-700 border-amber-200',
  Belum: 'bg-red-100 text-red-700 border-red-200',
};

const PER_SISWA_JENIS = ['Mutasi', 'PPDB Gel 1', 'PPDB Gel 2'];

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

  const kelasTingkat = kelasWali?.tingkat || (kelasWali?.nama_kelas?.charAt(0) || '');

  const activeTarif = useMemo(() => {
    return tarifList.filter(t => {
      if (t.status !== 'Aktif') return false;
      if (t.tahun_ajaran && t.tahun_ajaran !== activeAcademicYear) return false;
      const tk = Array.isArray(t.tingkat) ? t.tingkat : (t.tingkat ? [t.tingkat] : ['Semua']);
      return tk.includes('Semua') || tk.includes(kelasTingkat);
    });
  }, [tarifList, activeAcademicYear, kelasTingkat]);

  const siswaIds = useMemo(() => new Set(siswaKelas.map(s => s.id)), [siswaKelas]);

  const siswaKeuangan = useMemo(() => {
    return keuanganList.filter(k => k.siswa_id && siswaIds.has(k.siswa_id) && (!activeAcademicYear || k.tahun_ajaran === activeAcademicYear));
  }, [keuanganList, siswaIds, activeAcademicYear]);

  const getStatus = (siswa, tarif) => {
    if (PER_SISWA_JENIS.includes(tarif.jenis_iuran)) {
      const khusus = getKhusus(siswa, tarif);
      if (!khusus) return null;
      if (khusus.is_gratis) return { status: 'Lunas', detail: 'Gratis' };
      const tagihan = khusus.nominal_khusus || tarif.nominal || 0;
      const sb = khusus.sudah_bayar || 0;
      if (tagihan <= 0) return { status: 'Lunas', detail: 'Tanpa tagihan' };
      if (sb >= tagihan) return { status: 'Lunas', detail: 'Lunas' };
      if (sb > 0) return { status: 'Cicil', detail: 'Cicilan' };
      return { status: 'Belum', detail: 'Belum Bayar' };
    }
    const isSpp = (tarif.nama || '').toLowerCase().includes('spp') || tarif.jenis_iuran === 'SPP' || tarif.periode === 'Bulanan';
    const trans = siswaKeuangan.filter(k => k.siswa_id === siswa.id && (
      k.tipe_transaksi === tarif.nama ||
      k.uraian === tarif.nama ||
      (isSpp && ((k.tipe_transaksi || '').toLowerCase().includes('spp') || (k.bulan_dibayar || []).length > 0))
    ));
    if (isSpp) {
      const paidMonths = new Set();
      trans.forEach(t => (t.bulan_dibayar || []).forEach(m => paidMonths.add(m)));
      const count = paidMonths.size;
      if (count >= 12) return { status: 'Lunas', detail: '12/12 bulan' };
      if (count > 0) return { status: 'Cicil', detail: `${count}/12 bulan` };
      return { status: 'Belum', detail: '0/12 bulan' };
    }
    if (trans.length === 0) return { status: 'Belum', detail: '-' };
    const hasLunas = trans.some(t => (t.status_bayar || 'Lunas') === 'Lunas');
    const hasCicil = trans.some(t => t.status_bayar === 'Cicilan');
    if (hasCicil) return { status: 'Cicil', detail: 'Cicilan' };
    if (hasLunas) return { status: 'Lunas', detail: 'Lunas' };
    return { status: 'Belum', detail: 'Belum Lunas' };
  };

  const getKhusus = (siswa, tarif) => biayaKhususList.find(b => b.siswa_id === siswa.id && b.tarif_iuran_id === tarif.id);

  const siswaSummary = useMemo(() => {
    // eslint-disable-next-line
    return siswaKelas.map(s => {
      let belum = 0, cicil = 0, lunas = 0;
      activeTarif.forEach(t => {
        const st = getStatus(s, t);
        if (!st) return;
        if (st.status === 'Belum') belum++;
        else if (st.status === 'Cicil') cicil++;
        else lunas++;
      });
      return { siswa: s, belum, cicil, lunas };
    });
  }, [siswaKelas, activeTarif, siswaKeuangan, biayaKhususList]);

  const filtered = siswaSummary.filter(({ siswa }) =>
    siswa.nama?.toLowerCase().includes(search.toLowerCase()) || siswa.nis?.includes(search)
  );

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
                <TableHead className="text-xs text-center">Cicil</TableHead>
                <TableHead className="text-xs text-center">Belum</TableHead>
                <TableHead className="text-xs w-28">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-8">Tidak ada siswa</TableCell></TableRow>
              ) : filtered.map(({ siswa, belum, cicil, lunas }, i) => (
                <TableRow key={siswa.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-500">{siswa.nis}</TableCell>
                  <TableCell className="font-medium text-sm">{siswa.nama}</TableCell>
                  <TableCell className="text-center"><Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">{lunas}</Badge></TableCell>
                  <TableCell className="text-center"><Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{cicil}</Badge></TableCell>
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
          {detailSiswa && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                <span>NIS: <b className="font-mono text-slate-600">{detailSiswa.nis}</b></span>
                <span>•</span>
                <span>Kelas: <b className="text-slate-600">{detailSiswa.nama_kelas}</b></span>
              </div>
              {activeTarif.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">Tidak ada iuran aktif untuk tahun pelajaran ini.</p>
              ) : activeTarif.map(tarif => {
                const st = getStatus(detailSiswa, tarif);
                if (!st) return null;
                const khusus = getKhusus(detailSiswa, tarif);
                return (
                  <div key={tarif.id} className="flex items-center justify-between px-4 py-3 rounded-lg border bg-white">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{tarif.nama}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400">{tarif.periode}{tarif.tingkat !== 'Semua' ? ` · Tingkat ${tarif.tingkat}` : ''}</span>
                        {khusus && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                            <Tag className="w-3 h-3" />
                            {khusus.is_gratis ? 'Gratis' : `Khusus: ${khusus.kategori || '-'}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400">{st.detail}</span>
                      <Badge className={`border ${STATUS_STYLE[st.status]}`}>
                        {st.status === 'Lunas' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : st.status === 'Cicil' ? <Clock className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {st.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}