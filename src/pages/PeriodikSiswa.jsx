import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Ruler, Weight, Circle, Loader2, Save, X, RefreshCw, History,
  Search, ChevronUp, ChevronDown, ChevronsUpDown, CalendarDays, AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import RiwayatPeriodikDialog from '@/components/periodik/RiwayatPeriodikDialog';

const PAGE_SIZES = [10, 25, 50];

export default function PeriodikSiswa() {
  const [search, setSearch] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [inputValues, setInputValues] = useState({});
  const [riwayatSiswa, setRiwayatSiswa] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'nama', direction: 'asc' });

  const { activeAcademicYear, isLoading: yearLoading } = useActiveAcademicYear();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      try { const u = await base44.auth.me(); setCurrentUser(u); } catch {}
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const unsubscribe = base44.entities.PeriodikSiswa.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['periodikSiswa'] });
      queryClient.invalidateQueries({ queryKey: ['periodik-riwayat'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const userRole = currentUser?.role || 'guru';
  const canEdit = ['admin', 'tu', 'operator', 'piket'].includes(userRole);

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const kelasMap = useMemo(() => {
    const m = {};
    kelasList.forEach(k => { m[k.id] = k; });
    return m;
  }, [kelasList]);

  const { data: siswaList = [], isLoading: siswaLoading } = useQuery({
    queryKey: ['siswa-periodik', selectedKelas],
    queryFn: () => selectedKelas
      ? base44.entities.Siswa.filter({ status: 'Aktif', kelas_id: selectedKelas })
      : base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: periodikList = [], isLoading: periodikLoading } = useQuery({
    queryKey: ['periodikSiswa', activeAcademicYear],
    queryFn: () => base44.entities.PeriodikSiswa.filter(
      activeAcademicYear ? { tahun_ajaran: activeAcademicYear } : {}
    ),
    enabled: !yearLoading,
  });

  const latestMap = useMemo(() => {
    const map = {};
    periodikList.forEach(p => {
      if (!p.siswa_id) return;
      const existing = map[p.siswa_id];
      if (!existing) {
        map[p.siswa_id] = p;
      } else {
        const pDate = new Date(p.tanggal || 0).getTime();
        const eDate = new Date(existing.tanggal || 0).getTime();
        if (pDate > eDate || (pDate === eDate && new Date(p.updated_date || 0) > new Date(existing.updated_date || 0))) {
          map[p.siswa_id] = p;
        }
      }
    });
    return map;
  }, [periodikList]);

  const filteredSiswa = useMemo(() => {
    let result = [...siswaList];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.nama?.toLowerCase().includes(q) || s.nis?.toLowerCase().includes(q)
      );
    }
    const key = sortConfig.key;
    result.sort((a, b) => {
      let aVal, bVal;
      if (key === 'nama') { aVal = (a.nama || '').toLowerCase(); bVal = (b.nama || '').toLowerCase(); }
      else if (key === 'nis') { aVal = (a.nis || '').toLowerCase(); bVal = (b.nis || '').toLowerCase(); }
      else if (key === 'kelas') { aVal = (a.nama_kelas || '').toLowerCase(); bVal = (b.nama_kelas || '').toLowerCase(); }
      else if (key === 'tingkat') { aVal = kelasMap[a.kelas_id]?.tingkat || ''; bVal = kelasMap[b.kelas_id]?.tingkat || ''; }
      else {
        const aP = latestMap[a.id];
        const bP = latestMap[b.id];
        if (key === 'tb') { aVal = aP?.tinggi_badan ?? 0; bVal = bP?.tinggi_badan ?? 0; }
        else if (key === 'bb') { aVal = aP?.berat_badan ?? 0; bVal = bP?.berat_badan ?? 0; }
        else if (key === 'lk') { aVal = aP?.lingkar_kepala ?? 0; bVal = bP?.lingkar_kepala ?? 0; }
        else if (key === 'tanggal') { aVal = aP?.tanggal ? new Date(aP.tanggal).getTime() : 0; bVal = bP?.tanggal ? new Date(bP.tanggal).getTime() : 0; }
        else if (key === 'pencatat') { aVal = (aP?.input_by || '').toLowerCase(); bVal = (bP?.input_by || '').toLowerCase(); }
        else return 0;
      }
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return result;
  }, [siswaList, search, sortConfig, latestMap, kelasMap]);

  const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedSiswa = filteredSiswa.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [search, selectedKelas, pageSize]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleStartInput = (siswa) => {
    setEditingId(siswa.id);
    setInputValues({ tinggi_badan: '', berat_badan: '', lingkar_kepala: '' });
  };

  const handleSave = async (siswa) => {
    const kelas = kelasMap[siswa.kelas_id];
    try {
      await base44.entities.PeriodikSiswa.create({
        siswa_id: siswa.id,
        nis: siswa.nis,
        nama_siswa: siswa.nama,
        kelas_id: siswa.kelas_id,
        nama_kelas: siswa.nama_kelas,
        tingkat: kelas?.tingkat || '',
        tahun_ajaran: activeAcademicYear || '',
        tanggal: new Date().toISOString().split('T')[0],
        tinggi_badan: inputValues.tinggi_badan ? Number(inputValues.tinggi_badan) : undefined,
        berat_badan: inputValues.berat_badan ? Number(inputValues.berat_badan) : undefined,
        lingkar_kepala: inputValues.lingkar_kepala ? Number(inputValues.lingkar_kepala) : undefined,
        input_by: currentUser?.full_name || 'Petugas',
        input_by_id: currentUser?.id,
      });
      setEditingId(null);
      setInputValues({});
      queryClient.invalidateQueries({ queryKey: ['periodikSiswa'] });
      toast({ title: 'Tersimpan', description: `Data ${siswa.nama} berhasil disimpan.` });
    } catch (err) {
      toast({ title: 'Gagal menyimpan', description: err.message, variant: 'destructive' });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setInputValues({});
  };

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <ChevronsUpDown className="w-3 h-3 text-slate-300 ml-1 inline" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-3 h-3 text-violet-600 ml-1 inline" />
      : <ChevronDown className="w-3 h-3 text-violet-600 ml-1 inline" />;
  };

  const isLoading = siswaLoading || periodikLoading || yearLoading;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Ruler className="w-8 h-8 text-violet-500" />
              Data Periodik Siswa
            </h1>
            <p className="text-slate-500 mt-1">Pengukuran Tinggi Badan, Berat Badan & Lingkar Kepala</p>
          </div>
          <div className="flex items-center gap-2">
            {activeAcademicYear ? (
              <Badge className="bg-violet-100 text-violet-700">
                <CalendarDays className="w-3 h-3 mr-1" /> TA {activeAcademicYear}
              </Badge>
            ) : !yearLoading && (
              <Badge className="bg-amber-100 text-amber-700">
                <AlertCircle className="w-3 h-3 mr-1" /> TA belum diatur
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['periodikSiswa'] })}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="border-0 shadow-sm mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label className="text-xs">Cari Siswa</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Cari nama atau NIS..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:w-56">
                <Label className="text-xs">Pilih Kelas</Label>
                <Select
                  value={selectedKelas || 'all'}
                  onValueChange={(v) => setSelectedKelas(v === 'all' ? '' : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {kelasList.map(k => (
                      <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Daftar Siswa ({filteredSiswa.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
              </div>
            ) : paginatedSiswa.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Tidak ada data siswa.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-slate-500">
                        <th className="text-left py-2 px-2 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap" onClick={() => handleSort('nis')}>
                          NIS {renderSortIcon('nis')}
                        </th>
                        <th className="text-left py-2 px-2 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap" onClick={() => handleSort('nama')}>
                          Nama {renderSortIcon('nama')}
                        </th>
                        <th className="text-center py-2 px-2 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap" onClick={() => handleSort('tingkat')}>
                          Tingkat {renderSortIcon('tingkat')}
                        </th>
                        <th className="text-center py-2 px-2 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap" onClick={() => handleSort('kelas')}>
                          Kelas {renderSortIcon('kelas')}
                        </th>
                        <th className="text-center py-2 px-2 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap" onClick={() => handleSort('tb')}>
                          <Ruler className="w-3.5 h-3.5 mx-auto" /> TB (cm) {renderSortIcon('tb')}
                        </th>
                        <th className="text-center py-2 px-2 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap" onClick={() => handleSort('bb')}>
                          <Weight className="w-3.5 h-3.5 mx-auto" /> BB (kg) {renderSortIcon('bb')}
                        </th>
                        <th className="text-center py-2 px-2 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap" onClick={() => handleSort('lk')}>
                          <Circle className="w-3.5 h-3.5 mx-auto" /> LK (cm) {renderSortIcon('lk')}
                        </th>
                        <th className="text-center py-2 px-2 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap" onClick={() => handleSort('tanggal')}>
                          Tgl Ukur {renderSortIcon('tanggal')}
                        </th>
                        <th className="text-center py-2 px-2 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap" onClick={() => handleSort('pencatat')}>
                          Pencatat {renderSortIcon('pencatat')}
                        </th>
                        <th className="text-center py-2 px-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSiswa.map(siswa => {
                        const p = latestMap[siswa.id];
                        const isEditing = editingId === siswa.id;
                        const tingkat = kelasMap[siswa.kelas_id]?.tingkat || '-';
                        return (
                          <tr key={siswa.id} className="border-b hover:bg-slate-50">
                            <td className="py-2 px-2 font-mono text-xs">{siswa.nis}</td>
                            <td className="py-2 px-2 font-medium">{siswa.nama}</td>
                            <td className="py-2 px-2 text-center">{tingkat}</td>
                            <td className="py-2 px-2 text-center">{siswa.nama_kelas || '-'}</td>
                            {isEditing ? (
                              <>
                                <td className="py-1 px-1">
                                  <Input type="number" className="h-8 text-center" value={inputValues.tinggi_badan || ''} onChange={(e) => setInputValues(v => ({ ...v, tinggi_badan: e.target.value }))} />
                                </td>
                                <td className="py-1 px-1">
                                  <Input type="number" className="h-8 text-center" value={inputValues.berat_badan || ''} onChange={(e) => setInputValues(v => ({ ...v, berat_badan: e.target.value }))} />
                                </td>
                                <td className="py-1 px-1">
                                  <Input type="number" className="h-8 text-center" value={inputValues.lingkar_kepala || ''} onChange={(e) => setInputValues(v => ({ ...v, lingkar_kepala: e.target.value }))} />
                                </td>
                                <td colSpan={2}></td>
                                <td className="py-1 px-1">
                                  <div className="flex gap-1 justify-center">
                                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSave(siswa)}>
                                      <Save className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8" onClick={handleCancel}>
                                      <X className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-2 text-center">{p?.tinggi_badan || '-'}</td>
                                <td className="py-2 px-2 text-center">{p?.berat_badan || '-'}</td>
                                <td className="py-2 px-2 text-center">{p?.lingkar_kepala || '-'}</td>
                                <td className="py-2 px-2 text-center text-xs text-slate-500 whitespace-nowrap">
                                  {p?.tanggal ? format(new Date(p.tanggal), 'd MMM yyyy', { locale: idLocale }) : '-'}
                                </td>
                                <td className="py-2 px-2 text-center text-xs text-slate-500">{p?.input_by || '-'}</td>
                                <td className="py-2 px-2 text-center">
                                  <div className="flex gap-1 justify-center">
                                    {p ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50"
                                        onClick={() => setRiwayatSiswa(siswa)}
                                        title="Riwayat Pengukuran"
                                      >
                                        <History className="w-3.5 h-3.5" /> Riwayat
                                      </Button>
                                    ) : canEdit ? (
                                      <Button size="sm" variant="outline" onClick={() => handleStartInput(siswa)}>
                                        Input
                                      </Button>
                                    ) : (
                                      <span className="text-xs text-slate-400">-</span>
                                    )}
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Tampil</span>
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZES.map(s => (
                          <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>dari {filteredSiswa.length} siswa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                      Sebelumnya
                    </Button>
                    <span className="text-xs text-slate-500 whitespace-nowrap">Hal {currentPage} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                      Berikutnya
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <RiwayatPeriodikDialog siswa={riwayatSiswa} open={!!riwayatSiswa} onClose={() => setRiwayatSiswa(null)} />
    </div>
  );
}