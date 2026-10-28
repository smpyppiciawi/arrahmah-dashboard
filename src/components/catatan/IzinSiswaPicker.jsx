import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Check, X, UserPlus } from 'lucide-react';

const BATAS_AWAL = 6;
const BATAS_CARI = 12;

/**
 * Pencarian & pemilihan beberapa siswa sekaligus.
 * Daftar siswa hanya muncul beberapa saja (dengan Nama & Kelas) agar cepat dipilih.
 */
export default function IzinSiswaPicker({ siswaList = [], kelasList = [], selected = [], onChange }) {
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

  const kelasMap = useMemo(() => {
    const map = {};
    kelasList.forEach((k) => { map[k.id] = k.nama_kelas; });
    return map;
  }, [kelasList]);

  const namaKelas = (s) => s.nama_kelas || kelasMap[s.kelas_id] || '-';
  const idTerpilih = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  const hasil = useMemo(() => {
    const cari = kata.trim().toLowerCase();
    const dasar = cari
      ? siswaList.filter((s) => `${s.nama || ''} ${s.nis || ''} ${namaKelas(s)}`.toLowerCase().includes(cari))
      : siswaList;
    return dasar.slice(0, cari ? BATAS_CARI : BATAS_AWAL);
  }, [siswaList, kata, kelasMap]);

  const toggle = (s) => {
    if (idTerpilih.has(s.id)) onChange(selected.filter((x) => x.id !== s.id));
    else onChange([...selected, s]);
  };

  const hapus = (id) => onChange(selected.filter((x) => x.id !== id));

  return (
    <div className="space-y-2">
      <div ref={wadahRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={kata}
            onChange={(e) => { setKata(e.target.value); setTerbuka(true); }}
            onFocus={() => setTerbuka(true)}
            placeholder="Cari nama siswa (nama / NIS / kelas)"
            className="pl-9 bg-white"
          />
        </div>

        {terbuka && (
          <div className="mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-sm max-h-56 overflow-y-auto">
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

      {selected.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2">
          <p className="text-[11px] font-semibold text-emerald-700 mb-1">
            Siswa terpilih ({selected.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((s) => (
              <Badge key={s.id} className="bg-white text-emerald-700 border border-emerald-200 gap-1 pr-1 text-[11px] font-medium">
                {s.nama} · {namaKelas(s)}
                <button type="button" onClick={() => hapus(s.id)} className="rounded-full p-0.5 hover:bg-emerald-100">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs">Kelas (otomatis)</Label>
        <Input
          readOnly
          value={[...new Set(selected.map((s) => namaKelas(s)).filter((v) => v && v !== '-'))].join(', ')}
          placeholder="Terisi otomatis dari siswa terpilih"
          className="bg-slate-50 text-slate-600"
        />
      </div>
    </div>
  );
}