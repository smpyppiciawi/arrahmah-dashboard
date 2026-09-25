import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Eraser, ClipboardCheck, Users, CheckCircle2, CircleDashed } from 'lucide-react';

/**
 * Tampilan Dapo — alat bantu penyamaan jumlah siswa Dapodik (aplikasi berbeda)
 * dengan data real aplikasi ini. Kolom: NIS, Nama, Kelas, JK, dan ceklisan.
 * Ceklisan HANYA keadaan lokal (tidak disimpan / tidak berpengaruh pada data apa pun),
 * dipakai sebagai penanda saat mengecek satu-per-siswa terhadap Dapodik.
 * Rekap total data & total terceklis mengikuti filter kelas.
 */
export default function SiswaDapoView({ siswaList }) {
  const [filterKelas, setFilterKelas] = useState('all');
  const [checked, setChecked] = useState(() => new Set());

  const kelasOptions = useMemo(
    () => [...new Set(siswaList.map(s => s.nama_kelas).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true })),
    [siswaList]
  );

  const rows = useMemo(() => {
    const filtered = filterKelas === 'all'
      ? siswaList
      : siswaList.filter(s => s.nama_kelas === filterKelas);
    return [...filtered].sort((a, b) =>
      (a.nama_kelas || '').localeCompare(b.nama_kelas || '', 'id', { numeric: true }) ||
      a.nama.localeCompare(b.nama)
    );
  }, [siswaList, filterKelas]);

  const diceklis = rows.filter(s => checked.has(s.id)).length;

  const toggle = (id) => setChecked(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <div>
      <p className="text-xs text-slate-400 mb-3">
        Tampilan Dapo: ceklis siswa satu per satu untuk menyamakan jumlah data dengan Dapodik.
        Ceklisan hanya penanda lokal — tidak tersimpan dan tidak memengaruhi data siswa.
      </p>

      {/* Filter kelas + rekap */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Select value={filterKelas} onValueChange={setFilterKelas}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {kelasOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-blue-50 text-blue-700 border border-blue-100 gap-1 py-1">
            <Users className="w-3 h-3" /> Total Data: {rows.length}
          </Badge>
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 gap-1 py-1">
            <CheckCircle2 className="w-3 h-3" /> Diceklis: {diceklis}
          </Badge>
          <Badge className="bg-amber-50 text-amber-700 border border-amber-100 gap-1 py-1">
            <CircleDashed className="w-3 h-3" /> Belum Diceklis: {rows.length - diceklis}
          </Badge>
        </div>
        {checked.size > 0 && (
          <Button
            variant="ghost" size="sm"
            className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto"
            onClick={() => setChecked(new Set())}
          >
            <Eraser className="w-3.5 h-3.5" /> Hapus Semua Ceklis
          </Button>
        )}
      </div>

      {/* Tabel Dapo: NIS, Nama, Kelas, JK, Ceklis */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-500 uppercase">
                <th className="px-3 py-2 font-semibold w-10">No</th>
                <th className="px-3 py-2 font-semibold w-28">NIS</th>
                <th className="px-3 py-2 font-semibold">Nama Siswa</th>
                <th className="px-3 py-2 font-semibold w-24">Kelas</th>
                <th className="px-3 py-2 font-semibold w-12">JK</th>
                <th className="px-3 py-2 font-semibold w-20 text-center">Ceklis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">Tidak ada siswa sesuai filter.</td></tr>
              )}
              {rows.map((s, i) => {
                const on = checked.has(s.id);
                return (
                  <tr
                    key={s.id}
                    className={`cursor-pointer transition-colors ${on ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}
                    onClick={() => toggle(s.id)}
                  >
                    <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{s.nis || '-'}</td>
                    <td className={`px-3 py-2 ${on ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}`}>{s.nama}</td>
                    <td className="px-3 py-2">
                      <Badge className={
                        s.nama_kelas?.startsWith('7') ? 'bg-blue-100 text-blue-700' :
                        s.nama_kelas?.startsWith('8') ? 'bg-purple-100 text-purple-700' :
                        'bg-emerald-100 text-emerald-700'
                      }>
                        {s.nama_kelas || '-'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={
                        s.jenis_kelamin === 'Perempuan' ? 'text-pink-600 border-pink-200' : 'text-blue-600 border-blue-200'
                      }>
                        {s.jenis_kelamin === 'Perempuan' ? 'P' : 'L'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggle(s.id); }}
                        aria-label={`Ceklis ${s.nama}`}
                        className={`w-5 h-5 rounded-md border inline-flex items-center justify-center transition-colors ${
                          on ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 hover:border-emerald-400'
                        }`}
                      >
                        {on && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
        <ClipboardCheck className="w-3.5 h-3.5" />
        Klik baris atau ceklis untuk menandai siswa yang sudah sesuai data Dapodik.
      </p>
    </div>
  );
}