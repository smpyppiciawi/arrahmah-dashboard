import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Trophy, Table2, User, Users, ListChecks } from 'lucide-react';
import { useWaliKelas } from '@/hooks/useWaliKelas';
import { fetchAllNilai } from '@/lib/nilaiLoad';
import PaginationBar from '@/components/appui/PaginationBar';
import PillTabs from '@/components/appui/PillTabs';
import PtsStatusGuruView from '@/components/nilai/PtsStatusGuruView';
import PtsStatusMapelView from '@/components/nilai/PtsStatusMapelView';
import PtsProgressDetailDialog from '@/components/nilai/PtsProgressDetailDialog';

const semesterAktifFn = () => (new Date().getMonth() + 1 >= 7 ? 'Ganjil' : 'Genap');

/**
 * Tab PTS untuk Akun Guru — dua tampilan:
 * 1. Data Nilai Siswa (Wali Kelas): NAMA, NIS, Kelas, Jumlah, Rata-Rata, Peringkat.
 * 2. Status Penilaian: Per Guru (tugas ngajar akun ini) & Per Kelas (kelas yang diwalikan).
 */
export default function PtsGuruView({ activeAcademicYear }) {
  const { waliKelasIds, kelasList, siswaAktif, isWaliKelas, guruData } = useWaliKelas();
  const [topView, setTopView] = useState('nilai'); // 'nilai' | 'status'
  const [statusMode, setStatusMode] = useState('guru'); // 'guru' | 'kelas'
  const [filterKelas, setFilterKelas] = useState('all');
  const [semester, setSemester] = useState(semesterAktifFn);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('nama');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusDetail, setStatusDetail] = useState(null);

  const { data: nilaiPts = [], isLoading } = useQuery({
    queryKey: ['nilai-pts-wali'],
    queryFn: async () => (await fetchAllNilai()).filter(n => n.jenis_penilaian === 'PTS'),
    staleTime: 60000,
  });

  // Seluruh tugas Pembelajaran (dipakai untuk progres & daftar mapel per kelas)
  const { data: pembelajaranList = [] } = useQuery({
    queryKey: ['pembelajaran-list-pts'],
    queryFn: () => base44.entities.Pembelajaran.list(),
    staleTime: 300000,
  });

  // Nilai PTS tahun ajaran aktif & semester terpilih (semua kelas — untuk status penilaian)
  const recordsSemua = useMemo(
    () => nilaiPts.filter(n =>
      (!activeAcademicYear || n.tahun_ajaran === activeAcademicYear) &&
      (semester === 'all' || n.semester === semester)
    ),
    [nilaiPts, activeAcademicYear, semester]
  );

  // Nilai kelas yang diwalikan (untuk Data Nilai Siswa)
  const records = useMemo(
    () => recordsSemua.filter(n => waliKelasIds.includes(n.kelas_id)),
    [recordsSemua, waliKelasIds]
  );

  // Indeks nilai per kelas+mapel → siswa (progres status penilaian)
  const nilaiIdx = useMemo(() => {
    const idx = new Map();
    recordsSemua.forEach(n => {
      if (!n.kelas_id || !n.mapel || !n.siswa_id) return;
      const key = `${n.kelas_id}__${n.mapel}`;
      if (!idx.has(key)) idx.set(key, new Map());
      const m = idx.get(key);
      if (n.nilai === null || n.nilai === undefined || n.nilai === '') return;
      m.set(n.siswa_id, [...(m.get(n.siswa_id) || []), Number(n.nilai)]);
    });
    return idx;
  }, [recordsSemua]);

  const hitung = (kelasId, mapel) => {
    const siswaKelas = siswaAktif.filter(s => s.kelas_id === kelasId);
    const m = nilaiIdx.get(`${kelasId}__${mapel}`);
    const dinilai = siswaKelas.filter(s => m?.has(s.id)).length;
    return { total: siswaKelas.length, dinilai, persen: siswaKelas.length ? Math.round(dinilai / siswaKelas.length * 100) : 0 };
  };

  // Per Guru: seluruh tugas ngajar akun ini (dari Pembelajaran) + progres input nilai PTS
  const statusGuruRows = useMemo(() => {
    if (!guruData?.id) return [];
    const tugas = pembelajaranList
      .filter(p => p.guru_id === guruData.id && p.kelas_id && p.mapel)
      .map(p => ({
        mapel: p.mapel, kelas_id: p.kelas_id,
        nama_kelas: kelasList.find(k => k.id === p.kelas_id)?.nama_kelas || p.nama_kelas || '',
        ...hitung(p.kelas_id, p.mapel),
      }));
    const total = tugas.reduce((a, t) => a + t.total, 0);
    const dinilai = tugas.reduce((a, t) => a + t.dinilai, 0);
    return [{
      guru_id: guruData.id, nama_guru: guruData.nama || 'Saya', tugas,
      total, dinilai, persen: total ? Math.round(dinilai / total * 100) : 0,
    }];
  }, [pembelajaranList, guruData, kelasList, siswaAktif, nilaiIdx]);

  // Per Kelas (Wali Kelas): seluruh mapel di kelas yang diwalikan + progres input
  const statusKelasRows = useMemo(() => {
    const byKey = new Map();
    pembelajaranList.forEach(p => {
      if (!p.kelas_id || !p.mapel || !waliKelasIds.includes(p.kelas_id)) return;
      const key = `${p.kelas_id}__${p.mapel}`;
      if (byKey.has(key)) return;
      byKey.set(key, {
        mapel: p.mapel, kelas_id: p.kelas_id,
        nama_kelas: kelasList.find(k => k.id === p.kelas_id)?.nama_kelas || p.nama_kelas || '',
        guru: p.nama_guru || '',
        ...hitung(p.kelas_id, p.mapel),
      });
    });
    return [...byKey.values()].sort((a, b) =>
      (a.nama_kelas || '').localeCompare(b.nama_kelas || '') || a.mapel.localeCompare(b.mapel));
  }, [pembelajaranList, waliKelasIds, kelasList, siswaAktif, nilaiIdx]);

  const bukaStatusDetail = (row) => {
    const m = nilaiIdx.get(`${row.kelas_id}__${row.mapel}`) || new Map();
    const siswaKelas = siswaAktif
      .filter(s => s.kelas_id === row.kelas_id)
      .sort((a, b) => a.nama.localeCompare(b.nama))
      .map(s => {
        const arr = m.get(s.id);
        return {
          siswa_id: s.id, nama: s.nama, nis: s.nis,
          nilai: arr ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null,
        };
      });
    setStatusDetail({ ...row, siswa: siswaKelas });
  };

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

  return (
    <div className="pb-24">
      {/* Toggle tampilan utama: Data Nilai Siswa ↔ Status Penilaian */}
      <PillTabs
        tabs={[
          { key: 'nilai', label: 'Data Nilai Siswa', icon: Table2 },
          { key: 'status', label: 'Status Penilaian PTS', icon: ListChecks },
        ]}
        activeKey={topView}
        onChange={(v) => { setTopView(v); setPage(1); }}
        tint="amber"
        className="mb-4"
      />

      {topView === 'status' ? (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <PillTabs
              tabs={[
                { key: 'guru', label: 'Per Guru (Tugas Saya)', icon: User },
                ...(isWaliKelas ? [{ key: 'kelas', label: 'Per Kelas (Wali Kelas)', icon: Users }] : []),
              ]}
              activeKey={statusMode}
              onChange={setStatusMode}
              tint="amber"
            />
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger className="flex-none h-auto rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm w-auto"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ganjil">Semester Ganjil</SelectItem>
                <SelectItem value="Genap">Semester Genap</SelectItem>
                <SelectItem value="all">Semua Semester</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {statusMode === 'guru' ? (
            <PtsStatusGuruView rows={statusGuruRows} onDetail={bukaStatusDetail} isLoading={isLoading} />
          ) : (
            <PtsStatusMapelView rows={statusKelasRows} groupByKelas={waliKelasIds.length > 1} onDetail={bukaStatusDetail} isLoading={isLoading} />
          )}
        </div>
      ) : !isWaliKelas ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">Anda bukan Wali Kelas</p>
            <p className="text-slate-400 text-sm mt-1">Data Nilai Siswa menampilkan nilai untuk Wali Kelas. Gunakan Status Penilaian PTS untuk memantau progres nilai tugas mengajar Anda.</p>
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

      <PtsProgressDetailDialog open={!!statusDetail} onOpenChange={(v) => !v && setStatusDetail(null)} detail={statusDetail} />
    </div>
  );
}