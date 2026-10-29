import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { getFiturNotif, sendFonnteWA } from '../../shared/waSender.ts';

// Notifikasi tamu Buku Tamu kepada pegawai yang ingin ditemui:
// WhatsApp (Fonnte) — hanya berjalan bila tamu tertaut ke pegawai tertentu
// dan sakelar "Tamu Ingin Bertemu" pada Notifikasi Gateway aktif.
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

    const fitur = await getFiturNotif(svc);
    if (!fitur.pegawai_tamu) {
      return Response.json({ sent: false, reason: 'gateway_off', message: 'Notifikasi Tamu (Pegawai) dijeda di Pengaturan › Notifikasi Gateway' });
    }

    const namaTamu = tamu.nama_ortu_wali || tamu.nama_lengkap || 'Tamu';
    const siswaText = tamu.nama_siswa ? `${tamu.nama_siswa}${tamu.nama_kelas ? ` (${tamu.nama_kelas})` : ''}` : '-';

    const pesan = `*TAMU INGIN BERTEMU*\n\nYth. ${pegawai.nama},\nAda tamu yang ingin bertemu dengan Anda.\n\nJenis Tamu: ${tamu.jenis_tamu || '-'}\nNama Tamu: ${namaTamu}\nSiswa: ${siswaText}\nNo. HP/WA: ${tamu.no_hp_wa || '-'}\nKeperluan: ${tamu.keperluan || '-'}\nTanggal: ${tamu.tanggal || '-'}\n\nMohon konfirmasi kedatangan tamu. Terima kasih.`;

    const waHasil = pegawai.no_telp
      ? await sendFonnteWA(pegawai.no_telp, pesan, secrets.get('WA_FONNTE_TOKEN'))
      : { sent: false, reason: 'no_contact' };

    return Response.json({
      sent: waHasil.sent === true,
      wa: waHasil.sent === true,
      pegawai: pegawai.nama,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}