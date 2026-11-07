import { addDays, format, parseISO } from 'date-fns';
import { bucketAxis, bucketKey, bucketLabel, firstDateOfBucket } from '@/lib/statistikUtils';
import { hitungMovingAverage } from '@/lib/trenMovingAverage';
import { hariKerjaEfektif } from '@/lib/kehadiranUtils';

// Warna konsisten dashboard pelanggaran
export const WARNA_POIN = '#ef4444';
export const WARNA_KEJADIAN = '#f59e0b';
export const WARNA_MA = '#8b5cf6';

export const PALET_KATEGORI = [
  '#ef4444', '#f97316', '#f59e0b', '#8b5cf6', '#0ea5e9', '#14b8a6', '#ec4899', '#64748b',
];

export const PERIODE_TREN = [
  { key: 'harian', label: 'Harian' },
  { key: 'mingguan', label: 'Mingguan' },
  { key: 'bulanan', label: 'Bulanan' },
];

export const angka = (v) => Number(v) || 0;
export const bulat1 = (n) => Math.round(angka(n) * 10) / 10;

// Satu kejadian = 1 (tanggal, siswa, kode) — hindari hitung ganda record kembar
export function dedupePelanggaran(rows = []) {
  const seen = new Set();
  return rows.filter((r) => {
    const key = `${r.tanggal}|${r.siswa_id || r.nama_siswa}|${r.kode || r.uraian_pelanggaran}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const hariSebelum = (tgl) => format(addDays(parseISO(tgl), -1), 'yyyy-MM-dd');

export function ringkasPelanggaran({
  rows = [], periode = 'harian', tanggalMulai, tanggalAkhir, siswaPerKelas = {}, hariLibur = new Set(),
}) {
  // Hari kerja efektif — weekend & hari libur Kalender Akademik tidak dihitung
  const hariKerja = hariKerjaEfektif({ tanggalMulai, tanggalAkhir, hariLibur });
  const hariKerjaSet = new Set(hariKerja);
  const axisDasar = periode === 'harian'
    ? hariKerja
    : (tanggalMulai && tanggalAkhir ? bucketAxis(tanggalMulai, tanggalAkhir, periode) : []);
  // Mingguan/bulanan: bucket yang seluruhnya weekend atau hari libur Kalender Akademik dibuang
  const axis = periode === 'harian' ? axisDasar : axisDasar.filter((k, i) => {
    const mulaiBucket = firstDateOfBucket(k, periode);
    const nextMulai = i < axisDasar.length - 1 ? firstDateOfBucket(axisDasar[i + 1], periode) : null;
    const akhirBucket = nextMulai ? hariSebelum(nextMulai) : tanggalAkhir;
    return hariKerja.some((t) => t >= mulaiBucket && t <= akhirBucket);
  });
  const trenMap = new Map(axis.map((k) => [k, { poin: 0, kejadian: 0 }]));
  const kelasMap = new Map();
  const kodeMap = new Map();
  const kategoriMap = new Map();
  const tanggalMap = new Map();
  const siswaSet = new Set();
  let totalPoin = 0;

  rows.forEach((r) => {
    const poin = angka(r.poin);
    totalPoin += poin;
    const keySiswa = r.siswa_id || r.nama_siswa;
    if (keySiswa) siswaSet.add(keySiswa);

    // Tren hanya memakai hari kerja efektif (weekend & hari libur dikecualikan)
    if (hariKerjaSet.has(r.tanggal)) {
      const bucket = bucketKey(r.tanggal, periode);
      const tren = trenMap.get(bucket);
      if (tren) {
        tren.poin += poin;
        tren.kejadian += 1;
      }
    }

    const kelas = r.nama_kelas || '-';
    if (!kelasMap.has(kelas)) kelasMap.set(kelas, { poin: 0, kejadian: 0, siswa: new Set() });
    const kRow = kelasMap.get(kelas);
    kRow.poin += poin;
    kRow.kejadian += 1;
    if (keySiswa) kRow.siswa.add(keySiswa);

    const kategori = r.kategori_utama || 'Tanpa Kategori';
    if (!kategoriMap.has(kategori)) kategoriMap.set(kategori, { kejadian: 0, poin: 0 });
    const katRow = kategoriMap.get(kategori);
    katRow.kejadian += 1;
    katRow.poin += poin;

    const kode = r.kode || '-';
    if (!kodeMap.has(kode)) {
      kodeMap.set(kode, {
        kode, deskripsi: r.uraian_pelanggaran || '', poinMin: null, kejadian: 0, totalPoin: 0,
      });
    }
    const tRow = kodeMap.get(kode);
    tRow.kejadian += 1;
    tRow.totalPoin += poin;
    if (tRow.poinMin === null && r.poin_min !== undefined && r.poin_min !== null) tRow.poinMin = angka(r.poin_min);
    if (!tRow.deskripsi && r.uraian_pelanggaran) tRow.deskripsi = r.uraian_pelanggaran;

    const tgl = r.tanggal || '';
    if (tgl) {
      if (!tanggalMap.has(tgl)) tanggalMap.set(tgl, { tanggal: tgl, kejadian: 0, poin: 0 });
      const dRow = tanggalMap.get(tgl);
      dRow.kejadian += 1;
      dRow.poin += poin;
    }
  });

  const kategori = Array.from(kategoriMap.entries())
    .map(([nama, v]) => ({
      nama,
      kejadian: v.kejadian,
      poin: bulat1(v.poin),
      pct: rows.length ? (v.kejadian / rows.length) * 100 : 0,
    }))
    .sort((a, b) => b.kejadian - a.kejadian || a.nama.localeCompare(b.nama, 'id'));

  const perKelas = Array.from(kelasMap.entries())
    .map(([nama_kelas, v]) => {
      const siswaAktif = angka(siswaPerKelas[nama_kelas]) || v.siswa.size;
      return {
        nama_kelas,
        poin: bulat1(v.poin),
        kejadian: v.kejadian,
        siswa: v.siswa.size,
        siswaAktif,
        rata: siswaAktif ? bulat1(v.poin / siswaAktif) : 0,
      };
    })
    .sort((a, b) => b.poin - a.poin || a.nama_kelas.localeCompare(b.nama_kelas, 'id'));

  const trenDasar = axis.map((k, i) => {
    const mulaiBucket = firstDateOfBucket(k, periode);
    const nextMulai = i < axis.length - 1 ? firstDateOfBucket(axis[i + 1], periode) : null;
    const akhirBucket = nextMulai ? hariSebelum(nextMulai) : tanggalAkhir;
    const v = trenMap.get(k) || { poin: 0, kejadian: 0 };
    return {
      label: bucketLabel(mulaiBucket, periode),
      mulai: mulaiBucket < tanggalMulai ? tanggalMulai : mulaiBucket,
      akhir: akhirBucket > tanggalAkhir ? tanggalAkhir : akhirBucket,
      poin: bulat1(v.poin),
      kejadian: v.kejadian,
    };
  });

  // Moving Average dihitung hanya dari titik yang memiliki penginputan
  const ma = hitungMovingAverage(trenDasar);
  const tren = trenDasar.map((t, i) => ({ ...t, ma: ma.nilai[i] }));
  const jumlahHariKerja = hariKerja.length;

  const top = Array.from(kodeMap.values())
    .map((t) => ({
      ...t,
      totalPoin: bulat1(t.totalPoin),
      poinStandar: t.poinMin !== null ? t.poinMin : bulat1(t.totalPoin / t.kejadian),
    }))
    .sort((a, b) => b.kejadian - a.kejadian || b.totalPoin - a.totalPoin)
    .slice(0, 10);

  return {
    totalKejadian: rows.length,
    totalPoin: bulat1(totalPoin),
    totalSiswa: siswaSet.size,
    kategoriTeratas: kategori[0] || null,
    kategori,
    perKelas,
    tren,
    maJendela: ma.jendela,
    trenArah: ma.arah,
    trenPerubahan: ma.perubahan,
    hariKerja: jumlahHariKerja,
    rataPoinHarian: jumlahHariKerja ? bulat1(totalPoin / jumlahHariKerja) : 0,
    rataKejadianHarian: jumlahHariKerja ? bulat1(rows.length / jumlahHariKerja) : 0,
    top,
    perTanggal: Array.from(tanggalMap.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
  };
}

// Rekap poin per siswa (siswa unik) untuk tabel monitoring
export function perSiswaPelanggaran(rows = []) {
  const map = new Map();
  rows.forEach((r) => {
    const key = r.siswa_id || r.nama_siswa;
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, {
        siswa_id: r.siswa_id, nama: r.nama_siswa || '-', nama_kelas: r.nama_kelas || '-', poin: 0, kejadian: 0, terakhir: r.tanggal || '',
      });
    }
    const row = map.get(key);
    row.poin += angka(r.poin);
    row.kejadian += 1;
    if ((r.tanggal || '') > row.terakhir) row.terakhir = r.tanggal;
    if (r.nama_kelas) row.nama_kelas = r.nama_kelas;
    if (!row.siswa_id && r.siswa_id) row.siswa_id = r.siswa_id;
  });

  return Array.from(map.values())
    .map((r) => ({ ...r, poin: bulat1(r.poin) }))
    .sort((a, b) => b.poin - a.poin || b.kejadian - a.kejadian || a.nama.localeCompare(b.nama, 'id'));
}