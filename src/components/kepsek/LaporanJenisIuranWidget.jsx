import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { BULAN_SPP, getGratisBulanSPP, getSppTarif, computeStatusKeuangan, getTingkat } from '@/lib/sppUtils';

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

// Laporan Jenis Iuran — pengganti panel "SPP Bulan <X>":
// filter Jenis Iuran (default SPP) + filter Bulan (untuk SPP),
// menampilkan persentase, nominal jumlah masuk, dan nominal piutang.
export default function LaporanJenisIuranWidget({ siswaList, kelasList, keuanganList, tarifList, biayaKhususList, tahunAjaran, isDark, t }) {
  const jenisOptions = useMemo(() => {
    const arr = [...new Set((tarifList || []).filter(x => x.status !== 'Tidak Aktif').map(x => x.jenis_iuran || 'Lainnya'))];
    return arr.includes('SPP') ? ['SPP', ...arr.filter(j => j !== 'SPP')] : arr;
  }, [tarifList]);

  const [jenis, setJenis] = useState('SPP');
  const isSpp = jenis === 'SPP';
  const [bulan, setBulan] = useState(format(new Date(), 'MMMM', { locale: idLocale }));

  const summary = useMemo(() => {
    const aktif = (siswaList || []).filter(s => s.status === 'Aktif');
    const payments = (keuanganList || []).filter(k =>
      k.jenis !== 'Pengeluaran' && !k.is_iuran_muka &&
      (!tahunAjaran || !k.tahun_ajaran || k.tahun_ajaran === tahunAjaran)
    );

    if (isSpp) {
      const nominal = (tarifList || []).filter(x =>
        x.status !== 'Tidak Aktif' && (x.nama || '').toLowerCase().includes('spp') && x.periode === 'Bulanan'
      )[0]?.nominal || 0;
      let lunas = 0, belum = 0; const belumSiswa = [];
      aktif.forEach(s => {
        const tarif = getSppTarif(tarifList, getTingkat(s, kelasList));
        if (!tarif) return;
        const trans = payments.filter(k => k.siswa_id === s.id &&
          ((k.tipe_transaksi || '').toLowerCase().includes('spp') || (k.bulan_dibayar || []).length > 0));
        const paid = new Set();
        trans.forEach(x => (x.bulan_dibayar || []).forEach(m => paid.add(m)));
        const gratis = getGratisBulanSPP(s.id, biayaKhususList, tarifList, trans);
        if (paid.has(bulan) || gratis.includes(bulan)) lunas++;
        else { belum++; belumSiswa.push(s); }
      });
      const masuk = payments
        .filter(k => (k.tipe_transaksi || '').toLowerCase().includes('spp') && (k.bulan_dibayar || []).includes(bulan))
        .reduce((s, k) => s + (k.jumlah || 0), 0);
      const piutang = belum * nominal;
      const totalTagihan = masuk + piutang;
      return { lunas, belum, masuk, piutang, belumSiswa, totalTagihan, pct: totalTagihan > 0 ? Math.round((masuk / totalTagihan) * 100) : 0 };
    }

    // Non-SPP: agregat per siswa memakai logika keuangan terpusat (memperhitungkan BiayaKhusus & gratis)
    let masuk = 0, piutang = 0, lunas = 0, belum = 0; const belumSiswa = [];
    aktif.forEach(s => {
      const st = computeStatusKeuangan({
        siswa: s,
        keuanganList: payments.filter(k => k.siswa_id === s.id),
        tarifList,
        biayaKhususList,
        kelasList,
        tahunAjaran: tahunAjaran || '',
        iuranNama: null,
      });
      const items = st.items.filter(i => i.jenis === jenis);
      if (items.length === 0) return;
      const dibayar = items.reduce((s2, i) => s2 + (i.dibayar || 0), 0);
      const sisa = items.reduce((s2, i) => s2 + (i.sisa_setahun || 0), 0);
      masuk += dibayar; piutang += sisa;
      if (sisa <= 0) lunas++; else { belum++; belumSiswa.push(s); }
    });
    const totalTagihan = masuk + piutang;
    return { lunas, belum, masuk, piutang, belumSiswa, totalTagihan, pct: totalTagihan > 0 ? Math.round((masuk / totalTagihan) * 100) : 0 };
  }, [siswaList, kelasList, keuanganList, tarifList, biayaKhususList, jenis, bulan, tahunAjaran, isSpp]);

  return (
    <div className={`rounded-2xl ${t.card} p-3 md:p-4`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className={`${t.text} font-bold text-sm flex items-center gap-2`}><Wallet className="w-4 h-4 text-teal-500" /> Laporan Jenis Iuran</h3>
        <div className="flex gap-2 flex-wrap">
          <Select value={jenis} onValueChange={setJenis}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Jenis Iuran" /></SelectTrigger>
            <SelectContent>
              {(jenisOptions.length ? jenisOptions : ['SPP']).map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={bulan} onValueChange={setBulan} disabled={!isSpp}>
            <SelectTrigger className={`w-32 h-8 text-xs ${!isSpp ? 'opacity-50' : ''}`}><SelectValue placeholder="Bulan" /></SelectTrigger>
            <SelectContent>
              {BULAN_SPP.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Persentase tercapai */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs font-medium ${t.textMuted} flex items-center gap-1`}><TrendingUp className="w-3.5 h-3.5 text-teal-500" /> Tercapai</span>
          <span className={`${t.text} text-sm font-bold`}>{summary.pct}%</span>
        </div>
        <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all" style={{ width: `${summary.pct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className={`rounded-xl p-2.5 ${isDark ? 'bg-slate-700/40' : 'bg-emerald-50'}`}>
          <p className={`text-[10px] font-medium ${t.textMuted}`}>Nominal Jumlah Masuk</p>
          <p className="text-sm font-bold text-emerald-500">{formatRupiah(summary.masuk)}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${isDark ? 'bg-slate-700/40' : 'bg-red-50'}`}>
          <p className={`text-[10px] font-medium ${t.textMuted}`}>Nominal Piutang</p>
          <p className="text-sm font-bold text-red-500">{formatRupiah(summary.piutang)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" /> {summary.lunas} Lunas</Badge>
        <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" /> {summary.belum} Belum</Badge>
      </div>

      <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-100">
        {summary.belumSiswa.length === 0
          ? <p className={`text-center py-6 text-xs ${t.textMuted}`}>Semua siswa sudah terbayar 🎉</p>
          : [...summary.belumSiswa].sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id')).map(s => (
            <div key={s.id} className={`flex items-center justify-between px-3 py-2 text-xs border-b border-slate-100 last:border-0 ${isDark ? 'bg-slate-800/40' : 'bg-white'}`}>
              <span className={`font-medium ${t.text}`}>{s.nama}</span>
              <Badge className="bg-slate-100 text-slate-600">{s.nama_kelas}</Badge>
            </div>
          ))}
      </div>
      {!isSpp && <p className={`text-[10px] ${t.textSubtle} mt-2`}>Filter bulan hanya berlaku untuk iuran SPP (bulanan).</p>}
    </div>
  );
}