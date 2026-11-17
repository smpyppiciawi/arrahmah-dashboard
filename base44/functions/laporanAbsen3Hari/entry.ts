import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  detectAbsen3Hari, getRecipients, findWaka, eventKey, wibTodayStr, fetchAllRecords,
  periodeLabel, PERAN_PENERIMA, PERIODE_MULAI,
} from '../../shared/absen3Hari.ts';

// Laporan Peringatan Absen Siswa untuk Dashboard Kepsek.
// Memakai mesin deteksi yang SAMA dengan fungsi notifikasi (shared/absen3Hari.ts),
// sehingga siswa, kriteria, dan tanggal pemicu di dashboard identik dengan yang dinotifikasi.
// Periode: 1 November 2026 s/d HARI INI (WIB) — batas akhir bergerak maju setiap hari.
// Status WA dikembalikan terpisah untuk Wali Kelas, Waka Kesiswaan, dan Waka Kurikulum.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (e) { user = null; }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const todayStr = wibTodayStr();

    const [kalenderList, siswaList, kelasList, guruList, absensiRecords, logRows] = await Promise.all([
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
      fetchAllRecords(svc.entities.NotifAbsen3Hari, { tanggal_pemicu: { $gte: PERIODE_MULAI } }),
    ]);

    const detection = detectAbsen3Hari({ absensiRecords, todayStr, kalenderList });
    const siswaById = {};
    siswaList.forEach((s) => { siswaById[s.id] = s; });
    const kelasById = {};
    kelasList.forEach((k) => { kelasById[k.id] = k; });
    const guruById = {};
    guruList.forEach((g) => { guruById[g.id] = g; });
    const waka = findWaka(guruList);

    const logByKey = {};
    logRows.forEach((l) => { logByKey[`${l.siswa_id}|${l.status}|${l.kriteria}|${l.minggu_key}`] = l; });

    const rows = Object.keys(detection)
      .map((siswaId) => {
        const s = siswaById[siswaId];
        if (!s || s.status !== 'Aktif') return null;
        const det = detection[siswaId];
        const recipients = getRecipients({ siswa: s, kelasById, guruById, guruList, waka });
        const peranMap = {};

        const events = det.events.map((ev) => {
          const log = logByKey[eventKey(siswaId, ev)] || null;
          const detail = Array.isArray(log?.penerima_wa_detail) ? log.penerima_wa_detail : [];
          recipients.forEach((r) => {
            const d = detail.find((x) => x.peran === r.peran) || null;
            if (!peranMap[r.peran]) {
              peranMap[r.peran] = { peran: r.peran, nama: r.nama, phone: r.phone || '', total: 0, terkirim: 0, waktu: '', catatan: '' };
            }
            const p = peranMap[r.peran];
            p.total += 1;
            if (d && d.terkirim) {
              p.terkirim += 1;
              if ((d.waktu || '') > p.waktu) p.waktu = d.waktu || '';
            } else if (d && d.catatan && !p.catatan) {
              p.catatan = d.catatan;
            }
          });
          return {
            status: ev.status,
            kriteria: ev.kriteria,
            detail: ev.detail,
            tanggal_pemicu: ev.tanggal_pemicu,
          };
        });

        const penerima = PERAN_PENERIMA
          .filter((peran) => peranMap[peran])
          .map((peran) => {
            const p = peranMap[peran];
            return {
              ...p,
              status: p.terkirim === 0 ? 'Menunggu' : p.terkirim === p.total ? 'Terkirim' : 'Sebagian',
            };
          });

        const waStatus = penerima.length === 0
          ? 'Menunggu'
          : penerima.every((p) => p.status === 'Terkirim')
            ? 'Terkirim'
            : penerima.some((p) => p.status !== 'Menunggu') ? 'Sebagian' : 'Menunggu';

        return {
          siswa_id: siswaId,
          nis: s.nis || '',
          nama: s.nama || '',
          nama_kelas: s.nama_kelas || '',
          counts: det.counts,
          last_date: det.lastDate,
          absen_list: det.absenList,
          events,
          penerima,
          wa_status: waStatus,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id') || (a.nama_kelas || '').localeCompare(b.nama_kelas || '', 'id'));

    const jumlahPemicu = rows.reduce((sum, r) => sum + r.events.length, 0);
    const waTerkirim = rows.filter((r) => r.wa_status === 'Terkirim').length;

    return Response.json({
      periode: {
        mulai: PERIODE_MULAI,
        selesai: todayStr,
        label: periodeLabel(todayStr),
      },
      ringkasan: {
        siswa: rows.length,
        pemicu: jumlahPemicu,
        wa_terkirim: waTerkirim,
        wa_menunggu: rows.length - waTerkirim,
      },
      rows,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}