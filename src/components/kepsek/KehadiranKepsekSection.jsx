import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS = {
  Hadir: 'bg-emerald-100 text-emerald-700',
  Sakit: 'bg-blue-100 text-blue-700',
  Izin: 'bg-amber-100 text-amber-700',
  Alfa: 'bg-red-100 text-red-700',
};

export default function KehadiranKepsekSection({ dateFrom, dateTo, absensiList, kelasList, siswaList, isDark, t }) {
  const [kelasId, setKelasId] = useState('');
  const [search, setSearch] = useState('');

  const rangeAbsensi = useMemo(() => (absensiList || []).filter(a => a.tanggal >= dateFrom && a.tanggal <= dateTo), [absensiList, dateFrom, dateTo]);
  const total = useMemo(() => ({
    Hadir: rangeAbsensi.filter(a => a.status === 'Hadir' || a.status === 'Terlambat').length,
    Sakit: rangeAbsensi.filter(a => a.status === 'Sakit').length,
    Izin: rangeAbsensi.filter(a => a.status === 'Izin').length,
    Alfa: rangeAbsensi.filter(a => a.status === 'Alfa').length,
  }), [rangeAbsensi]);

  const kelasAbsensi = useMemo(() => kelasId ? rangeAbsensi.filter(a => a.kelas_id === kelasId) : [], [rangeAbsensi, kelasId]);
  const kelasTotal = useMemo(() => ({
    Hadir: kelasAbsensi.filter(a => a.status === 'Hadir' || a.status === 'Terlambat').length,
    Sakit: kelasAbsensi.filter(a => a.status === 'Sakit').length,
    Izin: kelasAbsensi.filter(a => a.status === 'Izin').length,
    Alfa: kelasAbsensi.filter(a => a.status === 'Alfa').length,
  }), [kelasAbsensi]);

  const kelasSiswa = useMemo(() => {
    const list = (siswaList || []).filter(s => s.kelas_id === kelasId && s.status === 'Aktif');
    const q = search.toLowerCase();
    return list.filter(s => !q || s.nama.toLowerCase().includes(q) || s.nis.includes(search))
      .map(s => {
        const recs = rangeAbsensi.filter(a => a.siswa_id === s.id);
        return {
          ...s,
          _hadir: recs.filter(a => a.status === 'Hadir' || a.status === 'Terlambat').length,
          _sakit: recs.filter(a => a.status === 'Sakit').length,
          _izin: recs.filter(a => a.status === 'Izin').length,
          _alfa: recs.filter(a => a.status === 'Alfa').length,
        };
      }).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  }, [siswaList, kelasId, search, rangeAbsensi]);

  const kelasName = kelasList.find(k => k.id === kelasId)?.nama_kelas;

  return (
    <div className={`rounded-2xl ${t.card} p-3 md:p-4`}>
      <h3 className={`${t.text} font-bold text-sm mb-3`}>Rekap Kehadiran ({dateFrom === dateTo ? dateFrom : `${dateFrom} s/d ${dateTo}`})</h3>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {['Hadir', 'Sakit', 'Izin', 'Alfa'].map(st => (
          <div key={st} className={`rounded-xl p-2.5 text-center ${isDark ? 'bg-slate-700/40' : 'bg-slate-50'}`}>
            <p className={`text-lg font-bold ${t.text}`}>{total[st]}</p>
            <p className={`text-[10px] ${t.textMuted}`}>{st}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
        <Select value={kelasId} onValueChange={setKelasId}>
          <SelectTrigger className="w-full sm:w-56 h-9 text-sm"><SelectValue placeholder="Pilih Kelas untuk detail" /></SelectTrigger>
          <SelectContent>{(kelasList || []).sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas, 'id')).map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}</SelectContent>
        </Select>
        {kelasId && <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama/NIS..." className={`flex-1 h-9 text-sm rounded-md border px-3 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200'}`} />}
      </div>
      {kelasId && (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className={STATUS_COLORS.Hadir}>{kelasName}: {kelasTotal.Hadir} Hadir</Badge>
            <Badge className={STATUS_COLORS.Sakit}>{kelasTotal.Sakit} Sakit</Badge>
            <Badge className={STATUS_COLORS.Izin}>{kelasTotal.Izin} Izin</Badge>
            <Badge className={STATUS_COLORS.Alfa}>{kelasTotal.Alfa} Alfa</Badge>
            <Badge className="bg-slate-100 text-slate-600">{kelasSiswa.length} siswa</Badge>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <Table>
              <TableHeader><TableRow className="bg-slate-50">
                <TableHead className="text-xs">NIS</TableHead>
                <TableHead className="text-xs">Nama</TableHead>
                <TableHead className="text-xs text-center">Hadir</TableHead>
                <TableHead className="text-xs text-center">Sakit</TableHead>
                <TableHead className="text-xs text-center">Izin</TableHead>
                <TableHead className="text-xs text-center">Alfa</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {kelasSiswa.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-400 text-sm">Tidak ada siswa</TableCell></TableRow> : kelasSiswa.map(s => (
                  <TableRow key={s.id} className="hover:bg-slate-50">
                    <TableCell className="text-xs font-mono text-slate-500">{s.nis}</TableCell>
                    <TableCell className="font-medium text-sm">{s.nama}</TableCell>
                    <TableCell className="text-center text-xs">{s._hadir}</TableCell>
                    <TableCell className="text-center text-xs text-blue-600">{s._sakit}</TableCell>
                    <TableCell className="text-center text-xs text-amber-600">{s._izin}</TableCell>
                    <TableCell className="text-center text-xs text-red-600">{s._alfa}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}