import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Pengingat H-1 (WA Gateway) untuk kegiatan Kalender Akademik yang menugaskan pegawai.
// Dijalankan workflow harian: kegiatan besok dengan tugas_untuk_aktif + pegawai terpilih
// akan dikirim WA ke tiap pegawai (sekali saja — dedup via tugas_h1_notif_at).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const h1 = new Date();
    h1.setDate(h1.getDate() + 1);
    const h1Str = h1.toISOString().split('T')[0];

    const events = await svc.entities.KalenderAkademik.filter({ tanggal_mulai: h1Str });
    const tugasEvents = (events || []).filter(ev =>
      ev.tugas_untuk_aktif &&
      (ev.pegawai_ids || []).length > 0 &&
      !ev.tugas_h1_notif_at
    );

    if (tugasEvents.length === 0) {
      return Response.json({ status: 'no_events', date: h1Str, message: 'Tidak ada kegiatan bertugas H-1' });
    }

    // Hormati sakelar gateway: WA jenis Pegawai (Pengaturan) — pengingat dijeda,
    // tugas_h1_notif_at BELUM ditandai agar terkirim saat gateway diaktifkan kembali.
    const gatewayRows = await svc.entities.PengaturanAplikasi.list();
    const gw = (gatewayRows || [])[0] || {};
    if (gw.notif_wa_pegawai === false) {
      return Response.json({
        status: 'wa_off',
        date: h1Str,
        events: tugasEvents.length,
        message: 'Gateway WA Pegawai dimatikan (OFF) di Pengaturan — pengingat H-1 dijeda',
      });
    }

    const guruList = await svc.entities.Guru.list();
    let waSent = 0;
    const notifiedEventIds = [];

    for (const ev of tugasEvents) {
      for (const gid of ev.pegawai_ids) {
        const g = guruList.find(x => x.id === gid);
        if (!g?.no_telp) continue;
        const message =
          `Pengingat H-1 Kegiatan: Yth. Bpk/Ibu ${g.nama}, Anda ditugaskan pada kegiatan "${ev.judul}" yang berlangsung BESOK (${h1Str}).` +
          `\nKategori: ${ev.kategori}` +
          `${ev.tanggal_selesai ? `\ns/d ${ev.tanggal_selesai}` : ''}` +
          `${ev.keterangan ? `\nKeterangan: ${ev.keterangan}` : ''}` +
          `\nMohon hadir tepat waktu dan siapkan perlengkapan kegiatan. Terima kasih.\n\n- Sistem Informasi Sekolah YPPI ARRAHMAH`;
        try {
          await svc.functions.invoke('sendWANotif', { phone: g.no_telp, message });
          waSent++;
        } catch (e) {
          // skip gagal kirim individual
        }
      }
      notifiedEventIds.push(ev.id);
    }

    // Tandai agar tidak dikirim ulang
    if (notifiedEventIds.length > 0) {
      try {
        await svc.entities.KalenderAkademik.updateMany(
          { id: { $in: notifiedEventIds } },
          { $set: { tugas_h1_notif_at: new Date().toISOString() } }
        );
      } catch (e) {
        // skip gagal update dedup
      }
    }

    return Response.json({
      status: 'success',
      date: h1Str,
      events: tugasEvents.length,
      wa_sent: waSent,
      events_marked: notifiedEventIds.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});