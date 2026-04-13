import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { GraduationCap, Download, Eye, Search, Users, Calendar, User } from 'lucide-react';

export default function LulusanTab() {
  const [filterTahun, setFilterTahun] = useState('semua');
  const [search, setSearch] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState(null);

  const { data: allSiswa = [], isLoading } = useQuery({
    queryKey: ['siswa-lulus'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Lulus' }, 'nama_kelas'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: nilaiList = [] } = useQuery({
    queryKey: ['nilai-lulus', selectedSiswa?.id],
    queryFn: () => base44.entities.Nilai.filter({ siswa_id: selectedSiswa.id }),
    enabled: !!selectedSiswa,
  });

  const { data: absensiList = [] } = useQuery({
    queryKey: ['absensi-lulus', selectedSiswa?.id],
    queryFn: () => base44.entities.Absensi.filter({ siswa_id: selectedSiswa.id }),
    enabled: !!selectedSiswa,
  });

  const { data: prestasiList = [] } = useQuery({
    queryKey: ['prestasi-lulus', selectedSiswa?.id],
    queryFn: () => base44.entities.Prestasi.filter({ siswa_id: selectedSiswa.id }),
    enabled: !!selectedSiswa,
  });

  // Extract unique tahun ajaran from nama_kelas or from records
  const tahunList = useMemo(() => {
    const set = new Set(allSiswa.map(s => s.tahun_ajaran).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [allSiswa]);

  const filtered = useMemo(() => {
    return allSiswa.filter(s => {
      const matchTahun = filterTahun === 'semua' || s.tahun_ajaran === filterTahun;
      const matchSearch = !search || s.nama?.toLowerCase().includes(search.toLowerCase()) || s.nis?.includes(search);
      return matchTahun && matchSearch;
    });
  }, [allSiswa, filterTahun, search]);

  // Group by tahun_ajaran for stats
  const stats = useMemo(() => {
    const groups = {};
    allSiswa.forEach(s => {
      const ta = s.tahun_ajaran || 'Tidak diketahui';
      groups[ta] = (groups[ta] || 0) + 1;
    });
    return groups;
  }, [allSiswa]);

  const downloadCSV = () => {
    const rows = [
      ['NIS', 'Nama', 'Jenis Kelamin', 'Nama Kelas', 'Tahun Ajaran', 'Nama Orang Tua', 'No. Telp Orang Tua', 'Alamat'],
      ...filtered.map(s => [
        s.nis, s.nama, s.jenis_kelamin, s.nama_kelas,
        s.tahun_ajaran || '-', s.nama_ortu || '-', s.no_telp_ortu || '-', s.alamat || '-'
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-lulusan${filterTahun !== 'semua' ? '-' + filterTahun.replace('/', '-') : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const absensiStats = useMemo(() => {
    const total = absensiList.length;
    const hadir = absensiList.filter(a => a.status === 'Hadir').length;
    const sakit = absensiList.filter(a => a.status === 'Sakit').length;
    const izin = absensiList.filter(a => a.status === 'Izin').length;
    const alfa = absensiList.filter(a => a.status === 'Alfa').length;
    return { total, hadir, sakit, izin, alfa };
  }, [absensiList]);

  const avgNilai = useMemo(() => {
    if (!nilaiList.length) return '-';
    const avg = nilaiList.reduce((s, n) => s + (n.nilai || 0), 0) / nilaiList.length;
    return avg.toFixed(1);
  }, [nilaiList]);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-slate-400">
      <GraduationCap className="w-8 h-8 animate-pulse mr-2" /> Memuat data lulusan...
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 font-medium">Total Lulusan</p>
            <p className="text-2xl font-bold text-amber-800">{allSiswa.length}</p>
          </CardContent>
        </Card>
        {tahunList.slice(0, 3).map(ta => (
          <Card key={ta} className="border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 font-medium">{ta}</p>
              <p className="text-2xl font-bold text-slate-700">{stats[ta] || 0}</p>
              <p className="text-xs text-slate-400">siswa</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nama atau NIS..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterTahun} onValueChange={setFilterTahun}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter Tahun Ajaran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Tahun Ajaran</SelectItem>
            {tahunList.map(ta => (
              <SelectItem key={ta} value={ta}>{ta}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={downloadCSV} className="gap-2 shrink-0">
          <Download className="w-4 h-4" /> Download CSV
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm text-slate-600 font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            {filtered.length} Siswa Lulusan
            {filterTahun !== 'semua' && <Badge className="bg-amber-100 text-amber-700 ml-1">{filterTahun}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">NIS</TableHead>
                  <TableHead className="text-xs">Nama</TableHead>
                  <TableHead className="text-xs">Kelas</TableHead>
                  <TableHead className="text-xs">Tahun Ajaran</TableHead>
                  <TableHead className="text-xs">L/P</TableHead>
                  <TableHead className="text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-12">
                      Tidak ada data lulusan ditemukan
                    </TableCell>
                  </TableRow>
                ) : filtered.map((siswa, i) => (
                  <TableRow key={siswa.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <TableCell className="text-xs font-mono text-slate-500">{siswa.nis}</TableCell>
                    <TableCell className="text-sm font-medium">{siswa.nama}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{siswa.nama_kelas || '-'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{siswa.tahun_ajaran || '-'}</TableCell>
                    <TableCell>
                      <Badge className={siswa.jenis_kelamin === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}>
                        {siswa.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setSelectedSiswa(siswa)}>
                        <Eye className="w-3 h-3" /> Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSiswa} onOpenChange={open => !open && setSelectedSiswa(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-amber-500" />
              Riwayat Siswa Lulusan
            </DialogTitle>
          </DialogHeader>
          {selectedSiswa && (
            <div className="space-y-4">
              {/* Profile */}
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {selectedSiswa.nama?.charAt(0)}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1">
                      <div>
                        <p className="text-xs text-slate-500">Nama Lengkap</p>
                        <p className="font-semibold text-slate-800">{selectedSiswa.nama}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">NIS</p>
                        <p className="font-mono font-semibold text-slate-800">{selectedSiswa.nis}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Kelas Terakhir</p>
                        <p className="font-semibold text-slate-800">{selectedSiswa.nama_kelas || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Tahun Ajaran</p>
                        <p className="font-semibold text-slate-800">{selectedSiswa.tahun_ajaran || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Tanggal Lahir</p>
                        <p className="text-slate-700">{selectedSiswa.tanggal_lahir || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Jenis Kelamin</p>
                        <p className="text-slate-700">{selectedSiswa.jenis_kelamin || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500">Alamat</p>
                        <p className="text-slate-700">{selectedSiswa.alamat || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Orang Tua / Wali</p>
                        <p className="text-slate-700">{selectedSiswa.nama_ortu || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">No. Telp Orang Tua</p>
                        <p className="text-slate-700">{selectedSiswa.no_telp_ortu || '-'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ringkasan */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-slate-500">Rata-rata Nilai</p>
                    <p className="text-xl font-bold text-blue-600">{avgNilai}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-slate-500">Total Hadir</p>
                    <p className="text-xl font-bold text-green-600">{absensiStats.hadir}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-slate-500">Prestasi</p>
                    <p className="text-xl font-bold text-amber-600">{prestasiList.length}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Absensi */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Ringkasan Kehadiran
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Hadir', val: absensiStats.hadir, color: 'text-green-600' },
                    { label: 'Sakit', val: absensiStats.sakit, color: 'text-blue-600' },
                    { label: 'Izin', val: absensiStats.izin, color: 'text-amber-600' },
                    { label: 'Alfa', val: absensiStats.alfa, color: 'text-red-600' },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 rounded-lg p-2 text-center">
                      <p className={`text-lg font-bold ${item.color}`}>{item.val}</p>
                      <p className="text-xs text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nilai */}
              {nilaiList.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Riwayat Nilai</p>
                  <div className="max-h-40 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-xs">Mapel</TableHead>
                          <TableHead className="text-xs">Jenis</TableHead>
                          <TableHead className="text-xs">Nilai</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nilaiList.map(n => (
                          <TableRow key={n.id}>
                            <TableCell className="text-xs">{n.mapel}</TableCell>
                            <TableCell className="text-xs">{n.jenis_penilaian}</TableCell>
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
                  <p className="text-sm font-semibold text-slate-700 mb-2">Prestasi</p>
                  <div className="space-y-2">
                    {prestasiList.map(p => (
                      <div key={p.id} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                        <GraduationCap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{p.nama_prestasi}</p>
                          <p className="text-xs text-slate-500">{p.kategori} • {p.tingkat} • {p.tanggal}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}