import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { getNotifGateway, sendFonnteWA } from '../../shared/waSender.ts';
import { detectAbsen3Hari, addDays } from '../../shared/absen3Hari.ts';

// Peringatan Absen 3 Hari — deteksi PER STATUS (Sakit/Izin/Alfa masing-masing) dengan 3 ketentuan:
// Beruntun 3 Hari, Akumulasi 3 Hari/Minggu, Sama Hari 3 Minggu (hari yang sama di 3 minggu berbeda).
// Notifikasi WA + Email otomatis ke Wali Kelas siswa, Waka Kesiswaan & Waka Kurikulum
// (data kontak diambil dari record Guru terkini; menghormati sakelar gateway WA & Email jenis Siswa).
// Dedup per siswa+status+kriteria+minggu lewat entitas NotifAbsen3Hari (gagal kirim diulang di run berikutnya).

async function fetchAllAbsensi(svc, windowStart) {
  const out = [];
  let cursor;
  for (;;) {
    const page = await svc.entities.Absensi.filter(
      { tanggal: { $gte: windowStart } },
      { sort: 'tanggal', limit: 1000, cursor, fields: ['siswa_id', 'tanggal', 'status', 'keterangan'] }
    );
    out.push(...(page.items || []));
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return out;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    // Token WA gateway (dipakai langsung — panggilan terjadwal/layanan tidak punya sesi user)
    const fonnteToken = secrets.get('WA_FONNTE_TOKEN');
    // WIB (UTC+7) — konsisten dgn zona waktu sekolah
    const todayStr = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

    const [kalenderList, siswaList, kelasList, guruList, absensiRecords, gateway] = await Promise.all([
      svc.entities.KalenderAkademik.list(),
      svc.entities.Siswa.filter({ status: 'Aktif' }),
      svc.entities.Kelas.list(),
      svc.entities.Guru.list(),
      fetchAllAbsensi(svc, addDays(todayStr, -35)),
      getNotifGateway(svc),
    ]);

    const detection = detectAbsen3Hari({ absensiRecords, todayStr, kalenderList });
    const siswaById = {};
    (siswaList || []).forEach((s) => { siswaById[s.id] = s; });
    const kelasById = {};
    (kelasList || []).forEach((k) => { kelasById[k.id] = k; });
    const guruById = {};
    (guruList || []).forEach((g) => { guruById[g.id] = g; });

    const candidateIds = Object.keys(detection);
    if (candidateIds.length === 0) {
      return Response.json({ status: 'no_absence', tanggal: todayStr, message: 'Tidak ada siswa yang memenuhi kriteria Peringatan Absen 3 Hari' });
    }

    // Dedup: log notifikasi yang sudah terkirim (minimal 1 kanal sukses) dilewati
    const existingLogs = await svc.entities.NotifAbsen3Hari.filter({ siswa_id: { $in: candidateIds } });
    const logMap = {};
    (existingLogs || []).forEach((l) => {
      logMap[`${l.siswa_id}|${l.status}|${l.kriteria}|${l.minggu_key}`] = l;
    });

    const pending = [];
    for (const siswaId of candidateIds) {
      const s = siswaById[siswaId];
      if (!s) continue;
      const det = detection[siswaId];
      det.events.forEach((ev) => {
        const key = `${siswaId}|${ev.status}|${ev.kriteria}|${ev.minggu_key}`;
        const existing = logMap[key];
        if (existing && (existing.wa_terkirim || existing.email_terkirim)) return;
        pending.push({ key, siswa: s, ev, existing });
      });
    }

    if (pending.length === 0) {
      return Response.json({ status: 'no_new', tanggal: todayStr, kandidat: candidateIds.length, message: 'Semua kriteria terpenuhi sudah dinotifikasi (dedup)' });
    }

    if (gateway.wa_siswa === false && gateway.email_siswa === false) {
      return Response.json({
        status: 'gateway_off',
        tanggal: todayStr,
        kandidat: pending.length,
        message: 'Gateway WA & Email jenis Siswa dimatikan di Pengaturan — notifikasi dijeda (dedup belum ditandai)',
      });
    }

    // Penerima: Wali Kelas (per kelas) + Waka Kesiswaan & Waka Kurikulum (aktif, dari data Guru terkini)
    const waka = { ks: null, kr: null };
    (guruList || []).forEach((g) => {
      if (g.status !== 'Aktif') return;
      if (g.tugas_tambahan === 'Waka Kesiswaan' && !waka.ks) waka.ks = g;
      if (g.tugas_tambahan === 'Waka Kurikulum' && !waka.kr) waka.kr = g;
    });

    const groups = {};
    const addEntry = (key, guru, p) => {
      if (!guru) return;
      if (!groups[key]) groups[key] = { nama: guru.nama, tugas: guru.tugas_tambahan || '', phone: guru.no_telp, email: guru.email, entries: [] };
      groups[key].entries.push(p);
    };
    pending.forEach((p) => {
      const kelas = kelasById[p.siswa.kelas_id];
      const wali = kelas ? (kelas.wali_kelas_id ? guruById[kelas.wali_kelas_id] : (guruList || []).find((g) => g.nama === kelas.wali_kelas)) : null;
      addEntry(`wali-${wali ? wali.id : p.siswa.kelas_id}`, wali, p);
      if (waka.ks) addEntry('waka-ks', waka.ks, p);
      if (waka.kr) addEntry('waka-kr', waka.kr, p);
    });

    // Email hanya ke penerima yang terdaftar sebagai pengguna aplikasi
    const groupEmails = [...new Set(Object.values(groups).map((g) => g.email).filter(Boolean))];
    let registeredSet = new Set();
    if (groupEmails.length > 0) {
      try {
        const users = await svc.entities.User.filter({ email: { $in: groupEmails } });
        registeredSet = new Set((users || []).map((u) => u.email));
      } catch (e) {
        registeredSet = new Set();
      }
    }

    const entryLine = (p) => `• ${p.siswa.nama} (${p.siswa.nama_kelas}) — ${p.ev.status} · ${p.ev.kriteria}: ${p.ev.detail}`;

    const groupKeys = Object.keys(groups);
    let waSentGroups = 0;
    let emailSentGroups = 0;
    let waFailGroups = 0;

    for (let i = 0; i < groupKeys.length; i += 6) {
      const slice = groupKeys.slice(i, i + 6);
      await Promise.allSettled(slice.map(async (key) => {
        const g = groups[key];
        const greeting = `Yth. Bpk/Ibu ${g.nama}${g.tugas ? ` (${g.tugas})` : ''}`;
        const shown = g.entries.slice(0, 25);
        const lines = shown.map(entryLine).join('\n') + (g.entries.length > 25 ? `\n… +${g.entries.length - 25} siswa lainnya` : '');

        // WA
        if (gateway.wa_siswa && g.phone) {
          try {
            const message = `${greeting},\n\n` +
              `Berikut siswa yang memenuhi Ketentuan Peringatan Absen 3 Hari (pemantauan otomatis ${todayStr}):\n\n` +
              `${lines}\n\n` +
              `Mohon tindak lanjut dan segera hubungi orang tua/wali siswa terkait. Terima kasih.\n\n` +
              `- Sistem Informasi Sekolah YPPI ARRAHMAH`;
            await sendFonnteWA(g.phone, message, fonnteToken);
            g.entries.forEach((p) => { p.waOk = true; p.penerimaWa = g.nama; });
            waSentGroups++;
          } catch (e) {
            waFailGroups++;
          }
        }

        // Email
        if (gateway.email_siswa && g.email && registeredSet.has(g.email)) {
          try {
            const rows = shown
              .map((p) => `<tr><td style="padding:8px 12px 8px 0;color:#0f172a;vertical-align:top">${p.siswa.nama}<br/><span style="font-size:11px;color:#64748b">${p.siswa.nama_kelas}</span></td><td style="padding:8px 12px 8px 0;font-weight:600;color:#0f172a;vertical-align:top;white-space:nowrap">${p.ev.status} · ${p.ev.kriteria}</td><td style="padding:8px 0;color:#334155;vertical-align:top">${p.ev.detail}</td></tr>`)
              .join('');
            const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">` +
              `<div style="background:#bfdbfe;padding:18px 24px"><h2 style="margin:0;font-size:16px;color:#000000">Peringatan Absen 3 Hari</h2><p style="margin:4px 0 0;font-size:12px;color:#374151">Sistem Informasi Sekolah YPPI ARRAHMAH — ${todayStr}</p></div>` +
              `<div style="padding:20px 24px"><p style="margin:0 0 12px;font-size:14px;color:#334155">${greeting},</p>` +
              `<p style="margin:0 0 12px;font-size:14px;color:#334155">Siswa berikut memenuhi ketentuan Peringatan Absen 3 Hari (Sakit/Izin/Alfa dihitung per status masing-masing):</p>` +
              `<table style="width:100%;border-collapse:collapse;font-size:13px"><tr><th align="left" style="padding:6px 12px 6px 0;color:#64748b;border-bottom:1px solid #e5e7eb">Siswa</th><th align="left" style="padding:6px 12px 6px 0;color:#64748b;border-bottom:1px solid #e5e7eb">Kriteria</th><th align="left" style="padding:6px 0;color:#64748b;border-bottom:1px solid #e5e7eb">Detail</th></tr>${rows}</table>` +
              `<p style="margin:14px 0 0;font-size:13px;color:#334155">Mohon tindak lanjut dan segera hubungi orang tua/wali siswa terkait.</p></div>` +
              `<div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e5e7eb"><p style="margin:0;font-size:11px;color:#94a3b8">Email otomatis dari Panel Absen 3 Hari. Mohon tidak membalas email ini.</p></div></div>`;
            await svc.integrations.Core.SendEmail({
              to: g.email,
              subject: `Peringatan Absen 3 Hari — ${g.entries.length} Siswa (${todayStr})`,
              html,
              from_name: 'Sistem Informasi Sekolah',
            });
            g.entries.forEach((p) => { p.emailOk = true; p.penerimaEmail = g.nama; });
            emailSentGroups++;
          } catch (e) {
            // gagal kirim individual — tidak menghentikan penerima lain
          }
        }
      }));
    }

    // Simpan/update log dedup per kejadian
    const byKey = {};
    pending.forEach((p) => { byKey[p.key] = p; });
    const creates = [];
    const updates = [];
    Object.keys(byKey).forEach((key) => {
      const p = byKey[key];
      const waTer = !!p.waOk;
      const emailTer = !!p.emailOk;
      if (!waTer && !emailTer && !p.existing) return; // belum ada upaya kirim sama sekali — coba lagi di run berikut
      const rec = {
        wa_terkirim: waTer,
        email_terkirim: emailTer,
        penerima_wa: p.penerimaWa || (p.existing && p.existing.penerima_wa) || '',
        penerima_email: p.penerimaEmail || (p.existing && p.existing.penerima_email) || '',
      };
      if (p.existing) updates.push(svc.entities.NotifAbsen3Hari.update(p.existing.id, rec));
      else creates.push({
        siswa_id: p.siswa.id,
        nis: p.siswa.nis || '',
        nama_siswa: p.siswa.nama,
        nama_kelas: p.siswa.nama_kelas || '',
        status: p.ev.status,
        kriteria: p.ev.kriteria,
        detail: p.ev.detail,
        minggu_key: p.ev.minggu_key,
        tanggal_pemicu: p.ev.tanggal_pemicu,
        ...rec,
      });
    });
    try {
      if (creates.length > 0) await svc.entities.NotifAbsen3Hari.bulkCreate(creates);
      if (updates.length > 0) await Promise.allSettled(updates);
    } catch (e) {
      // gagal simpan log — tidak mempengaruhi pengiriman yang sudah terjadi
    }

    return Response.json({
      status: 'success',
      tanggal: todayStr,
      kandidat: candidateIds.length,
      kejadian_baru: pending.length,
      wa_groups_terkirim: waSentGroups,
      wa_groups_gagal: waFailGroups,
      email_groups_terkirim: emailSentGroups,
      log_dibuat: creates.length,
      log_diperbarui: updates.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}