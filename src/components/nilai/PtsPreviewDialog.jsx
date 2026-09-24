import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

export default function PtsPreviewDialog({ preview, onClose }) {
  return (
    <Dialog open={!!preview} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[95vw] max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="truncate pr-4 text-base">{preview?.filename || 'Pratinjau PDF'}</DialogTitle>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => preview && window.open(preview.url, '_blank')}>
              <Printer className="w-4 h-4" /> Cetak
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => preview && preview.doc.save(preview.filename)}
            >
              <Download className="w-4 h-4" /> Unduh PDF
            </Button>
          </div>
        </DialogHeader>
        {preview?.url && (
          <iframe
            src={preview.url}
            title="Pratinjau PDF"
            className="flex-1 w-full rounded-lg border border-slate-200 bg-slate-100"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}