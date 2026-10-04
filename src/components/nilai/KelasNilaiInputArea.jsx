import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, MoreVertical, Plus, Pencil, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";

/**
 * Area isian nilai pada dialog Input Nilai Per Kelas.
 * Mobile: mode sheet per BAB (satu label aktif, tab pill BAB di bawah, edit/hapus label via menu titik-tiga).
 * Desktop: tabel rapat (kolom label inline) seperti sebelumnya.
 */
export default function KelasNilaiInputArea({
  isHarianKategori, jenisPenilaian, kelasLabels, kelasNilaiData, kkmPts,
  setNilaiCell, tambahLabel, ubahLabel, hapusLabel,
  activeLabelId, setActiveLabelId, totalTerisi, actions,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [hapusOpen, setHapusOpen] = useState(false);
  const [editText, setEditText] = useState('');

  const kolom = isHarianKategori
    ? (kelasLabels.find(l => l.id === activeLabelId) || kelasLabels[0] || null)
    : { id: 'ujian', label: '' };
  const judulKolom = isHarianKategori
    ? (kolom?.text || kolom?.label || 'Nilai Harian')
    : `Nilai ${jenisPenilaian || 'Ujian'}`;
  const tersimpan = kelasNilaiData.filter(i => Object.keys(i.existing).length > 0).length;
  const showTable = kelasNilaiData.length > 0;

  const cellClass = (val) =>
    `text-center h-11 rounded-xl text-base font-semibold ${val !== '' && val != null ? (Number(val) >= kkmPts ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-700') : ''}`;

  return (
    <div>
      {showTable && (
        <>
          {/* ===== MOBILE: sheet per BAB ===== */}
          <div className="md:hidden">
            {/* Header ringkasan menempel di atas */}
            <div className="sticky top-0 z-30 -mx-6 px-6 py-3 bg-white/95 backdrop-blur border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 leading-tight">Daftar Siswa ({kelasNilaiData.length})</p>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  Terisi {totalTerisi} • Tersimpan {tersimpan}
                  {tersimpan > 0 && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                </p>
              </div>
              {isHarianKategori && (
                <Button type="button" size="sm" onClick={tambahLabel} className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-4 flex-shrink-0">
                  <Plus className="w-4 h-4 mr-1" /> Tambah Nilai
                </Button>
              )}
            </div>

            {/* Kartu judul BAB/label aktif */}
            <div className="mt-4 border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-3 bg-white shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 leading-snug">{judulKolom}</h3>
              {isHarianKategori && (
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="p-2 -mr-2 -mt-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
                  title="Opsi label"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Daftar siswa — baris besar ramah sentuh */}
            <div className="mt-3 bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-sm">
              {kelasNilaiData.map((item) => {
                if (!kolom) return null;
                const val = item.values[kolom.id] ?? item.existing[kolom.id]?.nilai ?? '';
                const saved = !!item.existing[kolom.id];
                return (
                  <div key={item.siswa_id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 min-w-0 text-[15px] text-slate-800 truncate">{item.nama_siswa}</span>
                    <Input
                      type="number" min="0" max="100" placeholder="0" inputMode="numeric"
                      className={`w-24 flex-shrink-0 ${cellClass(val)}`}
                      value={val}
                      onChange={(e) => setNilaiCell(item.siswa_id, kolom.id, e.target.value)}
                    />
                    <span className="w-5 flex-shrink-0 flex justify-center">
                      {saved && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Baris kosong tidak tersimpan; nilai yang sudah ada otomatis diperbarui saat disimpan.</p>
          </div>

          {/* ===== DESKTOP: tabel rapat ===== */}
          <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Daftar Siswa ({kelasNilaiData.length})</p>
              <p className="text-[11px] text-slate-500">
                Terisi {totalTerisi} • Tersimpan {tersimpan}
              </p>
            </div>
            {isHarianKategori && (
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-slate-500">Label Nilai Harian ({kelasLabels.length}) — teks bebas per BAB/materi</p>
                <Button type="button" size="sm" variant="outline" onClick={tambahLabel}>
                  <Plus className="w-4 h-4 mr-1" /> Tambah Nilai
                </Button>
              </div>
            )}
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2 font-semibold text-slate-600 bg-slate-50">Siswa</th>
                    {(isHarianKategori ? kelasLabels : [{ id: 'ujian', label: '' }]).map(k => (
                      <th key={k.id} className="px-2 py-1.5 min-w-[140px] bg-slate-50">
                        {isHarianKategori ? (
                          <div className="flex items-center gap-1">
                            <Input value={k.text || ''} onChange={(e) => ubahLabel(k.id, e.target.value)} placeholder="Label Nilai" className="h-7 text-xs px-2" />
                            <button type="button" onClick={() => hapusLabel(k.id)} className="text-slate-300 hover:text-red-500 flex-shrink-0" title="Hapus kolom">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-600">Nilai {jenisPenilaian || 'Ujian'}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kelasNilaiData.map((item) => (
                    <tr key={item.siswa_id}>
                      <td className="px-4 py-2 text-sm text-slate-700 truncate max-w-[180px] sticky left-0 bg-white">
                        {item.nama_siswa}
                        {Object.keys(item.existing).length > 0 && <CheckCircle className="inline w-3.5 h-3.5 text-emerald-500 ml-1 -mt-0.5" />}
                      </td>
                      {(isHarianKategori ? kelasLabels : [{ id: 'ujian', label: '' }]).map(k => {
                        const val = item.values[k.id] ?? item.existing[k.id]?.nilai ?? '';
                        return (
                          <td key={k.id} className="px-2 py-1.5">
                            <Input
                              type="number" min="0" max="100" placeholder="0"
                              className={`w-20 text-center h-8 text-sm font-medium ${val !== '' && val != null ? (Number(val) >= kkmPts ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-700') : ''}`}
                              value={val}
                              onChange={(e) => setNilaiCell(item.siswa_id, k.id, e.target.value)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-2 text-[11px] text-slate-400 bg-slate-50 border-t border-slate-100">Baris kosong tidak tersimpan; nilai yang sudah ada otomatis diperbarui saat disimpan.</p>
          </div>
        </>
      )}

      {/* ===== MOBILE: footer sticky — tab BAB + tombol aksi selalu terlihat tanpa scroll ===== */}
      <div className={
        showTable
          ? 'md:hidden sticky bottom-0 z-30 -mx-6 mt-4 px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur border-t border-slate-100 space-y-2.5'
          : 'md:hidden pt-1'
      }>
        {showTable && isHarianKategori && kelasLabels.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {kelasLabels.map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => setActiveLabelId(l.id)}
                className={`flex-none px-4 py-2 rounded-full text-sm font-semibold max-w-[140px] truncate transition-all ${
                  kolom?.id === l.id
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                    : 'bg-white border border-slate-300 text-slate-600 hover:border-amber-300'
                }`}
              >
                {l.text || 'Nilai Harian'}
              </button>
            ))}
          </div>
        )}
        {actions}
      </div>

      {/* ===== DESKTOP: tombol aksi biasa di akhir form ===== */}
      <div className="hidden md:block">{actions}</div>

      {/* Menu titik-tiga: Ubah / Hapus label */}
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="w-[90vw] max-w-xs">
          <DialogHeader><DialogTitle>Opsi Label</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => { setEditText(kolom?.text || ''); setMenuOpen(false); setEditOpen(true); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-amber-50 hover:border-amber-300 transition-colors text-left"
            >
              <Pencil className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-800">Ubah Label</span>
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); setHapusOpen(true); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-300 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm font-medium text-red-600">Hapus Kolom</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog ubah label */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[90vw] max-w-sm">
          <DialogHeader><DialogTitle>Ubah Label</DialogTitle></DialogHeader>
          <Input value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="Contoh: Nilai BAB 1" autoFocus />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button type="button" size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { if (kolom) ubahLabel(kolom.id, editText); setEditOpen(false); }}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus kolom label */}
      <ConfirmDialog
        open={hapusOpen}
        onOpenChange={setHapusOpen}
        onConfirm={() => { if (kolom) hapusLabel(kolom.id); }}
        title="Hapus Kolom Nilai"
        description="Apakah Anda yakin ingin menghapus kolom label ini?"
      />
    </div>
  );
}