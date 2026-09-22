import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import CatatanDetailDialog from './CatatanDetailDialog';

// Daftar Catatan Siswa — diringkas jadi kartu total per kategori;
// detail lengkap dibuka via popup (CatatanDetailDialog)
export default function CatatanSection({ siswa, pelanggaranList = [], pelanggaranImprovementList = [], improvementList = [], prestasiList = [], absensiList = [] }) {
  const isFemale = siswa?.jenis_kelamin === 'Perempuan';
  const [selected, setSelected] = useState(null);

  const { data: uksList = [] } = useQuery({
    queryKey: ['siswa-uks', siswa?.id],
    queryFn: () => base44.entities.UKS.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
  });

  const { data: izinList = [] } = useQuery({
    queryKey: ['siswa-izin', siswa?.id],
    queryFn: () => base44.entities.IzinSiswa.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
  });

  const { data: menstruasiList = [] } = useQuery({
    queryKey: ['siswa-menstruasi', siswa?.id],
    queryFn: () => base44.entities.Menstruasi.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id && isFemale,
  });

  const totalPoin = pelanggaranList.reduce((s, p) => s + (p.poin || 0), 0);
  const totalPoinImprovement = pelanggaranImprovementList.filter(p => p.status !== 'Dibatalkan').reduce((s, p) => s + (p.poin || 0), 0);
  const totalPengurangan = improvementList.filter(i => i.status === 'Aktif').reduce((s, i) => s + (i.poin_pengurangan || 0), 0);
  const poinBersih = totalPoin + totalPoinImprovement - totalPengurangan;

  const sections = useMemo(() => {
    const byDate = (arr) => [...arr].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    const list = [
      {
        key: 'pelanggaran', emoji: '⚠️', title: 'Pelanggaran', poin: totalPoin + totalPoinImprovement,
        records: byDate([
          ...pelanggaranImprovementList.map(p => ({ ...p, sumber: 'baru' })),
          ...pelanggaranList.map(p => ({ ...p, sumber: 'lama' })),
        ]),
      },
      { key: 'improvement', emoji: '🌱', title: 'Improvement', poin: totalPengurangan, records: byDate(improvementList) },
      { key: 'prestasi', emoji: '🏆', title: 'Prestasi', records: byDate(prestasiList) },
      { key: 'uks', emoji: '💊', title: 'UKS', records: byDate(uksList) },
      { key: 'izin', emoji: '📝', title: 'Izin', records: byDate(izinList) },
      { key: 'jumat', emoji: '🕌', title: isFemale ? 'Keputrian' : 'Jumatan', records: byDate(absensiList.filter(a => a.jenis_absensi === 'Jumat')) },
    ];
    if (isFemale) list.push({ key: 'menstruasi', emoji: '🌙', title: 'Menstruasi', records: byDate(menstruasiList) });
    return list;
  }, [pelanggaranList, pelanggaranImprovementList, improvementList, prestasiList, uksList, izinList, menstruasiList, absensiList, isFemale, totalPoin, totalPoinImprovement, totalPengurangan]);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 px-5 pt-10 pb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
        <h2 className="text-white font-black text-2xl flex items-center gap-3 relative">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl">📋</div>
          Catatan
        </h2>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Ringkasan Poin Bersih */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-5 text-white shadow-lg">
          <p className="text-slate-300 text-xs font-medium mb-2">Ringkasan Poin Disiplin</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-black">{poinBersih}</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Poin Bersih (Net)</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-red-300 text-xs">Pelanggaran: {totalPoin + totalPoinImprovement}</p>
              <p className="text-emerald-300 text-xs">Pengurangan: {totalPengurangan}</p>
            </div>
          </div>
        </div>

        {/* Kartu Ringkasan per Kategori — klik untuk detail */}
        <div className="grid grid-cols-2 gap-3">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setSelected(s)}
              className="bg-white rounded-2xl shadow-sm p-4 text-left active:scale-95 transition-transform"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{s.emoji}</span>
                <span className="text-2xl font-black text-slate-800">{s.records.length}</span>
              </div>
              <p className="font-bold text-slate-700 text-xs mt-2">{s.title}</p>
              <p className="text-[10px] text-slate-400">data tercatat</p>
              {s.poin != null && (
                <p className={`text-[10px] font-bold mt-1 ${s.key === 'pelanggaran' ? 'text-red-500' : 'text-emerald-600'}`}>
                  {s.poin} poin
                </p>
              )}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-slate-400 text-center">Ketuk kartu untuk melihat detail catatan.</p>
      </div>

      <CatatanDetailDialog section={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}