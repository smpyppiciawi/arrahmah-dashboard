import { base44 } from '@/api/base44Client';

// Ambang & masa berlaku status Rapor berdasarkan Poin Bersih siswa.
export const POIN_PENDING_THRESHOLD = 100;

// Nilai awal parameter rapor — dapat diubah Admin melalui "Atur Limit".
export const RAPOR_DEFAULT_CONFIG = {
  kuning_poin: 300,
  merah_poin: 600,
  hitam_poin: 1000,
  naik_kuning_merah: 100,
  naik_merah_hitam: 100,
  kuning_hari: 40,
  merah_hari: 120,
  mode_kenaikan: 'Otomatis',
};

// Kompatibilitas untuk komponen lama.
export const RAPOR = {
  KUNING: { threshold: 300, days: 40, label: 'RAPOR KUNING' },
  MERAH: { threshold: 600, days: 120, label: 'RAPOR MERAH' },
  HITAM: { threshold: 1000, label: 'RAPOR HITAM' },
};

export const RAPOR_LEVEL_LABEL = {
  normal: 'NORMAL',
  kuning: 'RAPOR KUNING',
  merah: 'RAPOR MERAH',
  hitam: 'RAPOR HITAM',
};

export const RAPOR_LEVEL_NAMA = { normal: 'Normal', kuning: 'Kuning', merah: 'Merah', hitam: 'Hitam' };

const DAY = 86400000;

function pickNumber(source, keys, fallback) {
  for (const key of keys) {
    const raw = source?.[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const num = Number(raw);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return fallback;
}

// Normalisasi pengaturan (menerima record PengaturanImprovement maupun config yang sudah dinormalisasi).
export function normalizeRaporConfig(pengaturan) {
  const d = RAPOR_DEFAULT_CONFIG;
  if (!pengaturan) return { ...d };
  const mode = pengaturan.rapor_mode_kenaikan ?? pengaturan.mode_kenaikan;
  return {
    kuning_poin: pickNumber(pengaturan, ['rapor_kuning_poin', 'kuning_poin'], d.kuning_poin),
    merah_poin: pickNumber(pengaturan, ['rapor_merah_poin', 'merah_poin'], d.merah_poin),
    hitam_poin: pickNumber(pengaturan, ['rapor_hitam_poin', 'hitam_poin'], d.hitam_poin),
    naik_kuning_merah: pickNumber(pengaturan, ['rapor_naik_kuning_merah_poin', 'naik_kuning_merah'], d.naik_kuning_merah),
    naik_merah_hitam: pickNumber(pengaturan, ['rapor_naik_merah_hitam_poin', 'naik_merah_hitam'], d.naik_merah_hitam),
    kuning_hari: pickNumber(pengaturan, ['rapor_kuning_hari', 'kuning_hari'], d.kuning_hari),
    merah_hari: pickNumber(pengaturan, ['rapor_merah_hari', 'merah_hari'], d.merah_hari),
    mode_kenaikan: mode === 'Persetujuan' ? 'Persetujuan' : 'Otomatis',
  };
}

// Poin >= 100 otomatis berstatus Pending (belum terakumulasi sebelum disetujui).
export function isPendingPoin(poin) {
  return (Number(poin) || 0) >= POIN_PENDING_THRESHOLD;
}

// Akumulasi poin pelanggaran yang aktif dihitung (bukan Pending & bukan Dibatalkan).
export function sumPoinPelanggaranAktif(records) {
  return (records || [])
    .filter((p) => p.status !== 'Pending' && p.status !== 'Dibatalkan')
    .reduce((s, p) => s + (Number(p.poin) || 0), 0);
}

const addDays = (iso, days) => new Date(new Date(iso).getTime() + days * DAY).toISOString();
const daysLeft = (iso) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY));
const numberOrNaN = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
const windowEnd = (startIso, endIso, days) => endIso || (startIso ? addDays(startIso, days) : null);

// Tentukan status rapor (untuk tampilan) dari data siswa.
// Status ditentukan oleh timestamp penetapan & masa berlaku, BUKAN poin bersih saat ini.
// Artinya: meski poin bersih sudah berkurang di bawah ambang, status tetap aktif
// sampai masa berlaku habis ATAU dianulir manual (ADMIN/KEPSEK).
export function getRaporStatus(siswa, poinBersih, config) {
  const cfg = normalizeRaporConfig(config);
  if (siswa?.rapor_hitam_aktif) {
    return { level: 'hitam', label: RAPOR_LEVEL_LABEL.hitam, persistent: true };
  }
  const now = Date.now();
  const merahEnd = windowEnd(siswa?.rapor_merah_tanggal, siswa?.rapor_merah_berakhir, cfg.merah_hari);
  if (merahEnd && new Date(merahEnd).getTime() > now) {
    return { level: 'merah', label: RAPOR_LEVEL_LABEL.merah, sisaHari: daysLeft(merahEnd), totalHari: cfg.merah_hari };
  }
  const kuningEnd = windowEnd(siswa?.rapor_kuning_tanggal, siswa?.rapor_kuning_berakhir, cfg.kuning_hari);
  if (kuningEnd && new Date(kuningEnd).getTime() > now) {
    return { level: 'kuning', label: RAPOR_LEVEL_LABEL.kuning, sisaHari: daysLeft(kuningEnd), totalHari: cfg.kuning_hari };
  }
  return { level: 'normal', label: RAPOR_LEVEL_LABEL.normal };
}

// Kelas styling Card ringkasan akumulatif sesuai level rapor.
export const RAPOR_CARD_CLASS = {
  normal: 'from-emerald-50 to-white',
  kuning: 'from-yellow-100 to-yellow-50 border-yellow-300',
  merah: 'from-red-100 to-red-50 border-red-300',
  hitam: 'from-slate-900 to-black text-white',
};

export const RAPOR_BADGE_CLASS = {
  normal: 'bg-emerald-100 text-emerald-700',
  kuning: 'bg-yellow-400 text-yellow-900',
  merah: 'bg-red-500 text-white',
  hitam: 'bg-black text-white border border-white/40',
};

// Field siswa yang diubah saat sebuah tingkat rapor mulai berlaku.
// `poin` menjadi basis perhitungan poin baru untuk kenaikan tingkat berikutnya.
export function buildRaporLevelUpdates(ke, poin, nowIso, cfg) {
  const updates = {};
  if (ke === 'kuning') {
    updates.rapor_kuning_tanggal = nowIso;
    updates.rapor_kuning_berakhir = addDays(nowIso, cfg.kuning_hari);
    updates.rapor_kuning_basis_poin = poin;
  } else if (ke === 'merah') {
    updates.rapor_merah_tanggal = nowIso;
    updates.rapor_merah_berakhir = addDays(nowIso, cfg.merah_hari);
    updates.rapor_merah_basis_poin = poin;
    updates.rapor_kuning_tanggal = null;
    updates.rapor_kuning_berakhir = null;
    updates.rapor_kuning_basis_poin = null;
  } else if (ke === 'hitam') {
    updates.rapor_hitam_aktif = true;
    updates.rapor_hitam_tanggal = nowIso;
    updates.rapor_merah_tanggal = null;
    updates.rapor_merah_berakhir = null;
    updates.rapor_merah_basis_poin = null;
    updates.rapor_kuning_tanggal = null;
    updates.rapor_kuning_berakhir = null;
    updates.rapor_kuning_basis_poin = null;
  }
  return updates;
}

// Cegah catatan audit ganda bila beberapa komponen menghitung status bersamaan.
async function hasRecentLog(siswaId, dariNama, keNama) {
  try {
    const rows = await base44.entities.RiwayatRapor.filter({ siswa_id: siswaId, dari_status: dariNama, ke_status: keNama });
    const batas = Date.now() - 60000;
    return (rows || []).some((r) => new Date(r.tanggal).getTime() > batas);
  } catch (e) {
    return false;
  }
}

async function hasPendingRequest(siswaId) {
  try {
    const rows = await base44.entities.RiwayatRapor.filter({ siswa_id: siswaId, status_permintaan: 'Menunggu' });
    return (rows || []).length > 0;
  } catch (e) {
    // Bila riwayat tidak terbaca, jangan buat permintaan baru agar tidak terjadi duplikasi.
    return true;
  }
}

// Hitung & persist status rapor ke record Siswa.
// Aturan:
// - Tingkat awal (Normal) mengikuti ambang poin Kuning/Merah/Hitam.
// - Saat Kuning/Merah aktif: hanya poin BARU sejak status aktif (di atas basis) yang dihitung.
//   Mencapai batas tambahan → naik SATU tingkat, tidak pernah melompat.
// - Setiap transisi dicatat di RiwayatRapor (audit).
// - Mode Persetujuan: transisi menjadi permintaan "Menunggu" (status belum berubah).
export async function recomputeRaporStatus(siswa, poinBersih, opts = {}) {
  if (!siswa) return null;
  const cfg = normalizeRaporConfig(opts.config);
  const poin = Number(poinBersih) || 0;
  const nowIso = new Date().toISOString();
  const now = Date.now();
  const updates = {};

  const merahEnd = windowEnd(siswa.rapor_merah_tanggal, siswa.rapor_merah_berakhir, cfg.merah_hari);
  const merahAktif = !!merahEnd && new Date(merahEnd).getTime() > now;
  const kuningEnd = windowEnd(siswa.rapor_kuning_tanggal, siswa.rapor_kuning_berakhir, cfg.kuning_hari);
  const kuningAktif = !!kuningEnd && new Date(kuningEnd).getTime() > now;

  // Lengkapi batas masa berlaku untuk record lama (sebelum masa berlaku disimpan eksplisit).
  if (merahAktif && !siswa.rapor_merah_berakhir) updates.rapor_merah_berakhir = merahEnd;
  if (kuningAktif && !siswa.rapor_kuning_berakhir) updates.rapor_kuning_berakhir = kuningEnd;

  // Bersihkan masa berlaku yang sudah habis agar periode baru dapat dimulai.
  if (!merahAktif && (siswa.rapor_merah_tanggal || siswa.rapor_merah_berakhir)) {
    updates.rapor_merah_tanggal = null;
    updates.rapor_merah_berakhir = null;
    updates.rapor_merah_basis_poin = null;
  }
  if (!kuningAktif && (siswa.rapor_kuning_tanggal || siswa.rapor_kuning_berakhir)) {
    updates.rapor_kuning_tanggal = null;
    updates.rapor_kuning_berakhir = null;
    updates.rapor_kuning_basis_poin = null;
  }

  const level = siswa.rapor_hitam_aktif ? 'hitam' : merahAktif ? 'merah' : kuningAktif ? 'kuning' : 'normal';
  let transisi = null;

  if (level === 'normal') {
    if (poin >= cfg.hitam_poin) transisi = { dari: 'normal', ke: 'hitam', pemicu: poin };
    else if (poin >= cfg.merah_poin) transisi = { dari: 'normal', ke: 'merah', pemicu: poin };
    else if (poin >= cfg.kuning_poin) transisi = { dari: 'normal', ke: 'kuning', pemicu: poin };
  } else if (level === 'kuning') {
    const basis = numberOrNaN(siswa.rapor_kuning_basis_poin);
    if (!Number.isFinite(basis)) {
      // Record lama: jadikan poin saat ini sebagai titik awal, tanpa kenaikan retroaktif.
      updates.rapor_kuning_basis_poin = poin;
    } else if (poin - basis >= cfg.naik_kuning_merah) {
      transisi = { dari: 'kuning', ke: 'merah', pemicu: poin - basis };
    }
  } else if (level === 'merah') {
    const basis = numberOrNaN(siswa.rapor_merah_basis_poin);
    if (!Number.isFinite(basis)) {
      updates.rapor_merah_basis_poin = poin;
    } else if (poin - basis >= cfg.naik_merah_hitam) {
      transisi = { dari: 'merah', ke: 'hitam', pemicu: poin - basis };
    }
  }

  let pendingCreated = false;
  const bolehNaik = transisi && !(transisi.ke === 'hitam' && siswa.rapor_hitam_anulir_at);

  if (bolehNaik) {
    if (cfg.mode_kenaikan === 'Persetujuan') {
      const sudahAda = await hasPendingRequest(siswa.id);
      if (!sudahAda) {
        try {
        await base44.entities.RiwayatRapor.create({
          siswa_id: siswa.id,
          nis: siswa.nis,
          nama_siswa: siswa.nama,
          nama_kelas: siswa.nama_kelas,
          dari_status: RAPOR_LEVEL_NAMA[transisi.dari],
          ke_status: RAPOR_LEVEL_NAMA[transisi.ke],
          tanggal: nowIso,
          poin_saat_ini: poin,
          poin_pemicu: transisi.pemicu,
          mode: 'Persetujuan',
          status_permintaan: 'Menunggu',
          alasan: `${transisi.pemicu} poin pelanggaran baru selama masa ${RAPOR_LEVEL_LABEL[transisi.dari]}`,
          dibuat_oleh: opts.actor?.full_name || 'Sistem',
        });
        pendingCreated = true;
        } catch (e) { pendingCreated = false; }
      }
    } else {
      Object.assign(updates, buildRaporLevelUpdates(transisi.ke, poin, nowIso, cfg));
      const logBaru = !(await hasRecentLog(siswa.id, RAPOR_LEVEL_NAMA[transisi.dari], RAPOR_LEVEL_NAMA[transisi.ke]));
      try {
      if (logBaru) await base44.entities.RiwayatRapor.create({
        siswa_id: siswa.id,
        nis: siswa.nis,
        nama_siswa: siswa.nama,
        nama_kelas: siswa.nama_kelas,
        dari_status: RAPOR_LEVEL_NAMA[transisi.dari],
        ke_status: RAPOR_LEVEL_NAMA[transisi.ke],
        tanggal: nowIso,
        poin_saat_ini: poin,
        poin_pemicu: transisi.pemicu,
        mode: 'Otomatis',
        status_permintaan: 'Otomatis',
        alasan: transisi.dari === 'normal'
          ? `Poin bersih mencapai ambang ${RAPOR_LEVEL_LABEL[transisi.ke]}`
          : `${transisi.pemicu} poin pelanggaran baru selama masa ${RAPOR_LEVEL_LABEL[transisi.dari]}`,
        dibuat_oleh: 'Sistem',
      });
      } catch (e) { /* audit log opsional — perubahan status tetap diterapkan */ }
    }
  }

  let updated = siswa;
  let written = false;
  if (Object.keys(updates).length) {
    updated = await base44.entities.Siswa.update(siswa.id, updates);
    written = true;
  }
  return { siswa: updated, status: getRaporStatus(updated, poin, cfg), written, transisi, pendingCreated };
}

// Versi mandiri: fetch record siswa + pelanggaran/improvement, hitung poin bersih, lalu recompute.
export async function recomputeRaporForSiswa(siswaId, opts = {}) {
  if (!siswaId) return null;
  const siswa = await base44.entities.Siswa.get(siswaId);
  const pengaturanList = await base44.entities.PengaturanImprovement.list();
  const pengaturan = pengaturanList?.[0] || null;
  const akumulasiLama = pengaturan?.akumulasi_poin_lama_aktif;
  const [pel, imp, pelLama] = await Promise.all([
    base44.entities.PelanggaranImprovement.filter({ siswa_id: siswaId }),
    base44.entities.Improvement.filter({ siswa_id: siswaId }),
    akumulasiLama ? base44.entities.Pelanggaran.filter({ siswa_id: siswaId }) : Promise.resolve([]),
  ]);
  const poinPelanggaran = sumPoinPelanggaranAktif(pel)
    + (akumulasiLama ? (pelLama || []).reduce((s, p) => s + (Number(p.poin) || 0), 0) : 0);
  const poinPengurangan = (imp || []).filter((i) => i.status === 'Aktif').reduce((s, i) => s + (Number(i.poin_pengurangan) || 0), 0);
  return recomputeRaporStatus(siswa, poinPelanggaran - poinPengurangan, { config: pengaturan, actor: opts.actor });
}

// Setujui permintaan kenaikan status rapor (admin / kesiswaan / kurikulum).
export async function setujuiKenaikanRapor(permintaanId, actor) {
  const req = await base44.entities.RiwayatRapor.get(permintaanId);
  if (!req || req.status_permintaan !== 'Menunggu') return null;
  const pengaturanList = await base44.entities.PengaturanImprovement.list();
  const cfg = normalizeRaporConfig(pengaturanList?.[0]);
  const nowIso = new Date().toISOString();
  const level = { Kuning: 'kuning', Merah: 'merah', Hitam: 'hitam' }[req.ke_status] || 'kuning';
  const poin = Number(req.poin_saat_ini) || 0;
  await base44.entities.Siswa.update(req.siswa_id, buildRaporLevelUpdates(level, poin, nowIso, cfg));
  await base44.entities.RiwayatRapor.update(permintaanId, {
    status_permintaan: 'Disetujui',
    diproses_oleh: actor?.full_name || '',
    diproses_at: nowIso,
  });
  return level;
}

// Tolak permintaan kenaikan status rapor — poin saat ini diakui sebagai basis baru
// agar permintaan yang sama tidak muncul berulang tanpa poin baru.
export async function tolakKenaikanRapor(permintaanId, actor, alasan) {
  const req = await base44.entities.RiwayatRapor.get(permintaanId);
  if (!req || req.status_permintaan !== 'Menunggu') return null;
  const nowIso = new Date().toISOString();
  await base44.entities.RiwayatRapor.update(permintaanId, {
    status_permintaan: 'Ditolak',
    diproses_oleh: actor?.full_name || '',
    diproses_at: nowIso,
    alasan: alasan ? `${req.alasan} · Ditolak: ${alasan}` : req.alasan,
  });
  const field = req.dari_status === 'Merah' ? 'rapor_merah_basis_poin' : req.dari_status === 'Kuning' ? 'rapor_kuning_basis_poin' : null;
  if (field) {
    await base44.entities.Siswa.update(req.siswa_id, { [field]: Number(req.poin_saat_ini) || 0 });
  }
  return true;
}

// Anulir Status Rapor — hapus SEMUA status aktif (Kuning/Merah/Hitam).
// Hanya dieksekusi oleh ADMIN/KEPSEK atas perintah Kepala Sekolah.
// Untuk Hitam, set rapor_hitam_anulir_at agar tidak aktif otomatis lagi.
export async function anulirRaporStatus(siswaId, olehNama) {
  const siswa = await base44.entities.Siswa.get(siswaId);
  const nowIso = new Date().toISOString();
  let actorNama = olehNama;
  if (!actorNama) {
    try { actorNama = (await base44.auth.me())?.full_name || ''; } catch (e) { actorNama = ''; }
  }
  const statusSebelum = getRaporStatus(siswa, 0);
  const updated = await base44.entities.Siswa.update(siswaId, {
    rapor_kuning_tanggal: null,
    rapor_kuning_berakhir: null,
    rapor_kuning_basis_poin: null,
    rapor_merah_tanggal: null,
    rapor_merah_berakhir: null,
    rapor_merah_basis_poin: null,
    rapor_hitam_aktif: false,
    rapor_hitam_tanggal: null,
    rapor_hitam_anulir_at: nowIso,
  });
  if (statusSebelum.level !== 'normal') {
    try {
      await base44.entities.RiwayatRapor.create({
        siswa_id: siswaId,
        nis: siswa?.nis,
        nama_siswa: siswa?.nama,
        nama_kelas: siswa?.nama_kelas,
        dari_status: RAPOR_LEVEL_NAMA[statusSebelum.level],
        ke_status: 'Normal',
        tanggal: nowIso,
        poin_saat_ini: 0,
        poin_pemicu: 0,
        mode: 'Otomatis',
        status_permintaan: 'Dianulir',
        alasan: 'Status rapor dianulir atas perintah Kepala Sekolah',
        diproses_oleh: actorNama || '',
        diproses_at: nowIso,
      });
    } catch (e) { /* audit gagal tidak boleh membatalkan anulir */ }
  }
  return updated;
}

// Backward-compatible alias (hanya Hitam).
export async function anulirRaporHitam(siswaId, olehNama) {
  return anulirRaporStatus(siswaId, olehNama);
}