import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { str } from '../../shared/rekonsiliasiCore.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Akses ditolak. Hanya Admin yang dapat menerapkan rekonsiliasi.' }, { status: 403 });
    }

    const body = await req.json();
    const { queue_id, queue_ids, tindakan, siswa_id, catatan } = body;
    if (!tindakan || !['taut', 'tunda', 'selesai'].includes(tindakan)) {
      return Response.json({ error: 'tindakan (taut/tunda/selesai) wajib diisi' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const now0 = new Date().toISOString();
    const oleh0 = user.full_name || 'Admin';

    // Aksi massal: tutup/tunda banyak item antrean sekaligus (maks 200 per panggilan)
    if (Array.isArray(queue_ids) && queue_ids.length > 0) {
      if (tindakan === 'taut') {
        return Response.json({ error: 'Tautan hanya satu per satu lewat dialog peninjauan.' }, { status: 400 });
      }
      const ids = queue_ids.slice(0, 200);
      const kandidat = await svc.entities.AntrianRekonsiliasi.filter({ id: { $in: ids } }, undefined, 200);
      const terbuka = (kandidat.items || kandidat).filter((q) => ['Menunggu', 'Ditunda'].includes(str(q.status)));
      const updates = terbuka.map((q) => ({
        id: q.id,
        status: tindakan === 'tunda' ? 'Ditunda' : 'Selesai Tanpa Taut',
        catatan: catatan || (tindakan === 'tunda' ? 'Ditunda oleh Admin' : 'Ditutup tanpa tautan oleh Admin'),
        ditangani_oleh: oleh0,
        ditangani_at: now0,
      }));
      for (let i = 0; i < updates.length; i += 40) {
        await svc.entities.AntrianRekonsiliasi.bulkUpdate(updates.slice(i, i + 40));
      }
      return Response.json({ ok: true, diproses: updates.length });
    }

    if (!queue_id) {
      return Response.json({ error: 'queue_id atau queue_ids wajib diisi' }, { status: 400 });
    }
    const item = await svc.entities.AntrianRekonsiliasi.get(queue_id);
    if (!item) return Response.json({ error: 'Item antrean tidak ditemukan' }, { status: 404 });
    if (!['Menunggu', 'Ditunda'].includes(str(item.status))) {
      return Response.json({ error: `Item sudah ditangani (status: ${str(item.status)})` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const oleh = user.full_name || 'Admin';

    if (tindakan === 'tunda') {
      await svc.entities.AntrianRekonsiliasi.update(queue_id, {
        status: 'Ditunda',
        catatan: catatan || '',
        ditangani_oleh: oleh,
        ditangani_at: now,
      });
      return Response.json({ ok: true, status: 'Ditunda' });
    }

    if (tindakan === 'selesai') {
      await svc.entities.AntrianRekonsiliasi.update(queue_id, {
        status: 'Selesai Tanpa Taut',
        catatan: catatan || 'Ditutup tanpa tautan oleh Admin',
        ditangani_oleh: oleh,
        ditangani_at: now,
      });
      return Response.json({ ok: true, status: 'Selesai Tanpa Taut' });
    }

    // tindakan = taut
    if (item.jenis === 'NIS Duplikat') {
      return Response.json({ error: 'NIS duplikat diperbaiki manual lewat menu Siswa, bukan lewat tautan.' }, { status: 400 });
    }
    if (!siswa_id) return Response.json({ error: 'Pilih kandidat siswa terlebih dahulu' }, { status: 400 });
    const siswa = await svc.entities.Siswa.get(siswa_id);
    if (!siswa) return Response.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });

    let riwayatDiperbarui = 0;
    const snap = {
      siswa_id: siswa.id,
      siswa_uid: str(siswa.uid),
      nis: str(siswa.nis || item.nis),
      nama_siswa: str(siswa.nama || item.nama),
    };

    if (item.ref_entity === 'Keuangan') {
      await svc.entities.Keuangan.update(item.ref_id, { ...snap, kelas: str(siswa.nama_kelas || item.nama_kelas) });

      // NIS Tidak Sesuai: samakan SELURUH riwayat transaksi siswa ini (NIS/Nama/Kelas) dengan data siswa saat ini
      if (str(item.jenis) === 'NIS Tidak Sesuai') {
        let cursor;
        for (;;) {
          const page = await svc.entities.Keuangan.filter(
            { siswa_id: siswa.id },
            cursor ? { limit: 500, cursor } : { limit: 500 }
          );
          const rows = page.items || [];
          const perlu = rows.filter((r) =>
            str(r.nis) !== str(siswa.nis) ||
            str(r.nama_siswa) !== str(siswa.nama) ||
            str(r.kelas) !== str(siswa.nama_kelas)
          );
          for (let i = 0; i < perlu.length; i += 40) {
            await svc.entities.Keuangan.bulkUpdate(perlu.slice(i, i + 40).map((r) => ({
              id: r.id,
              nis: str(siswa.nis),
              nama_siswa: str(siswa.nama),
              kelas: str(siswa.nama_kelas),
            })));
          }
          riwayatDiperbarui += perlu.length;
          if (!page.next_cursor) break;
          cursor = page.next_cursor;
        }
      }
    } else if (item.ref_entity === 'Absensi') {
      await svc.entities.Absensi.update(item.ref_id, { ...snap, kelas_id: str(siswa.kelas_id || ''), nama_kelas: str(siswa.nama_kelas || item.nama_kelas) });
    } else if (item.ref_entity === 'IzinSiswa') {
      await svc.entities.IzinSiswa.update(item.ref_id, { ...snap, kelas_id: str(siswa.kelas_id || ''), nama_kelas: str(siswa.nama_kelas || item.nama_kelas) });
    } else {
      return Response.json({ error: `Entitas ${str(item.ref_entity)} belum didukung` }, { status: 400 });
    }

    await svc.entities.AntrianRekonsiliasi.update(queue_id, {
      status: 'Tertaut',
      catatan: catatan || `Tertaut ke ${str(siswa.nama)} (NIS ${str(siswa.nis)})`,
      ditangani_oleh: oleh,
      ditangani_at: now,
    });

    return Response.json({ ok: true, status: 'Tertaut', riwayat_diperbarui: riwayatDiperbarui, siswa: { id: siswa.id, nama: str(siswa.nama), nis: str(siswa.nis) } });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}