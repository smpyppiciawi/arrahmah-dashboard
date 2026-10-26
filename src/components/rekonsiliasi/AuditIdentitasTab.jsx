import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Fingerprint, Loader2, History, ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

const RelasiRow = ({ r }) => (
  <tr className="border-t border-slate-100">
    <td className="py-2 px-2 text-sm text-slate-700">{r.modul}</td>
    <td className="py-2 px-2 text-sm text-slate-500 text-right">{r.total}</td>
    <td className="py-2 px-2 text-right">{r.kosong > 0 ? <Badge className="bg-amber-100 text-amber-700 text-[10px]">{r.kosong}</Badge> : <span className="text-xs text-slate-300">0</span>}</td>
    <td className="py-2 px-2 text-right">{r.tidak_ditemukan > 0 ? <Badge className="bg-rose-100 text-rose-700 text-[10px]">{r.tidak_ditemukan}</Badge> : <span className="text-xs text-slate-300">0</span>}</td>
  </tr>
);

const KunciCard = ({ judul, total, tanpaUid, duplikat }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{judul}</p>
      {duplikat.length === 0 && tanpaUid === 0 ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-amber-500" />
      )}
    </div>
    <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
    <p className="text-xs text-slate-500 mt-1">Tanpa UID: <span className={tanpaUid > 0 ? 'font-semibold text-amber-600' : ''}>{tanpaUid}</span></p>
    {duplikat.length > 0 ? (
      <div className="mt-2 space-y-1">
        {duplikat.slice(0, 3).map((d) => (
          <p key={d.uid} className="text-[11px] text-rose-600 truncate">UID ganda ({d.jumlah}): {d.contoh.join(', ')}</p>
        ))}
        {duplikat.length > 3 && <p className="text-[11px] text-slate-400">+{duplikat.length - 3} lainnya</p>}
      </div>
    ) : (
      <p className="text-[11px] text-emerald-600 mt-1">UID unik & lengkap</p>
    )}
  </div>
);

export default function AuditIdentitasTab() {
  const { toast } = useToast();
  const [audit, setAudit] = useState(null);
  const [auditing, setAuditing] = useState(true);
  const [membangun, setMembangun] = useState(false);

  const jalankanAudit = useCallback(async () => {
    setAuditing(true);
    try {
      const res = await base44.functions.invoke('auditUidRelasi', {});
      setAudit(res.data);
    } catch (err) {
      toast({ title: 'Audit gagal', description: err.message, variant: 'destructive' });
    }
    setAuditing(false);
  }, [toast]);

  useEffect(() => { jalankanAudit(); }, [jalankanAudit]);

  const bangunRiwayat = async () => {
    setMembangun(true);
    try {
      const res = await base44.functions.invoke('bangunRiwayatIdentitas', {});
      const d = res.data || {};
      toast({
        title: 'Riwayat identitas dibangun',
        description: `${d.dibuat ?? 0} entri riwayat dibuat${d.sisa_belum_tersimpan ? ` · sisa ${d.sisa_belum_tersimpan} — jalankan lagi untuk melanjutkan` : ''}.`,
      });
      jalankanAudit();
    } catch (err) {
      toast({ title: 'Gagal membangun riwayat', description: err.message, variant: 'destructive' });
    }
    setMembangun(false);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-blue-600" /> Audit Identitas Siswa & Pegawai
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Pemeriksaan baca-saja: kelengkapan UID, relasi lintas modul, dan keutuhan transaksi. Tidak ada penautan otomatis untuk data ambigu.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={jalankanAudit} disabled={auditing}>
              {auditing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
              Jalankan Ulang
            </Button>
            <Button size="sm" onClick={bangunRiwayat} disabled={membangun} className="bg-blue-600 hover:bg-blue-700">
              {membangun ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <History className="w-4 h-4 mr-1.5" />}
              Bangun Riwayat Identitas
            </Button>
          </div>
        </div>
      </div>

      {auditing ? (
        <div className="p-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : !audit ? (
        <div className="p-8 text-center text-sm text-slate-500">Audit belum tersedia. Jalankan ulang.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <KunciCard judul="Siswa" total={audit.siswa?.total ?? 0} tanpaUid={audit.siswa?.tanpa_uid ?? 0} duplikat={audit.siswa?.duplikat || []} />
            <KunciCard judul="Pegawai" total={audit.guru?.total ?? 0} tanpaUid={audit.guru?.tanpa_uid ?? 0} duplikat={audit.guru?.duplikat || []} />
          </div>

          {audit.keuangan && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Keutuhan Transaksi Keuangan (siswa)</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-slate-800">{audit.keuangan.transaksi_siswa}</p>
                  <p className="text-[11px] text-slate-500">Transaksi bertaut siswa</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${audit.keuangan.tanpa_uid > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{audit.keuangan.tanpa_uid}</p>
                  <p className="text-[11px] text-slate-500">Belum ber-UID permanen</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${audit.keuangan.nis_tak_sesuai > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{audit.keuangan.nis_tak_sesuai}</p>
                  <p className="text-[11px] text-slate-500">NIS tidak sesuai siswa</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="py-2.5 px-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Modul</th>
                  <th className="py-2.5 px-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="py-2.5 px-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Relasi Kosong</th>
                  <th className="py-2.5 px-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">ID Tidak Dikenal</th>
                </tr>
              </thead>
              <tbody>
                {(audit.relasi || []).map((r) => <RelasiRow key={r.modul + r.tipe} r={r} />)}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" /> Tombol "Bangun Riwayat Identitas" mengisi riwayat seumur hidup (Masuk, Lulus, Keluar, Mutasi, Arsip) untuk siswa & pegawai yang belum punya riwayat — idempoten dan bisa dilanjutkan bila belum selesai.
          </p>
        </>
      )}
    </div>
  );
}