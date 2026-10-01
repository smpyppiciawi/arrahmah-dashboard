import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TrendingDown, Minus, Scale, CalendarClock, Plus, Settings, Search, Ban, AlertTriangle } from "lucide-react";
import { getMingguKey } from '@/lib/dapodikConstants';
import { recomputeRaporStatus, anulirRaporStatus, getRaporStatus, RAPOR_CARD_CLASS, RAPOR_BADGE_CLASS } from '@/lib/raporStatus';

export default function ImprovementSummaryCard({ pelanggaranImprovementList, improvementList, siswaList, onTambahImprovement, onTambahPelanggaran, onAturLimit, canAnulir, readOnly = false }) {
  const [openSiswaSearch, setOpenSiswaSearch] = useState(false);
  const [searchSiswa, setSearchSiswa] = useState('');
  const [selectedSiswaId, setSelectedSiswaId] = useState(null);
  const selectedSiswa = useMemo(() => (siswaList || []).find(s => s.id === selectedSiswaId) || null, [siswaList, selectedSiswaId]);
  const queryClient = useQueryClient();

  const { data: pengaturan } = useQuery({
    queryKey: ['pengaturan-improvement'],
    queryFn: async () => { const l = await base44.entities.PengaturanImprovement.list(); return l[0] || null; }
  });

  // Pelanggaran Lama (modul lama) — diakumulasi saat akumulasi_poin_lama_aktif = true
  const akumulasiLama = pengaturan?.akumulasi_poin_lama_aktif;
  const { data: pelanggaranLamaList = [] } = useQuery({
    queryKey: ['pelanggaran'],
    queryFn: () => base44.entities.Pelanggaran.list('-tanggal'),
    enabled: !!akumulasiLama,
  });

  const mingguKeyNow = getMingguKey(new Date());

  const filteredSiswa = useMemo(() => {
    const aktif = (siswaList || []).filter(s => s.status === 'Aktif');
    if (!searchSiswa) return aktif.sort((a, b) => a.nama.localeCompare(b.nama));
    const q = searchSiswa.toLowerCase();
    return aktif.filter(s => s.nama?.toLowerCase().includes(q) || s.nis?.toLowerCase().includes(q) || s.nama_kelas?.toLowerCase().includes(q)).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaList, searchSiswa]);

  const handleSelectSiswa = (siswa) => {
    setSelectedSiswaId(siswa.id);
    setOpenSiswaSearch(false); setSearchSiswa('');
  };

  const handleAnulir = async () => {
    if (!selectedSiswa) return;
    if (!confirm(`Anulir Status Rapor (${raporStatus?.label || 'aktif'}) atas perintah Kepala Sekolah? Status akan kembali normal dan tidak aktif otomatis lagi.`)) return;
    try {
      await anulirRaporStatus(selectedSiswa.id);
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
    } catch (e) { console.error(e); }
  };

  const stats = useMemo(() => {
    if (!selectedSiswa) return null;
    const poinPelanggaranBaru = pelanggaranImprovementList.filter(p => p.siswa_id === selectedSiswa.id && p.status !== 'Dibatalkan' && p.status !== 'Pending').reduce((s, p) => s + (Number(p.poin) || 0), 0);
    const poinPelanggaranLama = akumulasiLama
      ? pelanggaranLamaList.filter(p => p.siswa_id === selectedSiswa.id).reduce((s, p) => s + (Number(p.poin) || 0), 0)
      : 0;
    const poinPelanggaran = poinPelanggaranBaru + poinPelanggaranLama;
    const poinImprovement = improvementList.filter(i => i.siswa_id === selectedSiswa.id && i.status === 'Aktif').reduce((s, i) => s + (Number(i.poin_pengurangan) || 0), 0);
    const usedMingguan = improvementList.filter(i => i.siswa_id === selectedSiswa.id && i.status === 'Aktif' && i.minggu_key === mingguKeyNow).reduce((s, i) => s + (Number(i.poin_pengurangan) || 0), 0);
    const limitMingguan = pengaturan?.limit_universal_aktif
      ? (pengaturan.limit_mingguan_universal || 30)
      : (improvementList.find(i => i.siswa_id === selectedSiswa.id && i.minggu_key === mingguKeyNow)?.limit_mingguan || 30);
    return { poinPelanggaran, poinPelanggaranBaru, poinPelanggaranLama, poinImprovement, poinBersih: poinPelanggaran - poinImprovement, usedMingguan, limitMingguan };
  }, [selectedSiswa, pelanggaranImprovementList, improvementList, mingguKeyNow, pengaturan, akumulasiLama, pelanggaranLamaList]);

  const raporStatus = useMemo(() => selectedSiswa ? getRaporStatus(selectedSiswa, stats?.poinBersih ?? 0) : null, [selectedSiswa, stats]);

  // Recompute & persist status rapor (Kuning/Merah/Hitam) ke record Siswa saat poin bersih berubah
  useEffect(() => {
    if (!selectedSiswa || stats == null) return;
    let active = true;
    recomputeRaporStatus(selectedSiswa, stats.poinBersih)
      .then((res) => { if (active && res?.written) queryClient.invalidateQueries({ queryKey: ['siswa'] }); })
      .catch(() => {});
    return () => { active = false; };
  }, [selectedSiswa, stats]);

  return (
    <Card className={`border shadow-sm bg-gradient-to-br ${RAPOR_CARD_CLASS[raporStatus?.level || 'normal']}`}>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Scale className={`w-5 h-5 ${raporStatus?.level === 'hitam' ? 'text-white' : 'text-emerald-600'}`} />
            <h3 className={`font-semibold ${raporStatus?.level === 'hitam' ? 'text-white' : 'text-emerald-800'}`}>Ringkasan Akumulatif Poin Siswa</h3>
            {raporStatus && raporStatus.level !== 'normal' && (
              <Badge className={RAPOR_BADGE_CLASS[raporStatus.level]}>
                {raporStatus.label}{raporStatus.sisaHari != null ? ` · sisa ${raporStatus.sisaHari} hari` : ''}
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {raporStatus && raporStatus.level !== 'normal' && canAnulir && (
              <Button size="sm" variant="outline" onClick={handleAnulir} className={raporStatus.level === 'hitam' ? "border-white/40 text-white bg-white/10 hover:bg-white/20" : "border-red-300 text-red-700 bg-white hover:bg-red-50"}>
                <Ban className="w-4 h-4 mr-1" /> Anulir Status Rapor
              </Button>
            )}
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={onAturLimit} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                <Settings className="w-4 h-4 mr-1" /> Atur Limit
              </Button>
            )}
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
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <StatTile icon={Minus} label="Poin Pelanggaran" value={stats.poinPelanggaran} color="text-red-600 bg-red-50" />
              <StatTile icon={TrendingDown} label="Total Pengurangan" value={stats.poinImprovement} color="text-emerald-600 bg-emerald-50" />
              <StatTile icon={Scale} label="Poin Bersih" value={stats.poinBersih} color={stats.poinBersih > 0 ? "text-amber-600 bg-amber-50" : "text-slate-600 bg-slate-100"} />
              <StatTile icon={CalendarClock} label="Sisa Limit Minggu Ini" value={`${stats.limitMingguan - stats.usedMingguan}/${stats.limitMingguan}`} color="text-blue-600 bg-blue-50" />
              {!readOnly && (
                <button
                  onClick={() => onTambahPelanggaran(selectedSiswa)}
                  className="rounded-xl p-3 bg-red-600 text-white hover:bg-red-700 transition-all flex flex-col items-center justify-center gap-1 group"
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-xs font-medium">Tambah Pelanggaran</span>
                </button>
              )}
              {!readOnly && (
                <button
                  onClick={() => onTambahImprovement(selectedSiswa)}
                  className="rounded-xl p-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex flex-col items-center justify-center gap-1 group"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-xs font-medium">Tambah Improvement</span>
                </button>
              )}
            </div>
            {pengaturan && (
              <p className="text-xs text-slate-500 mt-3">
                {pengaturan.limit_universal_aktif
                  ? `Limit mingguan universal: ${pengaturan.limit_mingguan_universal} poin/minggu`
                  : 'Limit mingguan manual per record'}
              </p>
            )}
            {akumulasiLama && stats?.poinPelanggaranLama > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Termasuk akumulasi Poin Pelanggaran Lama: +{stats.poinPelanggaranLama} poin
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