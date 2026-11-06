import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getRaporStatus } from '@/lib/raporStatus';
import {
  bulat1, dedupePelanggaran, perSiswaPelanggaran, ringkasPelanggaran,
} from '@/lib/pelanggaranStatUtils';
import KpiPelanggaran from './pelanggaran/KpiPelanggaran';
import TrenPelanggaranChart from './pelanggaran/TrenPelanggaranChart';
import PerbandinganKelasPelanggaranChart from './pelanggaran/PerbandinganKelasPelanggaranChart';
import Top10Pelanggaran from './pelanggaran/Top10Pelanggaran';
import DonutKategoriPelanggaran from './pelanggaran/DonutKategoriPelanggaran';
import HeatmapPelanggaran from './pelanggaran/HeatmapPelanggaran';
import TabelSiswaPelanggaran from './pelanggaran/TabelSiswaPelanggaran';
import RincianPelanggaranDialog from './pelanggaran/RincianPelanggaranDialog';
import RiwayatPelanggaranDialog from './pelanggaran/RiwayatPelanggaranDialog';

const FIELD_SISWA = [
  'nama', 'nama_kelas', 'nis', 'status',
  'rapor_kuning_tanggal', 'rapor_kuning_berakhir',
  'rapor_merah_tanggal', 'rapor_merah_berakhir',
  'rapor_hitam_aktif',
];

export default function SubtabPelanggaran({
  rows = [], loading, periode = 'harian', tanggalMulai, tanggalAkhir,
  siswaPerKelas = {}, onTerapkanKelas, onTerapkanTanggal,
}) {
  const [trenPeriode, setTrenPeriode] = useState(periode);
  const [metricKelas, setMetricKelas] = useState('poin');
  const [rincian, setRincian] = useState(null);
  const [riwayat, setRiwayat] = useState(null);

  useEffect(() => { setTrenPeriode(periode); }, [periode]);

  const unik = useMemo(() => dedupePelanggaran(rows), [rows]);
  const stats = useMemo(
    () => ringkasPelanggaran({ rows: unik, periode: trenPeriode, tanggalMulai, tanggalAkhir, siswaPerKelas }),
    [unik, trenPeriode, tanggalMulai, tanggalAkhir, siswaPerKelas]
  );
  const topSiswa = useMemo(() => perSiswaPelanggaran(unik).slice(0, 10), [unik]);
  const idSiswa = useMemo(() => topSiswa.map((s) => s.siswa_id).filter(Boolean), [topSiswa]);

  const { data: siswaMap = {} } = useQuery({
    queryKey: ['statistik-pelanggaran-siswa', idSiswa.join(',')],
    enabled: idSiswa.length > 0,
    queryFn: async () => {
      const res = await base44.entities.Siswa.filter(
        { id: { $in: idSiswa } },
        { limit: 20, fields: FIELD_SISWA }
      );
      return Object.fromEntries((res.items || []).map((s) => [s.id, s]));
    },
  });

  const { data: pengaturan } = useQuery({
    queryKey: ['pengaturan-improvement'],
    queryFn: () => base44.entities.PengaturanImprovement.list(),
  });
  const cfg = pengaturan?.[0] || null;

  const barisSiswa = useMemo(
    () => topSiswa.map((s) => ({ ...s, status: getRaporStatus(siswaMap[s.siswa_id], s.poin, cfg) })),
    [topSiswa, siswaMap, cfg]
  );

  const aksiFilter = (label, fn) => (fn ? [{ label, onClick: () => { fn(); setRincian(null); } }] : []);

  const bukaKelas = (nama) => {
    const list = unik.filter((r) => (r.nama_kelas || '-') === nama);
    const poin = bulat1(list.reduce((s, r) => s + (Number(r.poin) || 0), 0));
    setRincian({
      judul: `Kelas ${nama}`,
      sub: `${list.length} kejadian · ${poin} poin`,
      rows: list,
      aksi: aksiFilter(`Terapkan filter kelas ${nama}`, onTerapkanKelas ? () => onTerapkanKelas(nama) : null),
    });
  };

  const bukaKategori = (nama) => {
    const list = unik.filter((r) => (r.kategori_utama || 'Tanpa Kategori') === nama);
    const poin = bulat1(list.reduce((s, r) => s + (Number(r.poin) || 0), 0));
    setRincian({ judul: nama, sub: `${list.length} kejadian · ${poin} poin`, rows: list });
  };

  const bukaKode = (item) => {
    const list = unik.filter((r) => (r.kode || '-') === item.kode);
    setRincian({
      judul: `${item.kode} · ${item.deskripsi || 'Pelanggaran'}`,
      sub: `${list.length} kejadian · ${item.totalPoin} poin · poin standar ${item.poinStandar}`,
      rows: list,
    });
  };

  const bukaRentang = (mulai, akhir, label) => {
    const list = unik.filter((r) => r.tanggal >= mulai && r.tanggal <= akhir);
    const poin = bulat1(list.reduce((s, r) => s + (Number(r.poin) || 0), 0));
    setRincian({
      judul: label,
      sub: `${list.length} kejadian · ${poin} poin`,
      rows: list,
      aksi: aksiFilter('Terapkan rentang tanggal ini', onTerapkanTanggal ? () => onTerapkanTanggal(mulai, akhir) : null),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-rose-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <KpiPelanggaran
        totalKejadian={stats.totalKejadian}
        totalSiswa={stats.totalSiswa}
        totalPoin={stats.totalPoin}
        kategoriTeratas={stats.kategoriTeratas}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <TrenPelanggaranChart
            data={stats.tren}
            periode={trenPeriode}
            onPeriode={setTrenPeriode}
            onPilih={(row) => bukaRentang(row.mulai, row.akhir, `Tren ${row.label}`)}
          />
        </div>
        <DonutKategoriPelanggaran
          data={stats.kategori}
          totalKejadian={stats.totalKejadian}
          onPilih={bukaKategori}
        />
      </div>

      <PerbandinganKelasPelanggaranChart
        data={stats.perKelas}
        metric={metricKelas}
        onMetric={setMetricKelas}
        onPilih={bukaKelas}
      />

      <Top10Pelanggaran data={stats.top} onPilih={bukaKode} />

      <HeatmapPelanggaran
        perTanggal={stats.perTanggal}
        tanggalMulai={tanggalMulai}
        tanggalAkhir={tanggalAkhir}
        onPilih={(tgl) => bukaRentang(tgl, tgl, `Tanggal ${tgl}`)}
      />

      <TabelSiswaPelanggaran rows={barisSiswa} onRiwayat={setRiwayat} />

      <RincianPelanggaranDialog rincian={rincian} onClose={() => setRincian(null)} />
      <RiwayatPelanggaranDialog siswa={riwayat} records={unik} onClose={() => setRiwayat(null)} />
    </div>
  );
}