import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Kirim email konfirmasi absensi scan ke pegawai.
// Hanya terkirim jika email pegawai terdaftar sebagai user aplikasi (User entity).
// Gagal kirim tidak mengganggu proses absensi (dipanggil fire-and-forget dari frontend).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { email, nama, jabatan, tanggal, jam, status, metode } = body;
    if (!email || !nama) {
      return Response.json({ error: 'email and nama are required' }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // Cek pegawai terdaftar sebagai user aplikasi
    let registered = false;
    try {
      const found = await svc.entities.User.filter({ email });
      registered = (found || []).length > 0;
    } catch (e) {
      registered = false;
    }
    if (!registered) {
      return Response.json({ sent: false, reason: 'not_registered' });
    }

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#059669;padding:20px 24px;color:#fff">
          <h2 style="margin:0;font-size:18px">Notifikasi Absensi</h2>
          <p style="margin:4px 0 0;font-size:13px;color:#d1fae5">Sistem Informasi Sekolah YPPI ARRAHMAH</p>
        </div>
        <div style="padding:24px">
          <p style="margin:0 0 16px;font-size:14px;color:#334155">Absensi Anda berhasil tercatat.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#64748b;width:120px">Nama</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${nama}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Jabatan</td><td style="padding:8px 0;color:#0f172a">${jabatan || '-'}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Tanggal</td><td style="padding:8px 0;color:#0f172a">${tanggal}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Jam</td><td style="padding:8px 0;color:#0f172a">${jam}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Status</td><td style="padding:8px 0;font-weight:700;color:#059669">${status}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Metode</td><td style="padding:8px 0;color:#0f172a">${metode || '-'}</td></tr>
          </table>
        </div>
        <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;color:#94a3b8">Email ini dikirim otomatis oleh sistem absensi. Mohon tidak membalas email ini.</p>
        </div>
      </div>
    `;

    await svc.integrations.Core.SendEmail({
      to: email,
      subject: `Notifikasi Absensi — ${status} (${tanggal} ${jam})`,
      html,
      from_name: 'Sistem Informasi Sekolah',
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});