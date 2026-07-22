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
import { toast } from "@/components/ui/use-toast";
import { Loader2, X, Check, Users } from "lucide-react";

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

const KATEGORI_OPTIONS = ['Yatim', 'Piatu', 'Yatim Piatu', 'Kurang Mampu', 'Prestasi', 'Lainnya'];

export default function BiayaKhususForm({ isOpen, onClose, siswaList, kelasList, tarifIuranList, activeAcademicYear }) {
  const queryClient = useQueryClient();
  const [selectedKategori, setSelectedKategori] = useState('Yatim');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedSiswaIds, setSelectedSiswaIds] = useState([]);
  const [selectedTarifId, setSelectedTarifId] = useState('');
  const [nominalKhusus, setNominalKhusus] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredSiswa = useMemo(() => {
    if (!selectedKelas) return siswaList;
    return siswaList.filter(s => s.kelas_id === selectedKelas);
  }, [siswaList, selectedKelas]);

  const selectedSiswaList = useMemo(() => {
    return siswaList.filter(s => selectedSiswaIds.includes(s.id));
  }, [siswaList, selectedSiswaIds]);

  const toggleSiswa = (siswaId) => {
    setSelectedSiswaIds(prev =>
      prev.includes(siswaId)
        ? prev.filter(id => id !== siswaId)
        : [...prev, siswaId]
    );
  };

  const handleTarifSelect = (tarifId) => {
    setSelectedTarifId(tarifId);
    const tarif = tarifIuranList.find(t => t.id === tarifId);
    if (tarif) {
      setNominalKhusus(String(tarif.nominal));
    }
  };

  const resetForm = () => {
    setSelectedKategori('Yatim');
    setSelectedKelas('');
    setSelectedSiswaIds([]);
    setSelectedTarifId('');
    setNominalKhusus('');
    setKeterangan('');
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
    if (!nominalKhusus || Number(nominalKhusus) <= 0) {
      toast({ title: "Nominal khusus harus diisi", variant: "destructive" });
      return;
    }

    const tarif = tarifIuranList.find(t => t.id === selectedTarifId);

    setSubmitting(true);
    try {
      const records = selectedSiswaIds.map(siswaId => {
        const siswa = siswaList.find(s => s.id === siswaId);
        return {
          siswa_id: siswa.id,
          nama_siswa: siswa.nama,
          nama_kelas: siswa.nama_kelas,
          tarif_iuran_id: tarif?.id || '',
          nama_iuran: tarif?.nama || '',
          nominal_khusus: Number(nominalKhusus),
          kategori: selectedKategori,
          keterangan,
          tahun_ajaran: activeAcademicYear || '',
        };
      });

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
            <Select value={selectedKategori} onValueChange={setSelectedKategori}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Pilih Kelas */}
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

          {/* 3. Pilih Siswa (multi-select) */}
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

          {/* 4. Daftar Siswa Terpilih */}
          {selectedSiswaList.length > 0 && (
            <div>
              <Label>Daftar Siswa Terpilih & Nominal</Label>
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {selectedSiswaList.map(siswa => (
                  <div key={siswa.id} className="flex items-center justify-between p-2.5 border-b last:border-0">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{siswa.nama}</span>
                      <span className="text-xs text-slate-400 ml-2">{siswa.nama_kelas}</span>
                    </div>
                    <span className="text-sm font-semibold text-amber-600 mr-3">
                      {formatRupiah(nominalKhusus)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-500 h-7 w-7 p-0"
                      onClick={() => toggleSiswa(siswa.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between p-2.5 bg-amber-50 font-semibold">
                  <span className="text-sm">Total ({selectedSiswaList.length} siswa):</span>
                  <span className="text-amber-700">{formatRupiah(Number(nominalKhusus || 0) * selectedSiswaList.length)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 5. Pilih Iuran */}
          <div>
            <Label>Pilih Iuran</Label>
            <Select value={selectedTarifId} onValueChange={handleTarifSelect}>
              <SelectTrigger><SelectValue placeholder="Pilih iuran untuk auto-fill nominal" /></SelectTrigger>
              <SelectContent>
                {tarifIuranList.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nama} — {formatRupiah(t.nominal)}
                    {t.tingkat && t.tingkat !== 'Semua' ? ` (Tingkat ${t.tingkat})` : ''} ({t.periode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 6. Nominal Khusus */}
          <div>
            <Label>Nominal Khusus (Rp)</Label>
            <RupiahInput value={nominalKhusus} onChange={setNominalKhusus} placeholder="0" required />
          </div>

          {/* 7. Keterangan */}
          <div>
            <Label>Keterangan</Label>
            <Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Keterangan tambahan" />
          </div>

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
                `Simpan (${selectedSiswaIds.length} Siswa)`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}