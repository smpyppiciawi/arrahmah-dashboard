import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, MessageCircle, AlertTriangle } from 'lucide-react';
import { kontakUtama } from '@/components/siswa/SiswaKontakRow';

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

const Ceklis = ({ checked, onToggle, title }) => (
  <button
    type="button"
    onClick={onToggle}
    title={title}
    aria-label={title}
    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
      checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 hover:border-emerald-400'
    }`}
  >
    {checked && <Check className="w-3.5 h-3.5" />}
  </button>
);

/**
 * Kirim laporan tunggakan ke orang tua/wali lewat WhatsApp oleh Wali Kelas.
 * Ceklisan menentukan iuran yang dilaporkan, lalu pesan disusun otomatis.
 */
export default function KirimTunggakanDialog({ open, onClose, siswa, items = [], kelasWali }) {
  const [dipilih, setDipilih] = useState([]);

  const belumBayar = useMemo(
    () => (items || []).filter((it) => (it.sisa_jatuh_tempo || 0) > 0),
    [items]
  );

  useEffect(() => {
    if (open) setDipilih(belumBayar.map((it) => it.key));
  }, [open, siswa?.id]);

  if (!siswa) return null;

  const phone = kontakUtama(siswa);
  const terpilih = belumBayar.filter((it) => dipilih.includes(it.key));
  const total = terpilih.reduce((s, it) => s + (it.sisa_jatuh_tempo || 0), 0);

  const pesan = [
    `Assalamualaikum Bapak/Ibu Orang Tua/Wali dari ${siswa.nama} (${siswa.nama_kelas || kelasWali?.nama_kelas || '-'}).`,
    '',
    'Kami informasikan tagihan administrasi sekolah yang belum diselesaikan:',
    ...terpilih.map((it) => `• ${it.nama}: ${formatRupiah(it.sisa_jatuh_tempo)}`),
    '',
    `Total belum terbayar: ${formatRupiah(total)}`,
    '',
    'Mohon kesediaan Bapak/Ibu untuk menyelesaikan pembayaran. Bila sudah membayar, mohon abaikan pesan ini atau konfirmasi ke wali kelas.',
    '',
    `Terima kasih.\nWali Kelas ${siswa.nama_kelas || kelasWali?.nama_kelas || ''}${kelasWali?.wali_kelas ? ` — ${kelasWali.wali_kelas}` : ''}`,
  ].join('\n');

  const kirim = () => {
    if (!phone) return;
    const clean = String(phone).replace(/\D/g, '').replace(/^0/, '62');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(pesan)}`, '_blank');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            Kirim Tunggakan — {siswa.nama}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-slate-500 -mt-2">
          Pilih tunggakan yang akan dilaporkan ke orang tua/wali lewat WhatsApp.
        </p>

        {!phone && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Nomor WhatsApp orang tua/wali belum tersedia. Lengkapi kontak pada data siswa terlebih dahulu.
          </div>
        )}

        {belumBayar.length === 0 ? (
          <p className="text-center py-8 text-sm text-slate-400">Tidak ada tunggakan pada tahun pelajaran ini.</p>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">Ceklis Tunggakan</p>
              <p className="text-[10px] text-slate-400">{terpilih.length} dari {belumBayar.length} dipilih</p>
            </div>
            <div className="divide-y divide-slate-100">
              {belumBayar.map((it) => {
                const on = dipilih.includes(it.key);
                return (
                  <div key={it.key} className={`flex items-center gap-3 px-3 py-2.5 ${on ? '' : 'opacity-50'}`}>
                    <Ceklis
                      checked={on}
                      onToggle={() => setDipilih((p) => (p.includes(it.key) ? p.filter((x) => x !== it.key) : [...p, it.key]))}
                      title={`Laporkan ${it.nama}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{it.nama}</p>
                      <p className="text-[11px] text-slate-400">{it.periode || '-'}{it.detail ? ` · ${it.detail}` : ''}</p>
                    </div>
                    <Badge className="bg-red-100 text-red-700 shrink-0">{formatRupiah(it.sisa_jatuh_tempo)}</Badge>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-600">Total dilaporkan</p>
              <p className="text-sm font-bold text-red-600">{formatRupiah(total)}</p>
            </div>
          </div>
        )}

        {terpilih.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-500 mb-1">Pratinjau Pesan</p>
            <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{pesan}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={kirim}
            disabled={!phone || terpilih.length === 0}
          >
            <MessageCircle className="w-4 h-4 mr-1.5" /> Kirim
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}