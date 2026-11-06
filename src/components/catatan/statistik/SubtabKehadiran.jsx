import React, { useMemo, useState } from 'react';
import { CalendarX2 } from 'lucide-react';
import { todayWIB } from '@/lib/wib.js';
import {
  STATUS_KEHADIRAN, dedupeHarian, hariEfektifDari, perKelasKehadiran,
  perSiswaKehadiran, ringkasHarian, trenKehadiran,
} from '@/lib/kehadiranUtils';
import KpiKehadiran from './KpiKehadiran';
import TrenKehadiranChart from './TrenKehadiranChart';
import DonutStatusKehadiran from './DonutStatusKehadiran';
import PerbandinganKelasChart from './PerbandinganKelasChart';
import KomposisiKelasChart from './KomposisiKelasChart';
import HeatmapKehadiran from './HeatmapKehadiran';
import TabelMonitoringSiswa from './TabelMonitoringSiswa';
import DetailHarianKehadiran from './DetailHarianKehadiran';

export default function SubtabKehadiran({
  absensiUnik = [], loading, periode = 'harian', tanggalMulai, tanggalAkhir,
  siswaAktif = 0, siswaPerKelas = {}, tanggalAbsensi = [], hariLibur,
}) {
  const [selectedDate, setSelectedDate] = useState(null);
  const hariIni = todayWIB();

  const hariEfektif = useMemo(
    () => hariEfektifDari({ tanggalAbsensi, tanggalMulai, tanggalAkhir, hariLibur, hariIni }),
    [tanggalAbsensi, tanggalMulai, tanggalAkhir, hariLibur, hariIni]
  );
  const setEfektif = useMemo(() => new Set(hariEfektif), [hariEfektif]);

  // Hanya kejadian pada hari efektif, satu siswa satu tanggal
  const absensiHarian = useMemo(
    () => dedupeHarian(absensiUnik.filter((a) => setEfektif.has(a.tanggal))),
    [absensiUnik, setEfektif]
  );

  const ringkasan = useMemo(
    () => ringkasHarian({ absensi: absensiHarian, siswaAktif, hariEfektif }),
    [absensiHarian, siswaAktif, hariEfektif]
  );
  const perTanggal = useMemo(
    () => new Map(ringkasan.harian.map((h) => [h.tanggal, h])),
    [ringkasan.harian]
  );
  const tren = useMemo(() => trenKehadiran({ harian: ringkasan.harian, periode }), [ringkasan.harian, periode]);
  const kelasRows = useMemo(
    () => perKelasKehadiran({ absensi: absensiHarian, siswaPerKelas, hariEfektif }),
    [absensiHarian, siswaPerKelas, hariEfektif]
  );
  const siswaRows = useMemo(
    () => perSiswaKehadiran({ absensi: absensiHarian, hariEfektif }),
    [absensiHarian, hariEfektif]
  );

  const refHari = useMemo(() => {
    if (!hariEfektif.length) return null;
    const tanggal = setEfektif.has(hariIni) ? hariIni : hariEfektif[hariEfektif.length - 1];
    return perTanggal.get(tanggal) || null;
  }, [hariEfektif, setEfektif, hariIni, perTanggal]);

  const distribusi = useMemo(
    () => STATUS_KEHADIRAN.map((s) => ({ name: s, value: ringkasan.total[s] || 0 })),
    [ringkasan.total]
  );

  const rincianHarian = useMemo(
    () => (selectedDate ? absensiUnik.filter((a) => a.tanggal === selectedDate) : []),
    [absensiUnik, selectedDate]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {hariEfektif.length === 0 && (
        <div className="flex flex-col items-center gap-1 py-8 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white">
          <CalendarX2 className="w-6 h-6" />
          <p className="text-xs">Belum ada entri absensi pada rentang tanggal dan filter ini</p>
        </div>
      )}

      <KpiKehadiran
        siswaAktif={siswaAktif}
        ringkasan={ringkasan}
        refHari={refHari}
        jumlahHari={hariEfektif.length}
      />

      <TrenKehadiranChart data={tren} periode={periode} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DonutStatusKehadiran distribusi={distribusi} pctKehadiran={ringkasan.pctPeriode} />
        <div className="lg:col-span-2">
          <PerbandinganKelasChart rows={kelasRows} />
        </div>
      </div>

      <KomposisiKelasChart rows={kelasRows} />

      <HeatmapKehadiran
        perTanggal={perTanggal}
        hariEfektif={setEfektif}
        hariLibur={hariLibur}
        tanggalMulai={tanggalMulai}
        tanggalAkhir={tanggalAkhir}
        siswaAktif={siswaAktif}
        onSelectDate={setSelectedDate}
      />

      <TabelMonitoringSiswa
        rows={siswaRows}
        absensi={absensiHarian}
        jumlahHari={hariEfektif.length}
      />

      <DetailHarianKehadiran
        tanggal={selectedDate}
        rows={rincianHarian}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  );
}