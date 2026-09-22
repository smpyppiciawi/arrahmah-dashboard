import React, { useState } from 'react';
import { X, Printer, Download, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BukuIndukDocument from './BukuIndukDocument';
import { exportBukuIndukPdf } from '@/lib/bukuIndukPdf';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default function BukuIndukPreviewDialog({ open, bundles, defaultDownload, onClose }) {
  const [busy, setBusy] = useState(null);
  if (!open || !bundles?.length) return null;

  const handlePrint = () => {
    // Pindahkan dokumen ke body agar print dirender di root halaman (bukan di dalam layout aplikasi)
    const root = document.getElementById('buku-induk-print-root');
    if (!root) { window.print(); return; }
    const parent = root.parentNode;
    const next = root.nextSibling;
    document.body.appendChild(root);
    const restore = () => {
      window.removeEventListener('afterprint', restore);
      if (root.parentNode === document.body) parent.insertBefore(root, next);
    };
    window.addEventListener('afterprint', restore);
    window.setTimeout(restore, 120000);
    window.print();
  };

  const handleDownloadCombined = async () => {
    setBusy('pdf');
    try {
      const root = document.getElementById('buku-induk-print-root');
      const pages = root ? [...root.querySelectorAll('.bi-page')] : [];
      const name = bundles.length === 1
        ? `Buku Induk - ${bundles[0].siswa.nama} (${bundles[0].siswa.nis}).pdf`
        : `Buku Induk - ${bundles.length} Siswa.pdf`;
      await exportBukuIndukPdf(pages, name);
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadPerSiswa = async () => {
    setBusy('perSiswa');
    try {
      const groups = [...document.querySelectorAll('[data-bi-student]')];
      for (const g of groups) {
        const nama = g.getAttribute('data-bi-student');
        const pages = [...g.querySelectorAll('.bi-page')];
        // eslint-disable-next-line no-await-in-loop
        await exportBukuIndukPdf(pages, `Buku Induk - ${nama}.pdf`);
        // eslint-disable-next-line no-await-in-loop
        await delay(700);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bi-dialog fixed inset-0 z-[100] bg-slate-700/70 overflow-y-auto">
      <div className="bi-no-print sticky top-0 z-10 bg-slate-900/95 backdrop-blur px-4 py-2.5 flex items-center gap-2 shadow-lg">
        <h3 className="text-white text-sm font-semibold flex-1 truncate">
          Preview Buku Induk — {bundles.length} siswa
        </h3>
        <Button size="sm" variant="secondary" onClick={handlePrint} className="gap-1.5">
          <Printer className="w-3.5 h-3.5" /> Print
        </Button>
        <Button
          size="sm"
          variant={defaultDownload === 'perSiswa' ? 'outline' : 'default'}
          onClick={handleDownloadCombined}
          disabled={!!busy}
          className="gap-1.5"
        >
          {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Unduh PDF {bundles.length > 1 ? '(Gabungan)' : ''}
        </Button>
        {bundles.length > 1 && (
          <Button
            size="sm"
            variant={defaultDownload === 'perSiswa' ? 'default' : 'outline'}
            onClick={handleDownloadPerSiswa}
            disabled={!!busy}
            className="gap-1.5"
          >
            {busy === 'perSiswa' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            Unduh PDF Per Siswa
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          disabled={!!busy}
          onClick={onClose}
          className="text-slate-300 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div id="buku-induk-print-root" className="py-6 flex flex-col items-center gap-6">
        {bundles.map((b, i) => (
          <BukuIndukDocument key={b.siswa.id || i} bundle={b} />
        ))}
      </div>
    </div>
  );
}