import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Migrasi UID permanen untuk Siswa & Guru (idempoten, dapat dilanjutkan).
 * - Melewati record yang sudah ber-UID.
 * - Menjaga NIS/NISN/NUPTK, ID internal, dan relasi lama tidak diubah.
 * - Anti-duplikasi: UID baru diperiksa terhadap seluruh UID yang sudah ada.
 * - Batas per pemanggilan (default 500/entity) agar aman; sisa dilaporkan
 *   sehingga pemanggil dapat mengulang sampai selesai.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let limit = 500;
    try {
      const body = await req.json();
      limit = Math.min(Number(body?.limit) || 500, 2000);
    } catch {}

    const hasil = {};
    for (const entityName of ['Siswa', 'Guru']) {
      // 1. Kumpulkan semua UID yang sudah ada (anti-duplikasi)
      const existing = new Set();
      let cursor;
      let guard = 0;
      do {
        const page = await base44.entities[entityName].list({
          limit: 1000,
          fields: ['uid'],
          ...(cursor ? { cursor } : {}),
        });
        (page.items || []).forEach(r => { if (r.uid) existing.add(r.uid); });
        cursor = page.has_more ? page.next_cursor : undefined;
        guard += 1;
      } while (cursor && guard < 100);

      // 2. Cari record tanpa UID (null / kosong / tidak ada)
      const tanpaUid = [];
      cursor = undefined;
      guard = 0;
      do {
        const page = await base44.entities[entityName].filter(
          { $or: [{ uid: null }, { uid: '' }] },
          { limit: 1000, ...(cursor ? { cursor } : {}) }
        );
        tanpaUid.push(...(page.items || []));
        cursor = page.has_more ? page.next_cursor : undefined;
        guard += 1;
      } while (cursor && guard < 100);

      // 3. Isi UID pada sebagian record (resumable)
      const diproses = tanpaUid.slice(0, limit);
      for (let i = 0; i < diproses.length; i += 500) {
        const batch = diproses.slice(i, i + 500).map(r => {
          let uid;
          do { uid = crypto.randomUUID(); } while (existing.has(uid));
          existing.add(uid);
          return { id: r.id, uid };
        });
        await base44.entities[entityName].bulkUpdate(batch);
      }

      const key = entityName === 'Siswa' ? 'siswa' : 'guru';
      hasil[key] = { diproses: diproses.length, sisa: tanpaUid.length - diproses.length };
    }

    const sisaTotal = hasil.siswa.sisa + hasil.guru.sisa;
    return Response.json({ selesai: sisaTotal === 0, ...hasil });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}