import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Search } from 'lucide-react';

const RANK_CATS = [
  { key: 'Alfa', label: 'Alfa', dot: 'bg-red-500', text: 'text-red-500' },
  { key: 'Sakit', label: 'Sakit', dot: 'bg-blue-500', text: 'text-blue-500' },
  { key: 'Izin', label: 'Izin', dot: 'bg-amber-500', text: 'text-amber-500' },
  { key: 'Hadir', label: 'Hadir', dot: 'bg-emerald-500', text: 'text-emerald-500' },
];

const countOf = (row, key) => (key === 'Hadir' ? (row.Hadir || 0) + (row.Terlambat || 0) : (row[key] || 0));

export default function KehadiranKepsekSection({ dateFrom, dateTo, rekap, isLoading, kelasList, isDark, t }) {
  const [rankCat, setRankCat] = useState('Alfa');
  const [rankScope, setRankScope] = useState('kelas'); // kelas | siswa
  const [kelasId, setKelasId] = useState('');
  const [search, setSearch] = useState('');

  const rangeLabel = dateFrom === dateTo ? dateFrom : `${dateFrom} s/d ${dateTo}`;
  const totals = rekap?.totals || {};
  const hariEfektif = (rekap?.hariEfektif || []).length;

  const totalRow = {
    Hadir: (totals.Hadir || 0) + (totals.Terlambat || 0),
    Sakit: totals.Sakit || 0,
    Izin: totals.Izin || 0,
    Alfa: totals.Alfa || 0,
  };

  // Ranking terbanyak — 2 tab: per Kelas & per Siswa
  const rankedRows = useMemo(() => {
    const src = rankScope === 'siswa'
      ? (rekap?.perSiswa || []).map((s) => ({ key: s.siswa_id, label: s.nama || '-', sub: s.nama_kelas || '', val: countOf(s, rankCat) }))
      : (rekap?.perKelas || []).map((k) => ({ key: k.kelas_id || k.nama_kelas || '-', label: k.nama_kelas || '-', sub: '', val: countOf(k, rankCat) }));
    return src.sort((a, b) => b.val - a.val).slice(0, 5);
  }, [rekap, rankCat, rankScope]);
  const maxRank = rankedRows[0]?.val || 1;
  const rankStyle = RANK_CATS.find((c) => c.key === rankCat);

  const kelasTotals = useMemo(() => {
    const row = (rekap?.perKelas || []).find((k) => k.kelas_id === kelasId);
    if (!row) return null;
    return { Hadir: countOf(row, 'Hadir'), Sakit: row.Sakit || 0, Izin: row.Izin || 0, Alfa: row.Alfa || 0 };
  }, [rekap, kelasId]);

  const kelasSiswa = useMemo(() => {
    if (!kelasId) return [];
    const q = (search || '').trim().toLowerCase();
    return (rekap?.perSiswa || [])
      .filter((s) => s.kelas_id === kelasId)
      .filter((s) => !q || (s.nama || '').toLowerCase().includes(q) || (s.nis || '').includes(q))
      .map((s) => ({ ...s, _hadir: countOf(s, 'Hadir') }))
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id'));
  }, [rekap, kelasId, search]);

  const scopeBtn = (active) => active
    ? (isDark ? 'bg-slate-600 text-white' : 'bg-slate-800 text-white')
    : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700');
  const catBtn = (active) => active
    ? (isDark ? 'bg-slate-600 text-white' : 'bg-slate-800 text-white')
    : (isDark ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200');

  return (
    <div className={`rounded-2xl ${t.card} p-3 md:p-4`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className={`${t.text} font-bold text-sm`}>Rekap Kehadiran Siswa</h3>
        <span className={`text-[10px] ${t.textMuted} whitespace-nowrap`}>{rangeLabel}</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-14 rounded-xl animate-pulse ${isDark ? 'bg-slate-700/40' : 'bg-slate-100'}`} />
          ))}
        </div>
      ) : hariEfektif === 0 ? (
        <p className={`${t.textMuted} text-xs text-center py-8`}>Tidak ada data absensi pada rentang waktu ini</p>
      ) : (
        <>
          {/* Total akumulasi keseluruhan (sesuai filter waktu) */}
          <div className="grid grid-cols-4 gap-2">
            {['Hadir', 'Sakit', 'Izin', 'Alfa'].map((st) => (
              <div key={st} className={`rounded-xl p-2 text-center ${isDark ? 'bg-slate-700/40' : 'bg-slate-50'}`}>
                <p className={`text-base md:text-lg font-bold ${t.text}`}>{totalRow[st]}</p>
                <p className={`text-[10px] ${t.textMuted}`}>{st}</p>
              </div>
            ))}
          </div>
          <p className={`text-[10px] ${t.textSubtle} mt-1.5`}>{hariEfektif} hari sekolah terdata · total akumulasi seluruh kelas</p>

          {/* Ranking terbanyak: tab Kelas / Siswa */}
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className={`text-xs font-semibold ${t.text}`}>{rankScope === 'siswa' ? 'Siswa' : 'Kelas'} {rankCat} Terbanyak</span>
              <div className="flex gap-1 ml-auto flex-wrap justify-end">
                <div className={`flex rounded-md overflow-hidden ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                  {['kelas', 'siswa'].map((sc) => (
                    <button key={sc} onClick={() => setRankScope(sc)}
                      className={`px-2.5 py-0.5 text-[10px] font-medium transition-colors ${scopeBtn(rankScope === sc)}`}>
                      {sc === 'kelas' ? 'Kelas' : 'Siswa'}
                    </button>
                  ))}
                </div>
                {RANK_CATS.map((c) => (
                  <button key={c.key} onClick={() => setRankCat(c.key)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${catBtn(rankCat === c.key)}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              {rankedRows.length === 0 ? (
                <p className={`text-[10px] ${t.textMuted}`}>Tidak ada data</p>
              ) : rankedRows.map((r, i) => (
                <div key={r.key || i} className="flex items-center gap-2">
                  <span className={`text-[10px] w-4 text-center ${t.textMuted}`}>{i + 1}</span>
                  <div className="w-24 md:w-28 min-w-0">
                    <p className={`text-xs font-medium truncate ${t.text}`}>{r.label}</p>
                    {r.sub && <p className={`text-[9px] ${t.textMuted} truncate`}>{r.sub}</p>}
                  </div>
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                    <div className={`h-full ${rankStyle.dot} rounded-full`} style={{ width: `${Math.max(4, (r.val / maxRank) * 100)}%` }} />
                  </div>
                  <span className={`text-xs font-bold w-8 text-right ${rankStyle.text}`}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detail per kelas */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3">
            <Select value={kelasId} onValueChange={setKelasId}>
              <SelectTrigger className="w-full sm:w-56 h-9 text-sm"><SelectValue placeholder="Pilih Kelas untuk detail siswa" /></SelectTrigger>
              <SelectContent>
                {(kelasList || []).sort((a, b) => (a.nama_kelas || '').localeCompare(b.nama_kelas || '', 'id')).map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {kelasId && (
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama/NIS..."
                  className={`w-full h-9 text-sm rounded-md border pl-8 pr-3 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200'}`} />
              </div>
            )}
          </div>

          {kelasId && kelasTotals && (
            <>
              <div className="flex flex-wrap gap-2 mb-3 mt-3">
                <Badge className="bg-emerald-100 text-emerald-700">{kelasTotals.Hadir} Hadir</Badge>
                <Badge className="bg-blue-100 text-blue-700">{kelasTotals.Sakit} Sakit</Badge>
                <Badge className="bg-amber-100 text-amber-700">{kelasTotals.Izin} Izin</Badge>
                <Badge className="bg-red-100 text-red-700">{kelasTotals.Alfa} Alfa</Badge>
                <Badge className="bg-slate-100 text-slate-600">{kelasSiswa.length} siswa terdata</Badge>
              </div>
              <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs">NIS</TableHead>
                      <TableHead className="text-xs">Nama</TableHead>
                      <TableHead className="text-xs text-center">Hadir</TableHead>
                      <TableHead className="text-xs text-center">Sakit</TableHead>
                      <TableHead className="text-xs text-center">Izin</TableHead>
                      <TableHead className="text-xs text-center">Alfa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kelasSiswa.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-400 text-sm">Tidak ada data siswa</TableCell></TableRow>
                    ) : kelasSiswa.map((s) => (
                      <TableRow key={s.siswa_id} className="hover:bg-slate-50">
                        <TableCell className="text-xs font-mono text-slate-500">{s.nis || '-'}</TableCell>
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
        </>
      )}
    </div>
  );
}