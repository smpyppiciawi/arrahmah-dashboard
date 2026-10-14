import { base44 } from '@/api/base44Client';

/**
 * Memuat SELURUH record Nilai — melewati batas maksimal 5.000 record per query
 * dengan fetch bertahap per halaman (cursor). Sekali jalan, tanpa polling,
 * agar progres penilaian, daftar nilai, dan Rapor terbaca utuh.
 * Hanya dipakai tampilan yang benar-benar butuh seluruh data lintas tahun.
 */
export async function fetchAllNilai() {
  const t0 = performance.now();
  let items = [];
  let cursor;
  let guard = 0;
  do {
    const page = await base44.entities.Nilai.list({
      sort: '-created_date',
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    });
    items = items.concat(page?.items || []);
    cursor = page?.has_more ? page.next_cursor : undefined;
    guard += 1;
  } while (cursor && guard < 60);
  if (import.meta.env.DEV) {
    console.info(`[nilaiLoad] fetchAllNilai: ${items.length} record dalam ${Math.round(performance.now() - t0)} ms`);
  }
  return items;
}

/**
 * Memuat Nilai dengan filter di sisi SERVER (bukan menyaring data yang sudah termuat).
 * Query contoh: { kelas_id: { $in: [...] }, mapel: { $in: [...] } } atau { jenis_penilaian: 'PTS' }.
 * Mengembalikan array hasil filter server, dipaginasi lewat cursor.
 */
export async function fetchNilai(query, { limit = 1000, guard = 60 } = {}) {
  const t0 = performance.now();
  let items = [];
  let cursor;
  let g = 0;
  do {
    const page = await base44.entities.Nilai.filter(query, {
      sort: '-created_date',
      limit,
      ...(cursor ? { cursor } : {}),
    });
    items = items.concat(page?.items || []);
    cursor = page?.has_more ? page.next_cursor : undefined;
    g += 1;
  } while (cursor && g < guard);
  if (import.meta.env.DEV) {
    console.info(`[nilaiLoad] fetchNilai: ${items.length} record dalam ${Math.round(performance.now() - t0)} ms`, query);
  }
  return items;
}