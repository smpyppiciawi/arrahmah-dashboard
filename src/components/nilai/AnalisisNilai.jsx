import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Minus, Search } from "lucide-react";

const SEMESTER_ORDER = [
  { semester: 'Ganjil', tahun: null, label: 'Sem 1' },
  { semester: 'Genap', tahun: null, label: 'Sem 2' },
  { semester: 'Ganjil', tahun: null, label: 'Sem 3' },
  { semester: 'Genap', tahun: null, label: 'Sem 4' },
  { semester: 'Ganjil', tahun: null, label: 'Sem 5' },
  { semester: 'Genap', tahun: null, label: 'Sem 6' },
];

export default function AnalisisNilai() {
  const [filterKelas, setFilterKelas] = useState('all');
  const [filterMapel, setFilterMapel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: nilaiList = [] } = useQuery({
    queryKey: ['nilai-all'],
    queryFn: () => base44.entities.Nilai.list('-created_date'),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  // Dapatkan semua mapel unik
  const mapelList = useMemo(() => [...new Set(nilaiList.map(n => n.mapel).filter(Boolean))].sort(), [nilaiList]);

  // Dapatkan semua tahun ajaran unik, urut
  const tahunAjaranList = useMemo(() => 
    [...new Set(nilaiList.map(n => n.tahun_ajaran).filter(Boolean))].sort(), 
    [nilaiList]
  );

  // Hitung nilai akhir per siswa per semester per tahun ajaran per mapel
  // Nilai akhir = rata-rata Ulangan Harian + Tugas + PTS + PAS (Ganjil)
  //             = rata-rata Ulangan Harian + Tugas + PTS (Genap Kelas 7&8, atau Genap Kelas 9)
  const hitungNilaiAkhir = (nilaiArr, kelas, semester) => {
    const tingkat = kelas?.replace(/[^0-9]/g, '') || '';
    const isKelas9GenAP = tingkat === '9' && semester === 'Genap';
    
    const harian = nilaiArr.filter(n => ['Ulangan Harian', 'Tugas'].includes(n.jenis_penilaian));
    const pts = nilaiArr.filter(n => n.jenis_penilaian === 'PTS');
    const pas = nilaiArr.filter(n => n.jenis_penilaian === 'PAS');
    
    const rataHarian = harian.length > 0 ? harian.reduce((s, n) => s + n.nilai, 0) / harian.length : null;
    const rataPTS = pts.length > 0 ? pts.reduce((s, n) => s + n.nilai, 0) / pts.length : null;
    const rataPAS = pas.length > 0 ? pas.reduce((s, n) => s + n.nilai, 0) / pas.length : null;

    if (isKelas9GenAP) {
      // Kelas 9 Genap: rata harian + PTS saja (untuk rapor)
      const components = [rataHarian, rataPTS].filter(v => v !== null);
      if (components.length === 0) return null;
      return Math.round(components.reduce((s, v) => s + v, 0) / components.length);
    } else {
      // Ganjil semua kelas & Genap Kelas 7,8: harian + PTS + PAS
      const components = [rataHarian, rataPTS, rataPAS].filter(v => v !== null);
      if (components.length === 0) return null;
      return Math.round(components.reduce((s, v) => s + v, 0) / components.length);
    }
  };

  // Kelompokkan nilai per siswa
  const analisisData = useMemo(() => {
    // Filter nilai berdasarkan filter yang dipilih
    const filtered = nilaiList.filter(n => {
      if (filterKelas !== 'all' && n.kelas_id !== filterKelas) return false;
      if (filterMapel !== 'all' && n.mapel !== filterMapel) return false;
      return true;
    });

    // Group by siswa
    const bySiswa = {};
    filtered.forEach(n => {
      if (!bySiswa[n.siswa_id]) {
        bySiswa[n.siswa_id] = {
          siswa_id: n.siswa_id,
          nama_siswa: n.nama_siswa,
          nis: n.nis,
          nama_kelas: n.nama_kelas,
          nilaiPerSemester: {}
        };
      }
      const key = `${n.tahun_ajaran}_${n.semester}`;
      if (!bySiswa[n.siswa_id].nilaiPerSemester[key]) {
        bySiswa[n.siswa_id].nilaiPerSemester[key] = {
          tahun_ajaran: n.tahun_ajaran,
          semester: n.semester,
          nama_kelas: n.nama_kelas,
          data: []
        };
      }
      bySiswa[n.siswa_id].nilaiPerSemester[key].data.push(n);
    });

    // Hitung nilai akhir per periode
    return Object.values(bySiswa).map(siswa => {
      const periodes = Object.values(siswa.nilaiPerSemester)
        .sort((a, b) => {
          const aKey = `${a.tahun_ajaran}_${a.semester === 'Ganjil' ? '1' : '2'}`;
          const bKey = `${b.tahun_ajaran}_${b.semester === 'Ganjil' ? '1' : '2'}`;
          return aKey.localeCompare(bKey);
        })
        .map(p => ({
          label: `${p.semester} ${p.tahun_ajaran || ''}`,
          tahun_ajaran: p.tahun_ajaran,
          semester: p.semester,
          nilai: hitungNilaiAkhir(p.data, p.nama_kelas, p.semester),
        }));

      // Tentukan trend
      const nilaiValid = periodes.filter(p => p.nilai !== null).map(p => p.nilai);
      let trend = 'stagnan';
      if (nilaiValid.length >= 2) {
        const first = nilaiValid[0];
        const last = nilaiValid[nilaiValid.length - 1];
        if (last > first + 2) trend = 'naik';
        else if (last < first - 2) trend = 'turun';
      }

      return { ...siswa, periodes, trend };
    }).filter(s => {
      if (!searchQuery) return true;
      return s.nama_siswa?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             s.nis?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [nilaiList, filterKelas, filterMapel, searchQuery]);

  const trendColor = (trend) => ({
    naik: 'text-emerald-600',
    turun: 'text-red-500',
    stagnan: 'text-slate-400',
  }[trend] || 'text-slate-400');

  const TrendIcon = ({ trend }) => {
    if (trend === 'naik') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (trend === 'turun') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getNilaiColor = (nilai) => {
    if (nilai === null) return 'bg-slate-100 text-slate-400';
    if (nilai >= 85) return 'bg-emerald-100 text-emerald-700 font-bold';
    if (nilai >= 75) return 'bg-blue-100 text-blue-700';
    if (nilai >= 60) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  // Kumpulkan semua label periode unik
  const allPeriodes = useMemo(() => {
    const set = new Set();
    analisisData.forEach(s => s.periodes.forEach(p => set.add(p.label)));
    return [...set].sort();
  }, [analisisData]);

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-700">
            <TrendingUp className="w-5 h-5" /> Analisis Nilai Siswa
          </CardTitle>
          <p className="text-sm text-slate-500">Riwayat nilai akhir per semester (Sem 1 – Sem 6) dengan indikator naik/turun/stagnan</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Cari nama atau NIS..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterKelas} onValueChange={setFilterKelas}>
              <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMapel} onValueChange={setFilterMapel}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Semua Mapel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mapel</SelectItem>
                {mapelList.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {analisisData.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada data nilai untuk dianalisis</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">Siswa</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Kelas</th>
                    {allPeriodes.map(p => (
                      <th key={p} className="text-center px-2 py-2 font-semibold text-slate-600 whitespace-nowrap text-xs">{p}</th>
                    ))}
                    <th className="text-center px-3 py-2 font-semibold text-slate-600">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {analisisData.map((siswa, i) => {
                    const nilaiByLabel = {};
                    siswa.periodes.forEach(p => { nilaiByLabel[p.label] = p.nilai; });
                    return (
                      <tr key={siswa.siswa_id} className={`border-t ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800">{siswa.nama_siswa}</p>
                          <p className="text-xs text-slate-400">{siswa.nis}</p>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className="bg-blue-100 text-blue-700 border-0">{siswa.nama_kelas}</Badge>
                        </td>
                        {allPeriodes.map(p => {
                          const nilai = nilaiByLabel[p];
                          return (
                            <td key={p} className="px-2 py-2 text-center">
                              {nilai !== undefined && nilai !== null ? (
                                <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getNilaiColor(nilai)}`}>{nilai}</span>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <TrendIcon trend={siswa.trend} />
                            <span className={`text-xs font-semibold capitalize ${trendColor(siswa.trend)}`}>{siswa.trend}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}