import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Maximize2 } from "lucide-react";

// Sel Rincian pada tabel pelanggaran: ringkas, dapat dibuka penuh.
export default function RincianCell({ rincian }) {
  const [open, setOpen] = useState(false);
  const text = (rincian || '').trim();

  if (!text) return <span className="text-xs text-slate-300">—</span>;

  const panjang = text.length > 70;

  return (
    <div className="min-w-0">
      <p className={`text-xs text-slate-600 ${panjang ? 'line-clamp-2' : ''}`}>{text}</p>
      {panjang && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-indigo-600 hover:underline"
        >
          <Maximize2 className="w-2.5 h-2.5" /> Lihat lengkap
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm text-slate-700">Rincian Pelanggaran</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{text}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}