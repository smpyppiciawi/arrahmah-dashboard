import React from 'react';
import StatCard from './StatCard';
import { formatPct, labelTanggal } from '@/lib/kehadiranUtils';

export default function KpiKehadiran({ siswaAktif = 0, ringkasan, refHari, jumlahHari = 0 }) {
  const hintHari = refHari ? `Hari ini · ${labelTanggal(refHari.tanggal)}` : 'Belum ada entri hari ini';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      <StatCard label="Siswa Aktif" value={siswaAktif} hint="sesuai filter kelas" tone="slate" />
      <StatCard label="Hadir Hari Ini" value={refHari?.Hadir ?? 0} hint={hintHari} tone="emerald" />
      <StatCard
        label="Kehadiran Periode"
        value={formatPct(ringkasan.pctPeriode)}
        hint={`${jumlahHari} hari efektif · ${ringkasan.kesempatan} kesempatan`}
        tone="indigo"
      />
      <StatCard label="Tidak Hadir Hari Ini" value={refHari?.absen ?? 0} hint={hintHari} tone="rose" />
      {['Sakit', 'Izin', 'Alfa'].map((s) => (
        <StatCard
          key={s}
          label={s}
          value={ringkasan.total[s] || 0}
          hint={`per periode · hari ini ${refHari?.[s] ?? 0}`}
          tone={s === 'Sakit' ? 'blue' : s === 'Izin' ? 'amber' : 'rose'}
        />
      ))}
    </div>
  );
}