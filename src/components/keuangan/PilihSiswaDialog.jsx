import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RupiahInput from '@/components/ui/RupiahInput';
import { Users, Check, Loader2, Lock, Search } from 'lucide-react';

export default function PilihSiswaDialog({ isOpen, onClose, tarif, siswaList, kelasList, activeAcademicYear }) {
  const queryClient = useQueryClient();
  const [selectedKelas, setSelectedKelas] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [sudahBayar, setSudahBayar] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: existingBiayaKhusus = [], isLoading } = useQuery({
    queryKey: ['biaya-khusus-tarif', tarif?.id],
    queryFn: () => base44.entities.BiayaKhusus.filter({ tarif_iuran_id: tarif.id }),
    enabled: !!tarif?.id && isOpen,
  });

  useEffect(() => {
    if (isOpen && existingBiayaKhusus.length >= 0) {
      setCheckedIds(new Set(existingBiayaKhusus.map(b => b.siswa_id)));
      const sbMap = {};
      existingBiayaKhusus.forEach(b => { sbMap[b.siswa_id] = String(b.sudah_bayar || 0); });
      setSudahBayar(sbMap);
      setSelectedKelas('all');
      setSearchQuery('');
    }
  }, [isOpen, existingBiayaKhusus]);

  const filteredSiswa = useMemo(() => {
    let result = siswaList;
    if (selectedKelas !== 'all') {
      const kelas = kelasList.find(k => k.id === selectedKelas);
      result = result.filter(s => s.kelas_id === selectedKelas || (kelas && s.nama_kelas === kelas.nama_kelas));
    }
    const q = (searchQuery || '').toLowerCase().trim();
    if (q) {
      result = result.filter(s =>
        (s.nama || '').toLowerCase().includes(q) ||
        (s.nis || '').toLowerCase().includes(q) ||
        (s.nama_kelas || '').toLowerCase().includes(q)
      );
    }
    // Urut abjad berdasarkan nama
    return [...result].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [siswaList, selectedKelas, kelasList, searchQuery]);

  const toggleSiswa = (siswaId) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(siswaId)) next.delete(siswaId);
      else {
        next.add(siswaId);
        if (sudahBayar[siswaId] === undefined) setSudahBayar(s => ({ ...s, [siswaId]: '' }));
      }
      return next;
    });
  };

  const toggleAll = () => {
    const allFilteredIds = filteredSiswa.map(s => s.id);
    const allChecked = allFilteredIds.every(id => checkedIds.has(id));
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (allChecked) {
        allFilteredIds.forEach(id => next.delete(id));
      } else {
        allFilteredIds.forEach(id => {
          next.add(id);
          if (sudahBayar[id] === undefined) setSudahBayar(s => ({ ...s, [id]: '' }));
        });
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existingIds = new Set(existingBiayaKhusus.map(b => b.siswa_id));
      const toAdd = [...checkedIds].filter(id => !existingIds.has(id));
      const toRemove = existingBiayaKhusus.filter(b => !checkedIds.has(b.siswa_id));
      const existingKept = existingBiayaKhusus.filter(b => checkedIds.has(b.siswa_id));

      const addRecords = toAdd.map(siswaId => {
        const siswa = siswaList.find(s => s.id === siswaId);
        return {
          siswa_id: siswa.id,
          nama_siswa: siswa.nama,
          nama_kelas: siswa.nama_kelas,
          tarif_iuran_id: tarif.id,
          nama_iuran: tarif.nama,
          nominal_khusus: tarif.nominal,
          sudah_bayar: Number(sudahBayar[siswaId] || 0),
          kategori: 'Lainnya',
          tahun_ajaran: activeAcademicYear || '',
        };
      });

      if (addRecords.length > 0) {
        await base44.entities.BiayaKhusus.bulkCreate(addRecords);
      }
      for (const biaya of existingKept) {
        const newSb = Number(sudahBayar[biaya.siswa_id] ?? biaya.sudah_bayar ?? 0);
        if (newSb !== (biaya.sudah_bayar || 0)) {
          await base44.entities.BiayaKhusus.update(biaya.id, { sudah_bayar: newSb });
        }
      }
      for (const biaya of toRemove) {
        await base44.entities.BiayaKhusus.delete(biaya.id);
      }

      queryClient.invalidateQueries({ queryKey: ['biaya-khusus'] });
      queryClient.invalidateQueries({ queryKey: ['biaya-khusus-siswa'] });
      queryClient.invalidateQueries({ queryKey: ['biaya-khusus-tarif'] });
      onClose();
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const allFilteredChecked = filteredSiswa.length > 0 && filteredSiswa.every(s => checkedIds.has(s.id));

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Pilih Siswa — {tarif?.nama}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Filter Kelas:</Label>
              <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {kelasList.map(k => (
                    <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama / NIS / kelas..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{checkedIds.size} siswa dipilih</span>
            <button onClick={toggleAll} className="text-purple-600 font-medium hover:underline">
              {allFilteredChecked ? 'Hapus Semua' : 'Pilih Semua'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Lock className="w-3 h-3" />
            <span>Isian terkunci hingga siswa diceklis. Isi "Sudah Bayar" hanya untuk pembayaran di luar transaksi tercatat — pembayaran yang dicatat lewat menu Transaksi otomatis masuk ke hitungan.</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="max-h-[340px] overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2 bg-slate-50/30">
              {filteredSiswa.map(siswa => {
                const checked = checkedIds.has(siswa.id);
                return (
                  <div key={siswa.id} className={`rounded-lg transition-colors ${checked ? 'bg-purple-50 ring-1 ring-purple-200' : 'hover:bg-white'}`}>
                    <label className="flex items-center gap-3 p-2 cursor-pointer">
                      <Checkbox checked={checked} onCheckedChange={() => toggleSiswa(siswa.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{siswa.nama}</p>
                        <p className="text-xs text-slate-400">{siswa.nis} · {siswa.nama_kelas}</p>
                      </div>
                    </label>
                    {checked && (
                      <div className="px-2 pb-2 pl-9">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 whitespace-nowrap">Sudah Bayar (manual):</span>
                          <div className="flex-1">
                            <RupiahInput
                              value={sudahBayar[siswa.id] ?? ''}
                              onChange={(val) => setSudahBayar(s => ({ ...s, [siswa.id]: val }))}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredSiswa.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4">Tidak ada siswa</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
            <Button type="button" onClick={handleSave} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}