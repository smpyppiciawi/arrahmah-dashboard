import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Users, UserCheck, Heart, Building2, Loader2, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import SiswaSearch from './SiswaSearch';
import SiswaRiwayat from './SiswaRiwayat';
import SppChecklist from './SppChecklist';
import PegawaiSearch from './PegawaiSearch';
import BuktiUpload from './BuktiUpload';

const TIPE_TO_KATEGORI = {
  'SPP/Bulanan': 'SPP',
  'Ujian Sekolah': 'Ujian',
  'Daftar Ulang': 'Daftar Ulang',
  'Kelulusan': 'Kelulusan',
  'Kasbon Pegawai': 'Kasbon',
};

const FALLBACK_TIPE = {
  siswa: ['SPP/Bulanan', 'Ujian Sekolah', 'Daftar Ulang', 'Kelulusan'],
  pegawai: ['Kasbon Pegawai', 'Lainnya'],
  donatur: ['Lainnya'],
  umum: ['Belanja Harian', 'Belanja Bulanan', 'Belanja Tahunan', 'Kegiatan', 'BOSP', 'Transaksi Khusus', 'Lainnya'],
};

const JENIS_OPTIONS = [
  { key: 'umum', label: 'Umum', icon: Building2, color: 'slate' },
  { key: 'siswa', label: 'Siswa', icon: Users, color: 'blue' },
  { key: 'pegawai', label: 'Pegawai', icon: UserCheck, color: 'purple' },
  { key: 'donatur', label: 'Donatur', icon: Heart, color: 'pink' },
];

const DEFAULT_FORM = {
  tanggal: format(new Date(), 'yyyy-MM-dd'),
  jenis: 'Pemasukan',
  tipe_transaksi: '',
  kategori: '',
  uraian: '',
  jumlah: '',
  siswa_id: '', nis: '', nama_siswa: '', kelas: '',
  guru_id: '', nip_pegawai: '', nama_pegawai: '', jabatan_pegawai: '',
  nama_donatur: '',
  bulan_dibayar: [],
  sumber_rekening: '',
  bukti_file: '',
  status_bayar: 'Lunas',
  tahun_ajaran: '',
};

export default function TransaksiForm({
  isOpen, onClose, editingData,
  currentUser, activeAcademicYear,
  siswaList, guruList,
  kategoriList, tipeTransaksiList, sumberDanaList, tarifIuranList,
  keuanganList,
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [jenisTransaksi, setJenisTransaksi] = useState('umum');
  const [selectedTarifId, setSelectedTarifId] = useState('');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingData) {
        const ed = { ...DEFAULT_FORM, ...editingData, bulan_dibayar: editingData.bulan_dibayar || [] };
        setFormData(ed);
        if (editingData.siswa_id) setJenisTransaksi('siswa');
        else if (editingData.guru_id) setJenisTransaksi('pegawai');
        else if (editingData.nama_donatur) setJenisTransaksi('donatur');
        else setJenisTransaksi('umum');
        setSelectedMonths(editingData.bulan_dibayar || []);
      } else {
        setFormData({
          ...DEFAULT_FORM,
          tanggal: format(new Date(), 'yyyy-MM-dd'),
          tahun_ajaran: activeAcademicYear || '',
        });
        setJenisTransaksi('umum');
        setSelectedMonths([]);
      }
      setSelectedTarifId('');
    }
  }, [isOpen, editingData, activeAcademicYear]);

  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));

  const paidMonths = useMemo(() => {
    if (!formData.siswa_id) return [];
    return keuanganList
      .filter(t =>
        t.siswa_id === formData.siswa_id &&
        t.id !== editingData?.id &&
        (t.tipe_transaksi?.toLowerCase().includes('spp') || t.bulan_dibayar?.length > 0) &&
        (!activeAcademicYear || t.tahun_ajaran === activeAcademicYear)
      )
      .flatMap(t => t.bulan_dibayar || []);
  }, [keuanganList, formData.siswa_id, activeAcademicYear, editingData]);

  const sppTarifNominal = useMemo(() => {
    if (selectedTarifId) {
      const t = tarifIuranList.find(t => t.id === selectedTarifId);
      return t?.nominal || 0;
    }
    const sppTarif = tarifIuranList.find(t => t.nama?.toLowerCase().includes('spp'));
    return sppTarif?.nominal || 0;
  }, [selectedTarifId, tarifIuranList]);

  const showSppChecklist = useMemo(() => {
    return jenisTransaksi === 'siswa' &&
      formData.siswa_id &&
      (formData.tipe_transaksi?.toLowerCase().includes('spp') ||
        (selectedTarifId && tarifIuranList.find(t => t.id === selectedTarifId)?.nama?.toLowerCase().includes('spp')));
  }, [jenisTransaksi, formData.siswa_id, formData.tipe_transaksi, selectedTarifId, tarifIuranList]);

  const siswaRiwayat = useMemo(() => {
    if (!formData.siswa_id) return [];
    return [...keuanganList]
      .filter(t => t.siswa_id === formData.siswa_id && t.id !== editingData?.id)
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
      .slice(0, 5);
  }, [keuanganList, formData.siswa_id, editingData]);

  const kasbonInfo = useMemo(() => {
    if (!formData.guru_id) return { total: 0, count: 0 };
    const kasbonTrans = keuanganList.filter(
      t => t.guru_id === formData.guru_id && t.tipe_transaksi === 'Kasbon Pegawai'
    );
    const totalKasbon = kasbonTrans
      .filter(t => t.jenis === 'Pengeluaran')
      .reduce((sum, t) => sum + (t.jumlah || 0), 0);
    const totalBayar = kasbonTrans
      .filter(t => t.jenis === 'Pemasukan')
      .reduce((sum, t) => sum + (t.jumlah || 0), 0);
    return {
      total: totalKasbon - totalBayar,
      count: kasbonTrans.filter(t => t.jenis === 'Pengeluaran').length,
    };
  }, [keuanganList, formData.guru_id]);

  const tipeOptions = useMemo(() => {
    let items = [];
    if (tipeTransaksiList.length > 0) {
      const filtered = tipeTransaksiList.filter(t => {
        if (jenisTransaksi === 'siswa') return t.jenis === 'Siswa';
        if (jenisTransaksi === 'pegawai') return t.jenis === 'Pegawai';
        if (jenisTransaksi === 'donatur') return t.jenis === 'Umum';
        return t.jenis === 'Umum';
      });
      items = (filtered.length > 0 ? filtered : tipeTransaksiList).map(t => t.nama);
    }
    if (items.length === 0) {
      items = FALLBACK_TIPE[jenisTransaksi] || FALLBACK_TIPE.umum;
    }
    return items;
  }, [tipeTransaksiList, jenisTransaksi]);

  const filteredKategori = useMemo(() => {
    const filtered = kategoriList.filter(k => k.jenis === 'Semua' || k.jenis === formData.jenis);
    return filtered.length > 0 ? filtered : kategoriList;
  }, [kategoriList, formData.jenis]);

  const handleJenisTransaksiChange = (type) => {
    setJenisTransaksi(type);
    setSelectedTarifId('');
    setSelectedMonths([]);
    setFormData(prev => ({
      ...prev,
      siswa_id: '', nis: '', nama_siswa: '', kelas: '',
      guru_id: '', nip_pegawai: '', nama_pegawai: '', jabatan_pegawai: '',
      nama_donatur: '',
      bulan_dibayar: [],
      tipe_transaksi: '',
      kategori: type === 'donatur' ? 'Donasi' : '',
      uraian: '',
      jumlah: '',
      jenis: (type === 'siswa' || type === 'donatur') ? 'Pemasukan' : prev.jenis,
    }));
  };

  const handleSiswaSelect = (siswa) => {
    setFormData(prev => ({
      ...prev,
      siswa_id: siswa.id,
      nis: siswa.nis,
      nama_siswa: siswa.nama,
      kelas: siswa.nama_kelas,
      guru_id: '', nip_pegawai: '', nama_pegawai: '', jabatan_pegawai: '',
      nama_donatur: '',
    }));
    setSelectedTarifId('');
    setSelectedMonths([]);
  };

  const handlePegawaiSelect = (guru) => {
    setFormData(prev => ({
      ...prev,
      guru_id: guru.id,
      nip_pegawai: guru.nip,
      nama_pegawai: guru.nama,
      jabatan_pegawai: guru.jabatan,
      siswa_id: '', nis: '', nama_siswa: '', kelas: '',
      nama_donatur: '',
    }));
  };

  const handleTarifSelect = (tarifId) => {
    setSelectedTarifId(tarifId);
    const tarif = tarifIuranList.find(t => t.id === tarifId);
    if (tarif) {
      setFormData(prev => ({
        ...prev,
        tipe_transaksi: tarif.nama,
        kategori: TIPE_TO_KATEGORI[tarif.nama] || prev.kategori,
        jumlah: tarif.nominal,
      }));
    }
  };

  const handleTipeChange = (tipe) => {
    set('tipe_transaksi', tipe);
    if (TIPE_TO_KATEGORI[tipe]) {
      set('kategori', TIPE_TO_KATEGORI[tipe]);
    }
    if (!tipe.toLowerCase().includes('spp')) {
      setSelectedMonths([]);
      set('bulan_dibayar', []);
    }
  };

  const handleToggleMonth = (bulan) => {
    setSelectedMonths(prev => {
      const next = prev.includes(bulan)
        ? prev.filter(m => m !== bulan)
        : [...prev, bulan];
      setFormData(fd => ({
        ...fd,
        bulan_dibayar: next,
        jumlah: sppTarifNominal * next.length,
        uraian: next.length > 0
          ? `Pembayaran SPP ${next.join(', ')}${activeAcademicYear ? ` TP ${activeAcademicYear}` : ''}`
          : fd.uraian,
      }));
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (showSppChecklist && selectedMonths.length === 0 && formData.jenis === 'Pemasukan') {
      toast({ title: "Pilih minimal 1 bulan SPP", variant: "destructive" });
      return;
    }
    if (!formData.jumlah || Number(formData.jumlah) <= 0) {
      toast({ title: "Jumlah harus diisi", variant: "destructive" });
      return;
    }
    if (!formData.kategori) {
      toast({ title: "Kategori harus dipilih", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const payload = {
      ...formData,
      jumlah: Number(formData.jumlah),
      pic: currentUser?.full_name || '',
      tahun_ajaran: activeAcademicYear || '',
    };

    try {
      if (editingData) {
        await base44.entities.Keuangan.update(editingData.id, payload);
        toast({ title: "Transaksi berhasil diperbarui" });
      } else {
        await base44.entities.Keuangan.create(payload);
        toast({ title: "Transaksi berhasil disimpan" });
      }
      queryClient.invalidateQueries({ queryKey: ['keuangan'] });
      onClose();
    } catch (err) {
      toast({ title: "Gagal menyimpan transaksi", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSiswa = formData.siswa_id ? siswaList.find(s => s.id === formData.siswa_id) : null;
  const selectedGuru = formData.guru_id ? guruList.find(g => g.id === formData.guru_id) : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800">
            {editingData ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section: Jenis Transaksi */}
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Jenis Transaksi</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {JENIS_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const active = jenisTransaksi === opt.key;
                const colorMap = {
                  slate: active ? 'bg-slate-700 text-white border-slate-700' : 'text-slate-500 border-slate-200',
                  blue: active ? 'bg-blue-600 text-white border-blue-600' : 'text-blue-500 border-slate-200',
                  purple: active ? 'bg-purple-600 text-white border-purple-600' : 'text-purple-500 border-slate-200',
                  pink: active ? 'bg-pink-600 text-white border-pink-600' : 'text-pink-500 border-slate-200',
                };
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleJenisTransaksiChange(opt.key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition text-xs font-medium ${colorMap[opt.color]}`}
                  >
                    <Icon className="w-5 h-5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Tanggal & Jenis */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tanggal Transaksi</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => set('tanggal', e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div>
              <Label>Jenis</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => set('jenis', 'Pemasukan')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-sm font-medium transition ${
                    formData.jenis === 'Pemasukan'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'text-emerald-600 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Masuk
                </button>
                <button
                  type="button"
                  onClick={() => set('jenis', 'Pengeluaran')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-sm font-medium transition ${
                    formData.jenis === 'Pengeluaran'
                      ? 'bg-red-500 text-white border-red-500'
                      : 'text-red-600 border-slate-200 hover:border-red-300'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            </div>
          </div>

          {/* Section: Dynamic Content */}
          {jenisTransaksi === 'siswa' && (
            <div className="space-y-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
              <Label className="text-xs text-blue-700 uppercase tracking-wide font-semibold">Data Siswa</Label>
              <SiswaSearch
                siswaList={siswaList}
                selectedSiswa={selectedSiswa}
                onSelect={handleSiswaSelect}
              />
              {formData.siswa_id && (
                <>
                  <div>
                    <Label className="text-xs">Pilih Tarif Iuran</Label>
                    <Select value={selectedTarifId} onValueChange={handleTarifSelect}>
                      <SelectTrigger><SelectValue placeholder="Pilih tarif untuk auto-fill" /></SelectTrigger>
                      <SelectContent>
                        {tarifIuranList.map(tarif => (
                          <SelectItem key={tarif.id} value={tarif.id}>
                            {tarif.nama} — {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(tarif.nominal)} ({tarif.periode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {showSppChecklist && (
                    <SppChecklist
                      tarifNominal={sppTarifNominal}
                      paidMonths={paidMonths}
                      selectedMonths={selectedMonths}
                      onToggleMonth={handleToggleMonth}
                      tahunAjaran={activeAcademicYear}
                    />
                  )}
                  <SiswaRiwayat riwayat={siswaRiwayat} />
                </>
              )}
            </div>
          )}

          {jenisTransaksi === 'pegawai' && (
            <div className="space-y-3 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
              <Label className="text-xs text-purple-700 uppercase tracking-wide font-semibold">Data Pegawai</Label>
              <PegawaiSearch
                guruList={guruList}
                selectedGuru={selectedGuru}
                onSelect={handlePegawaiSelect}
                kasbonInfo={kasbonInfo}
              />
            </div>
          )}

          {jenisTransaksi === 'donatur' && (
            <div className="space-y-3 p-4 bg-pink-50/50 rounded-lg border border-pink-100">
              <Label className="text-xs text-pink-700 uppercase tracking-wide font-semibold">Data Donatur</Label>
              <div>
                <Label>Nama Donatur</Label>
                <Input
                  value={formData.nama_donatur}
                  onChange={(e) => set('nama_donatur', e.target.value)}
                  placeholder="Nama donatur atau hamba Allah"
                />
              </div>
            </div>
          )}

          {/* Section: Detail Transaksi */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipe Transaksi</Label>
              <Select value={formData.tipe_transaksi} onValueChange={handleTipeChange}>
                <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                <SelectContent>
                  {tipeOptions.map(tipe => (
                    <SelectItem key={tipe} value={tipe}>{tipe}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={formData.kategori} onValueChange={(v) => set('kategori', v)}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {filteredKategori.map(kat => (
                    <SelectItem key={kat.id} value={kat.nama}>{kat.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Uraian / Deskripsi</Label>
            <Textarea
              value={formData.uraian}
              onChange={(e) => set('uraian', e.target.value)}
              placeholder="Contoh: Pembayaran SPP Juli 2025"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Jumlah (Rp)</Label>
              <Input
                type="number"
                value={formData.jumlah}
                onChange={(e) => set('jumlah', e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label>Status Bayar</Label>
              <Select value={formData.status_bayar} onValueChange={(v) => set('status_bayar', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lunas">Lunas</SelectItem>
                  <SelectItem value="Belum Lunas">Belum Lunas</SelectItem>
                  <SelectItem value="Cicilan">Cicilan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section: Sumber Dana & PIC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sumber Dana</Label>
              <Select value={formData.sumber_rekening} onValueChange={(v) => set('sumber_rekening', v)}>
                <SelectTrigger><SelectValue placeholder="Pilih sumber" /></SelectTrigger>
                <SelectContent>
                  {sumberDanaList.map(sumber => (
                    <SelectItem key={sumber.id} value={sumber.nama}>{sumber.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>PIC / Penanggung Jawab</Label>
              <Input
                value={currentUser?.full_name || formData.pic || ''}
                readOnly
                className="bg-slate-50 text-slate-600"
              />
            </div>
          </div>

          {/* Section: Bukti Upload */}
          <BuktiUpload
            buktiFile={formData.bukti_file}
            onUpload={(url) => set('bukti_file', url)}
            onClear={() => set('bukti_file', '')}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                editingData ? 'Simpan Perubahan' : 'Simpan Transaksi'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}