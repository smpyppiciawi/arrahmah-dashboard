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

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const todayStr = new Date().toISOString().slice(0, 10);
    const { weekKey, weekStart, weekEnd } = getSchoolWeek(todayStr);
    const prevWeekStart = addDays(weekStart, -7);

    const siswaList = await svc.entities.Siswa.filter({ status: 'Aktif' });
    const kelasList = await svc.entities.Kelas.list();
    const guruList = await svc.entities.Guru.list();

    // Hanya record Alfa/Sakit pada 2 minggu terakhir (subset kecil — akurat, bebas jendela data)
    const absenRecords = await svc.entities.Absensi.filter(
      { status: { $in: ['Alfa', 'Sakit'] }, tanggal: { $gte: prevWeekStart, $lte: weekEnd } },
      'tanggal',
      5000
    );

    const bySiswa = {};
    for (const r of absenRecords) {
      if (!r.siswa_id || !r.tanggal) continue;
      if (!bySiswa[r.siswa_id]) bySiswa[r.siswa_id] = [];
      bySiswa[r.siswa_id].push(r);
    }

    // Deteksi kandidat:
    // (1) akumulasi Alfa/Sakit >= 3 hari pada minggu berjalan (Senin-Jumat) -> notifikasi;
    // (2) memenuhi ambang pada minggu lalu & BELUM ada perubahan (record absensi terakhir
    //     masih Alfa/Sakit) -> pengingat berlanjut. Notifikasi cukup 1x per minggu
    //     (dedup via notif_absen3hari_minggu == weekKey); minggu berikutnya masih absen -> muncul lagi.
    const siswaAbsen3Hari = [];
    for (const s of siswaList) {
      const recs = (bySiswa[s.id] || []).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
      const curRecs = recs.filter((r) => r.tanggal >= weekStart && r.tanggal <= weekEnd);
      let base = null;
      let berlanjut = false;
      if (curRecs.length >= 3) {
        base = curRecs;
      } else {
        const prevRecs = recs.filter((r) => r.tanggal >= prevWeekStart && r.tanggal < weekStart);
        if (prevRecs.length >= 3) {
          const latest = await svc.entities.Absensi.filter({ siswa_id: s.id }, '-tanggal', 1);
          const last = (latest || [])[0];
          const stillAbsent = last && (last.status === 'Alfa' || last.status === 'Sakit') && last.tanggal >= prevWeekStart;
          if (stillAbsent) {
            base = [...prevRecs, ...curRecs];
            berlanjut = true;
          }
        }
      }
      if (!base) continue;
      // Dedup: sudah pernah dikirim notifikasi untuk minggu ini
      if (s.notif_absen3hari_minggu === weekKey) continue;
      const kelas = kelasList.find((k) => k.id === s.kelas_id);
      const waliGuru = guruList.find((g) => g.nama === kelas?.wali_kelas);
      siswaAbsen3Hari.push({
        id: s.id,
        nama: s.nama,
        kelas: s.nama_kelas || kelas?.nama_kelas,
        waliName: kelas?.wali_kelas,
        waliPhone: waliGuru?.no_telp,
        alfaCount: base.filter((r) => r.status === 'Alfa').length,
        sakitCount: base.filter((r) => r.status === 'Sakit').length,
        lastDate: base[base.length - 1].tanggal,
        berlanjut,
      });
    }

    if (siswaAbsen3Hari.length === 0) {
      return Response.json({
        status: 'no_absence',
        weekKey,
        weekStart,
        weekEnd,
        message: 'Tidak ada siswa absen 3+ hari yang perlu dinotifikasi minggu ini',
      });
    }

    // Hormati sakelar gateway: WA jenis Siswa (Pengaturan)
    const gatewayRows = await svc.entities.PengaturanAplikasi.list();
    const gw = (gatewayRows || [])[0] || {};
    if (gw.notif_wa_siswa === false) {
      return Response.json({
        status: 'wa_off',
        weekKey,
        weekStart,
        weekEnd,
        kandidat: siswaAbsen3Hari.length,
        message: 'Gateway WA Siswa dimatikan (OFF) di Pengaturan — notifikasi dijeda, dedup mingguan tidak ditandai',
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
    let berlanjutCount = 0;
    const notifiedSiswaIds = [];
    for (const key of Object.keys(byWali)) {
      const w = byWali[key];
      if (!w.waliPhone) { noPhoneCount++; continue; }
      const siswaRows = w.siswa
        .map((s) => `• ${s.nama} (${s.kelas}) — Alfa ${s.alfaCount}x, Sakit ${s.sakitCount}x${s.berlanjut ? ' — masih belum hadir (berlanjut dari minggu lalu)' : ''}`)
        .join('\n');
      const message =
        `Yth. Bpk/Ibu ${w.waliName || 'Wali Kelas'},\n\n` +
        `Mohon tindak lanjut siswa berikut yang telah absen (Alfa/Sakit) 3+ hari (${weekStart} s/d ${weekEnd}):\n\n` +
        `${siswaRows}\n\n` +
        `Mohon segera hubungi orang tua. Terima kasih.\n\n- Sistem Informasi Sekolah YPPI ARRAHMAH`;
      try {
        await svc.functions.invoke('sendWANotif', { phone: w.waliPhone, message });
        sentCount++;
        w.siswa.forEach((s) => {
          notifiedSiswaIds.push(s.id);
          if (s.berlanjut) berlanjutCount++;
        });
      } catch (e) {
        // skip gagal kirim individual
      }
    }

    // Tandai siswa yang sudah dinotifikasi (sekali per minggu) — dedup
    if (notifiedSiswaIds.length > 0) {
      try {
        await svc.entities.Siswa.updateMany(
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
      berlanjut: berlanjutCount,
      wali_notified: sentCount,
      wali_no_phone: noPhoneCount,
      siswa_marked_notified: notifiedSiswaIds.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});