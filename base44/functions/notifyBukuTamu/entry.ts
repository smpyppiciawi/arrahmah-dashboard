import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { getNotifGateway, sendFonnteWA } from '../../shared/waSender.ts';

// Notifikasi tamu Buku Tamu kepada pegawai yang ingin ditemui:
// WA (Fonnte) + Email (hanya jika email pegawai terdaftar sebagai pengguna aplikasi).
// Dipanggil dari form Buku Tamu setelah data tamu tersimpan.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const bukuTamuId = body?.buku_tamu_id;
    if (!bukuTamuId) return Response.json({ error: 'buku_tamu_id is required' }, { status: 400 });

    const svc = base44.asServiceRole;
    const tamu = await svc.entities.BukuTamu.get(bukuTamuId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!tamu) return Response.json({ error: 'Data tamu tidak ditemukan' }, { status: 404 });
    if (!tamu.ingin_bertemu_pegawai_id) return Response.json({ sent: false, reason: 'no_target' });

    const pegawai = await svc.entities.Guru.get(tamu.ingin_bertemu_pegawai_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!pegawai) return Response.json({ sent: false, reason: 'pegawai_not_found' });

    const namaTamu = tamu.nama_ortu_wali || tamu.nama_lengkap || 'Tamu';
    const siswaText = tamu.nama_siswa ? `${tamu.nama_siswa}${tamu.nama_kelas ? ` (${tamu.nama_kelas})` : ''}` : '-';
    const gateway = await getNotifGateway(svc);

    const pesan = `*TAMU INGIN BERTEMU*\n\nYth. ${pegawai.nama},\nAda tamu yang ingin bertemu dengan Anda.\n\nJenis Tamu: ${tamu.jenis_tamu || '-'}\nNama Tamu: ${namaTamu}\nSiswa: ${siswaText}\nNo. HP/WA: ${tamu.no_hp_wa || '-'}\nKeperluan: ${tamu.keperluan || '-'}\nTanggal: ${tamu.tanggal || '-'}\n\nMohon konfirmasi kedatangan tamu. Terima kasih.`;

    let waHasil = { sent: false, reason: 'gateway_off' };
    if (gateway.wa_pegawai !== false && pegawai.no_telp) {
      waHasil = await sendFonnteWA(pegawai.no_telp, pesan, secrets.get('WA_FONNTE_TOKEN'));
    }

    let emailTerkirim = false;
    if (gateway.email_pegawai !== false && pegawai.email) {
      try {
        const terdaftar = await svc.entities.User.filter({ email: pegawai.email });
        if ((terdaftar || []).length > 0) {
          const html = `
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
              <div style="background:#0891b2;padding:20px 24px;color:#fff">
                <h2 style="margin:0;font-size:18px">Ada Tamu Ingin Bertemu</h2>
                <p style="margin:4px 0 0;font-size:13px;color:#cffafe">Sistem Informasi Sekolah YPPI ARRAHMAH</p>
              </div>
              <div style="padding:24px">
                <p style="margin:0 0 16px;font-size:14px;color:#334155">Yth. ${pegawai.nama}, ada tamu yang ingin bertemu dengan Anda.</p>
                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <tr><td style="padding:8px 0;color:#64748b;width:130px">Jenis Tamu</td><td style="padding:8px 0;color:#0f172a">${tamu.jenis_tamu || '-'}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b">Nama Tamu</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${namaTamu}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b">Siswa</td><td style="padding:8px 0;color:#0f172a">${siswaText}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b">No. HP/WA</td><td style="padding:8px 0;color:#0f172a">${tamu.no_hp_wa || '-'}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b">Keperluan</td><td style="padding:8px 0;color:#0f172a">${tamu.keperluan || '-'}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b">Tanggal</td><td style="padding:8px 0;color:#0f172a">${tamu.tanggal || '-'}</td></tr>
                </table>
              </div>
              <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0">
                <p style="margin:0;font-size:11px;color:#94a3b8">Rincian tamu juga tersedia pada menu Buku Tamu di akun aplikasi Anda.</p>
              </div>
            </div>`;
          await svc.integrations.Core.SendEmail({
            to: pegawai.email,
            subject: `Ada tamu ingin bertemu — ${namaTamu}`,
            html,
            from_name: 'Buku Tamu Sekolah',
            category: 'transactional',
          });
          emailTerkirim = true;
        }
      } catch (e) {
        emailTerkirim = false;
      }
    }

    return Response.json({
      sent: waHasil.sent || emailTerkirim,
      wa: waHasil.sent === true,
      email: emailTerkirim,
      pegawai: pegawai.nama,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}