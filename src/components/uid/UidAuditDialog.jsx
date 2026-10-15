import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, RefreshCw } from "lucide-react";

/**
 * Audit baca-saja: record tanpa UID, UID ganda, dan relasi riwayat
 * yang kosong / menunjuk ID tidak dikenal. Admin-only (fungsi backend menegakkan).
 */
export default function UidAuditDialog({ open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasil, setHasil] = useState(null);

  const jalankan = async () => {
    setLoading(true);
    setError('');
    setHasil(null);
    try {
      const res = await base44.functions.invoke('auditUidRelasi', {});
      setHasil(res.data);
    } catch (e) {
      setError(e?.message || 'Gagal menjalankan audit.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && !hasil && !loading && !error) jalankan();
  }, [open]);

  const adaMasalah = (r) => r.kosong > 0 || r.tidak_ditemukan > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Audit UID &amp; Relasi Lintas Modul
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memeriksa data...
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm p-3 flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={jalankan}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Ulangi</Button>
          </div>
        )}

        {hasil && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {['siswa', 'guru'].map((k) => (
                <div key={k} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{k === 'siswa' ? 'Siswa' : 'Pegawai'}</p>
                  <p className="text-2xl font-bold text-slate-800">{hasil[k]?.total ?? 0}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge className={(hasil[k]?.tanpa_uid || 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                      Tanpa UID: {hasil[k]?.tanpa_uid ?? 0}
                    </Badge>
                    <Badge className={(hasil[k]?.duplikat?.length || 0) > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}>
                      UID ganda: {hasil[k]?.duplikat?.length || 0}
                    </Badge>
                  </div>
                  {(hasil[k]?.duplikat?.length || 0) > 0 && (
                    <div className="mt-2 space-y-1">
                      {hasil[k].duplikat.slice(0, 5).map((d) => (
                        <p key={d.uid} className="text-[11px] text-slate-500 truncate">{d.jumlah}x · {d.contoh.join(', ')}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <p className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wide">Relasi Riwayat per Modul</p>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {hasil.relasi.map((r) => (
                  <div key={r.modul + r.tipe} className="px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.modul} <span className="text-slate-400 text-xs">({r.tipe})</span></p>
                      <p className="text-[11px] text-slate-400">{r.total} record diperiksa</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Badge className={r.kosong > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                        Kosong: {r.kosong}
                      </Badge>
                      <Badge className={r.tidak_ditemukan > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}>
                        Tidak dikenal: {r.tidak_ditemukan}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {hasil.relasi.every((r) => !adaMasalah(r)) && (hasil.siswa?.tanpa_uid || 0) === 0 && (hasil.guru?.tanpa_uid || 0) === 0 && (hasil.siswa?.duplikat?.length || 0) === 0 && (hasil.guru?.duplikat?.length || 0) === 0 && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-center">
                Semua pemeriksaan bersih: UID lengkap, tanpa duplikat, relasi konsisten.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}