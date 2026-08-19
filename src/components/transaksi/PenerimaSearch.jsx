import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

/**
 * Combobox pencarian nama Penerima untuk Transaksi Umum.
 * Menampilkan seluruh Pegawai sebagai saranan, namun menerima nama bebas
 * (tidak harus terdata di Pegawai) sehingga tetap dapat disimpan.
 */
export default function PenerimaSearch({ guruList = [], value, onChange, placeholder }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = q
      ? guruList.filter(g => g.nama?.toLowerCase().includes(q))
      : guruList;
    return list.slice(0, 10);
  }, [query, guruList]);

  const handleSelect = (nama) => {
    setQuery(nama);
    onChange(nama);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || 'Cari nama pegawai / ketik nama manual'}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {suggestions.map(g => (
            <button
              type="button"
              key={g.id}
              onClick={() => handleSelect(g.nama)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex items-center justify-between gap-2"
            >
              <span className="font-medium text-slate-700 truncate">{g.nama}</span>
              <span className="text-xs text-slate-400 shrink-0">{g.jabatan}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}