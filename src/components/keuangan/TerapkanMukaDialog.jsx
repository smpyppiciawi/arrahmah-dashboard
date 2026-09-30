import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import RupiahInput from '@/components/ui/RupiahInput';
import { toast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { PiggyBank, Loader2, Info } from 'lucide-react';
import { BULAN_SPP, computeStatusKeuangan, getGratisBulanSPP } from '@/lib/sppUtils';
import { terbilang } from '@/lib/terbilang';

const JENIS_TO_KATEGORI = { 'SPP': 'SPP', 'Ujian': 'Ujian', 'Awal Tahun': 'Daftar Ulang' };
const formatRupiah = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

/**
 * Dialog penerapan Saldo Iuran Muka menjadi transaksi pembayaran resmi.
 * Saldo sudah ada di kas (setoran) — transaksi hasil penerapan ditandai
 * aplikasi_iuran_muka agar netral terhadap kas tapi mengurangi tagihan TA tujuan.
 */
export default function TerapkanMukaDialog({ isOpen, onClose, record, tarifIuranList = [], biayaKhususList = [], keuanganList = [], currentUser }) {
  const queryClient = useQueryClient();
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [nominal, setNominal] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sisaSaldo = record ? Math.max(0, (record.nominal || 0) - (record.nominal_diterapkan || 0)) : 0;
  const ta = record?.tahun_ajaran_tujuan || '';
  const isSpp = (record?.nama_iuran || '').toLowerCase().includes('spp');

  const siswaKeu = useMemo(
    () => (record ? keuanganList.filter(k => k.siswa_id === record.siswa_id) : []),
    [keuanganList, record]
  );

  // Sisa tagihan item tujuan pada TA tujuan (null bila tarif TA tujuan belum tersedia)
  const targetItem = useMemo(() => {
    if (!record?.siswa_id) return null;
    const pseudoSiswa = { id: record.siswa_id, nama: record.nama_siswa, nama_kelas: record.nama_kelas };
    const st = computeStatusKeuangan({
      siswa: pseudoSiswa,
      keuanganList: siswaKeu,
      tarifList: tarifIuranList,
      biayaKhususList,
      tahunAjaran: ta,
      iuranNama: record.nama_iuran,
    });
    return st.items.find(i => i.nama === record.nama_iuran) || null;
  }, [record, siswaKeu, tarifIuranList, biayaKhususList, ta]);

  const sisaTagihan = targetItem ? Math.max(0, targetItem.sisa_setahun || 0) : null;

  const sppTarif = useMemo(() => {
    if (!isSpp || !record) return null;
    return tarifIuranList.find(t => t.nama === record.nama_iuran && t.periode === 'Bulanan' && t.status !== 'Tidak Aktif') || null;
  }, [isSpp, record, tarifIuranList]);

  // Bulan SPP yang masih bisa dilunasi untuk TA tujuan
  const bulanOpsi = useMemo(() => {
    if (!record) return [];
    const paid = new Set();
    siswaKeu.forEach(k => {
      if (ta && k.tahun_ajaran !== ta) return;
      (k.bulan_dibayar || []).forEach(m => paid.add(m));
    });
    const gratis = new Set(getGratisBulanSPP(record.siswa_id, biayaKhususList, tarifIuranList, siswaKeu));
    return BULAN_SPP.filter(m => !paid.has(m) && !gratis.has(m));
  }, [record, siswaKeu, ta, biayaKhususList, tarifIuranList]);

  useEffect(() => {
    if (isOpen && record) {
      setSelectedMonths([]);
      setConfirmOpen(false);
      setNominal(sisaTagihan != null ? String(Math.max(0, Math.min(sisaSaldo, sisaTagihan))) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, record?.id]);

  const nominalEfektif = isSpp && sppTarif
    ? selectedMonths.length * (sppTarif.nominal || 0)
    : Number(nominal || 0);

  const toggleMonth = (m) => {
    setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const handleApply = async () => {
    if (!record || nominalEfektif <= 0) {
      toast({ title: "Nominal penerapan belum diisi", variant: "destructive" });
      return;
    }
    if (nominalEfektif > sisaSaldo) {
      toast({ title: "Nominal melebihi sisa saldo", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const tarif = tarifIuranList.find(t => t.nama === record.nama_iuran);
      const kategori = JENIS_TO_KATEGORI[tarif?.jenis_iuran] || 'Lainnya';
      const tanggal = format(new Date(), 'yyyy-MM-dd');
      const uraian = `Penerapan Iuran Muka — ${record.nama_iuran} TP ${ta}${selectedMonths.length ? ` (${selectedMonths.join(', ')})` : ''}`;
      const payload = {
        tanggal,
        jenis: 'Pemasukan',
        tipe_transaksi: record.nama_iuran,
        kategori,
        uraian,
        jumlah: nominalEfektif,
        terbilang: terbilang(nominalEfektif),
        siswa_id: record.siswa_id,
        nis: record.nis || '',
        nama_siswa: record.nama_siswa,
        kelas: record.nama_kelas || '',
        bulan_dibayar: selectedMonths,
        tahun_ajaran: ta,
        pic: currentUser?.full_name || '',
        penerima: currentUser?.full_name || '',
        status_bayar: 'Lunas',
        aplikasi_iuran_muka: true,
      };
      const created = await base44.entities.Keuangan.create(payload);
      await base44.entities.IuranMuka.update(record.id, {
        nominal_diterapkan: (record.nominal_diterapkan || 0) + nominalEfektif,
        penerapan: [
          ...(record.penerapan || []),
          { transaksi_id: created?.id || '', nominal: nominalEfektif, tanggal, uraian, pic: payload.pic },
        ],
      });
      ['keuangan', 'iuran-muka', 'keuangan-tunggakan', 'siswa-keuangan', 'iuran-muka-siswa'].forEach(key =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
      toast({ title: "Penerapan berhasil", description: `Transaksi pembayaran ${formatRupiah(nominalEfektif)} untuk TP ${ta} telah dibuat.` });
      onClose();
    } catch (e) {
      toast({ title: "Gagal menerapkan saldo", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-purple-600" />
              Terapkan Iuran Muka
            </DialogTitle>
          </DialogHeader>
          {record && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 space-y-1.5">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-500">Siswa</span>
                  <span className="font-semibold text-slate-700 text-right">{record.nama_siswa} · {record.nama_kelas || '-'}</span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-500">Iuran Tujuan</span>
                  <span className="font-semibold text-slate-700 text-right">{record.nama_iuran} · TP {ta || '-'}</span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-500">Sisa Saldo Muka</span>
                  <span className="font-bold text-purple-700">{formatRupiah(sisaSaldo)}</span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-500">Sisa Tagihan Item Tujuan</span>
                  <span className="font-semibold text-slate-700">
                    {sisaTagihan != null ? formatRupiah(sisaTagihan) : '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-400 px-1">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Penerapan tidak menambah kas — uang sudah tercatat masuk saat setoran. Transaksi ini hanya mengurangi tagihan iuran TP {ta || '-'}.</span>
              </div>

              {isSpp && sppTarif ? (
                <div>
                  <Label className="text-sm">Pilih Bulan SPP ({formatRupiah(sppTarif.nominal)}/bln)</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {bulanOpsi.map(m => (
                      <button
                        key={m} type="button" onClick={() => toggleMonth(m)}
                        className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                          selectedMonths.includes(m)
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                    {bulanOpsi.length === 0 && (
                      <p className="col-span-3 text-xs text-slate-400 text-center py-2">Semua bulan SPP TP {ta || '-'} sudah lunas</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 p-2.5 rounded-lg bg-slate-50">
                    <span className="text-xs text-slate-500">{selectedMonths.length} bulan × {formatRupiah(sppTarif.nominal)}</span>
                    <span className="text-sm font-bold text-purple-700">{formatRupiah(nominalEfektif)}</span>
                  </div>
                  {nominalEfektif > sisaSaldo && (
                    <p className="text-xs text-red-600 mt-1">Nominal melebihi sisa saldo — kurangi pilihan bulan.</p>
                  )}
                </div>
              ) : (
                <div>
                  <Label className="text-sm">Nominal Penerapan</Label>
                  <RupiahInput value={nominal} onChange={setNominal} placeholder="0" />
                  <p className="text-xs text-slate-400 mt-1">Maksimal sisa saldo {formatRupiah(sisaSaldo)}.</p>
                  {sisaTagihan != null && (
                    <p className="text-xs text-slate-500 mt-0.5">Sisa tagihan item tujuan saat ini: {formatRupiah(sisaTagihan)}.</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={saving}>Batal</Button>
                <Button
                  type="button"
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  disabled={saving || nominalEfektif <= 0 || nominalEfektif > sisaSaldo}
                  onClick={() => setConfirmOpen(true)}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Terapkan sebagai Pembayaran
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => !v && setConfirmOpen(false)}
        onConfirm={handleApply}
        title="Terapkan saldo iuran muka?"
        description={`Transaksi pembayaran ${formatRupiah(nominalEfektif)} untuk ${record?.nama_iuran || 'iuran'} TP ${ta || '-'} akan dibuat dan saldo muka berkurang sesuai nominal.`}
      />
    </>
  );
}