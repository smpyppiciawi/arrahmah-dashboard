import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCheck } from 'lucide-react';

const countOf = (row, key) => (key === 'Hadir' ? (row.Hadir || 0) + (row.Terlambat || 0) : (row[key] || 0));

export default function KehadiranPegawaiSection({ dateFrom, dateTo, rekap, isLoading, isDark, t }) {
  const rangeLabel = dateFrom === dateTo ? dateFrom : `${dateFrom} s/d ${dateTo}`;
  const totals = rekap?.totals || {};
  const hariEfektif = (rekap?.hariEfektif || []).length;

  const totalRow = {
    Hadir: (totals.Hadir || 0) + (totals.Terlambat || 0),
    Sakit: totals.Sakit || 0,
    Izin: totals.Izin || 0,
    Alfa: totals.Alfa || 0,
  };

  const rows = useMemo(() => (rekap?.perPegawai || [])
    .map((p) => ({
      ...p,
      _hadir: countOf(p, 'Hadir'),
      _terlambat: p.Terlambat || 0,
      _sakit: p.Sakit || 0,
      _izin: p.Izin || 0,
      _alfa: p.Alfa || 0,
    }))
    .sort((a, b) => (a.nama_pegawai || '').localeCompare(b.nama_pegawai || '', 'id')), [rekap]);

  return (
    <div className={`rounded-2xl ${t.card} p-3 md:p-4`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className={`${t.text} font-bold text-sm flex items-center gap-2`}>
          <UserCheck className="w-4 h-4 text-emerald-500" /> Rekap Kehadiran Pegawai
        </h3>
        <span className={`text-[10px] ${t.textMuted} whitespace-nowrap`}>{rangeLabel}</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-14 rounded-xl animate-pulse ${isDark ? 'bg-slate-700/40' : 'bg-slate-100'}`} />
          ))}
        </div>
      ) : hariEfektif === 0 ? (
        <p className={`${t.textMuted} text-xs text-center py-6`}>Tidak ada data kehadiran pegawai pada rentang waktu ini</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            {['Hadir', 'Sakit', 'Izin', 'Alfa'].map((st) => (
              <div key={st} className={`rounded-xl p-2 text-center ${isDark ? 'bg-slate-700/40' : 'bg-slate-50'}`}>
                <p className={`text-base md:text-lg font-bold ${t.text}`}>{totalRow[st]}</p>
                <p className={`text-[10px] ${t.textMuted}`}>{st}</p>
              </div>
            ))}
          </div>
          <p className={`text-[10px] ${t.textSubtle} mt-1.5 mb-3`}>{hariEfektif} hari sekolah terdata · Hadir termasuk Terlambat</p>

          <div className={`overflow-x-auto rounded-xl border max-h-[280px] overflow-y-auto ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">Nama</TableHead>
                  <TableHead className="text-xs">Jabatan</TableHead>
                  <TableHead className="text-xs text-center">Hadir</TableHead>
                  <TableHead className="text-xs text-center">Terlambat</TableHead>
                  <TableHead className="text-xs text-center">Sakit</TableHead>
                  <TableHead className="text-xs text-center">Izin</TableHead>
                  <TableHead className="text-xs text-center">Alfa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-6 text-slate-400 text-sm">Tidak ada data pegawai</TableCell></TableRow>
                ) : rows.map((p, i) => (
                  <TableRow key={p.guru_id || i} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-sm">{p.nama_pegawai || '-'}</TableCell>
                    <TableCell className="text-xs text-slate-500">{p.jabatan || '-'}</TableCell>
                    <TableCell className="text-center text-xs">{p._hadir}</TableCell>
                    <TableCell className="text-center text-xs text-amber-600">{p._terlambat}</TableCell>
                    <TableCell className="text-center text-xs text-blue-600">{p._sakit}</TableCell>
                    <TableCell className="text-center text-xs text-amber-600">{p._izin}</TableCell>
                    <TableCell className="text-center text-xs text-red-600">{p._alfa}</TableCell>
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