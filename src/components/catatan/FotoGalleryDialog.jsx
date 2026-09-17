import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

// Galeri foto bukti record Improvement (bisa lebih dari 1 foto).
export default function FotoGalleryDialog({ record, onClose }) {
  const fotos = record?.foto_urls || [];
  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Foto Bukti — {record?.nama_siswa} ({record?.nama_kelas})</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 -mt-2 mb-3">
          {record?.uraian_pelanggaran || record?.kegiatan_pembinaan_nama || record?.uraian || ''} · {record?.tanggal || ''}
        </p>
        {fotos.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Tidak ada foto</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {fotos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border border-slate-200 hover:shadow-md transition-shadow">
                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-32 object-cover" />
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 py-1">
                  Foto {i + 1} <ExternalLink className="w-3 h-3" />
                </div>
              </a>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}