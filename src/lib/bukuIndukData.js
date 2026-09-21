import { base44 } from '@/api/base44Client';

const BULAN_TA = [
  { m: 7, label: 'Jul' }, { m: 8, label: 'Agu' }, { m: 9, label: 'Sep' }, { m: 10, label: 'Okt' },
  { m: 11, label: 'Nov' }, { m: 12, label: 'Des' }, { m: 1, label: 'Jan' }, { m: 2, label: 'Feb' },
  { m: 3, label: 'Mar' }, { m: 4, label: 'Apr' }, { m: 5, label: 'Mei' }, { m: 6, label: 'Jun' },
];

export function prevTahunAjaran(ta) {
  const [a, b] = (ta || '').split('/');
  if (!a || !b) return null;
  return `${Number(a) - 1}/${Number(b) - 1}`;
}

export function taDateRange(ta) {
  const y = Number((ta || '').split('/')[0]);
  if (!y) return { start: null, end: null };
  return { start: `${y}-07-01`, end: `${y + 1}-06-30` };
}

// Hitung daftar jenjang (Tingkat 7..9) dengan tahun ajaran masing-masing
export function computeJenjangList(siswa, activeAcademicYear) {
  let endTingkat = null;
  let endTa = null;
  if (siswa.status === 'Lulus' && siswa.tahun_lulus) {
    endTingkat = 9;
    endTa = siswa.tahun_lulus;
  } else {
    const t = parseInt(String(siswa.nama_kelas || '').trim().charAt(0), 10);
    endTingkat = t >= 7 && t <= 9 ? t : 9;
    endTa = activeAcademicYear;
  }
  if (!endTa) return [];
  const list = [];
  let ta = endTa;
  let tingkat = endTingkat;
  while (tingkat >= 7) {
    const { start, end } = taDateRange(ta);
    list.push({ tingkat: String(tingkat), tahunAjaran: ta, start, end });
    ta = prevTahunAjaran(ta);
    tingkat -= 1;
  }
  return list.reverse();
}

function aggregateNilai(nilaiRecs, arsipRecs, jenjang) {
  const acc = {};
  [...(arsipRecs || []), ...(nilaiRecs || [])].forEach((r) => {
    if (r?.nilai == null || !r.tahun_ajaran || !r.semester || !r.mapel) return;
    const k = `${r.tahun_ajaran}|${r.semester}|${r.mapel}`;
    if (!acc[k]) acc[k] = { sum: 0, count: 0 };
    acc[k].sum += r.nilai;
    acc[k].count += 1;
  });
  const mapelSet = new Set(Object.keys(acc).map((k) => k.split('|')[2]));
  const mapelList = [...mapelSet].sort((a, b) => a.localeCompare(b));
  return jenjang
    .map((j) => ({
      tingkat: j.tingkat,
      tahunAjaran: j.tahunAjaran,
      rows: mapelList.map((m) => {
        const g = acc[`${j.tahunAjaran}|Ganjil|${m}`];
        const p = acc[`${j.tahunAjaran}|Genap|${m}`];
        return {
          mapel: m,
          ganjil: g ? Math.round((g.sum / g.count) * 10) / 10 : null,
          genap: p ? Math.round((p.sum / p.count) * 10) / 10 : null,
        };
      }),
    }))
    .filter((b) => b.rows.some((r) => r.ganjil != null || r.genap != null));
}

function aggregateAbsensi(absensiPerJenjang, jenjang) {
  return absensiPerJenjang.map((recs, idx) => {
    const j = jenjang[idx];
    const [yStart, yEnd] = j.tahunAjaran.split('/');
    const months = BULAN_TA.map(({ m, label }) => {
      const year = m >= 7 ? Number(yStart) : Number(yEnd);
      const c = { H: 0, S: 0, I: 0, A: 0, T: 0 };
      let total = 0;
      (recs || []).forEach((r) => {
        if (!r?.tanggal) return;
        const [y, mo] = r.tanggal.split('-').map(Number);
        if (y !== year || mo !== m) return;
        total += 1;
        if (r.status === 'Hadir' || r.status === 'Libur') c.H += 1;
        else if (r.status === 'Sakit') c.S += 1;
        else if (r.status === 'Izin') c.I += 1;
        else if (r.status === 'Alfa') c.A += 1;
        else if (r.status === 'Terlambat') c.T += 1;
      });
      const pct = total ? Math.round((c.H / total) * 1000) / 10 : null;
      return { label: `${label} ${year}`, ...c, total, pct };
    }).filter((row) => row.total > 0);
    const tot = months.reduce(
      (a, r) => ({ H: a.H + r.H, S: a.S + r.S, I: a.I + r.I, A: a.A + r.A, T: a.T + r.T, total: a.total + r.total }),
      { H: 0, S: 0, I: 0, A: 0, T: 0, total: 0 }
    );
    tot.pct = tot.total ? Math.round((tot.H / tot.total) * 1000) / 10 : null;
    return { tingkat: j.tingkat, tahunAjaran: j.tahunAjaran, months, total: tot };
  });
}

function aggregatePeriodik(recs, jenjang) {
  const byTingkat = {};
  (recs || [])
    .slice()
    .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
    .forEach((r) => {
      if (!r.tingkat && !r.nama_kelas) return;
      const t = r.tingkat || String(parseInt(String(r.nama_kelas || '').charAt(0), 10));
      if (!byTingkat[t]) byTingkat[t] = r;
    });
  return jenjang.map((j) => ({ tingkat: j.tingkat, data: byTingkat[j.tingkat] || null }));
}

function deriveKelasNama(absensiPerJenjang, jenjang, siswa) {
  const lastTingkat = String(parseInt(String(siswa.nama_kelas || '').charAt(0), 10));
  return jenjang.map((j, idx) => {
    const counts = {};
    (absensiPerJenjang[idx] || []).forEach((r) => {
      if (r?.nama_kelas) counts[r.nama_kelas] = (counts[r.nama_kelas] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top) return top[0];
    if (j.tingkat === lastTingkat && siswa.nama_kelas) return siswa.nama_kelas;
    return null;
  });
}

function poinSummary(pelanggaranRecs, improvementRecs) {
  const poin = (pelanggaranRecs || [])
    .filter((r) => r.status !== 'Dibatalkan' && r.status !== 'Pending')
    .reduce((a, r) => a + (r.poin || 0), 0);
  const pengurang = (improvementRecs || [])
    .filter((r) => (r.status || 'Aktif') === 'Aktif')
    .reduce((a, r) => a + (r.poin_pengurangan || 0), 0);
  return { poin, pengurang, bersih: poin - pengurang };
}

function aggregateHapalan(recs, jenjang) {
  return jenjang.map((j) => ({
    tingkat: j.tingkat,
    tahunAjaran: j.tahunAjaran,
    rows: (recs || [])
      .filter((r) => r.tingkat === j.tingkat)
      .map((r) => ({
        nama: r.nama_item,
        jenis: r.jenis,
        sudah: !!r.sudah_hapal,
        tanggal: r.tanggal_setor,
        validator: r.validator_nama,
      }))
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || '')),
  }));
}

const byDateDesc = (a, b) => (b.tanggal || '').localeCompare(a.tanggal || '');

// Kumpulkan seluruh data historis siswa berdasarkan NIS lintas tahun ajaran
export async function collectBukuIndukData(siswa, activeAcademicYear) {
  const nis = siswa.nis;
  const lulusanRecs = await base44.entities.DataLulusan.filter({ $or: [{ nis }, { siswa_id: siswa.id }] });
  const lulusan = lulusanRecs?.[0] || null;
  const baseSiswa = { ...siswa };
  if (!baseSiswa.tahun_lulus && lulusan?.tahun_lulus) baseSiswa.tahun_lulus = lulusan.tahun_lulus;

  const jenjang = computeJenjangList(baseSiswa, activeAcademicYear);
  const isPerempuan = siswa.jenis_kelamin === 'Perempuan';

  // Cari via NIS atau siswa_id (sebagian data lama hanya menyimpan salah satu)
  const key = { $or: [{ nis }, { siswa_id: siswa.id }] };

  // Pecah query absensi per tahun ajaran agar tidak menabrak batas record
  const absensiQs = jenjang.map((j) =>
    base44.entities.Absensi.filter({ ...key, tanggal: { $gte: j.start, $lte: j.end } }, 'tanggal', 1000)
  );

  const [
    nilaiRecs, arsipRecs, periodikRecs, pelanggaranRecs, improvementRecs,
    prestasiRecs, uksRecs, izinRecs, hapalanRecs, menstruasiRecs, ...absensiPerJenjang
  ] = await Promise.all([
    base44.entities.Nilai.filter(key, 'tanggal', 1000),
    base44.entities.ArsipNilai.filter(key, 'tahun_ajaran', 1000),
    base44.entities.PeriodikSiswa.filter(key, 'tanggal', 200),
    base44.entities.PelanggaranImprovement.filter(key, 'tanggal', 500),
    base44.entities.Improvement.filter(key, 'tanggal', 500),
    base44.entities.Prestasi.filter(key, 'tanggal', 200),
    base44.entities.UKS.filter(key, 'tanggal', 500),
    base44.entities.IzinSiswa.filter(key, 'tanggal', 500),
    base44.entities.HapalanSiswa.filter(key, 'nama_item', 1000),
    isPerempuan ? base44.entities.Menstruasi.filter(key, 'tanggal', 1000) : Promise.resolve([]),
    ...absensiQs,
  ]);

  return {
    siswa: baseSiswa,
    lulusan,
    jenjang,
    isPerempuan,
    nilai: aggregateNilai(nilaiRecs, arsipRecs, jenjang),
    absensi: aggregateAbsensi(absensiPerJenjang, jenjang),
    periodik: aggregatePeriodik(periodikRecs, jenjang),
    kelasNama: deriveKelasNama(absensiPerJenjang, jenjang, baseSiswa),
    catatan: {
      prestasi: (prestasiRecs || []).slice().sort(byDateDesc),
      pelanggaran: (pelanggaranRecs || []).slice().sort(byDateDesc),
      improvement: (improvementRecs || []).slice().sort(byDateDesc),
      uks: (uksRecs || []).slice().sort(byDateDesc),
      izin: (izinRecs || []).slice().sort(byDateDesc),
      menstruasi: menstruasiRecs || [],
      poin: poinSummary(pelanggaranRecs, improvementRecs),
    },
    hapalan: aggregateHapalan(hapalanRecs, jenjang),
  };
}