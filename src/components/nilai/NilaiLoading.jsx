import React from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

// Status pemuatan data nilai — dipakai seluruh tampilan Nilai agar layar tidak
// terlihat "kosong" saat data masih diambil (jaringan mobile lebih lambat).
export default function NilaiLoading({ loading, error, onRetry, label = 'Memuat data nilai…' }) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <AlertTriangle className="w-7 h-7 text-amber-400" />
        <p className="text-sm font-medium text-slate-600">Gagal memuat data nilai</p>
        <p className="text-xs text-slate-400 max-w-xs">Periksa koneksi lalu muat ulang data.</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Coba lagi
          </button>
        )}
      </div>
    );
  }
  if (!loading) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}