import React, { useEffect, useMemo, useState } from 'react';
import { bulat1, perSiswaImprovement, ringkasImprovement } from '@/lib/improvementStatUtils';
import KpiImprovement from './improvement/KpiImprovement';
import TrenImprovementChart from './improvement/TrenImprovementChart';
import PerbandinganKelasImprovementChart from './improvement/PerbandinganKelasImprovementChart';
import Top10Improvement from './improvement/Top10Improvement';
import HeatmapImprovement from './improvement/HeatmapImprovement';
import TabelSiswaImprovement from './improvement/TabelSiswaImprovement';
import RincianImprovementDialog from './improvement/RincianImprovementDialog';
import RiwayatImprovementDialog from './improvement/RiwayatImprovementDialog';

const totalPoin = (list) => bulat1(list.reduce((s, r) => s + (Number(r.poin_pengurangan) || 0), 0));

export default function SubtabImprovement({
  rows = [], loading, periode = 'harian', tanggalMulai, tanggalAkhir,
  siswaPerKelas = {}, onTerapkanKelas, onTerapkanTanggal,
}) {
  const [trenPeriode, setTrenPeriode] = useState(periode);
  const [metricKelas, setMetricKelas] = useState('poin');
  const [rincian, setRincian] = useState(null);
  const [riwayat, setRiwayat] = useState(null);

  useEffect(() => { setTrenPeriode(periode); }, [periode]);

  const stats = useMemo(
    () => ringkasImprovement({ rows, periode: trenPeriode, tanggalMulai, tanggalAkhir, siswaPerKelas }),
    [rows, trenPeriode, tanggalMulai, tanggalAkhir, siswaPerKelas]
  );
  const topSiswa = useMemo(() => perSiswaImprovement(rows).slice(0, 10), [rows]);

  const aksiFilter = (label, fn) => (fn ? [{ label, onClick: () => { fn(); setRincian(null); } }] : []);

  const bukaKelas = (nama) => {
    const list = rows.filter((r) => (r.nama_kelas || '-') === nama);
    setRincian({
      judul: `Kelas ${nama}`,
      sub: `${list.length} kegiatan · ${totalPoin(list)} poin`,
      rows: list,
      aksi: aksiFilter(`Terapkan filter kelas ${nama}`, onTerapkanKelas ? () => onTerapkanKelas(nama) : null),
    });
  };

  const bukaJenis = (item) => {
    const list = rows.filter((r) => (r.kegiatan_pembinaan_nama || r.uraian || 'Tanpa Jenis') === item.jenis);
    setRincian({
      judul: item.jenis,
      sub: `${list.length} kegiatan · ${item.totalPoin} poin · poin standar ${item.poinStandar}`,
      rows: list,
    });
  };

  const bukaRentang = (mulai, akhir, label) => {
    const list = rows.filter((r) => r.tanggal >= mulai && r.tanggal <= akhir);
    setRincian({
      judul: label,
      sub: `${list.length} kegiatan · ${totalPoin(list)} poin`,
      rows: list,
      aksi: aksiFilter('Terapkan rentang tanggal ini', onTerapkanTanggal ? () => onTerapkanTanggal(mulai, akhir) : null),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <KpiImprovement
        totalKejadian={stats.totalKejadian}
        totalSiswa={stats.totalSiswa}
        totalPoin={stats.totalPoin}
        jenisTeratas={stats.jenisTeratas}
        hariInput={stats.hariInput}
        rataPoinHarian={stats.rataPoinHarian}
        rataKejadianHarian={stats.rataKejadianHarian}
      />

      <TrenImprovementChart
        data={stats.tren}
        periode={trenPeriode}
        onPeriode={setTrenPeriode}
        onPilih={(row) => bukaRentang(row.mulai, row.akhir, `Tren ${row.label}`)}
        trenArah={stats.trenArah}
        trenPerubahan={stats.trenPerubahan}
        maJendela={stats.maJendela}
      />

      <PerbandinganKelasImprovementChart
        data={stats.perKelas}
        metric={metricKelas}
        onMetric={setMetricKelas}
        onPilih={bukaKelas}
      />

      <Top10Improvement data={stats.top} onPilih={bukaJenis} />

      <HeatmapImprovement
        perTanggal={stats.perTanggal}
        tanggalMulai={tanggalMulai}
        tanggalAkhir={tanggalAkhir}
        onPilih={(tgl) => bukaRentang(tgl, tgl, `Tanggal ${tgl}`)}
      />

      <TabelSiswaImprovement rows={topSiswa} onRiwayat={setRiwayat} />

      <RincianImprovementDialog rincian={rincian} onClose={() => setRincian(null)} />
      <RiwayatImprovementDialog siswa={riwayat} records={rows} onClose={() => setRiwayat(null)} />
    </div>
  );
}