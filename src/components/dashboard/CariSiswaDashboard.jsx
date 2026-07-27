import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users } from "lucide-react";

export default function CariSiswaDashboard() {
  const [selectedKelas, setSelectedKelas] = useState('all');
  const [search, setSearch] = useState('');

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const kelasMap = useMemo(() => {
    const map = {};
    kelasList.forEach(k => { map[k.id] = k; });
    return map;
  }, [kelasList]);

  const filteredSiswa = useMemo(() => {
    let list = siswaList;
    if (selectedKelas !== 'all') {
      list = list.filter(s => s.kelas_id === selectedKelas);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.nama?.toLowerCase().includes(q) ||
        s.nis?.includes(search) ||
        s.nisn?.includes(search)
      );
    }
    return [...list].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [siswaList, selectedKelas, search]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-500" />
          Cari Siswa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="sm:w-56">
            <Select value={selectedKelas} onValueChange={setSelectedKelas}>
              <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Cari nama, NIS, atau NISN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredSiswa.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Tidak ada siswa ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">NIS</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">NISN</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Nama</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Kelas</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Wali Kelas</th>
                </tr>
              </thead>
              <tbody>
                {filteredSiswa.map((siswa, i) => {
                  const kelas = kelasMap[siswa.kelas_id];
                  return (
                    <tr key={siswa.id} className={`border-b last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-4 py-2.5 text-xs font-mono text-slate-600">{siswa.nis || '-'}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-slate-600">{siswa.nisn || '-'}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{siswa.nama}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-xs">{siswa.nama_kelas || '-'}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{kelas?.wali_kelas || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-400 text-right">{filteredSiswa.length} siswa ditemukan</p>
      </CardContent>
    </Card>
  );
}