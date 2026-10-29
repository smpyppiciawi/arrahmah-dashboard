import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { User, Search, ChevronDown } from 'lucide-react';
import SiswaCard from '@/components/siswa/SiswaCard';
import { daftarKontak } from '@/components/siswa/SiswaKontakRow';
import { formatAlamatLengkap } from '@/lib/dapodikConstants';

const PAGE_SIZE = 24;
const KOLOM_KEY = 'siswa-kolom-per-baris';

// Jumlah kartu per baris — kelas dibuat literal agar tidak terbuang saat build
const GRID_KOLOM = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
  7: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7',
  8: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8',
};

export default function SiswaCardList({ siswaList, kelasList = [], onSelect, onPilihKontak, aktifkanKontak }) {
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [kolom, setKolom] = useState(() => {
    const saved = Number(localStorage.getItem(KOLOM_KEY));
    return GRID_KOLOM[saved] ? saved : 4;
  });

  const ubahKolom = (v) => {
    const n = Number(v);
    setKolom(n);
    localStorage.setItem(KOLOM_KEY, String(n));
  };

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
        {kelasList.length > 1 && (
          <Select value={filterKelas} onValueChange={(v) => { setFilterKelas(v); setLimit(PAGE_SIZE); }}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={String(kolom)} onValueChange={ubahKolom}>
          <SelectTrigger className="w-full sm:w-32" title="Jumlah kartu per baris">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(GRID_KOLOM).map((n) => (
              <SelectItem key={n} value={n}>{n} per baris</SelectItem>
            ))}
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
          <div className={`grid ${GRID_KOLOM[kolom]} ${kolom >= 6 ? 'gap-2' : 'gap-3 md:gap-4'}`}>
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