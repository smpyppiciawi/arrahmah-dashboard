import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, RefreshCw, AlertTriangle, Loader2, CheckCircle2, Clock, Users } from 'lucide-react';

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const fmtTgl = (d) => {
  if (!d) return '-';
  const p = String(d).split('-').map(Number);
  return `${p[2]} ${BULAN[(p[1] || 1) - 1]} ${p[0]}`;
};

const fmtWaktu = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const statusPenerimaBadge = (status) => {
  if (status === 'Terkirim') return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
  if (status === 'Sebagian') return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
  return 'bg-slate-500/15 text-slate-500 border-slate-500/30';
};

export default function Absen3HariDialog({ open, onOpenChange, rows = [], periode, ringkasan, isLoading, error, onRetry, onWhatsApp, isDark }) {
  const [cari, setCari] = useState('');

  const rowsFiltered = useMemo(() => {
    const s = cari.trim().toLowerCase();
    const list = !s
      ? rows
      : rows.filter((r) => `${r.nama || ''} ${r.nama_kelas || ''} ${r.nis || ''}`.toLowerCase().includes(s));
    return list.slice().sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id'));
  }, [rows, cari]);

  const surface = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const card = isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200';
  const textMain = isDark ? 'text-slate-100' : 'text-slate-800';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl w-[95vw] p-0 overflow-hidden border ${surface}`}>
        <DialogHeader className={`px-4 pt-4 pb-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <DialogTitle className={`flex items-center gap-2 text-base ${textMain}`}>
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Peringatan Absen Siswa
          </DialogTitle>
          <p className={`text-[11px] ${textMuted}`}>
            Periode {periode?.label || '1 Nov s/d hari ini'} · dihitung per status (Beruntun · Akumulasi · Hari Sama) pada hari sekolah
          </p>
        </DialogHeader>

        <div className="px-4 pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Siswa', value: ringkasan?.siswa ?? rows.length, icon: Users },
              { label: 'Pemicu', value: ringkasan?.pemicu ?? 0, icon: AlertTriangle },
              { label: 'WA Terkirim', value: ringkasan?.wa_terkirim ?? 0, icon: CheckCircle2 },
              { label: 'WA Menunggu', value: ringkasan?.wa_menunggu ?? 0, icon: Clock },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={`rounded-xl border px-2.5 py-2 ${card}`}>
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${textMuted}`} />
                    <p className={`text-[10px] ${textMuted}`}>{s.label}</p>
                  </div>
                  <p className={`text-lg font-bold ${textMain}`}>{s.value}</p>
                </div>
              );
            })}
          </div>

          <div className="relative mt-3">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textMuted}`} />
            <Input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama siswa, kelas, atau NIS"
              className={`pl-8 h-9 text-xs ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200'}`}
            />
          </div>
        </div>

        <div className="px-4 py-3 max-h-[55vh] overflow-y-auto space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-10">
              <Loader2 className={`w-4 h-4 animate-spin ${textMuted}`} />
              <span className={`text-xs ${textMuted}`}>Memuat laporan absen…</span>
            </div>
          )}

          {!isLoading && error && (
            <div className="py-8 text-center">
              <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-red-500">Laporan gagal dimuat</p>
              <p className={`text-[11px] mt-1 mb-3 ${textMuted}`}>{error.message || 'Terjadi kesalahan saat mengambil data absensi.'}</p>
              <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
              </Button>
            </div>
          )}

          {!isLoading && !error && rows.length === 0 && (
            <div className="py-10 text-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
              <p className={`text-sm font-medium ${textMain}`}>Tidak ada siswa yang memenuhi kriteria</p>
              <p className={`text-[11px] mt-1 ${textMuted}`}>Periode {periode?.label || '1 Nov s/d hari ini'} sudah diperiksa.</p>
            </div>
          )}

          {!isLoading && !error && rows.length > 0 && rowsFiltered.length === 0 && (
            <p className={`text-xs text-center py-8 ${textMuted}`}>Tidak ada siswa yang cocok dengan pencarian “{cari}”.</p>
          )}

          {!isLoading && !error && rowsFiltered.map((r) => (
            <div key={r.id} className={`rounded-xl border p-3 ${card}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${textMain}`}>{r.nama}</p>
                  <p className={`text-[11px] ${textMuted}`}>{r.nama_kelas || '-'} · NIS {r.nis || '-'}</p>
                </div>
                <Badge className={`shrink-0 border text-[10px] ${statusPenerimaBadge(r._notifLabel)}`}>{r._notifLabel || 'Menunggu'}</Badge>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {r._alfaCount > 0 && <Badge className="bg-red-500/15 text-red-600 border border-red-500/30 text-[10px]">Alfa {r._alfaCount}x</Badge>}
                {r._sakitCount > 0 && <Badge className="bg-blue-500/15 text-blue-600 border border-blue-500/30 text-[10px]">Sakit {r._sakitCount}x</Badge>}
                {r._izinCount > 0 && <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30 text-[10px]">Izin {r._izinCount}x</Badge>}
                {r._lastAbsenDate && <Badge className={`${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'} text-[10px]`}>Terakhir {fmtTgl(r._lastAbsenDate)}</Badge>}
              </div>

              <div className="mt-2 space-y-1">
                {(r._events || []).map((ev, i) => (
                  <p key={i} className={`text-[11px] leading-snug ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <span className={`font-semibold ${textMain}`}>{ev.status} · {ev.kriteria}</span>
                    {' — '}{ev.detail}
                    <span className={textMuted}> (pemicu {fmtTgl(ev.tanggal_pemicu)})</span>
                  </p>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {(r._penerima || []).map((p) => (
                  <div key={p.peran} className={`rounded-lg border px-2 py-1.5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                    <p className={`text-[10px] ${textMuted}`}>{p.peran}</p>
                    <p className={`text-[11px] font-medium truncate ${textMain}`}>{p.nama || '-'}</p>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className={`text-[10px] font-semibold ${p.status === 'Terkirim' ? 'text-emerald-500' : p.status === 'Sebagian' ? 'text-amber-500' : 'text-slate-500'}`}>
                        {p.status}
                      </span>
                      <span className={`text-[9px] ${textMuted}`}>{p.status === 'Terkirim' ? fmtWaktu(p.waktu) : (p.catatan || '')}</span>
                    </div>
                  </div>
                ))}
                {(r._penerima || []).length === 0 && (
                  <p className={`text-[10px] sm:col-span-3 ${textMuted}`}>Penerima belum terdata (wali kelas/waka belum diisi pada data pegawai).</p>
                )}
              </div>

              {(r._penerima || []).some((p) => p.phone) && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => {
                      const wali = (r._penerima || []).find((p) => p.peran === 'Wali Kelas' && p.phone);
                      if (!wali) return;
                      const msg = `Yth. ${wali.nama}, mohon tindak lanjut siswa ${r.nama} (${r.nama_kelas}) yang memenuhi kriteria Peringatan Absen Siswa (${r._kriteriaLabel}).`;
                      onWhatsApp && onWhatsApp(wali.phone, msg);
                    }}
                    className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 hover:text-emerald-500"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Hubungi Wali Kelas
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}