import React from 'react';
import { AlertTriangle } from 'lucide-react';
import KartuStatistik from '@/components/catatan/statistik/KartuStatistik';
import StatCard from '@/components/catatan/statistik/StatCard';
import { bulat1 } from '@/lib/pelanggaranStatUtils';

export default function KpiPelanggaran({
  totalKejadian = 0, totalSiswa = 0, totalPoin = 0, kategoriTeratas,
  hariInput = 0, rataPoinHarian = 0, rataKejadianHarian = 0,
}) {
  return (
    <KartuStatistik
      title="Ringkasan Pelanggaran"
      icon={AlertTriangle}
      sub="Pelanggaran aktif (bukan Pending/Dibatalkan) pada periode dan filter terpilih"
    >
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Total Kejadian" value={totalKejadian} hint="record pelanggaran" tone="slate" />
        <StatCard label="Siswa Terlibat" value={totalSiswa} hint="siswa unik" tone="indigo" />
        <StatCard label="Total Poin" value={totalPoin} hint="akumulasi periode" tone="rose" />
        <StatCard
          label="Kategori Terbanyak"
          value={kategoriTeratas ? kategoriTeratas.kejadian : 0}
          hint={kategoriTeratas ? `${kategoriTeratas.nama} · ${bulat1(kategoriTeratas.pct)}%` : 'Belum ada data'}
          tone="amber"
        />
        <StatCard
          label="Rata-rata Poin/Hari Input"
          value={rataPoinHarian}
          hint={hariInput ? `${hariInput} hari input` : 'Belum ada hari input'}
          tone="rose"
        />
        <StatCard
          label="Rata-rata Kejadian/Hari Input"
          value={rataKejadianHarian}
          hint={hariInput ? 'Tanggal tanpa input diabaikan' : 'Belum ada hari input'}
          tone="amber"
        />
      </div>
    </KartuStatistik>
  );
}