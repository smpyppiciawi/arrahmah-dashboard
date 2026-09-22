import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Search, ChevronDown } from 'lucide-react';
import { getFotoAktif } from '@/lib/fotoSiswa';

const PAGE_SIZE = 24;

export default function SiswaFotoGrid({ siswaList, kelasList, onSelect }) {
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const filtered = siswaList.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchQ = !q || s.nama?.toLowerCase().includes(q) || String(s.nis || '').includes(q);
    const matchK = filterKelas === 'all' || s.kelas_id === filterKelas;
    return matchQ && matchK;
  });
  const visible = filtered.slice(0, limit);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nama atau NIS..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setLimit(PAGE_SIZE); }}
            className="pl-9"
          />
        </div>
        <Select value={filterKelas} onValueChange={(v) => { setFilterKelas(v); setLimit(PAGE_SIZE); }}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-400 self-center whitespace-nowrap">{filtered.length} siswa</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <User className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Tidak ada siswa yang cocok</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {visible.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s)}
                className="group text-left rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md overflow-hidden transition-all"
              >
                <div className="aspect-[3/4] bg-slate-100 overflow-hidden">
                  {getFotoAktif(s) ? (
                    <img
                      src={getFotoAktif(s)}
                      alt={s.nama}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <User className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-xs font-semibold text-slate-800 truncate">{s.nama}</p>
                  <p className="text-[10px] text-slate-400 truncate">{s.nis || 'Tanpa NIS'}</p>
                  <div className="flex items-center justify-between gap-1">
                    <Badge className={
                      s.nama_kelas?.startsWith('7') ? 'bg-blue-100 text-blue-700' :
                      s.nama_kelas?.startsWith('8') ? 'bg-purple-100 text-purple-700' :
                      'bg-emerald-100 text-emerald-700'
                    }>
                      {s.nama_kelas || '-'}
                    </Badge>
                    {s.status === 'Lulus' && <Badge className="bg-slate-100 text-slate-600">Lulus</Badge>}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {filtered.length > limit && (
            <div className="text-center">
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                <ChevronDown className="w-4 h-4 mr-2" /> Muat lebih banyak ({filtered.length - limit} siswa)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}