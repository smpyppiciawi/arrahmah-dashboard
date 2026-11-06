import React from 'react';
import { Sparkles } from 'lucide-react';
import KartuStatistik from '@/components/catatan/statistik/KartuStatistik';
import StatCard from '@/components/catatan/statistik/StatCard';
import { potong } from '@/lib/improvementStatUtils';

export default function KpiImprovement({
  totalKejadian = 0, totalSiswa = 0, totalPoin = 0, jenisTeratas,
  hariKerja = 0, rataPoinHarian = 0, rataKejadianHarian = 0,
}) {
  return (
    <KartuStatistik
      title="Ringkasan Improvement"
      icon={Sparkles}
      sub="Catatan improvement aktif pada periode dan filter terpilih"
    >
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Total Kejadian" value={totalKejadian} hint="kegiatan tercatat" tone="slate" />
        <StatCard label="Siswa Terlibat" value={totalSiswa} hint="siswa unik" tone="indigo" />
        <StatCard label="Total Poin" value={totalPoin} hint="akumulasi pengurangan" tone="emerald" />
        <StatCard
          label="Jenis Terbanyak"
          value={jenisTeratas ? jenisTeratas.kejadian : 0}
          hint={jenisTeratas ? potong(jenisTeratas.jenis, 30) : 'Belum ada data'}
          tone="amber"
        />
        <StatCard
          label="Rata-rata Poin/Hari Kerja"
          value={rataPoinHarian}
          hint={hariKerja ? `${hariKerja} hari kerja efektif` : 'Belum ada hari kerja'}
          tone="emerald"
        />
        <StatCard
          label="Rata-rata Kejadian/Hari Kerja"
          value={rataKejadianHarian}
          hint={hariKerja ? 'Weekend & hari libur dikecualikan' : 'Belum ada hari kerja'}
          tone="indigo"
        />
      </div>
    </KartuStatistik>
  );
}