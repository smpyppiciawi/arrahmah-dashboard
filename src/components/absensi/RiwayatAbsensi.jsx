import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, BarChart2, Search } from "lucide-react";
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const STATUS_BADGE = {
  'Hadir':     'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Sakit':     'bg-amber-50 text-amber-700 border-amber-200',
  'Izin':      'bg-blue-50 text-blue-700 border-blue-200',
  'Alfa':      'bg-red-50 text-red-700 border-red-200',
  'Terlambat': 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function RiwayatAbsensi() {
  const [viewMode, setViewMode] = useState('kelas'); // 'kelas' | 'siswa'
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState('');
  const [searchSiswa, setSearchSiswa] = useState('');
  const [bulanFilter, setBulanFilter] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [tahunFilter, setTahunFilter] = useState(String(new Date().getFullYear()));

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-all'], queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  // Semua absensi di bulan & tahun terpilih
  const { data: absensiAll = [], isLoading } = useQuery({
    queryKey: ['absensi-riwayat', bulanFilter, tahunFilter],
    queryFn: async () => {
      const all = await base44.entities.Absensi.list('-tanggal');
      return all.filter(a => {
        const d = a.tanggal?.slice(0, 7); // "YYYY-MM"
        return d === `${tahunFilter}-${bulanFilter}`;
      });
    },
  });

  const tahunOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return [now - 1, now, now + 1].map(String);
  }, []);

  const bulanOptions = [
    { val: '01', label: 'Januari' }, { val: '02', label: 'Februari' },
    { val: '03', label: 'Maret' },   { val: '04', label: 'April' },
    { val: '05', label: 'Mei' },     { val: '06', label: 'Juni' },
    { val: '07', label: 'Juli' },    { val: '08', label: 'Agustus' },
    { val: '09', label: 'September' },{ val: '10', label: 'Oktober' },
    { val: '11', label: 'November' },{ val: '12', label: 'Desember' },
  ];

  // ---- Mode Per Kelas ----
  const absensiKelas = useMemo(() => {
    if (!selectedKelas) return [];
    return absensiAll.filter(a => a.kelas_id === selectedKelas);
  }, [absensiAll, selectedKelas]);

  // Summary per siswa dalam kelas
  const siswaKelasRekap = useMemo(() => {
    const siswaInKelas = siswaList.filter(s => s.kelas_id === selectedKelas)
      .sort((a, b) => a.nama.localeCompare(b.nama));
    return siswaInKelas.map(siswa => {
      const records = absensiKelas.filter(a => a.siswa_id === siswa.id);
      return {
        ...siswa,
        hadir: records.filter(r => r.status === 'Hadir').length,
        sakit: records.filter(r => r.status === 'Sakit').length,
        izin: records.filter(r => r.status === 'Izin').length,
        alfa: records.filter(r => r.status === 'Alfa').length,
        terlambat: records.filter(r => r.status === 'Terlambat').length,
        total: records.length,
      };
    });
  }, [absensiKelas, siswaList, selectedKelas]);

  const kelasStats = useMemo(() => ({
    hadir: absensiKelas.filter(a => a.status === 'Hadir').length,
    sakit: absensiKelas.filter(a => a.status === 'Sakit').length,
    izin: absensiKelas.filter(a => a.status === 'Izin').length,
    alfa: absensiKelas.filter(a => a.status === 'Alfa').length,
    terlambat: absensiKelas.filter(a => a.status === 'Terlambat').length,
    total: absensiKelas.length,
  }), [absensiKelas]);

  // ---- Mode Per Siswa ----
  const filteredSiswaList = useMemo(() => {
    return siswaList
      .filter(s => s.nama.toLowerCase().includes(searchSiswa.toLowerCase()) || s.nis?.includes(searchSiswa))
      .sort((a, b) => a.nama.localeCompare(b.nama))
      .slice(0, 50);
  }, [siswaList, searchSiswa]);

  const absensiSiswa = useMemo(() => {
    if (!selectedSiswa) return [];
    return absensiAll.filter(a => a.siswa_id === selectedSiswa).sort((a, b) => a.tanggal > b.tanggal ? -1 : 1);
  }, [absensiAll, selectedSiswa]);

  const siswaStats = useMemo(() => ({
    hadir: absensiSiswa.filter(a => a.status === 'Hadir').length,
    sakit: absensiSiswa.filter(a => a.status === 'Sakit').length,
    izin: absensiSiswa.filter(a => a.status === 'Izin').length,
    alfa: absensiSiswa.filter(a => a.status === 'Alfa').length,
    terlambat: absensiSiswa.filter(a => a.status === 'Terlambat').length,
    total: absensiSiswa.length,
  }), [absensiSiswa]);

  const StatCards = ({ stats }) => (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
      {[
        { label: 'Hadir', val: stats.hadir, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
        { label: 'Sakit', val: stats.sakit, color: 'bg-amber-50 border-amber-200 text-amber-700' },
        { label: 'Izin', val: stats.izin, color: 'bg-blue-50 border-blue-200 text-blue-700' },
        { label: 'Alfa', val: stats.alfa, color: 'bg-red-50 border-red-200 text-red-700' },
        { label: 'Terlambat', val: stats.terlambat, color: 'bg-orange-50 border-orange-200 text-orange-700' },
        { label: 'Total', val: stats.total, color: 'bg-slate-50 border-slate-200 text-slate-700' },
      ].map(s => (
        <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
          <p className="text-xl font-bold">{s.val}</p>
          <p className="text-[11px] font-medium mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-end">
            {/* Mode Toggle */}
            <div>
              <Label className="text-xs text-slate-500 font-medium mb-1 block">Tampilan</Label>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('kelas')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'kelas' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                >
                  <Users className="w-3.5 h-3.5" /> Per Kelas
                </button>
                <button
                  onClick={() => setViewMode('siswa')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'siswa' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                >
                  <UserCheck className="w-3.5 h-3.5" /> Per Siswa
                </button>
              </div>
            </div>

            {/* Bulan & Tahun */}
            <div>
              <Label className="text-xs text-slate-500 font-medium mb-1 block">Bulan</Label>
              <Select value={bulanFilter} onValueChange={setBulanFilter}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{bulanOptions.map(b => <SelectItem key={b.val} value={b.val}>{b.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 font-medium mb-1 block">Tahun</Label>
              <Select value={tahunFilter} onValueChange={setTahunFilter}>
                <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{tahunOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {viewMode === 'kelas' && (
              <div className="flex-1">
                <Label className="text-xs text-slate-500 font-medium mb-1 block">Kelas</Label>
                <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih Kelas..." /></SelectTrigger>
                  <SelectContent>{kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {viewMode === 'siswa' && (
              <div className="flex-1">
                <Label className="text-xs text-slate-500 font-medium mb-1 block">Cari & Pilih Siswa</Label>
                <Select value={selectedSiswa} onValueChange={setSelectedSiswa}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih Siswa..." /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                          placeholder="Cari nama / NIS..."
                          value={searchSiswa}
                          onChange={(e) => setSearchSiswa(e.target.value)}
                        />
                      </div>
                    </div>
                    {filteredSiswaList.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nama} — <span className="text-slate-400">{s.nama_kelas}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---- KELAS VIEW ---- */}
      {viewMode === 'kelas' && selectedKelas && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-500" />
              Rekap Kelas — {kelasList.find(k => k.id === selectedKelas)?.nama_kelas} &nbsp;·&nbsp;
              {bulanOptions.find(b => b.val === bulanFilter)?.label} {tahunFilter}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <StatCards stats={kelasStats} />
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Nama Siswa</TableHead>
                    <TableHead className="text-xs text-emerald-600">Hadir</TableHead>
                    <TableHead className="text-xs text-amber-600">Sakit</TableHead>
                    <TableHead className="text-xs text-blue-600">Izin</TableHead>
                    <TableHead className="text-xs text-red-600">Alfa</TableHead>
                    <TableHead className="text-xs text-orange-600">Terlambat</TableHead>
                    <TableHead className="text-xs">%&nbsp;Hadir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-400 text-sm">Memuat data...</TableCell></TableRow>
                  ) : siswaKelasRekap.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-400 text-sm">Tidak ada data absensi di bulan ini</TableCell></TableRow>
                  ) : siswaKelasRekap.map((s, i) => {
                    const pct = s.total > 0 ? Math.round((s.hadir / s.total) * 100) : 0;
                    return (
                      <TableRow key={s.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm text-slate-800">{s.nama}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{s.nis}</p>
                        </TableCell>
                        <TableCell><span className="font-semibold text-emerald-600">{s.hadir}</span></TableCell>
                        <TableCell><span className="font-semibold text-amber-600">{s.sakit}</span></TableCell>
                        <TableCell><span className="font-semibold text-blue-600">{s.izin}</span></TableCell>
                        <TableCell><span className="font-semibold text-red-600">{s.alfa}</span></TableCell>
                        <TableCell><span className="font-semibold text-orange-600">{s.terlambat}</span></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 w-16">
                              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-medium text-slate-600">{pct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'kelas' && !selectedKelas && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-14 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Pilih kelas untuk melihat riwayat absensi</p>
          </CardContent>
        </Card>
      )}

      {/* ---- SISWA VIEW ---- */}
      {viewMode === 'siswa' && selectedSiswa && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-500" />
              Riwayat — {siswaList.find(s => s.id === selectedSiswa)?.nama} &nbsp;·&nbsp;
              {bulanOptions.find(b => b.val === bulanFilter)?.label} {tahunFilter}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <StatCards stats={siswaStats} />
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Jam Masuk</TableHead>
                    <TableHead className="text-xs">Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400 text-sm">Memuat data...</TableCell></TableRow>
                  ) : absensiSiswa.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400 text-sm">Tidak ada data absensi di bulan ini</TableCell></TableRow>
                  ) : absensiSiswa.map(a => (
                    <TableRow key={a.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="text-sm font-medium text-slate-700">
                        {format(new Date(a.tanggal), 'EEE, dd MMM yyyy', { locale: idLocale })}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${STATUS_BADGE[a.status] || 'bg-slate-50 text-slate-600'}`}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{a.jam_masuk || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-500">{a.keterangan || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'siswa' && !selectedSiswa && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-14 text-center text-slate-400">
            <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Pilih siswa untuk melihat riwayat absensi</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}