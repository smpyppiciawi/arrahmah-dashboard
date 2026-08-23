import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import RupiahInput from '@/components/ui/RupiahInput';
import { BULAN_SPP, tarifMatchesTingkat } from '@/lib/sppUtils';
import { toast } from "@/components/ui/use-toast";
import { Loader2, X, Users, Search, Gift, Coins, Check } from "lucide-react";

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

const KATEGORI_OPTIONS = [
  'Yatim/Yatim Piatu Full',
  'Yatim',
  'Kurang Mampu',
  'Beasiswa Yayasan',
  'Prestasi',
  'Lainnya',
];

export default function BiayaKhususForm({ isOpen, onClose, siswaList, kelasList, tarifIuranList, activeAcademicYear }) {
  const queryClient = useQueryClient();
  const [selectedKategori, setSelectedKategori] = useState('Yatim');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedSiswaIds, setSelectedSiswaIds] = useState([]);
  const [selectedTarifIds, setSelectedTarifIds] = useState([]);
  const [nominalMode, setNominalMode] = useState('khusus'); // 'gratis' | 'khusus'
  const [nominalKhusus, setNominalKhusus] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [gratisBulanSPP, setGratisBulanSPP] = useState([]);

  const sortedSiswaList = useMemo(() => {
    return [...siswaList].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [siswaList]);

  const filteredSiswa = useMemo(() => {
    let list = sortedSiswaList;
    if (selectedKelas) list = list.filter(s => s.kelas_id === selectedKelas);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        (s.nama || '').toLowerCase().includes(q) ||
        (s.nis || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [sortedSiswaList, selectedKelas, searchQuery]);

  const selectedSiswaList = useMemo(() => {
    return sortedSiswaList.filter(s => selectedSiswaIds.includes(s.id));
  }, [sortedSiswaList, selectedSiswaIds]);

  // Filter iuran by selected class tingkat
  const filteredTarifList = useMemo(() => {
    if (!selectedKelas) return tarifIuranList;
    const kelas = kelasList.find(k => k.id === selectedKelas);
    const tingkat = kelas?.tingkat || '';
    if (!tingkat) return tarifIuranList;
    return tarifIuranList.filter(t => tarifMatchesTingkat(t, tingkat));
  }, [tarifIuranList, selectedKelas, kelasList]);

  // Check if any selected tarif is SPP Bulanan (for Prestasi gratis months)
  const hasSppBulananTarif = useMemo(() => {
    return selectedTarifIds.some(id => {
      const tarif = tarifIuranList.find(t => t.id === id);
      return tarif?.nama?.toLowerCase().includes('spp') && tarif?.periode === 'Bulanan';
    });
  }, [selectedTarifIds, tarifIuranList]);

  const showGratisBulanSPP = selectedKategori === 'Prestasi' && hasSppBulananTarif && nominalMode === 'gratis';

  const toggleGratisBulan = (bulan) => {
    setGratisBulanSPP(prev =>
      prev.includes(bulan)
        ? prev.filter(b => b !== bulan)
        : [...prev, bulan]
    );
  };

  const toggleSiswa = (siswaId) => {
    setSelectedSiswaIds(prev =>
      prev.includes(siswaId)
        ? prev.filter(id => id !== siswaId)
        : [...prev, siswaId]
    );
  };

  const toggleTarif = (tarifId) => {
    setSelectedTarifIds(prev =>
      prev.includes(tarifId)
        ? prev.filter(id => id !== tarifId)
        : [...prev, tarifId]
    );
  };

  const handleKategoriChange = (kat) => {
    setSelectedKategori(kat);
    if (kat === 'Yatim/Yatim Piatu Full') {
      setSelectedTarifIds(tarifIuranList.map(t => t.id));
      setNominalMode('gratis');
    }
  };

  const resetForm = () => {
    setSelectedKategori('Yatim');
    setSelectedKelas('');
    setSelectedSiswaIds([]);
    setSelectedTarifIds([]);
    setNominalMode('khusus');
    setNominalKhusus('');
    setKeterangan('');
    setSearchQuery('');
    setGratisBulanSPP([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSiswaIds.length === 0) {
      toast({ title: "Pilih minimal 1 siswa", variant: "destructive" });
      return;
    }
    if (selectedTarifIds.length === 0) {
      toast({ title: "Pilih minimal 1 iuran", variant: "destructive" });
      return;
    }
    if (nominalMode === 'khusus' && (!nominalKhusus || Number(nominalKhusus) <= 0)) {
      toast({ title: "Nominal khusus harus diisi", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const isGratis = nominalMode === 'gratis';
      const nominalValue = isGratis ? 0 : Number(nominalKhusus);

      const records = [];
      for (const siswaId of selectedSiswaIds) {
        const siswa = siswaList.find(s => s.id === siswaId);
        if (!siswa) continue;
        for (const tarifId of selectedTarifIds) {
          const tarif = tarifIuranList.find(t => t.id === tarifId);
          if (!tarif) continue;
          const isSppBulanan = tarif.nama?.toLowerCase().includes('spp') && tarif.periode === 'Bulanan';
          records.push({
            siswa_id: siswa.id,
            nama_siswa: siswa.nama,
            nama_kelas: siswa.nama_kelas,
            tarif_iuran_id: tarif.id,
            nama_iuran: tarif.nama,
            nominal_khusus: nominalValue,
            is_gratis: isGratis,
            kategori: selectedKategori,
            keterangan,
            tahun_ajaran: activeAcademicYear || '',
            gratis_bulan_spp: (isSppBulanan && isGratis && selectedKategori === 'Prestasi') ? gratisBulanSPP : [],
          });
        }
      }

      await base44.entities.BiayaKhusus.bulkCreate(records);
      queryClient.invalidateQueries({ queryKey: ['biaya-khusus'] });
      toast({ title: `${records.length} data biaya khusus disimpan` });
      resetForm();
      onClose();
    } catch (err) {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800">Tambah Biaya Khusus</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Kategori Biaya Khusus */}
          <div>
            <Label>Kategori Biaya Khusus</Label>
            <Select value={selectedKategori} onValueChange={handleKategoriChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedKategori === 'Yatim/Yatim Piatu Full' && (
              <p className="text-xs text-purple-600 mt-1">Semua iuran otomatis dipilih & digratiskan untuk kategori ini.</p>
            )}
          </div>

          {/* 2. Pilih Kelas & Search */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pilih Kelas</Label>
              <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Semua Kelas</SelectItem>
                  {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cari Siswa</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nama atau NIS..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* 3. Pilih Siswa (multi-select, A-Z) */}
          <div>
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Pilih Siswa ({selectedSiswaIds.length} dipilih)
            </Label>
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {filteredSiswa.length === 0 ? (
                <p className="text-sm text-slate-400 p-4 text-center">Tidak ada siswa</p>
              ) : (
                filteredSiswa.map(siswa => (
                  <label
                    key={siswa.id}
                    className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer border-b last:border-0"
                  >
                    <Checkbox
                      checked={selectedSiswaIds.includes(siswa.id)}
                      onCheckedChange={() => toggleSiswa(siswa.id)}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{siswa.nama}</span>
                      <span className="text-xs text-slate-400 ml-2">{siswa.nis} · {siswa.nama_kelas}</span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 4. Pilih Iuran (multi-select checkboxes) */}
          <div>
            <Label>Pilih Iuran ({selectedTarifIds.length} dipilih)</Label>
            <div className="border rounded-lg max-h-40 overflow-y-auto">
              {filteredTarifList.length === 0 ? (
                <p className="text-sm text-slate-400 p-4 text-center">Belum ada tarif iuran{selectedKelas ? ' untuk tingkat kelas ini' : ''}</p>
              ) : (
                filteredTarifList.map(tarif => (
                  <label
                    key={tarif.id}
                    className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer border-b last:border-0"
                  >
                    <Checkbox
                      checked={selectedTarifIds.includes(tarif.id)}
                      onCheckedChange={() => toggleTarif(tarif.id)}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{tarif.nama}</span>
                      <span className="text-xs text-slate-400 ml-2">{formatRupiah(tarif.nominal)}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{tarif.periode}</Badge>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 5. Nominal Mode: GRATIS / NOMINAL KHUSUS */}
          <div>
            <Label>Nominal Khusus</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setNominalMode('gratis')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition ${
                  nominalMode === 'gratis'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <Gift className="w-4 h-4" /> GRATIS
              </button>
              <button
                type="button"
                onClick={() => setNominalMode('khusus')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition ${
                  nominalMode === 'khusus'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <Coins className="w-4 h-4" /> NOMINAL KHUSUS
              </button>
            </div>
            {nominalMode === 'gratis' ? (
              <p className="text-xs text-emerald-600 mt-2">Seluruh iuran yang dipilih akan ditandai LUNAS/GRATIS.</p>
            ) : (
              <div className="mt-2">
                <Label className="text-xs">Nominal per Iuran (Rp)</Label>
                <RupiahInput value={nominalKhusus} onChange={setNominalKhusus} placeholder="0" required />
              </div>
            )}
          </div>

          {/* Prestasi: SPP Gratis Months */}
          {showGratisBulanSPP && (
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200 space-y-3">
              <div>
                <p className="text-sm font-semibold text-teal-700">Pilih Bulan SPP yang Digratiskan</p>
                <p className="text-xs text-teal-600">Bulan yang diceklis akan tercatat LUNAS di akun siswa tanpa riwayat pembayaran</p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {BULAN_SPP.map(bulan => {
                  const isSelected = gratisBulanSPP.includes(bulan);
                  return (
                    <div
                      key={bulan}
                      onClick={() => toggleGratisBulan(bulan)}
                      className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                        isSelected
                          ? 'bg-teal-500 border-teal-600 text-white'
                          : 'bg-white border-slate-200 hover:border-teal-400'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-teal-600 border-teal-600' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={isSelected ? 'text-white font-medium' : 'text-slate-700'}>{bulan}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-teal-600">{gratisBulanSPP.length} bulan SPP digratiskan</p>
            </div>
          )}

          {/* 6. Keterangan */}
          <div>
            <Label>Keterangan</Label>
            <Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Keterangan tambahan" />
          </div>

          {/* Summary */}
          {selectedSiswaList.length > 0 && selectedTarifIds.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
              <span className="text-sm text-slate-600">
                {selectedSiswaIds.length} siswa × {selectedTarifIds.length} iuran = {selectedSiswaIds.length * selectedTarifIds.length} record
              </span>
              <span className="text-sm font-bold text-amber-700">
                {nominalMode === 'gratis' ? 'GRATIS' : formatRupiah(Number(nominalKhusus || 0) * selectedTarifIds.length * selectedSiswaIds.length)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                `Simpan (${selectedSiswaIds.length * selectedTarifIds.length} record)`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}