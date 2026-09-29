import React, { useState, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export default function PersonSearch({ personType, personList, selectedPerson, onPersonSelect }) {
  const [searchText, setSearchText] = useState('');
  const [filterValue, setFilterValue] = useState('all');

  const isPegawai = personType === 'Pegawai';

  const filterOptions = useMemo(() => {
    const key = isPegawai ? 'jabatan' : 'nama_kelas';
    const unique = [...new Set(personList.map(p => p[key]).filter(Boolean))];
    return unique.sort();
  }, [personList, isPegawai]);

  const filteredList = useMemo(() => {
    return personList.filter(p => {
      if (filterValue !== 'all') {
        const key = isPegawai ? 'jabatan' : 'nama_kelas';
        if (p[key] !== filterValue) return false;
      }
      if (searchText.trim()) {
        const text = searchText.toLowerCase();
        const nama = (p.nama || '').toLowerCase();
        const nipNis = ((isPegawai ? p.nuptk : p.nis) || '').toLowerCase();
        return nama.includes(text) || nipNis.includes(text);
      }
      return true;
    }).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [personList, filterValue, searchText, isPegawai]);

  const filterLabel = isPegawai ? 'Jabatan' : 'Kelas';

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={`Cari nama atau ${isPegawai ? 'NUPTK' : 'NIS'}...`}
            className="pl-9 h-9"
          />
        </div>
        {filterOptions.length > 0 && (
          <Select value={filterValue} onValueChange={setFilterValue}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder={`Semua ${filterLabel}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua {filterLabel}</SelectItem>
              {filterOptions.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="border border-slate-200 rounded-xl max-h-[280px] overflow-y-auto bg-white">
        {filteredList.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Tidak ditemukan</p>
        ) : (
          filteredList.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPersonSelect(p.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-left border-b border-slate-100 last:border-0 transition-colors ${
                selectedPerson === p.id ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  selectedPerson === p.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {p.nama?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">{p.nama}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {isPegawai ? (p.nuptk || 'No NUPTK') : (p.nis || 'No NIS')}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full">
                {isPegawai ? (p.jabatan || '-') : (p.nama_kelas || '-')}
              </span>
            </button>
          ))
        )}
      </div>
      <p className="text-[10px] text-slate-400">{filteredList.length} {personType} ditemukan</p>
    </div>
  );
}