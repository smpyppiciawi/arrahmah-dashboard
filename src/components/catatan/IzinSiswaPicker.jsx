import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Check, X, UserPlus, Users } from 'lucide-react';

const BATAS_AWAL = 6;
const BATAS_CARI = 12;

/**
 * Pencarian nama siswa + ruang daftar siswa terpilih.
 * Filter Kelas hanya membantu menyempitkan hasil pencarian — tidak mengubah data apa pun.
 */
export default function IzinSiswaPicker({ siswaList = [], selected = [], onChange, kelasFilterId = '' }) {
  const [kata, setKata] = useState('');
  const [terbuka, setTerbuka] = useState(false);
  const wadahRef = useRef(null);

  useEffect(() => {
    const tutup = (e) => {
      if (wadahRef.current && !wadahRef.current.contains(e.target)) setTerbuka(false);
    };
    document.addEventListener('mousedown', tutup);
    return () => document.removeEventListener('mousedown', tutup);
  }, []);

  const namaKelas = (s) => s.nama_kelas || '-';
  const idTerpilih = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  const hasil = useMemo(() => {
    const dasar = kelasFilterId ? siswaList.filter((s) => s.kelas_id === kelasFilterId) : siswaList;
    const cari = kata.trim().toLowerCase();
    const cocok = cari
      ? dasar.filter((s) => `${s.nama || ''} ${s.nis || ''} ${namaKelas(s)}`.toLowerCase().includes(cari))
      : dasar;
    return cocok.slice(0, cari ? BATAS_CARI : BATAS_AWAL);
  }, [siswaList, kata, kelasFilterId]);

  const toggle = (s) => {
    if (idTerpilih.has(s.id)) onChange(selected.filter((x) => x.id !== s.id));
    else onChange([...selected, s]);
  };

  const hapus = (id) => onChange(selected.filter((x) => x.id !== id));

  return (
    <div className="space-y-2">
      {/* Pencarian nama siswa */}
      <div ref={wadahRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={kata}
            onChange={(e) => { setKata(e.target.value); setTerbuka(true); }}
            onFocus={() => setTerbuka(true)}
            placeholder="Cari nama siswa..."
            className="pl-9 bg-white"
          />
        </div>

        {terbuka && (
          <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto">
            {hasil.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">Siswa tidak ditemukan</p>
            ) : (
              hasil.map((s) => {
                const dipilih = idTerpilih.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggle(s)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-slate-100 last:border-0 transition ${
                      dipilih ? 'bg-emerald-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      dipilih ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {dipilih ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 truncate">{s.nama}</p>
                      <p className="text-[11px] text-slate-400">Kelas {namaKelas(s)}{s.nis ? ` · NIS ${s.nis}` : ''}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Ruang daftar siswa terpilih */}
      <div className="rounded-xl border border-dashed border-amber-300 bg-white/70 min-h-[190px] max-h-[250px] overflow-y-auto">
        {selected.length === 0 ? (
          <div className="h-[188px] flex flex-col items-center justify-center gap-1 text-amber-400/80">
            <Users className="w-7 h-7" />
            <p className="text-xs font-medium">Belum ada siswa dipilih</p>
            <p className="text-[11px] text-amber-400/70">Siswa hasil pencarian akan tampil di sini</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {selected.map((s) => (
              <li key={s.id} className="flex items-center gap-2 px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 truncate">{s.nama}</p>
                  <p className="text-[11px] text-slate-400">Kelas {namaKelas(s)}{s.nis ? ` · NIS ${s.nis}` : ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => hapus(s.id)}
                  className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50"
                  title="Hapus dari daftar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}