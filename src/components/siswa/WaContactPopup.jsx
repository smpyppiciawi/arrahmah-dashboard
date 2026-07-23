import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export default function WaContactPopup({ siswa, onClose }) {
  const contacts = [];
  if (siswa.kontak_list && siswa.kontak_list.length > 0) {
    siswa.kontak_list.forEach(k => { if (k.no_telp) contacts.push({ no_telp: k.no_telp, hubungan: k.hubungan || 'Ortu' }); });
  }
  if (siswa.no_telp_ortu && !contacts.find(c => c.no_telp === siswa.no_telp_ortu)) {
    contacts.push({ no_telp: siswa.no_telp_ortu, hubungan: 'Ortu' });
  }

  const openWA = (noTelp) => {
    const cleaned = noTelp.replace(/\D/g, '').replace(/^0/, '62');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            Kontak WA — {siswa.nama}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {contacts.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-700">{c.hubungan}</p>
                <p className="text-xs text-slate-500">{c.no_telp}</p>
              </div>
              <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => openWA(c.no_telp)}>
                <MessageCircle className="w-4 h-4 mr-1" /> WA
              </Button>
            </div>
          ))}
          {contacts.length === 0 && <p className="text-center text-slate-400 py-4">Tidak ada kontak tersedia</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}