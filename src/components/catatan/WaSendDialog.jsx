import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Send, CheckCircle2, XCircle, MessageCircle, Phone } from "lucide-react";
import { base44 } from '@/api/base44Client';

/**
 * Membangun daftar target WA (Wali Kelas + Orang Tua) dari data siswa & kelas.
 * @param {object} siswa - record Siswa
 * @param {object} kelas - record Kelas
 * @param {array} guruList - daftar Guru
 * @returns {array} targets - [{ key, label, name, phone }]
 */
export function buildWaTargets(siswa, kelas, guruList) {
  const targets = [];
  if (kelas?.wali_kelas) {
    const waliGuru = (guruList || []).find(g => g.nama === kelas.wali_kelas);
    if (waliGuru?.no_telp) {
      targets.push({ key: 'wali_kelas', label: 'Wali Kelas', name: waliGuru.nama, phone: waliGuru.no_telp });
    }
  }
  if (siswa?.kontak_list?.length > 0) {
    siswa.kontak_list.forEach((k, i) => {
      if (k.no_telp) {
        targets.push({ key: `ortu_${i}`, label: `Orang Tua (${k.hubungan || 'Wali'})`, name: k.hubungan || '', phone: k.no_telp });
      }
    });
  } else if (siswa?.no_telp_ortu) {
    targets.push({ key: 'ortu', label: 'Orang Tua', name: siswa.nama_ayah_kandung || siswa.nama_ibu_kandung || '', phone: siswa.no_telp_ortu });
  }
  return targets;
}

/**
 * Dialog untuk memilih tujuan pengiriman WA (Wali Kelas / Orang Tua) lalu
 * mengirim pesan melalui WA Gateway (backend function sendWANotif).
 */
export default function WaSendDialog({ open, onOpenChange, targets, message, onSent }) {
  const [sending, setSending] = useState(null);
  const [sentStatus, setSentStatus] = useState({});

  const handleSend = async (target) => {
    if (!target.phone) return;
    setSending(target.key);
    try {
      await base44.functions.invoke('sendWANotif', { phone: target.phone, message });
      setSentStatus(prev => ({ ...prev, [target.key]: 'success' }));
      onSent?.(target);
    } catch (err) {
      setSentStatus(prev => ({ ...prev, [target.key]: 'error' }));
    } finally {
      setSending(null);
    }
  };

  const handleClose = (open) => {
    if (!open) {
      setSentStatus({});
      setSending(null);
    }
    onOpenChange(open);
  };

  const availableTargets = (targets || []).filter(t => t.phone);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Kirim ke WA Gateway
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {message && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {message}
            </div>
          )}
          {availableTargets.length === 0 ? (
            <div className="text-center py-6">
              <Phone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Tidak ada nomor WA tujuan tersedia untuk siswa ini.</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-600">Pilih tujuan pengiriman:</p>
              {availableTargets.map(target => {
                const status = sentStatus[target.key];
                const isSending = sending === target.key;
                return (
                  <div key={target.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{target.label}</p>
                      {target.name && <p className="text-xs text-slate-500 truncate">{target.name}</p>}
                      <p className="text-xs text-slate-400">{target.phone}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSend(target)}
                      disabled={isSending || status === 'success'}
                      className={
                        status === 'success' ? 'bg-green-600 hover:bg-green-600' :
                        status === 'error' ? 'bg-red-600 hover:bg-red-700' :
                        'bg-green-600 hover:bg-green-700'
                      }
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> :
                       status === 'success' ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Terkirim</> :
                       status === 'error' ? <><XCircle className="w-4 h-4 mr-1" /> Coba Lagi</> :
                       <><Send className="w-4 h-4 mr-1" /> Kirim</>}
                    </Button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}