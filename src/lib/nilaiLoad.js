import { base44 } from '@/api/base44Client';

/**
 * Memuat SELURUH record Nilai — melewati batas maksimal 5.000 record per query
 * dengan fetch bertahap per halaman (cursor). Sekali jalan, tanpa polling,
 * agar progres penilaian, daftar nilai, dan Rapor terbaca utuh.
 */
export async function fetchAllNilai() {
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
  return items;
}