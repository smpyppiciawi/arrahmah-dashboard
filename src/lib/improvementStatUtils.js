import { addDays, format, parseISO } from 'date-fns';
import { bucketAxis, bucketKey, bucketLabel, firstDateOfBucket } from '@/lib/statistikUtils';
import { hitungMovingAverage } from '@/lib/trenMovingAverage';
import { hariKerjaEfektif } from '@/lib/kehadiranUtils';

// Warna konsisten dashboard improvement
export const WARNA_POIN = '#059669';
export const WARNA_KEJADIAN = '#0ea5e9';
export const WARNA_MA = '#8b5cf6';

export const PERIODE_TREN = [
  { key: 'harian', label: 'Harian' },
  { key: 'mingguan', label: 'Mingguan' },
  { key: 'bulanan', label: 'Bulanan' },
];

export const angka = (v) => Number(v) || 0;
export const bulat1 = (n) => Math.round(angka(n) * 10) / 10;
export const potong = (teks, n = 34) => {
  const t = String(teks || '-');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

const jenisDari = (r) => r.kegiatan_pembinaan_nama || r.uraian || 'Tanpa Jenis';
const poinDari = (r) => angka(r.poin_pengurangan);
const hariSebelum = (tgl) => format(addDays(parseISO(tgl), -1), 'yyyy-MM-dd');

// Setiap record improvement dihitung (multi-kegiatan pada hari yang sama tetap tercatat)
export function ringkasImprovement({
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
  const jenisMap = new Map();
  const tanggalMap = new Map();
  const siswaSet = new Set();
  let totalPoin = 0;

  rows.forEach((r) => {
    const poin = poinDari(r);
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

    const jenis = jenisDari(r);
    if (!jenisMap.has(jenis)) {
      jenisMap.set(jenis, {
        jenis, deskripsi: r.uraian || '', kejadian: 0, totalPoin: 0, poinCount: new Map(),
      });
    }
    const jRow = jenisMap.get(jenis);
    jRow.kejadian += 1;
    jRow.totalPoin += poin;
    jRow.poinCount.set(poin, (jRow.poinCount.get(poin) || 0) + 1);
    if (!jRow.deskripsi && r.uraian) jRow.deskripsi = r.uraian;

    const tgl = r.tanggal || '';
    if (tgl) {
      if (!tanggalMap.has(tgl)) tanggalMap.set(tgl, { tanggal: tgl, kejadian: 0, poin: 0 });
      const dRow = tanggalMap.get(tgl);
      dRow.kejadian += 1;
      dRow.poin += poin;
    }
  });

  const jenisList = Array.from(jenisMap.values())
    .map((j) => {
      let standar = j.kejadian ? Math.round(j.totalPoin / j.kejadian) : 0;
      let maks = 0;
      j.poinCount.forEach((n, p) => { if (n > maks) { maks = n; standar = p; } });
      return {
        jenis: j.jenis,
        deskripsi: j.deskripsi || j.jenis,
        kejadian: j.kejadian,
        totalPoin: bulat1(j.totalPoin),
        poinStandar: standar,
      };
    })
    .sort((a, b) => b.kejadian - a.kejadian || b.totalPoin - a.totalPoin || a.jenis.localeCompare(b.jenis, 'id'));

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

  return {
    totalKejadian: rows.length,
    totalPoin: bulat1(totalPoin),
    totalSiswa: siswaSet.size,
    jenisTeratas: jenisList[0] || null,
    jenis: jenisList,
    perKelas,
    tren,
    maJendela: ma.jendela,
    trenArah: ma.arah,
    trenPerubahan: ma.perubahan,
    hariKerja: jumlahHariKerja,
    rataPoinHarian: jumlahHariKerja ? bulat1(totalPoin / jumlahHariKerja) : 0,
    rataKejadianHarian: jumlahHariKerja ? bulat1(rows.length / jumlahHariKerja) : 0,
    top: jenisList.slice(0, 10),
    perTanggal: Array.from(tanggalMap.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
  };
}

// Rekap poin per siswa unik untuk tabel monitoring
export function perSiswaImprovement(rows = []) {
  const map = new Map();
  rows.forEach((r) => {
    const key = r.siswa_id || r.nama_siswa;
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, {
        siswa_id: r.siswa_id,
        nama: r.nama_siswa || '-',
        nama_kelas: r.nama_kelas || '-',
        poin: 0,
        kejadian: 0,
        terakhir: '',
        jenis: new Map(),
      });
    }
    const row = map.get(key);
    row.poin += poinDari(r);
    row.kejadian += 1;
    const jenis = jenisDari(r);
    row.jenis.set(jenis, (row.jenis.get(jenis) || 0) + 1);
    if ((r.tanggal || '') > row.terakhir) row.terakhir = r.tanggal || '';
    if (r.nama_kelas) row.nama_kelas = r.nama_kelas;
    if (!row.siswa_id && r.siswa_id) row.siswa_id = r.siswa_id;
  });

  return Array.from(map.values())
    .map((r) => {
      let dominan = '-';
      let maks = 0;
      r.jenis.forEach((n, j) => { if (n > maks) { maks = n; dominan = j; } });
      return {
        siswa_id: r.siswa_id,
        nama: r.nama,
        nama_kelas: r.nama_kelas,
        poin: bulat1(r.poin),
        kejadian: r.kejadian,
        dominan,
        terakhir: r.terakhir,
      };
    })
    .sort((a, b) => b.poin - a.poin || b.kejadian - a.kejadian || a.nama.localeCompare(b.nama, 'id'));
}