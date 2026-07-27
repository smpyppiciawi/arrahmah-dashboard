// Dapodik-standard dropdown values

export const PENDIDIKAN_OPTIONS = [
  "Tidak sekolah",
  "Putus SD",
  "SD / sederajat",
  "SMP / sederajat",
  "SMA / sederajat",
  "D1",
  "D2",
  "D3",
  "D4",
  "S1",
  "S2",
  "S3"
];

export const PEKERJAAN_OPTIONS = [
  "Tidak bekerja",
  "PNS",
  "TNI",
  "Polri",
  "Karyawan Swasta",
  "Wiraswasta",
  "Pedagang",
  "Petani/Peternak",
  "Nelayan",
  "Buruh",
  "Pensiun",
  "Guru",
  "Ibu Rumah Tangga",
  "Sudah Meninggal",
  "Lainnya"
];

export const PENGHASILAN_OPTIONS = [
  "Tidak Berpenghasilan",
  "< Rp1.000.000",
  "Rp1.000.001 - Rp3.000.000",
  "> Rp3.000.000"
];

export const AGAMA_OPTIONS = [
  "Islam",
  "Kristen",
  "Katolik",
  "Hindu",
  "Buddha",
  "Konghucu",
  "Kepercayaan"
];

// Normalisasi teks penghasilan dari CSV yang mungkin memiliki encoding berbeda
export const normalizePenghasilan = (raw) => {
  if (!raw) return '';
  const text = String(raw).trim().replace(/â€"/g, '-').replace(/–/g, '-').replace(/\s+/g, ' ');
  // Cari match terdekat
  const match = PENGHASILAN_OPTIONS.find(opt => text.toLowerCase() === opt.toLowerCase());
  if (match) return match;
  // Partial match
  if (text.toLowerCase().includes('tidak berpenghasilan')) return 'Tidak Berpenghasilan';
  if (text.includes('<') || text.toLowerCase().includes('kurang')) return '< Rp1.000.000';
  if (text.includes('1.000.001') || text.includes('1-3')) return 'Rp1.000.001 - Rp3.000.000';
  if (text.includes('>') || text.toLowerCase().includes('lebih')) return '> Rp3.000.000';
  return text;
};

// Format alamat lengkap dari field terpisah
export const formatAlamatLengkap = (s) => {
  if (!s) return '-';
  const parts = [];
  if (s.alamat) parts.push(s.alamat);
  if (s.rt || s.rw) parts.push(`RT${s.rt || '-'}/RW${s.rw || '-'}`);
  if (s.kelurahan) parts.push(s.kelurahan);
  if (s.kecamatan) parts.push(s.kecamatan);
  return parts.join(', ') || '-';
};

// Mapping Poin Pelanggaran ke Durasi Sanksi (Hari)
export const POIN_DURASI_MAP = [
  { poin: 5, durasi: 1, satuan: 'Hari' },
  { poin: 10, durasi: 3, satuan: 'Hari' },
  { poin: 15, durasi: 4, satuan: 'Hari' },
  { poin: 20, durasi: 6, satuan: 'Hari' },
  { poin: 30, durasi: 9, satuan: 'Hari' },
  { poin: 35, durasi: 10, satuan: 'Hari' },
  { poin: 50, durasi: 15, satuan: 'Hari' },
  { poin: 75, durasi: 22, satuan: 'Hari' },
  { poin: 100, durasi: 1, satuan: 'Bulan' },
  { poin: 150, durasi: 45, satuan: 'Hari' },
  { poin: 200, durasi: 2, satuan: 'Bulan' },
];

export const calculateAutoDurasi = (poin) => {
  let result = { durasi: 0, satuan: 'Hari' };
  for (const tier of POIN_DURASI_MAP) {
    if (poin >= tier.poin) {
      result = { durasi: tier.durasi, satuan: tier.satuan };
    }
  }
  return result;
};