import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer, Check, CalendarRange, CalendarDays } from 'lucide-react';
import { printSiswaStatement } from '@/lib/tunggakanPrint';
import { BULAN_SPP } from '@/lib/sppUtils';

const formatRupiah = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

const badgeCls = (st) => st === 'Lunas'
  ? 'bg-emerald-100 text-emerald-700'
  : st === 'Cicilan' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

// Ceklisan custom (bukan Radix) agar konsisten dengan pola aplikasi
const Ceklis = ({ checked, onToggle, title }) => (
  <button
    type="button"
    onClick={onToggle}
    title={title}
    aria-label={title}
    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
      checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 hover:border-blue-400'
    }`}
  >
    {checked && <Check className="w-3.5 h-3.5" />}
  </button>
);

/**
 * Popup Detail Data Siswa pada tab Tunggakan (Laporan Keuangan):
 * ringkasan Total Dibayar / Sisa Bayar, detail per jenis iuran dengan
 * ceklisan (menentukan iuran yang muncul saat dicetak), pilihan cetak
 * Data Per Tahun atau Data Per Bulan (ceklisan bulan — SPP menampilkan
 * nominal per bulan beserta statusnya), dan aksi Cetak Data Siswa.
 */
export default function TunggakanDetailDialog({ isOpen, onClose, row, taLabel }) {
  const [modeCetak, setModeCetak] = useState('tahun'); // 'tahun' | 'bulan'
  const [bulanPilihan, setBulanPilihan] = useState([]);
  const [iuranPilihan, setIuranPilihan] = useState([]);

  useEffect(() => {
    if (isOpen && row) {
      setModeCetak('tahun');
      setBulanPilihan([...BULAN_SPP]);
      setIuranPilihan((row.status_items || []).map(it => it.key));
    }
  }, [isOpen, row]);

  if (!row) return null;

  const items = row.status_items || [];
  const sppItem = items.find(it => it.jenis === 'SPP');
  const modeBulan = modeCetak === 'bulan';
  const bulanEfektif = BULAN_SPP.filter(m => bulanPilihan.includes(m));

  const toggleIuran = (key) => setIuranPilihan(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  const toggleBulan = (m) => setBulanPilihan(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const statusBulan = (m) => {
    if (!sppItem) return null;
    if ((sppItem.gratis_months || []).includes(m)) return { label: 'Gratis', cls: 'text-emerald-600' };
    if ((sppItem.paid_months || []).includes(m)) return { label: 'Lunas', cls: 'text-emerald-600' };
    return { label: 'Belum Bayar', cls: 'text-red-600' };
  };

  const cetak = () => printSiswaStatement(row, taLabel, {
    iuranPilihan: new Set(iuranPilihan),
    bulanPilihan: modeBulan ? bulanEfektif : null,
  });

  const modeBtnCls = (aktif) =>
    `flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
      aktif ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
    }`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap pr-6">
            {row.nama}
            <Badge className={badgeCls(row.status_keuangan)}>{row.status_keuangan}</Badge>
          </DialogTitle>
          <p className="text-xs text-slate-400">NIS {row.nis || '-'} · {row.nama_kelas || '-'} · TA {taLabel || '-'}</p>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-lg bg-emerald-50">
            <p className="text-[10px] text-emerald-500 uppercase font-medium">Total Dibayar</p>
            <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatRupiah(row.total_dibayar)}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50">
            <p className="text-[10px] text-amber-500 uppercase font-medium">Sisa (Jatuh Tempo)</p>
            <p className="text-sm font-bold text-amber-700 mt-0.5">{formatRupiah(row.sisa_jatuh_tempo)}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-red-50">
            <p className="text-[10px] text-red-500 uppercase font-medium">Sisa Bayar (Setahun)</p>
            <p className="text-sm font-bold text-red-700 mt-0.5">{formatRupiah(row.sisa_setahun)}</p>
          </div>
        </div>

        {/* Pilihan data cetak: per tahun atau per bulan */}
        <div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={modeBtnCls(!modeBulan)} onClick={() => setModeCetak('tahun')}>
              <CalendarRange className="w-4 h-4" /> Data Per Tahun
            </button>
            <button type="button" className={modeBtnCls(modeBulan)} onClick={() => setModeCetak('bulan')}>
              <CalendarDays className="w-4 h-4" /> Data Per Bulan
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Ceklis jenis iuran &amp; bulan menentukan data yang muncul pada cetak.
          </p>
        </div>

        {/* Ceklisan bulan (mode Data Per Bulan) */}
        {modeBulan && (
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">Pilih Bulan yang Dibutuhkan</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {BULAN_SPP.map(m => {
                const on = bulanPilihan.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleBulan(m)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      on ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
                      {on && <Check className="w-3 h-3" />}
                    </span>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Rincian SPP per bulan terpilih: nominal & status tiap bulan */}
        {modeBulan && sppItem && bulanEfektif.length > 0 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-600">Rincian SPP — Bulan Terpilih ({bulanEfektif.length})</p>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
              {bulanEfektif.map(m => {
                const st = statusBulan(m);
                return (
                  <div key={m} className="flex items-center justify-between px-3 py-2">
                    <p className="text-sm font-medium text-slate-800">{m}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{formatRupiah(sppItem.nominal_per_bulan || 0)}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 ${st.cls}`}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detail per jenis iuran dengan ceklisan */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600">Detail per Jenis Iuran</p>
            <p className="text-[10px] text-slate-400">Ceklis = tampil pada cetak</p>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-slate-400 text-center">Tidak ada item iuran</p>
            ) : items.map(it => {
              const on = iuranPilihan.includes(it.key);
              return (
                <div key={it.key} className={`flex items-center gap-3 px-3 py-2.5 ${on ? '' : 'opacity-40'}`}>
                  <Ceklis checked={on} onToggle={() => toggleIuran(it.key)} title={`Tampilkan ${it.nama} pada cetak`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {it.nama}{it.gratis ? ' (Gratis)' : ''}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {it.periode || '-'}{it.detail ? ` · ${it.detail}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">
                      Dibayar <span className="font-semibold text-emerald-600">{formatRupiah(it.dibayar)}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Sisa <span className={`font-semibold ${it.sisa_setahun > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(it.sisa_setahun)}</span>
                    </p>
                  </div>
                  <Badge className={`${badgeCls(it.status)} shrink-0`}>{it.status}</Badge>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={cetak}
            disabled={iuranPilihan.length === 0 || (modeBulan && bulanEfektif.length === 0)}
          >
            <Printer className="w-4 h-4 mr-1" /> {modeBulan ? 'Cetak Data Per Bulan' : 'Cetak Data Per Tahun'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}