import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Trophy } from 'lucide-react';
import { useWaliKelas } from '@/hooks/useWaliKelas';
import PaginationBar from '@/components/appui/PaginationBar';

const semesterAktifFn = () => (new Date().getMonth() + 1 >= 7 ? 'Ganjil' : 'Genap');

/**
 * Tab PTS untuk Akun Guru/Wali Kelas — daftar nilai siswa kelas yang diwalikan:
 * NAMA, NIS, Kelas, Jumlah Nilai, Rata-Rata, Peringkat. Dilengkapi cari, filter, sortir, paginasi.
 */
export default function PtsGuruView({ activeAcademicYear }) {
  const { waliKelasIds, kelasList, siswaAktif, isWaliKelas } = useWaliKelas();
  const [filterKelas, setFilterKelas] = useState('all');
  const [semester, setSemester] = useState(semesterAktifFn);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('nama');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: nilaiPts = [], isLoading } = useQuery({
    queryKey: ['nilai-pts-wali'],
    queryFn: () => base44.entities.Nilai.filter({ jenis_penilaian: 'PTS' }),
    staleTime: 60000,
  });

  const records = useMemo(
    () => nilaiPts.filter(n =>
      waliKelasIds.includes(n.kelas_id) &&
      (!activeAcademicYear || n.tahun_ajaran === activeAcademicYear) &&
      (semester === 'all' || n.semester === semester)
    ),
    [nilaiPts, waliKelasIds, activeAcademicYear, semester]
  );

  const dataSiswa = useMemo(() => {
    const bySiswa = new Map();
    records.forEach(n => {
      if (!n.siswa_id || !n.mapel) return;
      if (!bySiswa.has(n.siswa_id)) bySiswa.set(n.siswa_id, new Map());
      const m = bySiswa.get(n.siswa_id);
      if (!m.has(n.mapel)) m.set(n.mapel, []);
      if (n.nilai !== null && n.nilai !== undefined && n.nilai !== '') m.get(n.mapel).push(Number(n.nilai));
    });

    const list = siswaAktif
      .filter(s => waliKelasIds.includes(s.kelas_id))
      .map(s => {
        const m = bySiswa.get(s.id);
        const mapelVals = m ? [...m.entries()].map(([mp, arr]) => ({ mapel: mp, nilai: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 })) : [];
        const jumlah = mapelVals.length ? Math.round(mapelVals.reduce((a, x) => a + x.nilai, 0) * 10) / 10 : null;
        const rata = mapelVals.length ? Math.round(jumlah / mapelVals.length * 100) / 100 : null;
        return {
          siswa_id: s.id, nama: s.nama, nis: s.nis,
          nama_kelas: kelasList.find(k => k.id === s.kelas_id)?.nama_kelas || s.nama_kelas || '',
          jumlah, rata, mapelCount: mapelVals.length, peringkat: null,
        };
      });

    // Peringkat berdasar rata-rata dalam kelas (antar siswa yang punya nilai)
    const byKelas = {};
    list.forEach(s => { (byKelas[s.nama_kelas] = byKelas[s.nama_kelas] || []).push(s); });
    Object.values(byKelas).forEach(arr => {
      const sorted = arr.filter(s => s.rata != null).sort((a, b) => b.rata - a.rata);
      let lastRata = null, lastRank = 0;
      sorted.forEach((s, i) => {
        s.peringkat = (s.rata === lastRata) ? lastRank : i + 1;
        lastRata = s.rata;
        lastRank = s.peringkat;
      });
    });
    return list;
  }, [records, siswaAktif, waliKelasIds, kelasList]);

  const searched = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dataSiswa.filter(s =>
      (filterKelas === 'all' || s.nama_kelas === (kelasList.find(k => k.id === filterKelas)?.nama_kelas || filterKelas)) &&
      (!q || s.nama?.toLowerCase().includes(q) || String(s.nis || '').includes(searchQuery))
    );
  }, [dataSiswa, searchQuery, filterKelas, kelasList]);

  const sorted = useMemo(() => {
    const arr = [...searched];
    switch (sortKey) {
      case 'nama_desc': return arr.sort((a, b) => b.nama.localeCompare(a.nama));
      case 'jumlah_desc': return arr.sort((a, b) => (b.jumlah ?? -1) - (a.jumlah ?? -1));
      case 'rata_desc': return arr.sort((a, b) => (b.rata ?? -1) - (a.rata ?? -1));
      case 'peringkat_asc': return arr.sort((a, b) => (a.peringkat ?? 999) - (b.peringkat ?? 999));
      default: return arr.sort((a, b) => a.nama.localeCompare(b.nama));
    }
  }, [searched, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const effPage = Math.min(page, totalPages);
  const paged = sorted.slice((effPage - 1) * pageSize, effPage * pageSize);

  const nilaiCell = (v, cls = '') => (
    v == null ? <span className="text-slate-300">-</span> : <span className={`font-bold tabular-nums ${cls}`}>{v}</span>
  );

  const namaKelasById = (kid) => kelasList.find(k => k.id === kid)?.nama_kelas || '-';

  return (
    <div className="pb-24">
      {!isWaliKelas ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">Anda bukan Wali Kelas</p>
            <p className="text-slate-400 text-sm mt-1">Tab PTS menampilkan daftar nilai siswa untuk Wali Kelas.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Toolbar freeze: cari, filter, sortir, paginasi */}
          <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur py-3 space-y-3 mb-4 border-b border-slate-200 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Cari nama atau NIS siswa..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-10 pr-4 py-2.5 h-auto rounded-xl bg-white border-slate-300" />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              {kelasList.filter(k => waliKelasIds.includes(k.id)).length > 1 && (
                <Select value={filterKelas} onValueChange={(v) => { setFilterKelas(v); setPage(1); }}>
                  <SelectTrigger className="flex-none h-auto rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm w-auto"><SelectValue placeholder="Kelas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {kelasList.filter(k => waliKelasIds.includes(k.id)).map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Select value={semester} onValueChange={(v) => { setSemester(v); setPage(1); }}>
                <SelectTrigger className="flex-none h-auto rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm w-auto"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ganjil">Semester Ganjil</SelectItem>
                  <SelectItem value="Genap">Semester Genap</SelectItem>
                  <SelectItem value="all">Semua Semester</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortKey} onValueChange={setSortKey}>
                <SelectTrigger className="flex-none h-auto rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm w-auto"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nama">Nama A-Z</SelectItem>
                  <SelectItem value="nama_desc">Nama Z-A</SelectItem>
                  <SelectItem value="jumlah_desc">Jumlah Tertinggi</SelectItem>
                  <SelectItem value="rata_desc">Rata-Rata Tertinggi</SelectItem>
                  <SelectItem value="peringkat_asc">Peringkat Terbaik</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto"><PaginationBar page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={sorted.length} /></div>
            </div>
          </div>

          {/* Tabel desktop */}
          <div className="hidden md:block">
            {paged.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium">Belum ada data</p>
                  <p className="text-slate-400 text-sm mt-1">Belum ada nilai PTS untuk siswa kelas Anda pada semester ini.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-slate-200 shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Nama Siswa</TableHead>
                        <TableHead>NIS</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead className="text-center">Jumlah Nilai</TableHead>
                        <TableHead className="text-center">Rata-Rata Nilai</TableHead>
                        <TableHead className="text-center">Peringkat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.map(s => (
                        <TableRow key={s.siswa_id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-800">{s.nama}</TableCell>
                          <TableCell className="text-xs text-slate-500">{s.nis || '-'}</TableCell>
                          <TableCell className="text-slate-600">{s.nama_kelas}</TableCell>
                          <TableCell className="text-center text-lg">{nilaiCell(s.jumlah, 'text-slate-800')}</TableCell>
                          <TableCell className="text-center text-lg">{nilaiCell(s.rata, 'text-amber-600')}</TableCell>
                          <TableCell className="text-center">
                            {s.peringkat != null
                              ? <span className="inline-flex items-center gap-1 text-lg font-bold text-blue-600 tabular-nums"><Trophy className="w-4 h-4 text-amber-400" />{s.peringkat}</span>
                              : <span className="text-slate-300">-</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Kartu mobile */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {paged.map(s => (
              <Card key={s.siswa_id} className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <p className="font-semibold text-slate-800 truncate">{s.nama}</p>
                  <p className="text-xs text-slate-500">NIS {s.nis || '-'} • Kelas {s.nama_kelas}</p>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                      <p className="text-[10px] text-slate-400 leading-none mb-1">JUMLAH</p>
                      <p className="text-xl font-bold text-slate-800 tabular-nums">{s.jumlah ?? '-'}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-2 text-center border border-amber-100">
                      <p className="text-[10px] text-amber-500/80 leading-none mb-1">RATA-RATA</p>
                      <p className="text-xl font-bold text-amber-600 tabular-nums">{s.rata ?? '-'}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-2 text-center border border-blue-100">
                      <p className="text-[10px] text-blue-400 leading-none mb-1">PERINGKAT</p>
                      <p className="text-xl font-bold text-blue-600 tabular-nums">{s.peringkat ?? '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {paged.length === 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <p className="text-slate-700 font-medium">Belum ada data</p>
                  <p className="text-slate-400 text-sm mt-1">Belum ada nilai PTS untuk siswa kelas Anda pada semester ini.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}