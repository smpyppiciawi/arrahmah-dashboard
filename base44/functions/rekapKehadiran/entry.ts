import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Rekap kehadiran teragregasi (Siswa & Pegawai) untuk rentang tanggal tertentu.
// Menyediakan total per status, rincian per kelas, per siswa / per pegawai,
// dan daftar hari efektif — dihitung server-side agar akurat untuk rentang
// panjang (7 hari / bulan / tahun) tanpa membebani browser puluhan ribu record.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch { user = null; }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const jenis = body?.jenis === 'pegawai' ? 'pegawai' : 'siswa';
    const dateFrom = String(body?.dateFrom || '');
    const dateTo = String(body?.dateTo || '');
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(dateFrom) || !dateRe.test(dateTo)) {
      return Response.json({ error: 'Parameter dateFrom & dateTo (yyyy-MM-dd) wajib' }, { status: 400 });
    }
    if (dateFrom > dateTo) return Response.json({ error: 'dateFrom harus <= dateTo' }, { status: 400 });
    const spanDays = Math.round((new Date(dateTo + 'T00:00:00').getTime() - new Date(dateFrom + 'T00:00:00').getTime()) / 86400000);
    if (spanDays > 400) return Response.json({ error: 'Rentang maksimal 400 hari' }, { status: 400 });

    const svc = jenis === 'pegawai'
      ? base44.asServiceRole.entities.AbsensiPegawai
      : base44.asServiceRole.entities.Absensi;

    const totals: Record<string, number> = {};
    const perKelas: Record<string, any> = {};
    const perOrang: Record<string, any> = {};
    const dates = new Set<string>();

    const aggregate = (rows: any[]) => {
      for (const r of rows) {
        const st = r.status || 'Lainnya';
        totals[st] = (totals[st] || 0) + 1;
        if (r.tanggal) dates.add(r.tanggal);
        if (jenis === 'siswa') {
          const kKey = r.kelas_id || r.nama_kelas || '-';
          if (!perKelas[kKey]) perKelas[kKey] = { kelas_id: r.kelas_id || null, nama_kelas: r.nama_kelas || '-' };
          perKelas[kKey][st] = (perKelas[kKey][st] || 0) + 1;
          if (r.siswa_id) {
            if (!perOrang[r.siswa_id]) perOrang[r.siswa_id] = { siswa_id: r.siswa_id, nis: r.nis, nama: r.nama_siswa, kelas_id: r.kelas_id, nama_kelas: r.nama_kelas };
            perOrang[r.siswa_id][st] = (perOrang[r.siswa_id][st] || 0) + 1;
          }
        } else {
          const pKey = r.guru_id || r.nama_pegawai;
          if (!perOrang[pKey]) perOrang[pKey] = { guru_id: r.guru_id, nama_pegawai: r.nama_pegawai, jabatan: r.jabatan };
          perOrang[pKey][st] = (perOrang[pKey][st] || 0) + 1;
        }
      }
    };

    const addDays = (dateStr: string, n: number) => {
      const d = new Date(dateStr + 'T00:00:00');
      d.setDate(d.getDate() + n);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Baca per jendela 7 hari (batch 4000) agar tidak terpotong batas baca;
    // bila satu jendela terlalu padat (>= 4000), turun ke per hari.
    let cursor = dateFrom;
    while (cursor <= dateTo) {
      let chunkEnd = addDays(cursor, 6);
      if (chunkEnd > dateTo) chunkEnd = dateTo;
      const batch = await svc.filter({ tanggal: { $gte: cursor, $lte: chunkEnd } }, 'tanggal', 4000);
      if ((batch || []).length >= 4000) {
        let d = cursor;
        while (d <= chunkEnd) {
          const dayBatch = await svc.filter({ tanggal: d }, undefined, 5000);
          aggregate(dayBatch || []);
          d = addDays(d, 1);
        }
      } else {
        aggregate(batch || []);
      }
      cursor = addDays(chunkEnd, 1);
    }

    return Response.json({
      jenis,
      dateFrom,
      dateTo,
      hariEfektif: Array.from(dates).sort(),
      totals,
      perKelas: Object.values(perKelas),
      perSiswa: jenis === 'siswa' ? Object.values(perOrang) : [],
      perPegawai: jenis === 'pegawai' ? Object.values(perOrang) : [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}