import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ArrowLeft, Search, Eye, Calendar, Users, Loader2 } from "lucide-react";
import { motion } from 'framer-motion';
import DetailRiwayatSiswa from '@/components/lulusan/DetailRiwayatSiswa';

export default function DataLulusan() {
  const [selectedTahun, setSelectedTahun] = useState(null);
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [search, setSearch] = useState('');

  const { data: lulusanList = [], isLoading } = useQuery({
    queryKey: ['siswa-lulus'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Lulus' }),
  });

  const tahunGroups = useMemo(() => {
    const groups = {};
    lulusanList.forEach(s => {
      const ta = s.tahun_lulus || s.tahun_ajaran || 'Belum Dikategorikan';
      if (!groups[ta]) groups[ta] = [];
      groups[ta].push(s);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [lulusanList]);

  const filteredSiswa = useMemo(() => {
    if (!selectedTahun) return [];
    return lulusanList
      .filter(s => (s.tahun_lulus || s.tahun_ajaran || 'Belum Dikategorikan') === selectedTahun)
      .filter(s => !search || s.nama?.toLowerCase().includes(search.toLowerCase()) || s.nis?.includes(search))
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [lulusanList, selectedTahun, search]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {selectedTahun && (
            <Button variant="ghost" size="icon" onClick={() => { setSelectedTahun(null); setSearch(''); }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-amber-500" />
              {selectedTahun ? `Lulusan ${selectedTahun}` : 'Arsip Data Lulusan'}
            </h1>
            <p className="text-slate-500 mt-1">
              {selectedTahun
                ? `${filteredSiswa.length} siswa lulusan tahun pelajaran ${selectedTahun}`
                : 'Daftar tahun pelajaran lulusan sekolah'}
            </p>
          </div>
        </div>

        {/* Year List View */}
        {!selectedTahun && (
          <>
            {tahunGroups.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-400 mb-2">Belum ada data lulusan</p>
                  <p className="text-xs text-slate-400">
                    Data siswa yang diluluskan akan otomatis muncul di sini, dikelompokkan per tahun pelajaran.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tahunGroups.map(([tahun, siswaArr], index) => (
                  <motion.div
                    key={tahun}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group"
                      onClick={() => setSelectedTahun(tahun)}
                    >
                      <CardContent className="p-0">
                        <div className="h-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-t-xl" />
                        <div className="p-5">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Tahun Pelajaran</p>
                              <h3 className="text-2xl font-bold text-slate-800 mt-1">{tahun}</h3>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
                              <GraduationCap className="w-6 h-6 text-amber-500" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-600">{siswaArr.length} siswa</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Student List View */}
        {selectedTahun && (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Cari nama atau NIS siswa lulusan..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">NIS</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Nama Siswa</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Kelas Terakhir</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">L/P</th>
                        <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSiswa.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-slate-400 py-12">
                            Tidak ada siswa ditemukan
                          </td>
                        </tr>
                      ) : (
                        filteredSiswa.map((siswa, i) => (
                          <tr
                            key={siswa.id}
                            className={`border-b last:border-0 hover:bg-amber-50/50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                          >
                            <td className="px-4 py-3 text-xs font-mono text-slate-500">{siswa.nis}</td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{siswa.nama}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs">{siswa.nama_kelas || '-'}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={siswa.jenis_kelamin === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}>
                                {siswa.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={() => setSelectedSiswa(siswa)}
                              >
                                <Eye className="w-3.5 h-3.5" /> Detail Riwayat
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Detail Riwayat Popup */}
      <DetailRiwayatSiswa
        siswa={selectedSiswa}
        open={!!selectedSiswa}
        onOpenChange={(open) => !open && setSelectedSiswa(null)}
      />
    </div>
  );
}