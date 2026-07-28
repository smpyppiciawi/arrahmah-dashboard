import React, { useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function BarcodeDialog({ items, open, onClose }) {
  const { toast } = useToast();
  const itemsList = Array.isArray(items) ? items : items ? [items] : [];

  useEffect(() => {
    if (open && itemsList.length > 0) {
      // Small delay to ensure SVG elements are rendered
      setTimeout(() => {
        itemsList.forEach((item, i) => {
          const svg = document.getElementById(`barcode-svg-${i}`);
          if (svg && item.kode_barang) {
            try {
              JsBarcode(svg, item.kode_barang, {
                format: 'CODE128',
                width: 2,
                height: 60,
                displayValue: true,
                fontSize: 14,
                margin: 10,
              });
            } catch (e) {
              console.error('Barcode error:', e);
            }
          }
        });
      }, 100);
    }
  }, [open, itemsList]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    const barcodesHtml = itemsList.map((item, i) => {
      const svg = document.getElementById(`barcode-svg-${i}`);
      const svgString = svg ? new XMLSerializer().serializeToString(svg) : '';
      return `<div style="display:inline-block;margin:8px;text-align:center;border:1px solid #ccc;padding:10px;border-radius:8px;">
        ${svgString}
        <div style="font-size:11px;margin-top:4px;max-width:220px;word-wrap:break-word;font-family:'Courier New',monospace;">${item.nama_barang || ''}</div>
      </div>`;
    }).join('');

    printWindow.document.write(`<html><head><title>Cetak Barcode Sarpras</title><style>body{font-family:'Courier New',monospace;padding:20px;}@media print{.no-print{display:none;}}</style></head><body><div style="display:flex;flex-wrap:wrap;gap:5px;">${barcodesHtml}</div><div class="no-print" style="text-align:center;margin-top:20px;"><button onclick="window.print()" style="padding:8px 16px;font-size:14px;cursor:pointer;">Cetak</button></div></body></html>`);
    printWindow.document.close();
  };

  const handleCopy = (kode) => {
    navigator.clipboard.writeText(kode);
    toast({ title: 'Tersalin', description: `Kode ${kode} disalin ke clipboard.` });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Printer className="w-5 h-5 text-teal-500" />
            Barcode ({itemsList.length} item)
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-end mb-2">
          <Button size="sm" onClick={handlePrint} className="gap-1 bg-teal-600 hover:bg-teal-700">
            <Printer className="w-3.5 h-3.5" /> Cetak Semua
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {itemsList.map((item, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3 text-center">
              <svg id={`barcode-svg-${i}`}></svg>
              <p className="text-xs font-medium text-slate-700 mt-1 truncate" title={item.nama_barang}>{item.nama_barang}</p>
              <button
                onClick={() => handleCopy(item.kode_barang)}
                className="text-xs text-teal-600 hover:underline mt-1 font-mono inline-flex items-center gap-1"
              >
                <Copy className="w-2.5 h-2.5" /> {item.kode_barang}
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}