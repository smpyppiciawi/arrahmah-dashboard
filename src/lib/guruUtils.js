// Utilitas nama pegawai — Gelar Depan & Belakang (Menu Pegawai)
// Nama Lengkap pegawai disimpan tergabung (Gelar Depan + Nama + Gelar Belakang),
// namun data lama mungkin masih menyimpan nama tanpa gelar.

// Nama inti (tanpa gelar) — untuk pencocokan nama lama
export const namaIntiGuru = (g) => {
  let n = g?.nama || '';
  const gd = g?.gelar_depan || '';
  const gb = g?.gelar_belakang || '';
  if (gd && n.startsWith(gd + ' ')) n = n.slice(gd.length + 1);
  if (gb && n.endsWith(' ' + gb)) n = n.slice(0, n.length - gb.length - 1);
  return n.trim();
};

// Nama lengkap dengan gelar — aman untuk data lama yang belum tergabung
export const namaPegawaiLengkap = (g) => {
  if (!g) return '';
  const n = (g.nama || '').trim();
  const gd = (g.gelar_depan || '').trim();
  const gb = (g.gelar_belakang || '').trim();
  if (!gd && !gb) return n;
  if (gd && n.startsWith(gd + ' ') && (!gb || n.endsWith(' ' + gb))) return n;
  return [gd, n, gb].filter(Boolean).join(' ');
};

// Cari guru berdasar nama tersimpan (mendukung nama lama tanpa gelar)
export const cariGuruByNama = (guruList, namaCari) => {
  const t = (namaCari || '').trim().toLowerCase();
  if (!t) return null;
  return (guruList || []).find(g =>
    (g.nama || '').trim().toLowerCase() === t || namaIntiGuru(g).toLowerCase() === t
  ) || null;
};