import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getNamaPelapor, getNamaPencatat } from '@/lib/pelanggaranMeta';

// Popup detail daftar catatan per kategori — dipanggil dari CatatanSection
export default function CatatanDetailDialog({ section, open, onOpenChange }) {
  if (!section) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 rounded-3xl overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-800">
            <span className="text-xl">{section.emoji}</span> {section.title}
          </DialogTitle>
          <p className="text-xs text-slate-400">
            {section.records.length} data tercatat{section.poin != null ? ` · ${section.poin} poin` : ''}
          </p>
        </DialogHeader>
        <div className="px-4 py-4 overflow-y-auto space-y-2">
          {section.records.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">Belum ada data tercatat</p>
          ) : (
            section.records.map((r, idx) => (
              <RecordItem key={idx} record={r} sectionKey={section.key} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ children, className }) {
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${className}`}>{children}</span>;
}

function RecordItem({ record: r, sectionKey }) {
  if (sectionKey === 'pelanggaran') {
    if (r.sumber === 'baru') {
      return (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[9px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">{r.kode}</span>
                <span className="text-[9px] text-slate-400">{r.kategori_utama}</span>
              </div>
              <p className="font-semibold text-slate-800 text-sm">{r.uraian_pelanggaran}</p>
              {r.rincian && <p className="text-slate-400 text-xs mt-0.5">{r.rincian}</p>}
              <p className="text-slate-400 text-xs mt-1">{r.tanggal} · Pelapor: {getNamaPelapor(r)} · Pencatat: {getNamaPencatat(r)}</p>
              {r.tindak_lanjut && <p className="text-amber-500 text-xs mt-1">📋 {r.tindak_lanjut}</p>}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-red-600 font-black text-lg">{r.poin}</span>
              <span className="text-[9px] text-red-400">poin</span>
              <StatusBadge className={
                r.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700'
                  : r.status === 'Dibatalkan' ? 'bg-slate-200 text-slate-500 line-through'
                  : 'bg-amber-100 text-amber-700'}>{r.status}</StatusBadge>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">{r.uraian}</p>
            <p className="text-slate-400 text-xs mt-1">{r.tanggal} · {r.jenis_pelanggaran}</p>
            {r.sanksi && <p className="text-red-500 text-xs mt-1">⚡ {r.sanksi}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-red-600 font-black text-lg">{r.poin}</span>
            <span className="text-[9px] text-red-400">poin</span>
            <StatusBadge className={r.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{r.status}</StatusBadge>
          </div>
        </div>
      </div>
    );
  }

  if (sectionKey === 'improvement') {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{r.kategori}</span>
            <p className="font-semibold text-slate-800 text-sm mt-1">{r.kegiatan_pembinaan_nama || r.uraian}</p>
            {r.uraian && r.kegiatan_pembinaan_nama && <p className="text-slate-400 text-xs mt-0.5">{r.uraian}</p>}
            <p className="text-slate-400 text-xs mt-1">{r.tanggal} · {r.validator_nama || '-'}</p>
            {r.catatan && <p className="text-slate-500 text-xs mt-1">📝 {r.catatan}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-emerald-600 font-black text-lg">-{r.poin_pengurangan}</span>
            <span className="text-[9px] text-emerald-500">poin</span>
            <StatusBadge className={r.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>{r.status}</StatusBadge>
          </div>
        </div>
      </div>
    );
  }

  if (sectionKey === 'prestasi') {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-2xl flex items-center justify-center text-xl shrink-0">🏆</div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm">{r.nama_prestasi}</p>
            <p className="text-slate-500 text-xs mt-0.5">{r.tanggal} · {r.jenis_prestasi}</p>
            {r.penyelenggara && <p className="text-slate-400 text-xs">{r.penyelenggara}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] font-bold bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">{r.kategori}</span>
            <span className="text-[10px] text-slate-400">{r.tingkat}</span>
          </div>
        </div>
      </div>
    );
  }

  if (sectionKey === 'uks') {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center shrink-0">💊</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">{r.keluhan || r.diagnosa || 'Kunjungan UKS'}</p>
            <p className="text-slate-400 text-xs mt-0.5">{r.tanggal} · {r.jam_masuk}</p>
            {r.penanganan && <p className="text-slate-500 text-xs mt-1">🩹 {r.penanganan}</p>}
            <StatusBadge className={r.status === 'Di UKS' ? 'bg-rose-100 text-rose-700 mt-1 inline-block' : 'bg-emerald-100 text-emerald-700 mt-1 inline-block'}>{r.status}</StatusBadge>
          </div>
        </div>
      </div>
    );
  }

  if (sectionKey === 'izin') {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">{r.alasan_manual || r.alasan}</p>
            <p className="text-slate-400 text-xs mt-0.5">{r.tanggal} · Jam {r.jam_izin}</p>
            {r.keterangan && <p className="text-slate-500 text-xs mt-1">{r.keterangan}</p>}
          </div>
          <StatusBadge className="bg-blue-100 text-blue-700">{r.alasan}</StatusBadge>
        </div>
      </div>
    );
  }

  if (sectionKey === 'menstruasi') {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 bg-pink-100 rounded-2xl flex items-center justify-center shrink-0">🌙</div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">{r.tanggal}</p>
          <p className="text-slate-400 text-xs">{r.nama_kelas}</p>
        </div>
      </div>
    );
  }

  // jumat (Keputrian/Jumatan)
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-violet-100 rounded-2xl flex items-center justify-center shrink-0">🕌</div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">{r.tanggal}</p>
          {r.keterangan && <p className="text-slate-400 text-xs truncate">{r.keterangan}</p>}
        </div>
      </div>
      <StatusBadge className={
        r.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700'
          : r.status === 'Alfa' ? 'bg-red-100 text-red-700'
          : 'bg-amber-100 text-amber-700'}>{r.status}</StatusBadge>
    </div>
  );
}