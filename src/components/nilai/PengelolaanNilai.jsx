import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PengelolaanNilai() {
  const [filterKelas, setFilterKelas] = useState('');
  const [filterMapel, setFilterMapel] = useState('all');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterTahunAjaran, setFilterTahunAjaran] = useState('');

  const { data: nilaiList = [] } = useQuery({
    queryKey: ['nilai-all'],
    queryFn: () => base44.entities.Nilai.list('-created_date'),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const mapelList = useMemo(() => [...new Set(nilaiList.map(n => n.mapel).filter(Boolean))].sort(), [nilaiList]);
  const tahunAjaranList = useMemo(() => [...new Set(nilaiList.map(n => n.tahun_ajaran).filter(Boolean))].sort(), [nilaiList]);

  const kelasSelected = kelasList.find(k => k.id === filterKelas);
  const tingkatKelas = kelasSelected?.nama_kelas?.replace(/[^0-9]/g, '') || '';
  const isKelas9 = tingkatKelas === '9';
  const isGenap9 = isKelas9 && filterSemester === 'Genap';

  // Hitung nilai akhir
  const nilaiAkhirData = useMemo(() => {
    if (!filterKelas || !filterSemester) return [];

    const filtered = nilaiList.filter(n => {
      if (n.kelas_id !== filterKelas) return false;
      if (n.semester !== filterSemester) return false;
      if (filterTahunAjaran && n.tahun_ajaran !== filterTahunAjaran) return false;
      if (filterMapel !== 'all' && n.mapel !== filterMapel) return false;
      return true;
    });

    // Group by siswa + mapel
    const grouped = {};
    filtered.forEach(n => {
      const key = `${n.siswa_id}__${n.mapel}`;
      if (!grouped[key]) {
        grouped[key] = {
          siswa_id: n.siswa_id,
          nis: n.nis,
          nama_siswa: n.nama_siswa,
          nama_kelas: n.nama_kelas,
          mapel: n.mapel,
          kkm: n.kkm || 75,
          nilaiHarian: [],
          nilaiPTS: [],
          nilaiPAS: [],
          nilaiPraktik: [],
          nilaiUjianSekolah: [],
        };
      }
      if (['Ulangan Harian', 'Tugas'].includes(n.jenis_penilaian)) grouped[key].nilaiHarian.push(n.nilai);
      if (n.jenis_penilaian === 'PTS') grouped[key].nilaiPTS.push(n.nilai);
      if (n.jenis_penilaian === 'PAS') grouped[key].nilaiPAS.push(n.nilai);
      if (n.jenis_penilaian === 'Praktik') grouped[key].nilaiPraktik.push(n.nilai);
      // Ujian Sekolah — jenis_penilaian "PAS" di kelas 9 genap dianggap Ujian Sekolah
    });

    return Object.values(grouped).map(item => {
      const rata = (arr) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
      const fmt = (v) => v !== null ? Math.round(v * 10) / 10 : null;

      const rataHarian = fmt(rata(item.nilaiHarian));
      const rataPTS = fmt(rata(item.nilaiPTS));
      const rataPAS = fmt(rata(item.nilaiPAS));
      const rataPraktik = fmt(rata(item.nilaiPraktik));

      let nilaiAkhirRapor = null;
      let nilaiAkhirIjazah = null;
      let keterangan = '';

      if (filterSemester === 'Ganjil') {
        // Ganjil semua kelas: rata harian + PTS + PAS
        const components = [rataHarian, rataPTS, rataPAS].filter(v => v !== null);
        nilaiAkhirRapor = components.length > 0 ? Math.round(components.reduce((s, v) => s + v, 0) / components.length) : null;
        keterangan = 'Rata Harian + PTS + PAS';
      } else if (filterSemester === 'Genap' && !isKelas9) {
        // Genap Kelas 7 & 8: sama seperti ganjil
        const components = [rataHarian, rataPTS, rataPAS].filter(v => v !== null);
        nilaiAkhirRapor = components.length > 0 ? Math.round(components.reduce((s, v) => s + v, 0) / components.length) : null;
        keterangan = 'Rata Harian + PTS + PAS';
      } else if (isGenap9) {
        // Genap Kelas 9 - Rapor: rata harian + PTS
        const compRapor = [rataHarian, rataPTS].filter(v => v !== null);
        nilaiAkhirRapor = compRapor.length > 0 ? Math.round(compRapor.reduce((s, v) => s + v, 0) / compRapor.length) : null;
        // Ijazah: Praktik + Ujian Sekolah (PAS)
        const compIjazah = [rataPraktik, rataPAS].filter(v => v !== null);
        nilaiAkhirIjazah = compIjazah.length > 0 ? Math.round(compIjazah.reduce((s, v) => s + v, 0) / compIjazah.length) : null;
        keterangan = 'Rapor: Harian+PTS | Ijazah: Praktik+US';
      }

      const tuntas = nilaiAkhirRapor !== null && nilaiAkhirRapor >= item.kkm;

      return {
        ...item,
        rataHarian, rataPTS, rataPAS, rataPraktik,
        nilaiAkhirRapor, nilaiAkhirIjazah,
        tuntas, keterangan
      };
    }).sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));
  }, [nilaiList, filterKelas, filterMapel, filterSemester, filterTahunAjaran, isGenap9]);

  const valCell = (v, kkm) => {
    if (v === null || v === undefined) return <span className="text-slate-300 text-xs">-</span>;
    const color = v >= (kkm || 75) ? 'text-emerald-600 font-bold' : v >= 60 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold';
    return <span className={color}>{v}</span>;
  };

  const handleExportCSV = () => {
    if (nilaiAkhirData.length === 0) return;
    const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Mapel', 'Rata Harian', 'PTS', 'PAS', 'Nilai Akhir Rapor', 
      ...(isGenap9 ? ['Praktik', 'Nilai Akhir Ijazah'] : []), 'Ketuntasan'];
    const rows = nilaiAkhirData.map((r, i) => [
      i + 1, r.nis, r.nama_siswa, r.nama_kelas, r.mapel,
      r.rataHarian ?? '-', r.rataPTS ?? '-', r.rataPAS ?? '-', r.nilaiAkhirRapor ?? '-',
      ...(isGenap9 ? [r.rataPraktik ?? '-', r.nilaiAkhirIjazah ?? '-'] : []),
      r.tuntas ? 'Tuntas' : 'Belum Tuntas'
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nilai-akhir-${filterKelas}-${filterSemester}.csv`;
    a.click();
  };

  const stats = useMemo(() => {
    const tuntas = nilaiAkhirData.filter(r => r.tuntas).length;
    const total = nilaiAkhirData.length;
    const avg = total > 0 ? Math.round(nilaiAkhirData.filter(r => r.nilaiAkhirRapor !== null).reduce((s, r) => s + (r.nilaiAkhirRapor || 0), 0) / total) : 0;
    return { tuntas, total, avg, persen: total > 0 ? ((tuntas / total) * 100).toFixed(1) : 0 };
  }, [nilaiAkhirData]);

  return (
    <div className="space-y-6">
      {/* Filter */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <Calculator className="w-5 h-5" /> Pengelolaan & Nilai Akhir
          </CardTitle>
          <p className="text-sm text-slate-500">Hitung nilai akhir otomatis untuk rapor dan ijazah berdasarkan rumus resmi</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <Label className="text-xs text-slate-500">Kelas *</Label>
              <Select value={filterKelas} onValueChange={setFilterKelas}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                <SelectContent>
                  {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Semester *</Label>
              <Select value={filterSemester} onValueChange={setFilterSemester}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Semester" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ganjil">Ganjil</SelectItem>
                  <SelectItem value="Genap">Genap</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Tahun Ajaran</Label>
              <Select value={filterTahunAjaran} onValueChange={setFilterTahunAjaran}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Semua</SelectItem>
                  {tahunAjaranList.map(ta => <SelectItem key={ta} value={ta}>{ta}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Mata Pelajaran</Label>
              <Select value={filterMapel} onValueChange={setFilterMapel}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Mapel</SelectItem>
                  {mapelList.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rumus Info */}
          {filterSemester && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700 mb-4">
              <p className="font-semibold mb-1">📐 Rumus yang digunakan:</p>
              {filterSemester === 'Ganjil' && <p>Rata-rata Nilai Harian + PTS + PAS = Nilai Akhir (semua kelas)</p>}
              {filterSemester === 'Genap' && !isKelas9 && <p>Rata-rata Nilai Harian + PTS + PAS = Nilai Akhir (Kelas 7 & 8)</p>}
              {isGenap9 && (
                <>
                  <p>📘 <strong>Rapor:</strong> Rata-rata Nilai Harian + PTS = Nilai Akhir</p>
                  <p>📜 <strong>Ijazah:</strong> Nilai Ujian Praktik + Ujian Sekolah = Nilai Akhir Ijazah</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hasil */}
      {nilaiAkhirData.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-0 shadow-sm bg-blue-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                <p className="text-xs text-blue-600">Total Siswa</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-emerald-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{stats.tuntas}</p>
                <p className="text-xs text-emerald-600">Tuntas</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-red-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{stats.total - stats.tuntas}</p>
                <p className="text-xs text-red-600">Belum Tuntas</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-amber-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{stats.persen}%</p>
                <p className="text-xs text-amber-600">Ketuntasan</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tabel Nilai Akhir</CardTitle>
                <Button size="sm" variant="outline" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-1" /> Ekspor CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-10">No</TableHead>
                      <TableHead>NIS</TableHead>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead>Mapel</TableHead>
                      <TableHead className="text-center">Rata Harian</TableHead>
                      <TableHead className="text-center">PTS</TableHead>
                      <TableHead className="text-center">PAS</TableHead>
                      {isGenap9 && <TableHead className="text-center">Praktik</TableHead>}
                      <TableHead className="text-center font-bold text-indigo-700">Nilai Akhir Rapor</TableHead>
                      {isGenap9 && <TableHead className="text-center font-bold text-amber-700">Nilai Ijazah</TableHead>}
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nilaiAkhirData.map((row, i) => (
                      <TableRow key={`${row.siswa_id}-${row.mapel}`} className="hover:bg-slate-50">
                        <TableCell className="text-slate-400">{i + 1}</TableCell>
                        <TableCell className="text-xs text-slate-500">{row.nis}</TableCell>
                        <TableCell className="font-medium">{row.nama_siswa}</TableCell>
                        <TableCell><Badge className="bg-purple-100 text-purple-700 border-0 text-xs">{row.mapel}</Badge></TableCell>
                        <TableCell className="text-center">{valCell(row.rataHarian, row.kkm)}</TableCell>
                        <TableCell className="text-center">{valCell(row.rataPTS, row.kkm)}</TableCell>
                        <TableCell className="text-center">{valCell(row.rataPAS, row.kkm)}</TableCell>
                        {isGenap9 && <TableCell className="text-center">{valCell(row.rataPraktik, row.kkm)}</TableCell>}
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded-lg text-sm font-bold ${row.nilaiAkhirRapor !== null && row.nilaiAkhirRapor >= row.kkm ? 'bg-emerald-100 text-emerald-700' : row.nilaiAkhirRapor !== null ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400'}`}>
                            {row.nilaiAkhirRapor ?? '-'}
                          </span>
                        </TableCell>
                        {isGenap9 && (
                          <TableCell className="text-center">
                            <span className={`px-2 py-1 rounded-lg text-sm font-bold ${row.nilaiAkhirIjazah !== null ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                              {row.nilaiAkhirIjazah ?? '-'}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <Badge className={row.tuntas ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                            {row.tuntas ? 'Tuntas' : 'Belum'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {filterKelas && filterSemester && nilaiAkhirData.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center text-slate-400">
            <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Tidak ada data nilai untuk kelas dan semester yang dipilih</p>
          </CardContent>
        </Card>
      )}

      {(!filterKelas || !filterSemester) && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center text-slate-400">
            <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Pilih Kelas dan Semester untuk melihat hasil nilai akhir</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}