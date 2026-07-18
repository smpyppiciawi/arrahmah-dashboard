import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  GraduationCap, BookOpen, Calendar, Trophy, AlertTriangle,
  Stethoscope, Wallet, TrendingUp, X
} from "lucide-react";

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function DetailRiwayatSiswa({ siswa, open, onOpenChange }) {
  const siswaId = siswa?.id || siswa?.siswa_id;

  const { data: nilaiList = [] } = useQuery({
    queryKey: ['riwayat-nilai', siswaId],
    queryFn: () => base44.entities.Nilai.filter({ siswa_id: siswaId }),
    enabled: !!siswaId && open,
  });

  const { data: absensiList = [] } = useQuery({
    queryKey: ['riwayat-absensi', siswaId],
    queryFn: () => base44.entities.Absensi.filter({ siswa_id: siswaId }),
    enabled: !!siswaId && open,
  });

  const { data: prestasiList = [] } = useQuery({
    queryKey: ['riwayat-prestasi', siswaId],
    queryFn: () => base44.entities.Prestasi.filter({ siswa_id: siswaId }),
    enabled: !!siswaId && open,
  });

  const { data: pelanggaranList = [] } = useQuery({
    queryKey: ['riwayat-pelanggaran', siswaId],
    queryFn: () => base44.entities.Pelanggaran.filter({ siswa_id: siswaId }),
    enabled: !!siswaId && open,
  });

  const { data: uksList = [] } = useQuery({
    queryKey: ['riwayat-uks', siswaId],
    queryFn: () => base44.entities.UKS.filter({ siswa_id: siswaId }),
    enabled: !!siswaId && open,
  });

  const { data: keuanganList = [] } = useQuery({
    queryKey: ['riwayat-keuangan', siswaId],
    queryFn: () => base44.entities.Keuangan.filter({ siswa_id: siswaId }),
    enabled: !!siswaId && open,
  });

  const absensiStats = useMemo(() => {
    const hadir = absensiList.filter(a => a.status === 'Hadir').length;
    const sakit = absensiList.filter(a => a.status === 'Sakit').length;
    const izin = absensiList.filter(a => a.status === 'Izin').length;
    const alfa = absensiList.filter(a => a.status === 'Alfa').length;
    return { total: absensiList.length, hadir, sakit, izin, alfa };
  }, [absensiList]);

  const avgNilai = useMemo(() => {
    if (!nilaiList.length) return '-';
    const avg = nilaiList.reduce((s, n) => s + (n.nilai || 0), 0) / nilaiList.length;
    return avg.toFixed(1);
  }, [nilaiList]);

  const totalPoinPelanggaran = useMemo(() => {
    return pelanggaranList.reduce((s, p) => s + (p.poin || 0), 0);
  }, [pelanggaranList]);

  const keuanganStats = useMemo(() => {
    const lunas = keuanganList.filter(k => k.status_bayar === 'Lunas');
    const tunggakan = keuanganList.filter(k => k.status_bayar !== 'Lunas');
    const totalBayar = lunas.filter(k => k.jenis === 'Pemasukan').reduce((s, k) => s + (k.jumlah || 0), 0);
    const totalTunggakan = tunggakan.filter(k => k.jenis === 'Pemasukan').reduce((s, k) => s + (k.jumlah || 0), 0);
    return { totalBayar, totalTunggakan, tunggakanCount: tunggakan.length };
  }, [keuanganList]);

  if (!siswa) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="w-5 h-5 text-amber-500" />
            Riwayat Lengkap Siswa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Profile */}
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
                  {siswa.nama?.charAt(0)}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1.5">
                  <div>
                    <p className="text-xs text-slate-500">Nama Lengkap</p>
                    <p className="font-semibold text-slate-800">{siswa.nama}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">NIS</p>
                    <p className="font-mono font-semibold text-slate-800">{siswa.nis}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Kelas Terakhir</p>
                    <p className="font-semibold text-slate-800">{siswa.nama_kelas || siswa.kelas_terakhir || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tahun Lulus</p>
                    <p className="font-semibold text-slate-800">{siswa.tahun_lulus || siswa.tahun_ajaran || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Jenis Kelamin</p>
                    <p className="text-slate-700">{siswa.jenis_kelamin || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tanggal Lahir</p>
                    <p className="text-slate-700">{siswa.tanggal_lahir || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Orang Tua / Wali</p>
                    <p className="text-slate-700">{siswa.nama_ortu || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">No. Telp Orang Tua</p>
                    <p className="text-slate-700">{siswa.no_telp_ortu || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Alamat</p>
                    <p className="text-slate-700">{siswa.alamat || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { label: 'Rata-rata Nilai', value: avgNilai, icon: BookOpen, color: 'text-blue-600' },
              { label: 'Total Hadir', value: absensiStats.hadir, icon: Calendar, color: 'text-green-600' },
              { label: 'Prestasi', value: prestasiList.length, icon: Trophy, color: 'text-amber-600' },
              { label: 'Pelanggaran', value: pelanggaranList.length, icon: AlertTriangle, color: 'text-red-600' },
              { label: 'Total Poin', value: totalPoinPelanggaran, icon: AlertTriangle, color: 'text-orange-600' },
              { label: 'Kunjungan UKS', value: uksList.length, icon: Stethoscope, color: 'text-teal-600' },
            ].map((stat, i) => {
              const StatIcon = stat.icon;
              return (
                <Card key={i} className="border-slate-200">
                  <CardContent className="p-3 text-center">
                    <StatIcon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-slate-500">{stat.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Keuangan Summary */}
          <Card className={keuanganStats.totalTunggakan > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${keuanganStats.totalTunggakan > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}>
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Ringkasan Keuangan</p>
                  <p className="text-xs text-slate-500">Status pembayaran selama bersekolah</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Total Dibayar</p>
                  <p className="font-bold text-emerald-600">{formatRupiah(keuanganStats.totalBayar)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Tunggakan</p>
                  <p className={`font-bold ${keuanganStats.totalTunggakan > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatRupiah(keuanganStats.totalTunggakan)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Transaksi</p>
                  <p className="font-bold text-slate-700">{keuanganList.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Absensi Detail */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Ringkasan Kehadiran
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'Hadir', val: absensiStats.hadir, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Sakit', val: absensiStats.sakit, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Izin', val: absensiStats.izin, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Alfa', val: absensiStats.alfa, color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'Total', val: absensiStats.total, color: 'text-slate-700', bg: 'bg-slate-100' },
              ].map(item => (
                <div key={item.label} className={`${item.bg} rounded-lg p-2 text-center`}>
                  <p className={`text-lg font-bold ${item.color}`}>{item.val}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Nilai */}
          {nilaiList.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <BookOpen className="w-4 h-4" /> Riwayat Nilai ({nilaiList.length})
              </p>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs">Mapel</TableHead>
                      <TableHead className="text-xs">Jenis</TableHead>
                      <TableHead className="text-xs">Semester</TableHead>
                      <TableHead className="text-xs">Nilai</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nilaiList.map(n => (
                      <TableRow key={n.id}>
                        <TableCell className="text-xs">{n.mapel}</TableCell>
                        <TableCell className="text-xs">{n.jenis_penilaian}</TableCell>
                        <TableCell className="text-xs">{n.semester || '-'}</TableCell>
                        <TableCell className="text-xs font-semibold">{n.nilai}</TableCell>
                        <TableCell>
                          <Badge className={n.status_ketuntasan === 'Tuntas' ? 'bg-green-100 text-green-700 text-xs' : 'bg-red-100 text-red-700 text-xs'}>
                            {n.status_ketuntasan || '-'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Prestasi */}
          {prestasiList.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <Trophy className="w-4 h-4" /> Prestasi ({prestasiList.length})
              </p>
              <div className="space-y-2">
                {prestasiList.map(p => (
                  <div key={p.id} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                    <Trophy className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{p.nama_prestasi}</p>
                      <p className="text-xs text-slate-500">
                        {p.kategori} • {p.tingkat} • {p.tanggal ? format(new Date(p.tanggal), 'd MMM yyyy', { locale: idLocale }) : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pelanggaran */}
          {pelanggaranList.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Pelanggaran ({pelanggaranList.length} • {totalPoinPelanggaran} poin)
              </p>
              <div className="space-y-2">
                {pelanggaranList.map(p => (
                  <div key={p.id} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{p.uraian}</p>
                      <p className="text-xs text-slate-500">
                        {p.jenis_pelanggaran} • {p.poin} poin • {p.tanggal ? format(new Date(p.tanggal), 'd MMM yyyy', { locale: idLocale }) : '-'}
                      </p>
                    </div>
                    <Badge className={p.status === 'Selesai' ? 'bg-green-100 text-green-700 text-xs' : 'bg-amber-100 text-amber-700 text-xs'}>
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UKS */}
          {uksList.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <Stethoscope className="w-4 h-4" /> Riwayat UKS ({uksList.length})
              </p>
              <div className="space-y-2">
                {uksList.map(u => (
                  <div key={u.id} className="flex items-start gap-2 p-2 bg-teal-50 rounded-lg">
                    <Stethoscope className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{u.keluhan}</p>
                      <p className="text-xs text-slate-500">
                        {u.diagnosa || '-'} • {u.penanganan || '-'} • {u.tanggal ? format(new Date(u.tanggal), 'd MMM yyyy', { locale: idLocale }) : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keuangan Detail */}
          {keuanganList.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <Wallet className="w-4 h-4" /> Riwayat Keuangan ({keuanganList.length})
              </p>
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs">Tanggal</TableHead>
                      <TableHead className="text-xs">Tipe</TableHead>
                      <TableHead className="text-xs">Jumlah</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keuanganList.slice(0, 20).map(k => (
                      <TableRow key={k.id}>
                        <TableCell className="text-xs">{k.tanggal ? format(new Date(k.tanggal), 'd MMM yy', { locale: idLocale }) : '-'}</TableCell>
                        <TableCell className="text-xs">{k.tipe_transaksi || '-'}</TableCell>
                        <TableCell className="text-xs font-semibold">{formatRupiah(k.jumlah)}</TableCell>
                        <TableCell>
                          <Badge className={
                            k.status_bayar === 'Lunas' ? 'bg-green-100 text-green-700 text-xs' :
                            'bg-red-100 text-red-700 text-xs'
                          }>
                            {k.status_bayar || 'Lunas'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Empty state for no data */}
          {nilaiList.length === 0 && absensiList.length === 0 && prestasiList.length === 0 &&
           pelanggaranList.length === 0 && uksList.length === 0 && keuanganList.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Tidak ada data riwayat untuk siswa ini</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}