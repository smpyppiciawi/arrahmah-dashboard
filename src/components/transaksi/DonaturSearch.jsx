import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/**
 * Combobox pencarian Nama Donatur.
 * Menampilkan donatur dari entity Donatur + nama donatur unik dari Keuangan records.
 * Menerima nama bebas (donatur baru) — akan otomatis disimpan ke entity Donatur saat submit transaksi.
 */
export default function DonaturSearch({ donaturList = [], keuanganList = [], value, onChange, placeholder }) {
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

  // Merge donatur entity + unique nama_donatur from keuangan records
  const allNames = useMemo(() => {
    const fromEntity = donaturList.map(d => d.nama).filter(Boolean);
    const fromKeuangan = keuanganList.filter(k => k.nama_donatur).map(k => k.nama_donatur).filter(Boolean);
    return [...new Set([...fromEntity, ...fromKeuangan])].sort((a, b) => a.localeCompare(b));
  }, [donaturList, keuanganList]);

  const suggestions = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = q
      ? allNames.filter(n => n.toLowerCase().includes(q))
      : allNames;
    return list.slice(0, 20);
  }, [query, allNames]);

  const handleSelect = (nama) => {
    setQuery(nama);
    onChange(nama);
    setOpen(false);
  };

  const isNew = query && query.trim() && !allNames.some(n => n.toLowerCase() === query.toLowerCase().trim());

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || 'Cari nama donatur / ketik nama baru'}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {suggestions.map(n => {
            const isSaved = donaturList.some(d => d.nama === n);
            return (
              <button
                type="button"
                key={n}
                onClick={() => handleSelect(n)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex items-center justify-between gap-2"
              >
                <span className="font-medium text-slate-700 truncate">{n}</span>
                {isSaved && <Badge variant="outline" className="text-xs text-emerald-600 shrink-0">Tersimpan</Badge>}
              </button>
            );
          })}
        </div>
      )}
      {isNew && (
        <p className="text-xs text-blue-500 mt-1">Donatur baru — akan otomatis tersimpan ke Data Donatur</p>
      )}
    </div>
  );
}