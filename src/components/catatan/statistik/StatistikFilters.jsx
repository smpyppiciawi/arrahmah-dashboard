import React from 'react';
import { CalendarRange, Download, RefreshCw, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const QUICK = [
  { key: 'hari-ini', label: 'Hari Ini' },
  { key: '7-hari', label: '7 Hari' },
  { key: '30-hari', label: '30 Hari' },
  { key: 'bulan-ini', label: 'Bulan Ini' },
];

const SELECT_CLS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

export default function StatistikFilters({
  tahunAjaran, semester, onSemester,
  periode, onPeriode,
  tanggalMulai, tanggalAkhir, onTanggalMulai, onTanggalAkhir,
  onQuick, quickAktif,
  tingkat, onTingkat, kelasFilter, onKelas, kelasOptions,
  onRefresh, onExport, exporting, loading,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
      <div className="flex flex-wrap items-end gap-3 md:gap-4">
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Tahun Ajaran</Label>
          <div className="h-9 flex items-center gap-1.5 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
            <School className="w-3.5 h-3.5 text-slate-400" />
            {tahunAjaran || '-'}
          </div>
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Semester</Label>
          <select value={semester} onChange={(e) => onSemester(e.target.value)} className={SELECT_CLS}>
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Tingkat</Label>
          <select value={tingkat} onChange={(e) => onTingkat(e.target.value)} className={SELECT_CLS}>
            <option value="semua">Semua Tingkat</option>
            <option value="7">Tingkat 7</option>
            <option value="8">Tingkat 8</option>
            <option value="9">Tingkat 9</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Kelas</Label>
          <select value={kelasFilter} onChange={(e) => onKelas(e.target.value)} className={SELECT_CLS}>
            <option value="semua">Semua Kelas</option>
            {kelasOptions.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Tanggal Mulai</Label>
          <Input type="date" value={tanggalMulai} max={tanggalAkhir}
            onChange={(e) => onTanggalMulai(e.target.value)} className="w-full md:w-40" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Tanggal Akhir</Label>
          <Input type="date" value={tanggalAkhir} min={tanggalMulai}
            onChange={(e) => onTanggalAkhir(e.target.value)} className="w-full md:w-40" />
        </div>
        <div className="flex gap-2 md:ml-auto">
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2 border-slate-300">
            <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Muat Ulang</span>
          </Button>
          <Button size="sm" onClick={onExport} disabled={exporting || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Download className="w-4 h-4" /> {exporting ? 'Mengekspor…' : 'Export Excel'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-500">Periode cepat:</span>
        {QUICK.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => onQuick(q.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              quickAktif === q.key
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:text-slate-900'
            }`}
          >
            {q.label}
          </button>
        ))}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 ml-auto">
          {['harian', 'mingguan', 'bulanan'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPeriode(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                periode === p ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5">
        <CalendarRange className="w-3.5 h-3.5" />
        Tanggal memakai waktu sekolah (WIB). Statistik dihitung dari tanggal kejadian, mengikuti filter di atas.
      </p>
    </div>
  );
}