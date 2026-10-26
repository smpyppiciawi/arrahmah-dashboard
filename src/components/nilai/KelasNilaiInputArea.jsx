import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Plus, Trash2, Lock, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";

/**
 * Area isian nilai pada dialog Input Nilai Per Kelas.
 * Semua kolom Nilai Harian terkunci (read only) sampai Guru memilih satu kolom
 * dan mengonfirmasi "Ya". Kolom lain tetap terkunci agar tidak salah isi.
 * Desktop: tabel gaya Excel dengan kolom Nama dibekukan (sticky) + nomor kolom Nilai 1..n.
 * Mobile : daftar kartu per siswa dengan pilihan Nomor Nilai di atas.
 */
export default function KelasNilaiInputArea({
  isHarianKategori, jenisPenilaian, kelasLabels, kelasNilaiData, kkmPts,
  setNilaiCell, tambahLabel, ubahLabel, hapusLabel,
  activeLabelId, setActiveLabelId, totalTerisi, actions,
}) {
  const [pendingKolom, setPendingKolom] = useState(null);
  const [hapusOpen, setHapusOpen] = useState(false);

  const kolomList = isHarianKategori ? kelasLabels : [{ id: 'ujian', text: '' }];
  const activeKolom = isHarianKategori ? kelasLabels.find(l => l.id === activeLabelId) || null : kolomList[0];
  const activeIndex = activeKolom ? kolomList.findIndex(k => k.id === activeKolom.id) : -1;
  const isEditable = (id) => !isHarianKategori || activeLabelId === id;
  const tersimpan = kelasNilaiData.filter(i => Object.keys(i.existing).length > 0).length;
  const showTable = kelasNilaiData.length > 0;

  const mintaAktif = (kolom) => {
    if (!isHarianKategori || isEditable(kolom.id)) return;
    setPendingKolom(kolom);
  };
  const konfirmasiAktif = () => {
    if (pendingKolom) setActiveLabelId(pendingKolom.id);
    setPendingKolom(null);
  };
  const nilaiTeks = (val) => (val === '' || val == null ? '–' : val);
  const cellClass = (val) =>
    `w-20 mx-auto text-center h-9 font-semibold ${val !== '' && val != null ? (Number(val) >= kkmPts ? 'border-emerald-300 text-emerald-700 bg-emerald-50/40' : 'border-red-300 text-red-700 bg-red-50/40') : ''}`;
  const readClass = (val) =>
    val === '' || val == null
      ? 'border-slate-100 bg-slate-50/70 text-slate-300'
      : Number(val) >= kkmPts
        ? 'border-emerald-100 bg-emerald-50/60 text-emerald-700'
        : 'border-red-100 bg-red-50/60 text-red-600';

  const tambahButton = (variant = 'outline', extra = '') => (
    <Button type="button" size="sm" variant={variant} onClick={tambahLabel} className={extra}>
      <Plus className="w-4 h-4 mr-1" /> Tambah Nilai
    </Button>
  );

  return (
    <div>
      {showTable && (
        <>
          {/* ================= DESKTOP : tabel gaya Excel ================= */}
          <div className="hidden md:block border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
              <p className="text-sm font-semibold text-slate-700">
                Daftar Siswa ({kelasNilaiData.length})
                <span className="ml-2 text-[11px] font-normal text-slate-500">Terisi {totalTerisi} • Tersimpan {tersimpan}</span>
              </p>
              {isHarianKategori ? tambahButton() : (
                <span className="text-[11px] text-slate-500">Nilai {jenisPenilaian || 'Ujian'} — satu kali pelaksanaan</span>
              )}
            </div>

            {isHarianKategori && (
              activeKolom ? (
                <div className="px-4 py-2.5 bg-amber-50/70 border-b border-amber-100 flex flex-wrap items-end gap-3">
                  <div className="flex-shrink-0 pb-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                      <Pencil className="w-3 h-3" /> Mengedit Nilai {activeIndex + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-[240px]">
                    <Label className="text-[11px] text-slate-600">
                      Label Nilai Harian ({activeKolom.text || 'belum diisi'}) — teks bebas per BAB/Materi
                    </Label>
                    <Input
                      className="mt-1 h-9 bg-white"
                      value={activeKolom.text || ''}
                      onChange={(e) => ubahLabel(activeKolom.id, e.target.value)}
                      placeholder="Contoh: BAB 2 Pidato"
                    />
                  </div>
                  <div className="flex gap-2 pb-1">
                    <Button type="button" size="sm" variant="outline" className="h-9 bg-white" onClick={() => setActiveLabelId(null)}>
                      <Lock className="w-3.5 h-3.5 mr-1" /> Selesai
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="h-9 text-red-600 hover:bg-red-50" onClick={() => setHapusOpen(true)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Semua nilai terkunci. Klik judul kolom atau sel Nilai untuk mulai mengedit.
                  </p>
                  {tambahButton()}
                </div>
              )
            )}

            <div className="overflow-auto max-h-[56vh]">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-30 w-[13rem] min-w-[13rem] bg-slate-100 border-b border-r border-slate-200 px-4 py-2.5 text-left text-xs font-bold text-slate-600">
                      Nama Siswa
                    </th>
                    {kolomList.map((k, i) => {
                      const aktif = isHarianKategori && isEditable(k.id);
                      return (
                        <th
                          key={k.id}
                          className={`sticky top-0 z-20 min-w-[104px] border-b border-slate-200 px-2 py-2 ${aktif ? 'bg-amber-100' : 'bg-slate-100'}`}
                        >
                          <button
                            type="button"
                            onClick={() => mintaAktif(k)}
                            disabled={aktif}
                            className={`w-full flex flex-col items-center gap-0.5 rounded-md px-1 py-0.5 transition-colors ${aktif ? 'cursor-default' : 'hover:bg-white/70'}`}
                            title={isHarianKategori ? (k.text || 'Klik untuk mengedit label') : 'Nilai Ujian'}
                          >
                            <span className={`inline-flex items-center gap-1 text-xs font-bold ${aktif ? 'text-amber-700' : 'text-slate-600'}`}>
                              {isHarianKategori ? `Nilai ${i + 1}` : `Nilai ${jenisPenilaian || 'Ujian'}`}
                              {isHarianKategori && !aktif && <Lock className="w-3 h-3 text-slate-400" />}
                            </span>
                            {isHarianKategori && (
                              <span className={`text-[10px] max-w-[96px] truncate ${aktif ? 'text-amber-700 font-medium' : 'text-slate-400'}`}>
                                {k.text || 'Tanpa label'}
                              </span>
                            )}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {kelasNilaiData.map((item) => (
                    <tr key={item.siswa_id} className="group">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-r border-slate-100 px-4 py-2 align-middle">
                        <div className="flex items-start gap-1.5">
                          <span className="w-[10.5rem] text-[13px] leading-snug text-slate-800 break-words line-clamp-2" title={item.nama_siswa}>
                            {item.nama_siswa}
                          </span>
                          {Object.keys(item.existing).length > 0 && (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      </td>
                      {kolomList.map((k) => {
                        const val = item.values[k.id] ?? item.existing[k.id]?.nilai ?? '';
                        const editable = isEditable(k.id);
                        return (
                          <td
                            key={k.id}
                            className={`border-b border-slate-100 px-2 py-1.5 text-center ${isHarianKategori && isEditable(k.id) ? 'bg-amber-50/50' : ''}`}
                          >
                            {editable ? (
                              <Input
                                type="number" min="0" max="100" inputMode="numeric" placeholder="–"
                                className={cellClass(val)}
                                value={val}
                                onChange={(e) => setNilaiCell(item.siswa_id, k.id, e.target.value)}
                                onFocus={(e) => e.target.select()}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => mintaAktif(k)}
                                className={`w-20 mx-auto h-9 rounded-lg border text-sm font-semibold transition-colors hover:ring-2 hover:ring-amber-300 ${readClass(val)}`}
                                title="Klik untuk mengedit kolom ini"
                              >
                                {nilaiTeks(val)}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-2 text-[11px] text-slate-400 bg-slate-50 border-t border-slate-100">
              Baris kosong tidak tersimpan; nilai yang sudah ada otomatis diperbarui saat disimpan. Nilai maksimal 100.
            </p>
          </div>

          {/* ================= MOBILE ================= */}
          <div className="md:hidden">
            <div className="sticky top-0 z-30 -mx-6 px-6 py-3 bg-white/95 backdrop-blur border-b border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 leading-tight">Daftar Siswa ({kelasNilaiData.length})</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    Terisi {totalTerisi} • Tersimpan {tersimpan}
                    {tersimpan > 0 && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                  </p>
                </div>
                {isHarianKategori && tambahButton('default', 'bg-amber-500 hover:bg-amber-600 text-white rounded-full px-4 flex-shrink-0')}
              </div>

              {/* Pilihan kolom Nilai 1..n */}
              {isHarianKategori && kolomList.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                  {kolomList.map((k, i) => {
                    const aktif = isEditable(k.id);
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => mintaAktif(k)}
                        className={`flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                          aktif
                            ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/30'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          Nilai {i + 1}
                          {!aktif && <Lock className="w-3 h-3 text-slate-400" />}
                        </span>
                        <span className={`block text-[10px] font-medium truncate max-w-[92px] ${aktif ? 'text-amber-50' : 'text-slate-400'}`}>
                          {k.text || 'Tanpa label'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Kartu label kolom aktif */}
            {isHarianKategori && (activeKolom ? (
              <div className="mt-3 border border-amber-200 rounded-2xl p-3.5 bg-amber-50/60 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                    <Pencil className="w-3 h-3" /> Mengedit Nilai {activeIndex + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="sm" variant="outline" className="h-8 bg-white px-2.5" onClick={() => setActiveLabelId(null)}>
                      <Lock className="w-3.5 h-3.5" />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="h-8 px-2.5 text-red-600 hover:bg-red-50" onClick={() => setHapusOpen(true)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] text-slate-600">Label Nilai Harian — teks bebas per BAB/Materi</Label>
                  <Input
                    className="mt-1 h-9 bg-white"
                    value={activeKolom.text || ''}
                    onChange={(e) => ubahLabel(activeKolom.id, e.target.value)}
                    placeholder="Contoh: BAB 2 Pidato"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-3 border border-slate-200 rounded-2xl p-3.5 bg-white flex items-start gap-2">
                <Lock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  Semua nilai terkunci. Pilih <span className="font-semibold text-slate-700">Nilai 1, Nilai 2, …</span> di atas untuk mulai mengedit kolom tersebut.
                </p>
              </div>
            ))}

            {/* Daftar siswa */}
            <div className="mt-3 bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-sm">
              {kelasNilaiData.map((item) => {
                if (!activeKolom) {
                  const first = kolomList[0];
                  const val = first ? (item.values[first.id] ?? item.existing[first.id]?.nilai ?? '') : '';
                  return (
                    <div key={item.siswa_id} className="flex items-start gap-3 px-4 py-3">
                      <span className="flex-1 min-w-0 text-sm text-slate-800 break-words leading-snug line-clamp-2">{item.nama_siswa}</span>
                      <span className={`w-20 h-9 flex-shrink-0 rounded-lg border flex items-center justify-center text-sm font-semibold ${readClass(val)}`}>
                        {nilaiTeks(val)}
                      </span>
                      <span className="w-5 flex-shrink-0" />
                    </div>
                  );
                }
                const val = item.values[activeKolom.id] ?? item.existing[activeKolom.id]?.nilai ?? '';
                const saved = !!item.existing[activeKolom.id];
                const editable = isEditable(activeKolom.id);
                return (
                  <div key={item.siswa_id} className="flex items-start gap-3 px-4 py-3">
                    <span className="flex-1 min-w-0 text-sm text-slate-800 break-words leading-snug line-clamp-2">{item.nama_siswa}</span>
                    {editable ? (
                      <Input
                        type="number" min="0" max="100" placeholder="–" inputMode="numeric"
                        className={`w-24 flex-shrink-0 h-9 ${cellClass(val)}`}
                        value={val}
                        onChange={(e) => setNilaiCell(item.siswa_id, activeKolom.id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => mintaAktif(activeKolom)}
                        className={`w-20 h-9 flex-shrink-0 rounded-lg border text-sm font-semibold ${readClass(val)}`}
                      >
                        {nilaiTeks(val)}
                      </button>
                    )}
                    <span className="w-5 flex-shrink-0 flex justify-center pt-2">
                      {saved && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Nilai maksimal 100. Baris kosong tidak tersimpan; nilai yang sudah ada otomatis diperbarui saat disimpan.</p>
          </div>
        </>
      )}

      {/* ===== MOBILE: footer sticky — tombol aksi selalu terlihat tanpa scroll ===== */}
      <div className={
        showTable
          ? 'md:hidden sticky bottom-0 z-30 -mx-6 mt-4 px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur border-t border-slate-100 space-y-2.5'
          : 'md:hidden pt-1'
      }>
        {actions}
      </div>

      {/* ===== DESKTOP: tombol aksi biasa di akhir form ===== */}
      <div className="hidden md:block pt-4">{actions}</div>

      {/* Konfirmasi sebelum kolom nilai aktif */}
      <Dialog open={!!pendingKolom} onOpenChange={(v) => !v && setPendingKolom(null)}>
        <DialogContent className="w-[92vw] max-w-sm">
          <DialogHeader>
            <DialogTitle>Aktifkan Kolom Nilai</DialogTitle>
            <DialogDescription>
              Anda akan mengedit{' '}
              <span className="font-semibold text-slate-800">
                {pendingKolom ? `Nilai ${kolomList.findIndex(k => k.id === pendingKolom.id) + 1}` : 'Nilai'}
                {pendingKolom?.text ? ` (${pendingKolom.text})` : ''}
              </span>? Kolom nilai lain tetap terkunci dan hanya bisa dilihat.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => setPendingKolom(null)}>Tidak</Button>
            <Button type="button" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={konfirmasiAktif}>Ya</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus kolom label */}
      <ConfirmDialog
        open={hapusOpen}
        onOpenChange={setHapusOpen}
        onConfirm={() => { if (activeKolom) hapusLabel(activeKolom.id); setActiveLabelId(null); }}
        title="Hapus Kolom Nilai"
        description="Apakah Anda yakin ingin menghapus kolom label ini?"
      />
    </div>
  );
}