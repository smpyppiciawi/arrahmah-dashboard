import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TrendingDown, Minus, Scale, CalendarClock, Plus, Settings, Search } from "lucide-react";
import { getMingguKey } from '@/lib/dapodikConstants';

export default function ImprovementSummaryCard({ pelanggaranImprovementList, improvementList, siswaList, onTambahImprovement, onAturLimit, isAdmin }) {
  const [openSiswaSearch, setOpenSiswaSearch] = useState(false);
  const [searchSiswa, setSearchSiswa] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState(null);

  const { data: pengaturan } = useQuery({
    queryKey: ['pengaturan-improvement'],
    queryFn: async () => { const l = await base44.entities.PengaturanImprovement.list(); return l[0] || null; }
  });

  const mingguKeyNow = getMingguKey(new Date());

  const filteredSiswa = useMemo(() => {
    const aktif = (siswaList || []).filter(s => s.status === 'Aktif');
    if (!searchSiswa) return aktif.sort((a, b) => a.nama.localeCompare(b.nama));
    const s = searchSiswa.toLowerCase();
    return aktif.filter(s => s.nama?.toLowerCase().includes(s) || s.nis?.toLowerCase().includes(s) || s.nama_kelas?.toLowerCase().includes(s)).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaList, searchSiswa]);

  const handleSelectSiswa = (siswa) => {
    setSelectedSiswa(siswa);
    setOpenSiswaSearch(false); setSearchSiswa('');
  };

  const stats = useMemo(() => {
    if (!selectedSiswa) return null;
    const poinPelanggaran = pelanggaranImprovementList.filter(p => p.siswa_id === selectedSiswa.id).reduce((s, p) => s + (Number(p.poin) || 0), 0);
    const poinImprovement = improvementList.filter(i => i.siswa_id === selectedSiswa.id && i.status === 'Aktif').reduce((s, i) => s + (Number(i.poin_pengurangan) || 0), 0);
    const usedMingguan = improvementList.filter(i => i.siswa_id === selectedSiswa.id && i.status === 'Aktif' && i.minggu_key === mingguKeyNow).reduce((s, i) => s + (Number(i.poin_pengurangan) || 0), 0);
    const limitMingguan = pengaturan?.limit_universal_aktif
      ? (pengaturan.limit_mingguan_universal || 30)
      : (improvementList.find(i => i.siswa_id === selectedSiswa.id && i.minggu_key === mingguKeyNow)?.limit_mingguan || 30);
    return { poinPelanggaran, poinImprovement, poinBersih: poinPelanggaran - poinImprovement, usedMingguan, limitMingguan };
  }, [selectedSiswa, pelanggaranImprovementList, improvementList, mingguKeyNow, pengaturan]);

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-emerald-800">Ringkasan Akumulatif Poin Siswa</h3>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onAturLimit} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <Settings className="w-4 h-4 mr-1" /> Atur Limit
            </Button>
          </div>
        </div>

        {/* Cari Nama Siswa/Kelas */}
        <div className="mb-4">
          <Popover open={openSiswaSearch} onOpenChange={setOpenSiswaSearch}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                <Search className="w-4 h-4 mr-2 text-slate-400" />
                {selectedSiswa ? `${selectedSiswa.nama} — ${selectedSiswa.nama_kelas}` : "Cari nama siswa / kelas..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cari nama / NIS / kelas..." value={searchSiswa} onValueChange={setSearchSiswa} />
                <CommandList className="max-h-72">
                  <CommandEmpty>Tidak ditemukan</CommandEmpty>
                  <CommandGroup heading={`Siswa Aktif (${filteredSiswa.length})`}>
                    {filteredSiswa.map(s => (
                      <CommandItem key={s.id} value={`${s.nama} ${s.nis} ${s.nama_kelas}`} onSelect={() => handleSelectSiswa(s)} className="cursor-pointer">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{s.nama}</span>
                          <Badge variant="outline" className="text-xs">{s.nama_kelas}</Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {stats ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatTile icon={Minus} label="Poin Pelanggaran" value={stats.poinPelanggaran} color="text-red-600 bg-red-50" />
              <StatTile icon={TrendingDown} label="Total Pengurangan" value={stats.poinImprovement} color="text-emerald-600 bg-emerald-50" />
              <StatTile icon={Scale} label="Poin Bersih" value={stats.poinBersih} color={stats.poinBersih > 0 ? "text-amber-600 bg-amber-50" : "text-slate-600 bg-slate-100"} />
              <StatTile icon={CalendarClock} label="Sisa Limit Minggu Ini" value={`${stats.limitMingguan - stats.usedMingguan}/${stats.limitMingguan}`} color="text-blue-600 bg-blue-50" />
              <button
                onClick={() => onTambahImprovement(selectedSiswa)}
                className="rounded-xl p-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex flex-col items-center justify-center gap-1 group"
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs font-medium">Tambah Improvement</span>
              </button>
            </div>
            {pengaturan && (
              <p className="text-xs text-slate-500 mt-3">
                {pengaturan.limit_universal_aktif
                  ? `Limit mingguan universal: ${pengaturan.limit_mingguan_universal} poin/minggu`
                  : 'Limit mingguan manual per record'}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400 italic">Cari dan pilih siswa untuk melihat ringkasan akumulatif poin.</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({ icon: Icon, label, value, color }) {
  return (
    <div className={`rounded-xl p-3 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}