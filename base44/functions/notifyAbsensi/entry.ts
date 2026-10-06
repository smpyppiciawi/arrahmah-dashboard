import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { sendFonnteWA, getNotifGateway } from '../../shared/waSender.ts';

// Notifikasi absensi terpusat (WA + Email) untuk Siswa & Pegawai.
// - Kontak SELALU dibaca dari data terbaru (Siswa / Guru), bukan snapshot kartu.
// - Siswa: WA ke nomor Ibu, fallback Ayah → Wali → no_telp_ortu; Email ke siswa.email (jika terdaftar sebagai user aplikasi).
// - Pegawai: WA + Email keduanya ke pegawai (no_telp & email Data Pegawai).
// - Mendukung 1 absensi tunggal atau batch: { batch: [ {...}, ... ] } (maks 100).
// - Hasil tiap kanal independen: gagal satu kanal tidak menggagalkan kanal lain.

const KONTAK_URUTAN = ['Ibu', 'Ayah', 'Wali'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const items = Array.isArray(body && body.batch) ? body.batch : [body];
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return Response.json({ error: 'Payload absensi tidak valid (batch maksimal 100)' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const token = secrets.get('WA_FONNTE_TOKEN');
    // Sakelar gateway (per kanal & jenis) dari PengaturanAplikasi — dibaca sekali per panggilan
    const gw = await getNotifGateway(svc);

    const results = [];
    // Proses per 5 paralel: cepat tapi tetap ramah batas rate Fonnte
    for (let i = 0; i < items.length; i += 5) {
      const chunk = items.slice(i, i + 5);
      const chunkRes = await Promise.allSettled(chunk.map((it) => prosesSatu(svc, it, token, gw)));
      chunkRes.forEach((r) => {
        if (r.status === 'fulfilled') {
          results.push(r.value);
        } else {
          results.push({ wa: { sent: false, error: 'error' }, email: { sent: false, error: 'error' } });
        }
      });
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function prosesSatu(svc, it, token, gw) {
  const person_type = it && it.person_type;
  const person_id = it && it.person_id;
  if (!person_type || !person_id) {
    return { wa: { sent: false, reason: 'invalid' }, email: { sent: false, reason: 'invalid' } };
  }
  const { tanggal, jam, status, metode, jenis_absensi } = it;

  if (person_type === 'Pegawai') {
    return pegawaiNotif(svc, person_id, tanggal, jam, status, metode, token, gw);
  }
  return siswaNotif(svc, person_id, tanggal, jam, status, metode, jenis_absensi, token, gw);
}

// ===== PEGAWAI: WA & Email keduanya ke pegawai =====
async function pegawaiNotif(svc, personId, tanggal, jam, status, metode, token, gw) {
  let guru = null;
  try { guru = await svc.entities.Guru.get(personId); } catch (e) { guru = null; }
  if (!guru) {
    return { wa: { sent: false, reason: 'not_found' }, email: { sent: false, reason: 'not_found' } };
  }

  // Hormati sakelar gateway: WA & Email jenis Pegawai (Pengaturan)
  const wa = gw.wa_pegawai === false
    ? { sent: false, reason: 'off' }
    : guru.no_telp
      ? await sendFonnteWA(
          guru.no_telp,
          `*Notifikasi Absensi Pegawai*\n\nNama: ${guru.nama}\nJabatan: ${guru.jabatan || '-'}\nTanggal: ${tanggal}\nJam: ${jam || '-'}\nStatus: *${status}*\nMetode: ${metode || '-'}`,
          token
        )
      : { sent: false, reason: 'no_contact' };

  const email = gw.email_pegawai === false
    ? { sent: false, reason: 'off' }
    : await emailTerkirim(
    svc,
    guru.email,
    `Notifikasi Absensi Pegawai — ${status} (${tanggal} ${jam || '-'})`,
    buildEmailHtml('Notifikasi Absensi', [
      ['Nama', guru.nama],
      ['Jabatan', guru.jabatan || '-'],
      ['Tanggal', tanggal],
      ['Jam', jam || '-'],
      ['Status', status],
      ['Metode', metode || '-'],
    ])
  );

  return { wa, email };
}

// ===== SISWA: WA (Ibu → Ayah → Wali) + Email yang terdaftar =====
async function siswaNotif(svc, personId, tanggal, jam, status, metode, jenisAbsensi, token, gw) {
  let siswa = null;
  try { siswa = await svc.entities.Siswa.get(personId); } catch (e) { siswa = null; }
  if (!siswa) {
    return { wa: { sent: false, reason: 'not_found' }, email: { sent: false, reason: 'not_found' } };
  }

  let phone = '';
  let hubungan = '';
  const kontakList = Array.isArray(siswa.kontak_list) ? siswa.kontak_list : [];
  for (const hub of KONTAK_URUTAN) {
    const c = kontakList.find((k) => (k.hubungan || '') === hub && k.no_telp);
    if (c) { phone = c.no_telp; hubungan = hub; break; }
  }
  if (!phone && siswa.no_telp_ortu) {
    phone = siswa.no_telp_ortu;
    hubungan = 'Orang Tua/Wali';
  }

  // Hormati sakelar gateway: WA & Email jenis Siswa (Pengaturan)
  const wa = gw.wa_siswa === false
    ? { sent: false, reason: 'off' }
    : phone
      ? await sendFonnteWA(
          phone,
          `*Notifikasi Absensi Siswa*\n\nNama: ${siswa.nama}\nKelas: ${siswa.nama_kelas || '-'}\nTanggal: ${tanggal}\nJam: ${jam || '-'}\nStatus: *${status}*\nMetode: ${metode || '-'}${hubungan ? `\n(Dikirim ke ${hubungan})` : ''}`,
          token
        )
      : { sent: false, reason: 'no_contact' };

  const email = gw.email_siswa === false
    ? { sent: false, reason: 'off' }
    : await emailTerkirim(
    svc,
    siswa.email,
    `Notifikasi Absensi Siswa — ${status} (${tanggal} ${jam || '-'})`,
    buildEmailHtml('Notifikasi Absensi', [
      ['Nama', siswa.nama],
      ['Kelas', siswa.nama_kelas || '-'],
      ['Tanggal', tanggal],
      ['Jam', jam || '-'],
      ['Status', status],
      ['Metode', metode || '-'],
    ])
  );

  return { wa, email };
}

// ===== EMAIL: hanya ke email yang terdaftar sebagai user aplikasi =====
async function emailTerkirim(svc, email, subject, html) {
  if (!email) return { sent: false, reason: 'no_contact' };

  let registered = false;
  try {
    const found = await svc.entities.User.filter({ email });
    registered = (found || []).length > 0;
  } catch (e) {
    registered = false;
  }
  if (!registered) return { sent: false, reason: 'not_registered' };

  try {
    await svc.integrations.Core.SendEmail({
      to: email,
      subject,
      html,
      from_name: 'Sistem Informasi Sekolah',
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e.message };
  }
}

function buildEmailHtml(judul, baris) {
  const rows = baris
    .map(([k, v]) => `<tr><td style="padding:8px 0;color:#64748b;width:120px">${k}</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${v}</td></tr>`)
    .join('');
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#059669;padding:20px 24px;color:#fff">
        <h2 style="margin:0;font-size:18px">${judul}</h2>
        <p style="margin:4px 0 0;font-size:13px;color:#d1fae5">Sistem Informasi Sekolah YPPI ARRAHMAH</p>
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 16px;font-size:14px;color:#334155">Absensi berhasil tercatat.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
      </div>
      <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0">
        <p style="margin:0;font-size:11px;color:#94a3b8">Email ini dikirim otomatis oleh sistem absensi. Mohon tidak membalas email ini.</p>
      </div>
    </div>
  `;
}