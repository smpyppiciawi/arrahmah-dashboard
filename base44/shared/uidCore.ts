/**
 * Utilitas UID permanen lintas siklus (Siswa & Pegawai).
 * - fetchAllPages: pengambilan seluruh record secara bertahap (cursor).
 * - Pencocokan gabungan: identifier kuat (NISN/NIK/NUPTK) diutamakan;
 *   nama saja TIDAK pernah dianggap orang yang sama.
 */

export async function fetchAllPages(entity, opts = {}) {
  const items = [];
  let cursor;
  let guard = 0;
  do {
    const page = await entity.list({
      limit: 1000,
      ...(cursor ? { cursor } : {}),
      ...opts,
    });
    items.push(...(page.items || []));
    cursor = page.has_more ? page.next_cursor : undefined;
    guard += 1;
  } while (cursor && guard < 100);
  return items;
}

export const normNama = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const normAngka = (s) => String(s ?? '').replace(/\D/g, '');

/** NIS/NUPTK bernilai '0' atau kosong = placeholder tidak valid, TIDAK boleh dipakai sebagai kunci pencocokan. */
export const isIdJunk = (v) => {
  const n = normAngka(v);
  return !n || n === '0';
};

const skorAlasan = (alasan) =>
  alasan.reduce((a, x) => a + (x.startsWith('NISN') || x.startsWith('NIK') || x.startsWith('NUPTK') ? 3 : x.startsWith('NIS') ? 2 : 1), 0);

/**
 * Kandidat siswa lama untuk siswa yang masuk kembali.
 * Cocok bila: NISN / NIK / NIS sama persis, ATAU
 * nama + jenis kelamin + tanggal lahir semuanya sama.
 */
export function cariKandidatSiswa(input, records) {
  const nisn = normAngka(input.nisn);
  const nik = normAngka(input.nik);
  const nis = normAngka(input.nis);
  const nama = normNama(input.nama);
  const jk = input.jenis_kelamin || '';
  const tgl = String(input.tanggal_lahir || '').slice(0, 10);

  const hasil = [];
  for (const r of records) {
    const alasan = [];
    if (nisn && normAngka(r.nisn) === nisn) alasan.push('NISN sama');
    if (nik && normAngka(r.nik) === nik) alasan.push('NIK sama');
    if (nis && !isIdJunk(input.nis) && !isIdJunk(r.nis) && normAngka(r.nis) === nis) alasan.push('NIS sama');
    if (nama && normNama(r.nama) === nama && jk && r.jenis_kelamin === jk && tgl && String(r.tanggal_lahir || '').slice(0, 10) === tgl) {
      alasan.push('Nama, jenis kelamin & tanggal lahir sama');
    }
    if (alasan.length === 0) continue;
    hasil.push({ record: r, alasan, skor: skorAlasan(alasan) });
  }
  hasil.sort((a, b) => b.skor - a.skor);
  return hasil.slice(0, 10);
}

/**
 * Kandidat pegawai lama untuk pegawai yang masuk kembali.
 * Cocok bila: NUPTK/NIP sama persis ATAU nama + jenis kelamin sama
 * (tanpa tanggal lahir, nama+jk dinilai cukup kuat untuk KANDIDAT —
 * keputusan akhir tetap lewat konfirmasi admin).
 */
export function cariKandidatGuru(input, records) {
  const nuptk = normAngka(input.nuptk);
  const nama = normNama(input.nama);
  const jk = input.jenis_kelamin || '';

  const hasil = [];
  for (const r of records) {
    const alasan = [];
    if (nuptk && !isIdJunk(input.nuptk) && !isIdJunk(r.nuptk) && normAngka(r.nuptk) === nuptk) alasan.push('NUPTK/NIP sama');
    if (nama && normNama(r.nama) === nama && jk && r.jenis_kelamin === jk) {
      alasan.push('Nama & jenis kelamin sama');
    }
    if (alasan.length === 0) continue;
    hasil.push({ record: r, alasan, skor: skorAlasan(alasan) });
  }
  hasil.sort((a, b) => b.skor - a.skor);
  return hasil.slice(0, 10);
}