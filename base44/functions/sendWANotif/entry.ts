import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { sendFonnteWA, normalizePhone, getFiturNotif } from '../../shared/waSender.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'tu', 'kepsek', 'bendahara'].includes(user.role)) {
      return Response.json({ error: 'Akses ditolak. Gateway WA hanya untuk Admin/TU/Kepsek/Bendahara.' }, { status: 403 });
    }

    const body = await req.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return Response.json({ error: 'phone and message are required' }, { status: 400 });
    }

    // Sakelar Notifikasi Gateway untuk pengiriman MANUAL catatan siswa UKS/Izin
    // catatan_ortu → Siswa (Kirim Orang Tua) · catatan_wali → Pegawai (Kirim Wali Kelas)
    const fiturKode = body.fitur === 'catatan_wali' ? 'pegawai_catatan'
      : body.fitur === 'catatan_ortu' ? 'siswa_catatan'
      : null;
    if (fiturKode) {
      const fiturGateway = await getFiturNotif(base44.asServiceRole);
      if (!fiturGateway[fiturKode]) {
        return Response.json({
          paused: true,
          message: fiturKode === 'pegawai_catatan'
            ? 'Kirim Wali Kelas sedang dijeda di Pengaturan › Notifikasi Gateway.'
            : 'Kirim Orang Tua sedang dijeda di Pengaturan › Notifikasi Gateway.',
        });
      }
    }

    // Whitelist nomor: hanya nomor yang terdaftar pada data siswa/pegawai
    const svc = base44.asServiceRole;
    const target = normalizePhone(phone);
    const daftar = new Set();
    const pushPhone = (p) => { const d = normalizePhone(p || ''); if (d && d.length >= 8) daftar.add(d); };
    const siswaSemua = await svc.entities.Siswa.list();
    for (const s of siswaSemua) {
      (s.kontak_list || []).forEach((c) => pushPhone(c && c.no_telp));
      pushPhone(s.no_telp_ortu);
    }
    const guruSemua = await svc.entities.Guru.list();
    for (const g of guruSemua) pushPhone(g.no_telp);
    const digits = target.replace(/\D/g, '');
    const allowed = daftar.has(target) || [...daftar].some((d) => digits.endsWith(d) || d.endsWith(digits));
    if (!allowed) {
      return Response.json({ error: 'Nomor tujuan tidak terdaftar pada data siswa/pegawai' }, { status: 403 });
    }

    const token = secrets.get('WA_FONNTE_TOKEN');
    if (!token) {
      return Response.json({ error: 'WA_FONNTE_TOKEN secret not set' }, { status: 500 });
    }

    const res = await sendFonnteWA(phone, message, token);
    if (!res.sent) {
      return Response.json(
        { error: res.error || res.reason || 'Fonnte API error', detail: res.fonnte || null },
        { status: 502 }
      );
    }

    return Response.json({ success: true, phone: normalizePhone(phone), fonnte: res.fonnte });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}