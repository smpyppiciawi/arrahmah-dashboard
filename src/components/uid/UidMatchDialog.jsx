import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Fingerprint } from "lucide-react";

/**
 * Dialog konfirmasi kecocokan orang: saat siswa/pegawai baru dibuat dan
 * ditemukan kandidat record lama, admin memutuskan orang yang sama (UID lama
 * dipakai) atau orang berbeda (UID baru dibuat).
 */
export default function UidMatchDialog({ open, tipe, dataBaru, kandidat = [], onSame, onDifferent, saving }) {
  const [pilih, setPilih] = useState(null);

  useEffect(() => {
    if (open) setPilih(null);
  }, [open, kandidat]);

  const labelIdentitas = (k) => {
    const bagian = [];
    if (tipe === 'Guru') { if (k.nuptk) bagian.push(`NUPTK ${k.nuptk}`); }
    else { if (k.nis) bagian.push(`NIS ${k.nis}`); if (k.nisn) bagian.push(`NISN ${k.nisn}`); }
    return bagian.join(' · ') || '-';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onDifferent(); }}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-blue-600" />
            Kandidat Record Lama Ditemukan
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Data <b>{dataBaru?.nama || ''}</b> ({tipe}) mirip dengan {kandidat.length} record lama.
          Jika ini orang yang sama, record baru akan memakai <b>UID lama</b> agar seluruh riwayat lintas modul tetap terhubung.
        </p>
        <div className="space-y-2">
          {kandidat.map((k) => {
            const aktif = pilih?.id === k.id;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setPilih(k)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  aktif ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{k.nama}</p>
                    <p className="text-xs text-slate-500">{labelIdentitas(k)}</p>
                    {k.tanggal_lahir && <p className="text-xs text-slate-400">Lahir: {k.tanggal_lahir.slice(0, 10)}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge className={k.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                      {k.status || '-'}
                    </Badge>
                    {k.is_arsip && <Badge className="bg-amber-100 text-amber-700">Arsip</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {k.alasan.map((a, i) => <Badge key={i} variant="secondary" className="text-[10px]">{a}</Badge>)}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onDifferent}
            disabled={saving}
          >
            Orang Berbeda (UID Baru)
          </Button>
          <Button
            type="button"
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={() => pilih && onSame(pilih)}
            disabled={!pilih || saving}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
            Orang yang Sama (UID Lama)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}