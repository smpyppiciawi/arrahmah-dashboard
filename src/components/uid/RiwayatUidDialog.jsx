import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Fingerprint, ChevronDown, ChevronRight, History } from "lucide-react";

/**
 * Menelusuri seluruh riwayat lintas modul seorang siswa/pegawai via UID —
 * mencakup riwayat record lama (ID internal lama) dan record baru ber-UID sama.
 */
export default function RiwayatUidDialog({ open, onOpenChange, tipe, uid, personId, nama }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = null;
  const [cariUid, setCariUid] = useState('');
  const [terbuka, setTerbuka] = useState({});

  const muat = async (uidTarget, seedId) => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const body = { tipe };
      if (uidTarget) body.uid = uidTarget;
      else if (seedId) { if (tipe === 'Guru') body.guru_id = seedId; else body.siswa_id = seedId; }
      const res = await base44.functions.invoke('riwayatUid', body);
      setData(res.data);
    } catch (e) {
      setError(e?.message || 'Gagal memuat riwayat.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && (uid || personId)) {
      setCariUid(uid || '');
      muat(uid, personId);
    }
    if (open && !uid && !personId) {
      setCariUid('');
      setData(null);
      setError('');
    }
  }, [open, uid, personId]);

  const ringkas = (it) => {
    const tgl = it.tanggal || it.tanggal_setor || it.tanggal_masuk || String(it.created_date || '').slice(0, 10);
    const detail = [
      it.status, it.mapel && `${it.mapel}${it.nilai != null ? `: ${it.nilai}` : ''}`,
      it.tipe_transaksi, it.jumlah != null && `${it.jenis === 'Pengeluaran' ? '-' : '+'}Rp${Number(it.jumlah).toLocaleString('id-ID')}`,
      it.kode, it.nilai != null && !it.mapel && `Nilai: ${it.nilai}`,
      it.nama_item, it.kegiatan_pembinaan_nama, it.alasan,
      it.uraian && String(it.uraian).slice(0, 60), it.nama_sekolah_asal,
      it.tinggi_badan && `${it.tinggi_badan} cm / ${it.berat_badan} kg`,
      it.nominal != null && `Rp${Number(it.nominal).toLocaleString('id-ID')}`,
      it.nama_iuran,
    ].filter(Boolean).slice(0, 3).join(' · ');
    return { tgl, detail };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Riwayat Lintas Modul {tipe === 'Guru' ? 'Pegawai' : 'Siswa'}
          </DialogTitle>
        </DialogHeader>

        {/* Cari via UID (bisa telusuri orang arsip/lulus tanpa membuka daftar) */}
        <div className="flex gap-2">
          <Input
            value={cariUid}
            onChange={(e) => setCariUid(e.target.value)}
            placeholder="Tempel UID di sini lalu tekan Enter"
            onKeyDown={(e) => { if (e.key === 'Enter' && cariUid.trim()) muat(cariUid.trim()); }}
            className="text-xs"
          />
          <Button size="sm" variant="outline" onClick={() => cariUid.trim() && muat(cariUid.trim())} disabled={loading}>Cari</Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat riwayat...
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm p-3">{error}</div>
        )}
        {!loading && !data && !error && (
          <p className="text-sm text-slate-400 py-6 text-center">Masukkan UID untuk menelusuri riwayat.</p>
        )}

        {data && (
          <div className="space-y-4">
            {/* Identitas: semua record utama ber-UID sama */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Fingerprint className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">UID {data.uid}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.identitas.map((r) => (
                  <div key={r.id} className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs">
                    <p className="font-semibold text-slate-800">{r.nama}</p>
                    <p className="text-slate-500">
                      {tipe === 'Guru' ? (r.nuptk || '-') : (r.nis || '-')} · {r.nama_kelas || '-'}
                      {r.tahun_lulus ? ` · Lulus ${r.tahun_lulus}` : ''}
                    </p>
                    <Badge className={r.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                      {r.status}{r.is_arsip ? ' (Arsip)' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Riwayat per modul */}
            <div className="space-y-2">
              {data.modul.filter((m) => m.jumlah > 0).map((m) => (
                <div key={m.nama} className="rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTerbuka((p) => ({ ...p, [m.nama]: !p[m.nama] }))}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      {terbuka[m.nama] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      {m.nama}
                    </span>
                    <Badge variant="secondary">{m.jumlah} record</Badge>
                  </button>
                  {terbuka[m.nama] && (
                    <div className="divide-y divide-slate-100">
                      {m.items.map((it) => {
                        const { tgl, detail } = ringkas(it);
                        return (
                          <div key={it.id} className="px-3 py-2 flex gap-3 items-start">
                            <span className="text-[11px] text-slate-400 flex-shrink-0 w-20">{tgl || '-'}</span>
                            <span className="text-xs text-slate-700">{detail || '(tanpa rincian)'}</span>
                          </div>
                        );
                      })}
                      {m.jumlah > m.items.length && (
                        <p className="px-3 py-1.5 text-[11px] text-slate-400">Menampilkan {m.items.length} terbaru dari {m.jumlah} record.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {data.modul.every((m) => m.jumlah === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">Belum ada riwayat pada modul mana pun.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}