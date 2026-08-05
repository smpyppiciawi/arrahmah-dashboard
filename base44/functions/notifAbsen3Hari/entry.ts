import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Hitung minggu sekolah (Senin-Jumat) untuk tanggal 'yyyy-MM-dd'
function getSchoolWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  const fmt = (x) => x.toISOString().slice(0, 10);
  // ISO week number
  const thu = new Date(monday);
  thu.setUTCDate(monday.getUTCDate() + 3);
  const year = thu.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor((thu.getTime() - jan1.getTime()) / 86400000);
  const jan1Day = (jan1.getUTCDay() + 6) % 7;
  const weekNum = Math.ceil((dayOfYear + jan1Day + 1) / 7);
  return {
    weekKey: `${year}-${String(weekNum).padStart(2, '0')}`,
    weekStart: fmt(monday),
    weekEnd: fmt(friday),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const todayStr = new Date().toISOString().slice(0, 10);
    const { weekKey, weekStart, weekEnd } = getSchoolWeek(todayStr);

    const siswaList = await base44.asServiceRole.entities.Siswa.filter({ status: 'Aktif' });
    const kelasList = await base44.asServiceRole.entities.Kelas.list();
    const guruList = await base44.asServiceRole.entities.Guru.list();
    const absensiList = await base44.asServiceRole.entities.Absensi.list('-tanggal', 5000);

    // Deteksi siswa dengan akumulasi absen (Alfa/Sakit) >= 3 hari dalam minggu berjalan (Senin-Jumat)
    // yang belum dinotifikasi pada minggu ini (dedup via notif_absen3hari_minggu == weekKey).
    const siswaAbsen3Hari = [];
    for (const s of siswaList) {
      const records = absensiList.filter(a => a.siswa_id === s.id);
      const weekRecords = records
        .filter(r => r.tanggal >= weekStart && r.tanggal <= weekEnd && (r.status === 'Alfa' || r.status === 'Sakit'))
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
      if (weekRecords.length < 3) continue;
      // Dedup: sudah pernah dikirim notifikasi untuk minggu ini
      if (s.notif_absen3hari_minggu === weekKey) continue;
      const alfaCount = weekRecords.filter(r => r.status === 'Alfa').length;
      const sakitCount = weekRecords.filter(r => r.status === 'Sakit').length;
      const kelas = kelasList.find(k => k.id === s.kelas_id);
      const waliGuru = guruList.find(g => g.nama === kelas?.wali_kelas);
      siswaAbsen3Hari.push({
        id: s.id,
        nama: s.nama,
        kelas: s.nama_kelas || kelas?.nama_kelas,
        waliName: kelas?.wali_kelas,
        waliPhone: waliGuru?.no_telp,
        alfaCount,
        sakitCount,
        lastDate: weekRecords[weekRecords.length - 1].tanggal,
      });
    }

    if (siswaAbsen3Hari.length === 0) {
      return Response.json({
        status: 'no_absence',
        weekKey,
        weekStart,
        weekEnd,
        message: 'Tidak ada siswa absen 3+ hari minggu ini yang belum dinotifikasi',
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
    const notifiedSiswaIds = [];
    for (const key of Object.keys(byWali)) {
      const w = byWali[key];
      if (!w.waliPhone) { noPhoneCount++; continue; }
      const siswaRows = w.siswa
        .map(s => `• ${s.nama} (${s.kelas}) — Alfa ${s.alfaCount}x, Sakit ${s.sakitCount}x`)
        .join('\n');
      const message =
        `Yth. Bpk/Ibu ${w.waliName || 'Wali Kelas'},\n\n` +
        `Mohon tindak lanjut siswa berikut yang telah absen (Alfa/Sakit) 3+ hari pada minggu ini (${weekStart} s/d ${weekEnd}):\n\n` +
        `${siswaRows}\n\n` +
        `Mohon segera hubungi orang tua. Terima kasih.\n\n- Sistem Informasi Sekolah YPPI ARRAHMAH`;
      try {
        await base44.asServiceRole.functions.invoke('sendWANotif', { phone: w.waliPhone, message });
        sentCount++;
        w.siswa.forEach(s => notifiedSiswaIds.push(s.id));
      } catch (e) {
        // skip gagal kirim individual
      }
    }

    // Tandai siswa yang sudah dinotifikasi (sekali per minggu) — dedup
    if (notifiedSiswaIds.length > 0) {
      try {
        await base44.asServiceRole.entities.Siswa.updateMany(
          { id: { $in: notifiedSiswaIds } },
          { $set: { notif_absen3hari_minggu: weekKey } }
        );
      } catch (e) {
        // skip gagal update dedup
      }
    }

    return Response.json({
      status: 'success',
      weekKey,
      weekStart,
      weekEnd,
      siswa_absen_3hari: siswaAbsen3Hari.length,
      wali_notified: sentCount,
      wali_no_phone: noPhoneCount,
      siswa_marked_notified: notifiedSiswaIds.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});