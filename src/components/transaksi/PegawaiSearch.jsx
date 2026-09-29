import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { ChevronsUpDown, Check, UserCheck, AlertCircle, Wallet, Award } from "lucide-react";

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function PegawaiSearch({ guruList, selectedGuru, onSelect, kasbonInfo }) {
  const [open, setOpen] = useState(false);
  const sortedGuru = [...guruList].sort((a, b) =>
    (a.nama || '').localeCompare(b.nama || '')
  );

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal h-11"
          >
            {selectedGuru ? (
              <span className="flex items-center gap-2 truncate">
                <UserCheck className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span className="truncate">
                  <span className="font-medium">{selectedGuru.nama}</span>
                  <span className="text-slate-400 text-xs ml-1">· {selectedGuru.jabatan || '-'}</span>
                </span>
              </span>
            ) : (
              "Cari pegawai..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Ketik nama pegawai..." />
            <CommandList>
              <CommandEmpty>Pegawai tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                {sortedGuru.map(guru => (
                  <CommandItem
                    key={guru.id}
                    value={`${guru.nama} ${guru.nuptk || ''} ${guru.jabatan || ''}`}
                    onSelect={() => {
                      onSelect(guru);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${selectedGuru?.id === guru.id ? "opacity-100" : "opacity-0"}`}
                    />
                    <div className="flex flex-col">
                      <span>{guru.nama}</span>
                      <span className="text-xs text-slate-400">
                        {guru.nuptk || '-'} · {guru.jabatan || '-'}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedGuru && (
        <div className="space-y-2">
          {/* Golongan & Gaji Info */}
          <div className="p-4 rounded-lg flex items-center justify-between border bg-violet-50 border-violet-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-500">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Golongan Honorarium</p>
                <p className="font-bold text-lg text-violet-700">
                  {selectedGuru.nama_golongan || 'Belum diatur'}
                </p>
              </div>
            </div>
            {selectedGuru.nominal_gaji ? (
              <Badge variant="outline" className="text-violet-600 border-violet-300 bg-violet-100/50">
                Gaji: {formatRupiah(selectedGuru.nominal_gaji)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-400 border-slate-300 bg-slate-100/50">
                Atur di Honorarium
              </Badge>
            )}
          </div>

          {/* Kasbon Info */}
          <div
            className={`p-4 rounded-lg flex items-center justify-between border ${
              kasbonInfo.total > 0
                ? 'bg-amber-50 border-amber-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                kasbonInfo.total > 0 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}>
                {kasbonInfo.total > 0 ? (
                  <AlertCircle className="w-5 h-5 text-white" />
                ) : (
                  <Wallet className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Kasbon Saat Ini</p>
                <p className={`font-bold text-lg ${kasbonInfo.total > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {formatRupiah(kasbonInfo.total)}
                </p>
              </div>
            </div>
            {kasbonInfo.count > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-100/50">
                {kasbonInfo.count}x kasbon
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}