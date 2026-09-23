import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RupiahInput from '@/components/ui/RupiahInput';
import { Plus, Trash2 } from 'lucide-react';

const formatRupiah = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

/**
 * Opsi TA tujuan untuk Iuran Muka: TA aktif + beberapa tahun berikutnya.
 * Format TA: 2025/2026 → 2026/2027, dst.
 */
export function buildTaOptions(activeAcademicYear, count = 5) {
  const opts = [];
  const m = /^(\d{4})\s*\/\s*(\d{4})$/.exec((activeAcademicYear || '').trim());
  if (m) {
    const start = parseInt(m[1], 10);
    opts.push(activeAcademicYear.trim());
    for (let i = 1; i <= count; i++) opts.push(`${start + i}/${start + i + 1}`);
  } else if (activeAcademicYear) {
    opts.push(activeAcademicYear);
  }
  return opts;
}

/**
 * Editor alokasi Iuran Muka: pecah nominal per tahun ajaran & jenis iuran.
 * Total alokasi harus sama dengan Jumlah transaksi.
 */
export default function MukaAllocationEditor({ value = [], onChange, tarifIuranList = [], activeAcademicYear, jumlah = 0 }) {
  const taOptions = buildTaOptions(activeAcademicYear);
  const iuranNames = [...new Set(tarifIuranList.map(t => t.nama).filter(Boolean))].sort();
  const total = value.reduce((s, r) => s + Number(r.nominal || 0), 0);
  const selisih = Number(jumlah || 0) - total;

  const updateRow = (idx, field, val) => onChange(value.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  const addRow = () => onChange([...value, { ta: taOptions[1] || taOptions[0] || '', iuran: '', nominal: '' }]);
  const removeRow = (idx) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3 p-4 bg-amber-50/70 rounded-lg border border-amber-100">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Label className="text-xs text-amber-700 uppercase tracking-wide font-semibold">Alokasi Iuran Muka</Label>
          <p className="text-[11px] text-slate-400 mt-0.5">Pecah nominal per tahun ajaran & jenis iuran — total alokasi harus sama dengan Jumlah.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addRow}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Alokasi
        </Button>
      </div>

      {value.map((row, idx) => {
        const rowTaOptions = row.ta && !taOptions.includes(row.ta) ? [...taOptions, row.ta] : taOptions;
        return (
          <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1.3fr_1fr_auto] gap-2 items-end bg-white rounded-lg p-3 border border-amber-100">
            <div>
              <Label className="text-[11px] text-slate-500">TA Tujuan</Label>
              <Select value={row.ta} onValueChange={(v) => updateRow(idx, 'ta', v)}>
                <SelectTrigger><SelectValue placeholder="Pilih TA" /></SelectTrigger>
                <SelectContent>
                  {rowTaOptions.map(ta => <SelectItem key={ta} value={ta}>{ta}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-slate-500">Jenis Iuran</Label>
              <Select value={row.iuran} onValueChange={(v) => updateRow(idx, 'iuran', v)}>
                <SelectTrigger><SelectValue placeholder="Pilih iuran" /></SelectTrigger>
                <SelectContent>
                  {iuranNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-slate-500">Nominal</Label>
              <RupiahInput value={row.nominal} onChange={(val) => updateRow(idx, 'nominal', val)} placeholder="0" />
            </div>
            <Button
              type="button" size="icon" variant="ghost"
              className="text-red-400 hover:text-red-600"
              disabled={value.length === 1}
              onClick={() => removeRow(idx)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      })}

      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-slate-500">Total Alokasi: <b className="text-slate-700">{formatRupiah(total)}</b></span>
        {Number(jumlah || 0) === 0 ? (
          <span className="text-slate-400">Isi Jumlah terlebih dulu</span>
        ) : selisih === 0 ? (
          <span className="text-emerald-600 font-semibold">✓ Alokasi lengkap</span>
        ) : selisih > 0 ? (
          <span className="text-red-600 font-medium">Kurang {formatRupiah(selisih)}</span>
        ) : (
          <span className="text-red-600 font-medium">Lebih {formatRupiah(Math.abs(selisih))}</span>
        )}
      </div>
    </div>
  );
}