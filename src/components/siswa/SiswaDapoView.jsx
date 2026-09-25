import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Eraser, ClipboardCheck, Users, CheckCircle2, CircleDashed } from 'lucide-react';

/**
 * Tampilan Dapo — alat bantu penyamaan jumlah siswa Dapodik (aplikasi berbeda)
 * dengan data real aplikasi ini. Kolom: NIS, Nama, Kelas, JK, dan ceklisan.
 * Ceklisan TERSIMPAN PERMANEN (entity CeklisDapo) sehingga tetap ada saat halaman
 * ditutup/dibuka kembali — tetap tidak memengaruhi data siswa lainnya.
 * Rekap total data & total terceklis mengikuti filter kelas.
 */
export default function SiswaDapoView({ siswaList }) {
  const [filterKelas, setFilterKelas] = useState('all');
  const queryClient = useQueryClient();

  const { data: ceklisList = [], isLoading: isLoadingCeklis } = useQuery({
    queryKey: ['ceklis-dapo'],
    queryFn: () => base44.entities.CeklisDapo.list(),
    staleTime: 30000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (s) => {
      const rec = ceklisList.find(c => c.siswa_id === s.id);
      if (rec) return base44.entities.CeklisDapo.update(rec.id, { diceklis: !rec.diceklis });
      return base44.entities.CeklisDapo.create({
        siswa_id: s.id,
        nis: s.nis || '',
        nama: s.nama || '',
        nama_kelas: s.nama_kelas || '',
        jenis_kelamin: s.jenis_kelamin || '',
        diceklis: true,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ceklis-dapo'] }),
  });

  const resetMutation = useMutation({
    mutationFn: () => base44.entities.CeklisDapo.updateMany({ diceklis: true }, { $set: { diceklis: false } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ceklis-dapo'] }),
  });

  const checked = useMemo(
    () => new Set(ceklisList.filter(c => c.diceklis).map(c => c.siswa_id)),
    [ceklisList]
  );

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
  const adaCeklis = ceklisList.some(c => c.diceklis);

  const toggle = (s) => toggleMutation.mutate(s);

  return (
    <div>
      <p className="text-xs text-slate-400 mb-3">
        Tampilan Dapo: ceklis siswa satu per satu untuk menyamakan jumlah data dengan Dapodik.
        Ceklisan tersimpan permanen (tetap ada saat halaman dibuka kembali) dan tidak memengaruhi data siswa lainnya.
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
        {adaCeklis && (
          <Button
            variant="ghost" size="sm"
            className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
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
                    onClick={() => toggle(s)}
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
                        onClick={(e) => { e.stopPropagation(); toggle(s); }}
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
        Klik baris atau ceklis untuk menandai siswa yang sudah sesuai data Dapodik. {isLoadingCeklis ? 'Memuat ceklis tersimpan...' : 'Ceklis tersimpan otomatis.'}
      </p>
    </div>
  );
}