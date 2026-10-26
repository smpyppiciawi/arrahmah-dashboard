import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { fetchAllPages } from '../../shared/uidCore.ts';
import { snapIdentitas } from '../../shared/riwayatIdentitas.ts';
import { str } from '../../shared/rekonsiliasiCore.ts';

/**
 * Membangun Riwayat Identitas awal untuk seluruh Siswa & Pegawai yang belum
 * punya riwayat (backfill idempoten). Event: Masuk, Lulus/Pindah/Keluar,
 * Meninggal Dunia/Mengundurkan Diri, Arsip. Resumable: batas 150 per proses,
 * jalankan ulang untuk melanjutkan.
 */
const BATAS_PER_PROSES = 150;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;
    const [siswaAll, guruAll, keluarAll, riwayatAll] = await Promise.all([
      fetchAllPages(svc.entities.Siswa),
      fetchAllPages(svc.entities.Guru),
      fetchAllPages(svc.entities.SiswaKeluar),
      fetchAllPages(svc.entities.RiwayatIdentitas),
    ]);

    const ada = new Set(
      riwayatAll.map((r) => `${str(r.tipe)}|${str(r.uid) || 'noid:' + str(r.record_id)}|${str(r.event)}`)
    );
    const pending = [];
    let sisa = 0;

    const add = (item) => {
      const key = `${item.tipe}|${item.uid || 'noid:' + item.record_id}|${item.event}`;
      if (ada.has(key)) return;
      ada.add(key);
      if (pending.length >= BATAS_PER_PROSES) { sisa += 1; return; }
      pending.push(item);
    };

    const tanggalDari = (ts) => String(ts || '').slice(0, 10);

    // Siswa: Masuk + akhir siklus (Lulus/Pindah/Keluar/Meninggal/Mengundurkan Diri) + Arsip
    const keluarById = new Map(keluarAll.filter((k) => str(k.siswa_id)).map((k) => [str(k.siswa_id), k]));
    for (const s of siswaAll) {
      add({
        ...snapIdentitas('Siswa', s),
        event: 'Masuk',
        tanggal_event: tanggalDari(s.created_date),
        detail: 'Masuk sebagai siswa',
        snapshot: { nama_kelas: str(s.nama_kelas), status: 'Aktif' },
        sumber: 'Sistem (backfill)',
      });
      if (s.is_arsip) {
        add({
          ...snapIdentitas('Siswa', s),
          event: 'Arsip',
          tanggal_event: tanggalDari(s.arsip_at),
          detail: `Alasan: ${str(s.arsip_alasan) || 'diarsipkan'}`,
          snapshot: { nama_kelas: str(s.nama_kelas), status_sebelum: str(s.status_sebelum_arsip) },
          sumber: 'Sistem (backfill)',
        });
      }
      const st = str(s.status);
      if (st === 'Lulus') {
        add({
          ...snapIdentitas('Siswa', s),
          event: 'Lulus',
          tahun_ajaran: str(s.tahun_lulus),
          detail: `Lulus tahun ajaran ${str(s.tahun_lulus)}`,
          snapshot: { nama_kelas: str(s.nama_kelas), status: 'Lulus' },
          sumber: 'Sistem (backfill)',
        });
      } else if (st === 'Pindah') {
        add({
          ...snapIdentitas('Siswa', s),
          event: 'Pindah',
          detail: 'Status Pindah',
          snapshot: { nama_kelas: str(s.nama_kelas), status: 'Pindah' },
          sumber: 'Sistem (backfill)',
        });
      } else if (st === 'Keluar') {
        const k = keluarById.get(str(s.id)) || {};
        const kategori = str(k.kategori) || 'Keluar';
        const event = ['Pindah', 'Meninggal Dunia', 'Mengundurkan Diri'].includes(kategori) ? kategori : 'Keluar';
        add({
          ...snapIdentitas('Siswa', s),
          event,
          tanggal_event: tanggalDari(k.tanggal_keluar),
          detail: `Alasan: ${str(k.alasan) || kategori}`,
          snapshot: { nama_kelas: str(k.nama_kelas) || str(s.nama_kelas), kategori_keluar: kategori },
          sumber: 'Sistem (backfill)',
        });
      }
    }

    // Pegawai: Masuk + Keluar/Mutasi/Meninggal Dunia + Arsip
    for (const g of guruAll) {
      add({
        ...snapIdentitas('Pegawai', g),
        event: 'Masuk',
        tanggal_event: tanggalDari(g.created_date),
        detail: `Masuk sebagai ${str(g.jabatan) || 'Pegawai'}`,
        snapshot: { jabatan: str(g.jabatan), status: 'Aktif' },
        sumber: 'Sistem (backfill)',
      });
      if (g.is_arsip) {
        add({
          ...snapIdentitas('Pegawai', g),
          event: 'Arsip',
          tanggal_event: tanggalDari(g.arsip_at),
          detail: `Alasan: ${str(g.arsip_alasan) || 'diarsipkan'}`,
          snapshot: { jabatan: str(g.jabatan), status_sebelum: str(g.status_sebelum_arsip) },
          sumber: 'Sistem (backfill)',
        });
      }
      if (str(g.status) === 'Keluar') {
        const alasan = str(g.alasan_keluar) || 'Keluar';
        const event = ['Mutasi', 'Meninggal Dunia'].includes(alasan) ? alasan : 'Keluar';
        add({
          ...snapIdentitas('Pegawai', g),
          event,
          tanggal_event: tanggalDari(g.tanggal_keluar),
          detail: `Alasan: ${alasan}`,
          snapshot: { jabatan: str(g.jabatan), status: 'Keluar' },
          sumber: 'Sistem (backfill)',
        });
      }
    }

    // Simpan berkelompok (40 per batch, jeda antar batch — batas laju server)
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < pending.length; i += 40) {
      await svc.entities.RiwayatIdentitas.bulkCreate(pending.slice(i, i + 40));
      if (i + 40 < pending.length) await sleep(3000);
    }

    // Penyembuhan idempoten: hapus duplikat akibat lag konsistensi baca antar proses
    const cek = await fetchAllPages(svc.entities.RiwayatIdentitas);
    const sudah = new Set();
    const hapusIds = [];
    for (const r of cek) {
      const key = `${str(r.tipe)}|${str(r.uid) || 'noid:' + str(r.record_id)}|${str(r.event)}`;
      if (sudah.has(key)) hapusIds.push(r.id);
      else sudah.add(key);
    }
    for (let i = 0; i < hapusIds.length; i += 40) {
      await svc.entities.RiwayatIdentitas.deleteMany({ id: { $in: hapusIds.slice(i, i + 40) } });
    }

    return Response.json({
      ok: true,
      dibuat: pending.length,
      dihapus_duplikat: hapusIds.length,
      sisa_belum_tersimpan: sisa,
      total_siswa: siswaAll.length,
      total_pegawai: guruAll.length,
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}