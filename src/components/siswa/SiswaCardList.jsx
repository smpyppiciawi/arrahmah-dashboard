import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { User, Search, ChevronDown } from 'lucide-react';
import SiswaCard from '@/components/siswa/SiswaCard';
import { daftarKontak } from '@/components/siswa/SiswaKontakRow';
import { formatAlamatLengkap } from '@/lib/dapodikConstants';

const PAGE_SIZE = 24;

export default function SiswaCardList({ siswaList, kelasList = [], onSelect, onPilihKontak, aktifkanKontak }) {
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const filtered = siswaList.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchQ = !q || [
      s.nama, s.nis, s.nisn, s.nama_kelas, s.jenis_kelamin, s.status,
      formatAlamatLengkap(s), s.nama_ibu_kandung, s.nama_ayah_kandung, s.nama_wali,
      ...daftarKontak(s).map((k) => k.no_telp),
    ].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    const matchK = filterKelas === 'all' || s.kelas_id === filterKelas || s.nama_kelas === filterKelas;
    return matchQ && matchK;
  });
  const visible = filtered.slice(0, limit);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Cari nama, NIS, kelas, alamat, atau nomor WA..."
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {visible.map((s) => (
              <SiswaCard
                key={s.id}
                siswa={s}
                onClick={onSelect}
                onPilihKontak={onPilihKontak}
                aktifkanKontak={aktifkanKontak}
              />
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