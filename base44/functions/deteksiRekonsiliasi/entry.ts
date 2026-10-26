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
      if (n) (byNis[n] = byNis[n] || []).push(s);
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

    // 2. Keuangan: transaksi siswa tanpa siswa_id
    const keuAll = await fetchAllPages(svc.entities.Keuangan);
    for (const k of keuAll) {
      if (str(k.siswa_id)) continue;
      if (str(k.sumber_rekening) === 'SPMB') continue;
      if (k.is_iuran_muka || k.is_saldo_awal) continue;
      if (!KATEGORI_SISWA.includes(str(k.kategori))) continue;
      await add('Keuangan Tanpa Siswa', 'Keuangan', k.id, {
        nis: str(k.nis),
        nama: str(k.nama_siswa),
        nama_kelas: str(k.kelas),
        jumlah: Number(k.jumlah) || 0,
        uraian: str(k.uraian) || str(k.tipe_transaksi) || str(k.kategori),
        detail: `Tanggal ${str(k.tanggal)} · Kategori ${str(k.kategori)} · Status ${str(k.status_bayar)}`,
        kandidat: toKandidat({ nisn: '', nik: '', nis: k.nis, nama: k.nama_siswa, jenis_kelamin: '', tanggal_lahir: '' }),
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

    // Ringkasan antrean terbuka
    const terbuka = antrean.filter((q) => q.status === 'Menunggu' || q.status === 'Ditunda');
    const ringkasan = {};
    for (const q of terbuka) ringkasan[str(q.jenis)] = (ringkasan[str(q.jenis)] || 0) + 1;

    return Response.json({
      ok: true,
      spmb_tertaut: linkHasil.diperbarui,
      spmb_keuangan_id_dibackfill: linkHasil.keuangan_id_dibackfill,
      item_baru: itemBaru,
      sisa_belum_tersimpan: sisaBelumTersimpan,
      antrean_terbuka: terbuka.length,
      ringkasan,
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}