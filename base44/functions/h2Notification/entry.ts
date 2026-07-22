import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Calculate H-2 date (2 days from now)
    const h2Date = new Date();
    h2Date.setDate(h2Date.getDate() + 2);
    const h2DateStr = h2Date.toISOString().split('T')[0];

    // Query KalenderAkademik for events on H-2
    const events = await base44.asServiceRole.entities.KalenderAkademik.filter({
      tanggal_mulai: h2DateStr
    });

    if (!events || events.length === 0) {
      return Response.json({ status: 'no_events', message: 'Tidak ada kegiatan H-2', date: h2DateStr });
    }

    // Get all guru/pegawai emails
    const guruList = await base44.asServiceRole.entities.Guru.list();
    const emails = guruList.filter(g => g.email).map(g => g.email);

    if (emails.length === 0) {
      return Response.json({ status: 'no_emails', message: 'Tidak ada email guru terdaftar' });
    }

    // Format event details
    const eventDetails = events.map(ev =>
      `Kegiatan: ${ev.judul}\nTanggal: ${h2DateStr}\nKategori: ${ev.kategori}${ev.keterangan ? `\nKeterangan: ${ev.keterangan}` : ''}`
    ).join('\n\n');

    const subject = `Notifikasi H-2: ${events.length} Kegiatan Sekolah Lusa`;
    const body = `Pengingat: Lusa ada kegiatan sekolah:\n\n${eventDetails}\n\nMohon perhatian dan persiapan.\n\n- Sistem Informasi Sekolah YPPI ARRAHMAH`;

    let sentCount = 0;
    for (const email of emails) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject,
          body
        });
        sentCount++;
      } catch (e) {
        // skip unregistered emails
      }
    }

    return Response.json({
      status: 'success',
      date: h2DateStr,
      events_count: events.length,
      emails_sent: sentCount,
      events: events.map(e => e.judul)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});