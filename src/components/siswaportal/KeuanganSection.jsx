import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { CheckCircle, XCircle, Gift } from 'lucide-react';
import { getGratisBulanSPP, getSppTarif, BULAN_SPP, formatDateID, computeStatusKeuangan } from '@/lib/sppUtils';

const JENIS_TABS = [
  { key: 'SPP', label: 'SPP' },
  { key: 'Ujian', label: 'Ujian Sekolah' },
  { key: 'Mutasi', label: 'Mutasi' },
  { key: 'PPDB Gel 1', label: 'PPDB Gel 1' },
  { key: 'PPDB Gel 2', label: 'PPDB Gel 2' },
  { key: 'Awal Tahun', label: 'Awal Tahun' },
];

const PER_SISWA_KEYS = ['Mutasi', 'PPDB Gel 1', 'PPDB Gel 2'];

export default function KeuanganSection({ siswa, keuanganList = [] }) {
  const [activeIuran, setActiveIuran] = useState('SPP');
  const { activeAcademicYear } = useActiveAcademicYear();
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

  // ===== Hitungan terpusat — angka identik dengan Laporan Bendahara & Wali Kelas =====
  const statusKeuangan = useMemo(() => computeStatusKeuangan({
    siswa, keuanganList, tarifList, biayaKhususList,
    tahunAjaran: activeAcademicYear || '',
  }), [siswa, keuanganList, tarifList, biayaKhususList, activeAcademicYear]);

  const itemsAktif = useMemo(
    () => statusKeuangan.items.filter(i => i.jenis === activeIuran),
    [statusKeuangan, activeIuran]
  );

  const sppItem = useMemo(
    () => statusKeuangan.items.find(i => i.jenis === 'SPP'),
    [statusKeuangan]
  );

  // Rekap bulan SPP — hanya transaksi TA aktif (data lama tanpa TA tetap dihitung)
  const sppStatus = useMemo(() => {
    const keuanganTA = keuanganList.filter(k => !activeAcademicYear || !k.tahun_ajaran || k.tahun_ajaran === activeAcademicYear);
    const paidMonths = new Set();
    keuanganTA.forEach(r => {
      if (r.tipe_transaksi === 'SPP/Bulanan' && Array.isArray(r.bulan_dibayar)) {
        r.bulan_dibayar.forEach(m => paidMonths.add(m));
      }
    });
    const gratisSet = new Set(getGratisBulanSPP(siswa?.id, biayaKhususList, tarifList));
    return BULAN_SPP.map(month => ({ month, lunas: paidMonths.has(month), gratis: gratisSet.has(month) }));
  }, [keuanganList, biayaKhususList, tarifList, siswa?.id, activeAcademicYear]);

  const sppTarif = useMemo(() => getSppTarif(tarifList, tingkat), [tarifList, tingkat]);

  const formatRupiah = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

  const badgeStyle = (status) => status === 'Lunas'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'Cicilan' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

  const badgeText = (item, sisa) => item.status === 'Lunas' ? 'Lunas'
    : item.status === 'Cicilan' ? `Cicilan · Sisa ${formatRupiah(sisa)}`
    : `Menunggak · ${formatRupiah(sisa)}`;

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
            {sppItem && (
              <div className="flex flex-wrap items-center gap-2 mb-3 p-2.5 rounded-2xl bg-slate-50">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${badgeStyle(sppItem.status)}`}>
                  {badgeText(sppItem, sppItem.sisa_jatuh_tempo)}
                </span>
                <span className="text-[11px] text-slate-400">
                  Sisa jatuh tempo {formatRupiah(sppItem.sisa_jatuh_tempo)} · sisa setahun {formatRupiah(sppItem.sisa_setahun)}
                </span>
              </div>
            )}
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

        {/* Iuran lain: Ujian / Awal Tahun / Mutasi / PPDB — hitungan terpusat */}
        {activeIuran !== 'SPP' && (
          <div className="bg-white rounded-3xl shadow-sm p-4">
            <p className="text-sm font-bold text-slate-800 mb-3">
              {PER_SISWA_KEYS.includes(activeIuran) ? `Iuran ${activeIuran}` : `Status ${JENIS_TABS.find(t => t.key === activeIuran)?.label}`}
            </p>
            {itemsAktif.length > 0 ? (
              <div className="space-y-2">
                {itemsAktif.map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{item.nama}</p>
                      <p className="text-xs text-slate-400">
                        {item.khusus ? `${item.khusus} · ` : ''}
                        {item.gratis ? 'GRATIS' : `Tagihan ${formatRupiah(item.tagihan)}`}
                      </p>
                      {!item.gratis && item.dibayar > 0 && (
                        <p className="text-[10px] text-emerald-600 mt-0.5">
                          Dibayar {formatRupiah(item.dibayar)}
                          {item.dibayar_manual > 0 && ` (transaksi ${formatRupiah(item.dibayar_transaksi)} + manual ${formatRupiah(item.dibayar_manual)})`}
                          {item.sisa_setahun > 0 ? ` · Sisa ${formatRupiah(item.sisa_setahun)}` : ''}
                        </p>
                      )}
                    </div>
                    {item.gratis ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 shrink-0">GRATIS</span>
                    ) : (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${badgeStyle(item.status)}`}>
                        {badgeText(item, item.sisa_setahun)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <span className="text-3xl block mb-2">{PER_SISWA_KEYS.includes(activeIuran) ? '✅' : '📋'}</span>
                <p className="text-sm">
                  {PER_SISWA_KEYS.includes(activeIuran)
                    ? `Tidak ada iuran ${activeIuran} untuk Anda`
                    : 'Belum ada data iuran untuk tingkat ini'}
                </p>
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