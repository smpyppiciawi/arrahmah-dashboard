import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { fetchAllPages, cariKandidatSiswa } from '../../shared/uidCore.ts';
import { tautkanSpmbKeuangan, str } from '../../shared/rekonsiliasiCore.ts';

const KATEGORI_SISWA = ['SPP', 'Ujian', 'Daftar Ulang', 'Kelulusan'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Akses ditolak. Hanya Admin yang dapat memindai rekonsiliasi.' }, { status: 403 });
    }
    const svc = base44.asServiceRole;

    const pengaturan = (await svc.entities.PengaturanAplikasi.list())[0] || {};
    const taAktif = pengaturan.tahun_ajaran_aktif || '';

    // 0. Tautkan transaksi SPMB yang kecocokannya PASTI (ref_payment_id / reg_number)
    const linkHasil = await tautkanSpmbKeuangan(svc);

    const siswaSemua = await fetchAllPages(svc.entities.Siswa);
    const siswaById = new Map(siswaSemua.map((s) => [s.id, s]));
    const siswaAktif = siswaSemua.filter((s) => !s.is_arsip && s.status === 'Aktif');
    const guruAll = await fetchAllPages(svc.entities.Guru);
    const guruById = new Map(guruAll.map((g) => [g.id, g]));

    const antrean = await fetchAllPages(svc.entities.AntrianRekonsiliasi);
    const openKeys = new Set(
      antrean
        .filter((q) => q.status === 'Menunggu' || q.status === 'Ditunda')
        .map((q) => `${str(q.jenis)}|${str(q.ref_entity)}|${str(q.ref_id)}`)
    );

    // Kumpulkan dulu, simpan berkelompok di akhir (batas laju server per menit)
    const BATAS_PER_PROSES = 150;
    const pending = [];
    let itemBaru = 0;
    let sisaBelumTersimpan = 0;
    const add = (jenis, refEntity, refId, data) => {
      const key = `${jenis}|${refEntity}|${refId}`;
      if (openKeys.has(key)) return;
      openKeys.add(key);
      if (pending.length >= BATAS_PER_PROSES) { sisaBelumTersimpan++; return; }
      pending.push({ jenis, status: 'Menunggu', ref_entity: refEntity, ref_id: refId, tahun_ajaran: taAktif, ...data });
    };

    const toKandidat = (input) =>
      cariKandidatSiswa(input, siswaSemua).map((c) => ({
        siswa_id: c.record.id,
        nis: str(c.record.nis),
        nama: str(c.record.nama),
        nama_kelas: str(c.record.nama_kelas),
        alasan: c.alasan.join('; '),
        skor: c.skor,
      }));

    // 1. NIS ganda pada siswa aktif
    const byNis = {};
    for (const s of siswaAktif) {
      const n = str(s.nis);
      if (n && n !== '0') (byNis[n] = byNis[n] || []).push(s); // NIS '0' = placeholder, bukan duplikat
    }
    for (const [nis, list] of Object.entries(byNis)) {
      if (list.length < 2) continue;
      await add('NIS Duplikat', 'Siswa', `nis:${nis}`, {
        nis,
        nama: list.map((s) => str(s.nama)).join(' / '),
        nama_kelas: list.map((s) => str(s.nama_kelas)).join(' / '),
        jumlah: 0,
        uraian: `NIS ${nis} dipakai ${list.length} siswa aktif`,
        detail: list.map((s) => `${str(s.nama)} (${str(s.nama_kelas)})${s.uid ? ' — UID ' + str(s.uid).slice(0, 8) + '…' : ''}`).join('  |  '),
        kandidat: [],
      });
    }

    // 2. Keuangan: transaksi dengan BUKTI keterkaitan siswa tetapi relasi tidak lengkap.
    // Transaksi umum (tidak memilih siswa/pegawai sama sekali) VALID dan TIDAK masuk antrean.
    const keuAll = await fetchAllPages(svc.entities.Keuangan);
    const uidBackfill = [];
    for (const k of keuAll) {
      if (str(k.sumber_rekening) === 'SPMB') continue;
      const sid = str(k.siswa_id);
      const adaReferensi = !!(sid || str(k.nis) || str(k.nama_siswa) || str(k.siswa_uid));
      if (sid && siswaById.has(sid)) {
        // Relasi utuh — lengkapi UID permanen bila belum ada (idempoten, untuk sinkronisasi akurat)
        if (!str(k.siswa_uid)) {
          const s = siswaById.get(sid);
          uidBackfill.push({
            id: k.id,
            siswa_uid: str(s.uid),
            nis: str(k.nis) || str(s.nis),
            nama_siswa: str(k.nama_siswa) || str(s.nama),
            kelas: str(k.kelas) || str(s.nama_kelas),
          });
        }
        // NIS catatan transaksi berbeda dari NIS siswa saat ini — perlu konfirmasi Admin
        const nisTrx = str(k.nis);
        if (nisTrx && nisTrx !== str(siswaById.get(sid).nis)) {
          await add('NIS Tidak Sesuai', 'Keuangan', k.id, {
            nis: nisTrx,
            nama: str(k.nama_siswa) || str(siswaById.get(sid).nama),
            nama_kelas: str(k.kelas) || str(siswaById.get(sid).nama_kelas),
            jumlah: Number(k.jumlah) || 0,
            uraian: str(k.uraian) || 'NIS transaksi berbeda dari NIS siswa',
            detail: `Tanggal ${str(k.tanggal)} · Kategori ${str(k.kategori)} · NIS transaksi: ${nisTrx} · NIS siswa saat ini: ${str(siswaById.get(sid).nis)}`,
            kandidat: [{
              siswa_id: sid,
              nis: str(siswaById.get(sid).nis),
              nama: str(siswaById.get(sid).nama),
              nama_kelas: str(siswaById.get(sid).nama_kelas),
              alasan: 'Tertaut via siswa_id pada transaksi',
              skor: 100,
            }],
          });
        }
        continue;
      }
      if (!adaReferensi) continue; // transaksi umum yang valid
      await add('Keuangan Tanpa Siswa', 'Keuangan', k.id, {
        nis: str(k.nis),
        nama: str(k.nama_siswa),
        nama_kelas: str(k.kelas),
        jumlah: Number(k.jumlah) || 0,
        uraian: sid ? 'Transaksi menunjuk siswa yang tidak dikenal' : (str(k.uraian) || str(k.tipe_transaksi) || str(k.kategori)),
        detail: `Tanggal ${str(k.tanggal)} · Kategori ${str(k.kategori)} · Status ${str(k.status_bayar)}${sid ? ' · Siswa ID asal: ' + sid.slice(0, 12) + '…' : ''}`,
        kandidat: toKandidat({ nisn: '', nik: '', nis: k.nis, nama: k.nama_siswa, jenis_kelamin: '', tanggal_lahir: '' }),
      });
    }
    // Lengkapi stempel UID permanen pada transaksi yang relasinya sudah utuh
    for (let i = 0; i < uidBackfill.length; i += 40) {
      await svc.entities.Keuangan.bulkUpdate(uidBackfill.slice(i, i + 40));
    }

    // 2B. Keuangan: transaksi dengan BUKTI keterkaitan pegawai tetapi pegawai tidak dikenal.
    // Transaksi pegawai yang relasinya utuh, dan transaksi umum, tidak masuk antrean.
    for (const k of keuAll) {
      const gid = str(k.guru_id);
      if (gid && guruById.has(gid)) continue;
      if (!gid && !str(k.nip_pegawai) && !str(k.nama_pegawai)) continue;
      await add('Keuangan Tanpa Pegawai', 'Keuangan', k.id, {
        nis: '',
        nama: str(k.nama_pegawai),
        nama_kelas: str(k.jabatan_pegawai),
        jumlah: Number(k.jumlah) || 0,
        uraian: str(k.uraian) || str(k.tipe_transaksi) || str(k.kategori),
        detail: `Tanggal ${str(k.tanggal)} · Kategori ${str(k.kategori)} · NIP ${str(k.nip_pegawai) || '-'}${gid ? ' · Pegawai ID asal: ' + gid.slice(0, 12) + '…' : ''}`,
        kandidat: [],
      });
    }

    // 3. SPMB belum tertaut (tidak ada kecocokan pasti)
    for (const k of keuAll) {
      if (str(k.sumber_rekening) !== 'SPMB' || str(k.siswa_id)) continue;
      await add('SPMB Belum Tertaut', 'Keuangan', k.id, {
        nis: str(k.nis),
        nama: str(k.nama_siswa),
        nama_kelas: str(k.kelas),
        jumlah: Number(k.jumlah) || 0,
        uraian: str(k.uraian) || 'Pembayaran SPMB',
        detail: `Tanggal ${str(k.tanggal)} · Sumber SPMB · Status ${str(k.status_bayar)}`,
        kandidat: toKandidat({ nisn: '', nik: '', nis: k.nis, nama: k.nama_siswa, jenis_kelamin: '', tanggal_lahir: '' }),
      });
    }

    // 4. Absensi menunjuk siswa tak dikenal
    const absAll = await fetchAllPages(svc.entities.Absensi);
    for (const a of absAll) {
      const sid = str(a.siswa_id);
      if (!sid || siswaById.has(sid)) continue;
      await add('Absensi Tak Dikenal', 'Absensi', a.id, {
        nis: str(a.nis),
        nama: str(a.nama_siswa),
        nama_kelas: str(a.nama_kelas),
        jumlah: 0,
        uraian: `Absensi ${str(a.status)} tak tertaut`,
        detail: `Tanggal ${str(a.tanggal)} · Metode ${str(a.metode)} · Siswa ID asal: ${sid.slice(0, 12)}…`,
        kandidat: toKandidat({ nisn: '', nik: '', nis: a.nis, nama: a.nama_siswa, jenis_kelamin: '', tanggal_lahir: '' }),
      });
    }

    // 5. Izin siswa tanpa/tak dikenal siswa_id
    const izinAll = await fetchAllPages(svc.entities.IzinSiswa);
    for (const i of izinAll) {
      const sid = str(i.siswa_id);
      if (sid && siswaById.has(sid)) continue;
      await add('Izin Tak Dikenal', 'IzinSiswa', i.id, {
        nis: str(i.nis),
        nama: str(i.nama_siswa),
        nama_kelas: str(i.nama_kelas),
        jumlah: 0,
        uraian: `Izin ${str(i.alasan)} tak tertaut`,
        detail: `Tanggal ${str(i.tanggal)} · Jam ${str(i.jam_izin)}`,
        kandidat: toKandidat({ nisn: '', nik: '', nis: i.nis, nama: i.nama_siswa, jenis_kelamin: '', tanggal_lahir: '' }),
      });
    }

    // Simpan temuan berkelompok (40 per batch, jeda antar batch)
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < pending.length; i += 40) {
      await svc.entities.AntrianRekonsiliasi.bulkCreate(pending.slice(i, i + 40));
      if (i + 40 < pending.length) await sleep(3000);
    }
    itemBaru = pending.length;

    // Ringkasan antrean terbuka (termasuk item yang baru dibuat pada proses ini)
    const terbuka = antrean.filter((q) => q.status === 'Menunggu' || q.status === 'Ditunda');
    const ringkasan = {};
    for (const q of terbuka) ringkasan[str(q.jenis)] = (ringkasan[str(q.jenis)] || 0) + 1;
    for (const q of pending) ringkasan[str(q.jenis)] = (ringkasan[str(q.jenis)] || 0) + 1;

    return Response.json({
      ok: true,
      spmb_tertaut: linkHasil.diperbarui,
      spmb_keuangan_id_dibackfill: linkHasil.keuangan_id_dibackfill,
      item_baru: itemBaru,
      uid_dibackfill: uidBackfill.length,
      sisa_belum_tersimpan: sisaBelumTersimpan,
      antrean_terbuka: terbuka.length + pending.length,
      ringkasan,
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}