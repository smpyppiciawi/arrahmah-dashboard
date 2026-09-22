import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, ImageOff } from 'lucide-react';
import { getFotoAktif } from '@/lib/fotoSiswa';

export default function RingkasanFotoTab({ siswaList }) {
  const [statusFilter, setStatusFilter] = useState('Aktif');

  const rows = useMemo(() => {
    const filtered = siswaList.filter((s) => s.status === statusFilter);
    const byKelas = {};
    filtered.forEach((s) => {
      const key = s.nama_kelas || 'Tanpa Kelas';
      if (!byKelas[key]) byKelas[key] = { kelas: key, total: 0, ada: 0, ortu: 0 };
      const r = byKelas[key];
      r.total += 1;
      if (getFotoAktif(s)) r.ada += 1;
      if (s.foto_ayah || s.foto_ibu || s.foto_wali) r.ortu += 1;
    });
    return Object.values(byKelas).sort((a, b) => a.kelas.localeCompare(b.kelas));
  }, [siswaList, statusFilter]);

  const totalSiswa = rows.reduce((a, r) => a + r.total, 0);
  const totalAda = rows.reduce((a, r) => a + r.ada, 0);
  const totalBelum = totalSiswa - totalAda;
  const totalOrtu = rows.reduce((a, r) => a + r.ortu, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Aktif">Siswa Aktif</SelectItem>
            <SelectItem value="Lulus">Lulusan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-xs text-slate-400">Total Siswa</p>
          <p className="text-2xl font-bold text-slate-800">{totalSiswa}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-slate-400">Sudah Berfoto</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{totalAda}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <ImageOff className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-slate-400">Belum Berfoto</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{totalBelum}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-xs text-slate-400">Foto Ortu/Wali Terisi</p>
          <p className="text-2xl font-bold text-blue-500">{totalOrtu}</p>
        </CardContent></Card>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <th className="px-4 py-3 font-medium">Kelas</th>
              <th className="px-4 py-3 font-medium text-center">Siswa</th>
              <th className="px-4 py-3 font-medium text-center">Sudah Foto</th>
              <th className="px-4 py-3 font-medium text-center">Belum Foto</th>
              <th className="px-4 py-3 font-medium">Kelengkapan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pct = r.total ? Math.round((r.ada / r.total) * 100) : 0;
              return (
                <tr key={r.kelas} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{r.kelas}</td>
                  <td className="px-4 py-2.5 text-center text-slate-600">{r.total}</td>
                  <td className="px-4 py-2.5 text-center text-emerald-600 font-medium">{r.ada}</td>
                  <td className="px-4 py-2.5 text-center text-amber-600 font-medium">{r.total - r.ada}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden min-w-16">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 w-9 text-right">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">Tidak ada data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}