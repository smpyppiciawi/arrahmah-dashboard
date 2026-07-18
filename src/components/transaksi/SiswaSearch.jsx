import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { ChevronsUpDown, Check, GraduationCap } from "lucide-react";

export default function SiswaSearch({ siswaList, selectedSiswa, onSelect }) {
  const [open, setOpen] = useState(false);

  const sortedSiswa = [...siswaList].sort((a, b) =>
    (a.nama || '').localeCompare(b.nama || '')
  );

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal h-11"
          >
            {selectedSiswa ? (
              <span className="flex items-center gap-2 truncate">
                <GraduationCap className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="truncate">
                  <span className="font-medium">{selectedSiswa.nama}</span>
                  <span className="text-slate-400 text-xs ml-1">· {selectedSiswa.nis} · {selectedSiswa.nama_kelas}</span>
                </span>
              </span>
            ) : (
              "Cari siswa (Nama / NIS / Kelas)..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Ketik nama, NIS, atau kelas..." />
            <CommandList>
              <CommandEmpty>Siswa tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                {sortedSiswa.map(siswa => (
                  <CommandItem
                    key={siswa.id}
                    value={`${siswa.nama} ${siswa.nis} ${siswa.nama_kelas}`}
                    onSelect={() => {
                      onSelect(siswa);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${selectedSiswa?.id === siswa.id ? "opacity-100" : "opacity-0"}`}
                    />
                    <div className="flex flex-col">
                      <span>{siswa.nama}</span>
                      <span className="text-xs text-slate-400">
                        {siswa.nis} · {siswa.nama_kelas}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}