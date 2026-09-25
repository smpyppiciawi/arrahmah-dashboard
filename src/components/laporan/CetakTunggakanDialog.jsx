import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Check, FileText, Users, School, BookOpen, Activity } from 'lucide-react';
import { printTunggakanReport } from '@/lib/tunggakanPrint';

const MODES = [
  { key: 'global', label: 'Seluruh Data', desc: 'Semua siswa sesuai filter aktif', icon: FileText },
  { key: 'kelas', label: 'Per Kelas', desc: 'Dipisah section tiap kelas', icon: School },
  { key: 'siswa', label: 'Per Siswa', desc: 'Detail lengkap tiap siswa', icon: Users },
  { key: 'iuran', label: 'Per Jenis Iuran', desc: 'Rekap jenis iuran terpilih (ceklis)', icon: BookOpen },
  { key: 'status', label: 'Per Status', desc: 'Kelompok Lunas/Cicilan/Menunggak', icon: Activity },
];

/**
 * Popup pilihan data cetak Laporan Tunggakan: seluruh data (global),
 * per kelas, per siswa, per jenis iuran, atau per status — dengan opsi
 * penyaringan & bentuk yang dapat disesuaikan.
 */
export default function CetakTunggakanDialog({ isOpen, onClose, rows, taLabel, kelasLabel, iuranLabel }) {
  const [mode, setMode] = useState('global');
  const [pick, setPick] = useState('');
  const [iuranChecked, setIuranChecked] = useState([]);
  const [onlySisa, setOnlySisa] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (isOpen) { setMode('global'); setPick(''); setIuranChecked([]); setOnlySisa(false); setShowDetail(false); }
  }, [isOpen]);

  const options = useMemo(() => {
    if (mode === 'kelas') return [...new Set(rows.map(r => r.nama_kelas).filter(Boolean))].sort();
    if (mode === 'siswa') return rows.map(r => ({ id: r.id, label: `${r.nama} (${r.nama_kelas})` }));
    return [];
  }, [mode, rows]);

  // Daftar jenis iuran untuk ceklisan (mode 'iuran')
  const iuranOptions = useMemo(
    () => [...new Set(rows.flatMap(r => (r.status_items || []).map(it => it.nama)))].sort(),
    [rows]
  );

  const showPick = mode === 'kelas' || mode === 'siswa';
  const pickLabel = mode === 'kelas' ? 'Pilih Kelas' : 'Pilih Siswa';

  const handleCetak = () => {
    printTunggakanReport({
      rows, taLabel, kelasLabel, iuranLabel,
      mode,
      pick: pick && pick !== 'all' ? pick : '',
      iuranPicks: mode === 'iuran' ? iuranChecked : null,
      onlySisa,
      showDetail,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cetak Data Tunggakan</DialogTitle>
          <p className="text-xs text-slate-400">{rows.length} data sesuai filter aktif · TA {taLabel || '-'}</p>
        </DialogHeader>

        <div>
          <Label className="text-xs text-slate-500">Pilih Data yang Akan Dicetak</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
            {MODES.map(m => {
              const Icon = m.icon;
              const active = mode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => { setMode(m.key); setPick(''); if (m.key === 'iuran') setIuranChecked(iuranOptions); }}
                  className={`text-left p-3 rounded-xl border transition-all ${active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                    <p className="text-sm font-semibold text-slate-800">{m.label}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{m.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {showPick && (
          <div>
            <Label className="text-xs text-slate-500">{pickLabel}</Label>
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Semua" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {mode === 'siswa'
                  ? options.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)
                  : options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === 'iuran' && (
          <div>
            <Label className="text-xs text-slate-500">Ceklis Jenis Iuran yang Muncul pada Cetak Laporan</Label>
            <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {iuranOptions.length === 0 && (
                <p className="p-3 text-sm text-slate-400">Tidak ada jenis iuran pada data ini.</p>
              )}
              {iuranOptions.map(nm => {
                const on = iuranChecked.includes(nm);
                return (
                  <button
                    key={nm}
                    type="button"
                    onClick={() => setIuranChecked(prev => on ? prev.filter(x => x !== nm) : [...prev, nm])}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
                      {on && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span className={`text-sm ${on ? 'font-medium text-slate-800' : 'text-slate-400'}`}>{nm}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Cetak hanya menyertakan jenis iuran yang diceklis.</p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs text-slate-500">Opsi Tambahan</Label>
          <button onClick={() => setOnlySisa(v => !v)} className="flex items-center gap-2 text-sm text-slate-700 w-full text-left">
            <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${onlySisa ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
              {onlySisa && <Check className="w-3.5 h-3.5" />}
            </span>
            Hanya siswa dengan sisa tagihan
          </button>
          <button onClick={() => setShowDetail(v => !v)} className="flex items-center gap-2 text-sm text-slate-700 w-full text-left">
            <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${showDetail ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
              {showDetail && <Check className="w-3.5 h-3.5" />}
            </span>
            Sertakan detail per jenis iuran (tiap siswa)
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCetak}>
            <Printer className="w-4 h-4 mr-1" /> Cetak Sekarang
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}