// Moving Average adaptif untuk garis tren statistik.
// Hanya tanggal/bucket yang memiliki penginputan yang dihitung —
// tanggal tanpa input (termasuk libur tanpa catatan) tidak dianggap nol.

export const AMBANG_STABIL = 5; // batas perubahan relatif (%) agar arah dianggap Stabil

const bulat1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

// Jendela adaptif proporsional terhadap banyaknya titik data yang berisi input
export function jendelaAdaptif(jumlahTitik = 0) {
  if (jumlahTitik <= 7) return 3;
  if (jumlahTitik <= 20) return 5;
  return 7;
}

// points: deret tren (punya `poin` & `kejadian`). Nilai null pada titik tanpa input.
export function hitungMovingAverage(points = [], key = 'poin') {
  const titik = [];
  points.forEach((p, i) => {
    const kejadian = Number(p.kejadian) || 0;
    const nilai = Number(p[key]) || 0;
    if (kejadian > 0 || nilai > 0) titik.push(i);
  });

  const nilaiMA = new Array(points.length).fill(null);
  if (titik.length === 0) {
    return { nilai: nilaiMA, jendela: 0, arah: 'Stabil', perubahan: 0, jumlahInput: 0 };
  }

  const jendela = jendelaAdaptif(titik.length);
  const deret = titik.map((i) => Number(points[i][key]) || 0);
  titik.forEach((i, n) => {
    const mulai = Math.max(0, n - jendela + 1);
    const potongan = deret.slice(mulai, n + 1);
    nilaiMA[i] = bulat1(potongan.reduce((s, v) => s + v, 0) / potongan.length);
  });

  const awal = nilaiMA[titik[0]];
  const akhir = nilaiMA[titik[titik.length - 1]];

  let perubahan = 0;
  if (awal !== akhir) {
    perubahan = awal === 0 ? 100 : bulat1(((akhir - awal) / Math.abs(awal)) * 100);
  }

  let arah = 'Stabil';
  if (Math.abs(perubahan) >= AMBANG_STABIL) arah = perubahan > 0 ? 'Naik' : 'Turun';

  return { nilai: nilaiMA, jendela, arah, perubahan, jumlahInput: titik.length };
}