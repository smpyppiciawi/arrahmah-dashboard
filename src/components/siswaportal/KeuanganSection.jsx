import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Gift, AlertTriangle, Wallet } from 'lucide-react';
import { tarifMatchesTingkat, getGratisBulanSPP, getSppTarif, BULAN_SPP, formatDateID, computeTunggakan, matchIuranItemTransactions } from '@/lib/sppUtils';

const JENIS_TABS = [
  { key: 'SPP', label: 'SPP' },
  { key: 'Ujian', label: 'Ujian Sekolah' },
  { key: 'Mutasi', label: 'Mutasi' },
  { key: 'PPDB Gel 1', label: 'PPDB Gel 1' },
  { key: 'PPDB Gel 2', label: 'PPDB Gel 2' },
  { key: 'Awal Tahun', label: 'Awal Tahun' },
];

const JENIS_MATCH = {
  'SPP': { tipe: 'SPP/Bulanan', kategori: 'SPP' },
  'Ujian': { tipe: 'Ujian Sekolah', kategori: 'Ujian' },
  'Awal Tahun': { tipe: 'Daftar Ulang', kategori: 'Daftar Ulang' },
};

export default function KeuanganSection({ siswa, keuanganList = [] }) {
  const [activeIuran, setActiveIuran] = useState('SPP');
  const tingkat = siswa?.nama_kelas?.charAt(0) || '';

  const { data: tarifList = [] } = useQuery({
    queryKey: ['tarif-iuran-siswa', tingkat],
    queryFn: () => base44.entities.TarifIuran.filter({ status: 'Aktif' }),
  });

  const { data: biayaKhususList = [] } = useQuery({
    queryKey: ['biaya-khusus-siswa', siswa?.id],
    queryFn: () => base44.entities.BiayaKhusus.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
  });

  const tarifJenisMap = useMemo(() => {
    const map = {};
    tarifList.forEach(t => { if (t.id) map[t.id] = t.jenis_iuran; });
    return map;
  }, [tarifList]);

  const filteredBiayaKhusus = useMemo(() => {
    if (activeIuran !== 'Mutasi' && activeIuran !== 'PPDB Gel 1' && activeIuran !== 'PPDB Gel 2') return [];
    return biayaKhususList.filter(b => tarifJenisMap[b.tarif_iuran_id] === activeIuran);
  }, [biayaKhususList, tarifJenisMap, activeIuran]);

  const relevantTarif = useMemo(() => {
    return tarifList.filter(t => tarifMatchesTingkat(t, tingkat));
  }, [tarifList, tingkat]);

  const gratisMonths = useMemo(() => {
    return getGratisBulanSPP(siswa?.id, biayaKhususList, tarifList);
  }, [siswa?.id, biayaKhususList, tarifList]);

  const sppTarif = useMemo(() => getSppTarif(tarifList, tingkat), [tarifList, tingkat]);

  // SPP monthly status (includes gratis months from BiayaKhusus)
  const sppStatus = useMemo(() => {
    const sppRecords = keuanganList.filter(k => k.tipe_transaksi === 'SPP/Bulanan');
    const paidMonths = new Set();
    sppRecords.forEach(r => {
      if (r.bulan_dibayar && Array.isArray(r.bulan_dibayar)) {
        r.bulan_dibayar.forEach(m => paidMonths.add(m));
      }
    });
    const gratisSet = new Set(gratisMonths);
    return BULAN_SPP.map(month => ({
      month,
      lunas: paidMonths.has(month),
      gratis: gratisSet.has(month),
    }));
  }, [keuanganList, gratisMonths]);

  // Tunggakan (arrears) — accurate per student
  const tunggakan = useMemo(() => {
    return computeTunggakan(siswa, keuanganList, tarifList, biayaKhususList);
  }, [siswa, keuanganList, tarifList, biayaKhususList]);

  // Other iuran status (Ujian, Awal Tahun) — per item, toleran variasi penamaan
  const otherIuranList = useMemo(() => {
    const match = JENIS_MATCH[activeIuran];
    if (!match) return [];
    const tarifs = relevantTarif.filter(t => t.jenis_iuran === activeIuran);
    return tarifs.map(t => {
      const trans = matchIuranItemTransactions(t, keuanganList, relevantTarif);
      const lunas = trans.some(k => (k.status_bayar || 'Lunas') === 'Lunas');
      const cicilan = !lunas && trans.some(k => k.status_bayar === 'Cicilan');
      return { ...t, lunas, cicilan };
    });
  }, [relevantTarif, keuanganList, activeIuran]);

  const formatRupiah = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

  const riwayat = useMemo(() => {
    return [...keuanganList].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  }, [keuanganList]);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-500 px-5 pt-10 pb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
        <h2 className="text-white font-black text-2xl flex items-center gap-3 relative">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl">💰</div>
          Keuangan
        </h2>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Iuran Type Selector */}
        <div className="bg-white rounded-3xl shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium mb-2">Pilih Jenis Iuran</p>
          <div className="grid grid-cols-2 gap-2">
            {JENIS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveIuran(tab.key)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeIuran === tab.key
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* SPP Monthly Recap */}
        {activeIuran === 'SPP' && (
          <div className="bg-white rounded-3xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-800">Rekap SPP Tahun Ajaran</p>
              {sppTarif && (
                <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">{formatRupiah(sppTarif.nominal)}/bln</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {sppStatus.map((s, i) => (
                <div key={i} className={`rounded-2xl p-3 text-center ${
                  s.gratis ? 'bg-teal-50 border border-teal-200' :
                  s.lunas ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'
                }`}>
                  {s.gratis ? (
                    <Gift className="w-5 h-5 text-teal-500 mx-auto mb-1" />
                  ) : s.lunas ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                  )}
                  <p className={`text-xs font-medium ${
                    s.gratis ? 'text-teal-700' : s.lunas ? 'text-emerald-700' : 'text-slate-400'
                  }`}>{s.month}</p>
                  <p className={`text-[10px] ${
                    s.gratis ? 'text-teal-500' : s.lunas ? 'text-emerald-500' : 'text-slate-400'
                  }`}>{s.gratis ? 'GRATIS' : s.lunas ? 'Lunas' : 'Belum'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ujian / Awal Tahun */}
        {(activeIuran === 'Ujian' || activeIuran === 'Awal Tahun') && (
          <div className="bg-white rounded-3xl shadow-sm p-4">
            <p className="text-sm font-bold text-slate-800 mb-3">Status {JENIS_TABS.find(t => t.key === activeIuran)?.label}</p>
            {otherIuranList.length > 0 ? (
              <div className="space-y-2">
                {otherIuranList.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{t.nama}</p>
                      <p className="text-xs text-slate-400">{t.periode} · {formatRupiah(t.nominal)}</p>
                    </div>
                    {t.lunas ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">Lunas</span>
                    ) : t.cicilan ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700">Cicilan</span>
                    ) : (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700">Belum Lunas</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <span className="text-3xl block mb-2">📋</span>
                <p className="text-sm">Belum ada data iuran untuk tingkat ini</p>
              </div>
            )}
          </div>
        )}

        {/* Mutasi & PPDB (BiayaKhusus) */}
        {(activeIuran === 'Mutasi' || activeIuran === 'PPDB Gel 1' || activeIuran === 'PPDB Gel 2') && (
          <div className="bg-white rounded-3xl shadow-sm p-4">
            <p className="text-sm font-bold text-slate-800 mb-3">Iuran {activeIuran}</p>
            {filteredBiayaKhusus.length > 0 ? (
              <div className="space-y-2">
                {filteredBiayaKhusus.map((b, i) => {
                  const tagihan = b.nominal_khusus || 0;
                  const sb = b.sudah_bayar || 0;
                  const sisa = Math.max(0, tagihan - sb);
                  const isLunas = b.is_gratis || sb >= tagihan;
                  const isCicil = !isLunas && sb > 0;
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700">{b.nama_iuran}</p>
                        <p className="text-xs text-slate-400">
                          {b.kategori}
                          {b.is_gratis ? ' · GRATIS' : ` · ${formatRupiah(tagihan)}`}
                        </p>
                        {sb > 0 && !b.is_gratis && (
                          <p className="text-[10px] text-emerald-600 mt-0.5">
                            Sudah Bayar: {formatRupiah(sb)}{sisa > 0 ? ` · Sisa: ${formatRupiah(sisa)}` : ''}
                          </p>
                        )}
                      </div>
                      {b.is_gratis ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">GRATIS</span>
                      ) : isLunas ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">Lunas</span>
                      ) : isCicil ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700">Sisa {formatRupiah(sisa)}</span>
                      ) : (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700">Belum Bayar</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <span className="text-3xl block mb-2">✅</span>
                <p className="text-sm">Tidak ada iuran {activeIuran} untuk Anda</p>
              </div>
            )}
          </div>
        )}

        {/* Riwayat Pembayaran */}
        <div>
          <p className="text-slate-700 font-bold text-sm mb-2">Riwayat Pembayaran</p>
          <div className="space-y-2">
            {riwayat.map((k, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${k.jenis === 'Pemasukan' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {k.jenis === 'Pemasukan' ? '💳' : '📤'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{k.uraian || k.kategori}</p>
                  <p className="text-slate-400 text-xs">{formatDateID(k.tanggal)}</p>
                </div>
                <div className="text-right">
                  <p className={`font-black text-sm ${k.jenis === 'Pemasukan' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {k.jenis === 'Pengeluaran' ? '-' : '+'}{formatRupiah(k.jumlah)}
                  </p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${k.status_bayar === 'Lunas' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {k.status_bayar}
                  </span>
                </div>
              </div>
            ))}
            {riwayat.length === 0 && (
              <div className="bg-white rounded-3xl shadow-sm py-12 text-center">
                <span className="text-5xl block mb-3">💰</span>
                <p className="text-slate-400 text-sm">Belum ada riwayat pembayaran</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}