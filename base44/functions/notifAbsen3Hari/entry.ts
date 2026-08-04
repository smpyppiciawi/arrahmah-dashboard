import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Ambil data siswa aktif, kelas, guru, dan absensi terbaru
    const siswaList = await base44.asServiceRole.entities.Siswa.filter({ status: 'Aktif' });
    const kelasList = await base44.asServiceRole.entities.Kelas.list();
    const guruList = await base44.asServiceRole.entities.Guru.list();
    const absensiList = await base44.asServiceRole.entities.Absensi.list('-tanggal', 5000);

    // Deteksi siswa absen (Alfa/Sakit) >= 3 hari sejak terakhir hadir dan belum hadir kembali
    const siswaAbsen3Hari = [];
    for (const s of siswaList) {
      const records = absensiList.filter(a => a.siswa_id === s.id);
      if (records.length === 0) continue;
      const hadirDates = records
        .filter(r => r.status === 'Hadir' || r.status === 'Terlambat')
        .map(r => r.tanggal)
        .sort();
      const lastHadirDate = hadirDates.length > 0 ? hadirDates[hadirDates.length - 1] : null;
      const absentsAfter = records
        .filter(r => !lastHadirDate || r.tanggal > lastHadirDate)
        .filter(r => r.status === 'Alfa' || r.status === 'Sakit')
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
      if (absentsAfter.length >= 3) {
        const alfaCount = absentsAfter.filter(r => r.status === 'Alfa').length;
        const sakitCount = absentsAfter.filter(r => r.status === 'Sakit').length;
        const kelas = kelasList.find(k => k.id === s.kelas_id);
        const waliGuru = guruList.find(g => g.nama === kelas?.wali_kelas);
        siswaAbsen3Hari.push({
          nama: s.nama,
          kelas: s.nama_kelas || kelas?.nama_kelas,
          waliName: kelas?.wali_kelas,
          waliPhone: waliGuru?.no_telp,
          alfaCount,
          sakitCount,
          lastDate: absentsAfter[absentsAfter.length - 1].tanggal,
        });
      }
    }

    if (siswaAbsen3Hari.length === 0) {
      return Response.json({
        status: 'no_absence',
        message: 'Tidak ada siswa absen 3+ hari yang belum hadir kembali',
      });
    }

    // Kelompokkan per Wali Kelas (berdasarkan no_telp)
    const byWali = {};
    for (const s of siswaAbsen3Hari) {
      const key = s.waliPhone || `no-phone-${s.waliName || s.kelas}`;
      if (!byWali[key]) byWali[key] = { waliName: s.waliName, waliPhone: s.waliPhone, siswa: [] };
      byWali[key].siswa.push(s);
    }

    let sentCount = 0;
    let noPhoneCount = 0;
    for (const key of Object.keys(byWali)) {
      const w = byWali[key];
      if (!w.waliPhone) { noPhoneCount++; continue; }
      const siswaRows = w.siswa
        .map(s => `• ${s.nama} (${s.kelas}) — Alfa ${s.alfaCount}x, Sakit ${s.sakitCount}x`)
        .join('\n');
      const message =
        `Yth. Bpk/Ibu ${w.waliName || 'Wali Kelas'},\n\n` +
        `Mohon tindak lanjut siswa berikut yang telah absen 3+ hari dan belum hadir kembali:\n\n` +
        `${siswaRows}\n\n` +
        `Mohon segera hubungi orang tua. Terima kasih.\n\n- Sistem Informasi Sekolah YPPI ARRAHMAH`;
      try {
        await base44.asServiceRole.functions.invoke('sendWANotif', { phone: w.waliPhone, message });
        sentCount++;
      } catch (e) {
        // skip gagal kirim individual
      }
    }

    return Response.json({
      status: 'success',
      siswa_absen_3hari: siswaAbsen3Hari.length,
      wali_notified: sentCount,
      wali_no_phone: noPhoneCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});