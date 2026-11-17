import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { getFiturNotif, sendFonnteWA } from '../../shared/waSender.ts';
import {
  detectAbsen3Hari, getRecipients, findWaka, eventKey, wibTodayStr, buildHolidaySet, isSchoolDay,
  fetchAllRecords, periodeLabel, PERIODE_MULAI,
} from '../../shared/absen3Hari.ts';

// Peringatan Absen Siswa — pemantauan otomatis periode 1 November 2026 s/d HARI INI (WIB).
// Dijalankan sekali setiap hari belajar/sekolah oleh workflow "Notifikasi Absen 3 Hari Siswa".
//
// - Deteksi memakai SATU mesin bersama (shared/absen3Hari.ts) yang juga dipakai laporan Dashboard Kepsek,
//   sehingga angka dashboard = angka yang dinotifikasi.
// - Pemicu SELALU disimpan ke entitas NotifAbsen3Hari, termasuk saat gateway dimatikan, nomor belum ada,
//   atau pengiriman gagal — laporan tetap bisa diaudit.
// - Status WA dicatat TERPISAH per penerima (Wali Kelas, Waka Kesiswaan, Waka Kurikulum) beserta waktunya.
// - Idempoten: penerima yang sudah berhasil tidak dikirimi ulang; hanya yang belum berhasil dicoba lagi.
// Payload opsional: { dry_run: true } untuk pemeriksaan awal tanpa kirim, { force: true } untuk melewati
// pemeriksaan hari libur.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const force = body?.force === true;

    // Bila dipanggil pengguna, batasi ke peran pengelola (workflow memanggil sebagai admin sistem)
    let user = null;
    try { user = await base44.auth.me(); } catch (e) { user = null; }
    if (user && !['admin', 'kepsek', 'tu'].includes(user.role)) {
      return Response.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const fonnteToken = secrets.get('WA_FONNTE_TOKEN');
    const todayStr = wibTodayStr();

    const [kalenderList, siswaList, kelasList, guruList, absensiRecords, fiturGateway] = await Promise.all([
      fetchAllRecords(svc.entities.KalenderAkademik, {}),
      fetchAllRecords(svc.entities.Siswa, { status: 'Aktif' }),
      fetchAllRecords(svc.entities.Kelas, {}),
      fetchAllRecords(svc.entities.Guru, {}),
      fetchAllRecords(
        svc.entities.Absensi,
        { tanggal: { $gte: PERIODE_MULAI, $lte: todayStr } },
        ['siswa_id', 'tanggal', 'status', 'keterangan'],
        'tanggal'
      ),
      getFiturNotif(svc),
    ]);

    // Pemantauan hanya berjalan pada hari belajar/sekolah (bukan Sabtu/Minggu/libur Kalender Akademik)
    if (!force && !isSchoolDay(todayStr, buildHolidaySet(kalenderList))) {
      return Response.json({
        status: 'hari_libur',
        tanggal: todayStr,
        message: 'Hari ini bukan hari belajar/sekolah — pemantauan absen dilewati',
      });
    }

    const gatewayWa = fiturGateway.siswa_absen3 !== false;
    const detection = detectAbsen3Hari({ absensiRecords, todayStr, kalenderList });
    const siswaById = {};
    siswaList.forEach((s) => { siswaById[s.id] = s; });
    const kelasById = {};
    kelasList.forEach((k) => { kelasById[k.id] = k; });
    const guruById = {};
    guruList.forEach((g) => { guruById[g.id] = g; });
    const waka = findWaka(guruList);

    const candidateIds = Object.keys(detection);
    if (candidateIds.length === 0) {
      return Response.json({
        status: 'tidak_ada_pemicu',
        tanggal: todayStr,
        periode: periodeLabel(todayStr),
        message: 'Tidak ada siswa yang memenuhi kriteria Peringatan Absen Siswa pada periode ini',
      });
    }

    // Log lama (idempoten — tidak pernah dihapus)
    const logRows = await fetchAllRecords(svc.entities.NotifAbsen3Hari, { tanggal_pemicu: { $gte: PERIODE_MULAI } });
    let logByKey = {};
    logRows.forEach((l) => { logByKey[`${l.siswa_id}|${l.status}|${l.kriteria}|${l.minggu_key}`] = l; });

    const buildItems = () => {
      const items = [];
      candidateIds.forEach((siswaId) => {
        const s = siswaById[siswaId];
        if (!s || s.status !== 'Aktif') return;
        const det = detection[siswaId];
        const recipients = getRecipients({ siswa: s, kelasById, guruById, guruList, waka });
        det.events.forEach((ev) => {
          const key = eventKey(siswaId, ev);
          const log = logByKey[key] || null;
          const detailLama = Array.isArray(log?.penerima_wa_detail) ? log.penerima_wa_detail : [];
          items.push({ key, siswa: s, ev, log, recipients, detailLama });
        });
      });
      return items;
    };

    let items = buildItems();
    if (items.length === 0) {
      return Response.json({ status: 'tidak_ada_pemicu', tanggal: todayStr, periode: periodeLabel(todayStr) });
    }

    // Simpan pemicu lebih dulu — tidak bergantung pada keberhasilan WA.
    const baru = items.filter((it) => !it.log);
    if (baru.length > 0) {
      await svc.entities.NotifAbsen3Hari.bulkCreate(baru.map((it) => ({
        siswa_id: it.siswa.id,
        nis: it.siswa.nis || '',
        nama_siswa: it.siswa.nama,
        nama_kelas: it.siswa.nama_kelas || '',
        status: it.ev.status,
        kriteria: it.ev.kriteria,
        detail: it.ev.detail,
        minggu_key: it.ev.minggu_key,
        tanggal_pemicu: it.ev.tanggal_pemicu,
        wa_terkirim: false,
        email_terkirim: false,
        penerima_wa: '',
        dicek_at: new Date().toISOString(),
        penerima_wa_detail: it.recipients.map((r) => ({
          peran: r.peran, nama: r.nama, phone: r.phone || '', terkirim: false, waktu: '', catatan: 'Menunggu pengiriman',
        })),
      })));
      const refreshed = await fetchAllRecords(svc.entities.NotifAbsen3Hari, { tanggal_pemicu: { $gte: PERIODE_MULAI } });
      logByKey = {};
      refreshed.forEach((l) => { logByKey[`${l.siswa_id}|${l.status}|${l.kriteria}|${l.minggu_key}`] = l; });
      items = buildItems();
    }

    // Kelompokkan HANYA penerima yang belum berhasil (idempoten per penerima)
    const groups = {};
    items.forEach((it) => {
      it.recipients.forEach((r) => {
        const sudah = it.detailLama.find((d) => d.peran === r.peran);
        if (sudah && sudah.terkirim) return;
        if (!r.phone) return;
        const gk = `${r.peran}|${r.guru_id}`;
        if (!groups[gk]) groups[gk] = { nama: r.nama, peran: r.peran, phone: r.phone, items: [] };
        groups[gk].items.push(it);
      });
    });
    const groupKeys = Object.keys(groups);

    // hasil[eventKey][peran] = { terkirim, waktu, catatan }
    const hasil = {};
    let grupTerkirim = 0;
    let grupGagal = 0;

    const catat = (gk, ok, catatan) => {
      const g = groups[gk];
      const waktu = new Date().toISOString();
      g.items.forEach((it) => {
        if (!hasil[it.key]) hasil[it.key] = {};
        hasil[it.key][g.peran] = ok ? { terkirim: true, waktu, catatan: 'Terkirim' } : { terkirim: false, waktu: '', catatan };
      });
    };

    if (!dryRun && gatewayWa && fonnteToken && groupKeys.length > 0) {
      for (let i = 0; i < groupKeys.length; i += 5) {
        const slice = groupKeys.slice(i, i + 5);
        await Promise.allSettled(slice.map(async (gk) => {
          const g = groups[gk];
          const shown = g.items.slice(0, 25);
          const lines = shown
            .map((it) => `• ${it.siswa.nama} (${it.siswa.nama_kelas}) — ${it.ev.status} · ${it.ev.kriteria}: ${it.ev.detail}`)
            .join('\n') + (g.items.length > 25 ? `\n… +${g.items.length - 25} siswa lainnya` : '');
          const message = `Yth. Bpk/Ibu ${g.nama} (${g.peran}),\n\n` +
            `Berikut siswa yang memenuhi Ketentuan Peringatan Absen Siswa — periode ${periodeLabel(todayStr)}:\n\n` +
            `${lines}\n\n` +
            `Mohon tindak lanjut dan segera hubungi orang tua/wali siswa terkait. Terima kasih.\n\n` +
            `- Sistem Informasi Sekolah YPPI ARRAHMAH`;
          try {
            const res = await sendFonnteWA(g.phone, message, fonnteToken);
            if (res && res.sent) {
              grupTerkirim += 1;
              catat(gk, true);
            } else {
              grupGagal += 1;
              catat(gk, false, `Gagal kirim: ${(res && (res.error || res.reason)) || 'tanpa keterangan'}`);
            }
          } catch (e) {
            grupGagal += 1;
            catat(gk, false, `Gagal kirim: ${e?.message || 'kesalahan jaringan'}`);
          }
        }));
      }
    }

    // Simpan hasil per penerima (satu kali bulkUpdate)
    const waktuCek = new Date().toISOString();
    const updates = items.map((it) => {
      const detail = it.recipients.map((r) => {
        const lama = it.detailLama.find((d) => d.peran === r.peran) || null;
        if (lama && lama.terkirim) return lama;
        const baruHasil = hasil[it.key] && hasil[it.key][r.peran];
        if (baruHasil && baruHasil.terkirim) {
          return { peran: r.peran, nama: r.nama, phone: r.phone || '', terkirim: true, waktu: baruHasil.waktu, catatan: 'Terkirim' };
        }
        let catatan = (baruHasil && baruHasil.catatan) || '';
        if (!catatan) {
          if (!gatewayWa) catatan = 'Gateway WA dimatikan di Pengaturan';
          else if (dryRun) catatan = 'Pemeriksaan awal — belum dikirim';
          else if (!r.phone) catatan = 'Nomor WA belum tersedia';
          else if (!fonnteToken) catatan = 'Token WA belum diatur';
          else catatan = 'Menunggu pengiriman';
        }
        return { peran: r.peran, nama: r.nama, phone: r.phone || '', terkirim: false, waktu: '', catatan };
      });
      const terkirim = detail.filter((d) => d.terkirim);
      return {
        id: it.log.id,
        siswa_id: it.siswa.id,
        nis: it.siswa.nis || '',
        nama_siswa: it.siswa.nama,
        nama_kelas: it.siswa.nama_kelas || '',
        status: it.ev.status,
        kriteria: it.ev.kriteria,
        detail: it.ev.detail,
        minggu_key: it.ev.minggu_key,
        tanggal_pemicu: it.ev.tanggal_pemicu,
        dicek_at: waktuCek,
        wa_terkirim: terkirim.length > 0,
        penerima_wa: terkirim.map((d) => `${d.nama} (${d.peran})`).join(', '),
        penerima_wa_detail: detail,
      };
    });

    if (updates.length > 0) {
      await svc.entities.NotifAbsen3Hari.bulkUpdate(updates.slice(0, 500));
    }

    return Response.json({
      status: 'success',
      tanggal: todayStr,
      periode: periodeLabel(todayStr),
      dry_run: dryRun,
      gateway_wa: gatewayWa,
      kandidat_siswa: candidateIds.length,
      pemicu: items.length,
      pemicu_baru: baru.length,
      grup_penerima: groupKeys.length,
      grup_terkirim: grupTerkirim,
      grup_gagal: grupGagal,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}