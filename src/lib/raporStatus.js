import { base44 } from '@/api/base44Client';

// Ambang & masa berlaku status Rapor berdasarkan Poin Bersih siswa.
export const POIN_PENDING_THRESHOLD = 100;

export const RAPOR = {
  KUNING: { threshold: 300, days: 40, label: 'RAPOR KUNING' },
  MERAH: { threshold: 600, days: 120, label: 'RAPOR MERAH' },
  HITAM: { threshold: 1000, label: 'RAPOR HITAM' },
};

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

function diffDays(a, b) {
  return Math.floor((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}

// Tentukan status rapor (untuk tampilan) dari data siswa + poin bersih.
export function getRaporStatus(siswa, poinBersih) {
  // HITAM: aktif permanen (flag) atau baru mencapai 1000 dan belum pernah dianulir.
  if (siswa?.rapor_hitam_aktif || (poinBersih >= RAPOR.HITAM.threshold && !siswa?.rapor_hitam_anulir_at)) {
    return { level: 'hitam', label: RAPOR.HITAM.label, persistent: true };
  }
  if (poinBersih >= RAPOR.MERAH.threshold) {
    const start = siswa?.rapor_merah_tanggal ? new Date(siswa.rapor_merah_tanggal) : null;
    const sisa = start ? RAPOR.MERAH.days - diffDays(new Date(), start) : RAPOR.MERAH.days;
    if (sisa > 0) return { level: 'merah', label: RAPOR.MERAH.label, sisaHari: sisa, totalHari: RAPOR.MERAH.days };
  }
  if (poinBersih >= RAPOR.KUNING.threshold) {
    const start = siswa?.rapor_kuning_tanggal ? new Date(siswa.rapor_kuning_tanggal) : null;
    const sisa = start ? RAPOR.KUNING.days - diffDays(new Date(), start) : RAPOR.KUNING.days;
    if (sisa > 0) return { level: 'kuning', label: RAPOR.KUNING.label, sisaHari: sisa, totalHari: RAPOR.KUNING.days };
  }
  return { level: 'normal', label: 'NORMAL' };
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

// Hitung & persist status rapor ke record Siswa. Hanya tulis bila ada perubahan.
// Mengembalikan { siswa, status, written }.
export async function recomputeRaporStatus(siswa, poinBersih) {
  if (!siswa) return null;
  const nowIso = new Date().toISOString();
  const updates = {};
  const inKuning = poinBersih >= RAPOR.KUNING.threshold && poinBersih < RAPOR.MERAH.threshold;
  const inMerah = poinBersih >= RAPOR.MERAH.threshold && poinBersih < RAPOR.HITAM.threshold;
  const inHitam = poinBersih >= RAPOR.HITAM.threshold;

  if (inKuning && !siswa.rapor_kuning_tanggal) updates.rapor_kuning_tanggal = nowIso;
  if (!inKuning && siswa.rapor_kuning_tanggal) updates.rapor_kuning_tanggal = null;

  if (inMerah && !siswa.rapor_merah_tanggal) updates.rapor_merah_tanggal = nowIso;
  if (!inMerah && siswa.rapor_merah_tanggal) updates.rapor_merah_tanggal = null;

  // Hitam: aktif otomatis saat mencapai 1000, kecuali sudah pernah dianulir.
  if (inHitam && !siswa.rapor_hitam_aktif && !siswa.rapor_hitam_anulir_at) {
    updates.rapor_hitam_aktif = true;
    updates.rapor_hitam_tanggal = nowIso;
  }

  let updated = siswa;
  let written = false;
  if (Object.keys(updates).length) {
    updated = await base44.entities.Siswa.update(siswa.id, updates);
    written = true;
  }
  return { siswa: updated, status: getRaporStatus(updated, poinBersih), written };
}

// Versi mandiri: fetch record siswa + pelanggaran/improvement, hitung poin bersih, lalu recompute.
export async function recomputeRaporForSiswa(siswaId) {
  if (!siswaId) return null;
  const siswa = await base44.entities.Siswa.get(siswaId);
  const pengaturanList = await base44.entities.PengaturanImprovement.list();
  const akumulasiLama = pengaturanList?.[0]?.akumulasi_poin_lama_aktif;
  const [pel, imp, pelLama] = await Promise.all([
    base44.entities.PelanggaranImprovement.filter({ siswa_id: siswaId }),
    base44.entities.Improvement.filter({ siswa_id: siswaId }),
    akumulasiLama ? base44.entities.Pelanggaran.filter({ siswa_id: siswaId }) : Promise.resolve([]),
  ]);
  const poinPelanggaran = sumPoinPelanggaranAktif(pel)
    + (akumulasiLama ? (pelLama || []).reduce((s, p) => s + (Number(p.poin) || 0), 0) : 0);
  const poinPengurangan = (imp || []).filter((i) => i.status === 'Aktif').reduce((s, i) => s + (Number(i.poin_pengurangan) || 0), 0);
  return recomputeRaporStatus(siswa, poinPelanggaran - poinPengurangan);
}

// Anulir Status Hitam — hanya atas perintah Kepala Sekolah melalui ADMIN.
export async function anulirRaporHitam(siswaId) {
  return base44.entities.Siswa.update(siswaId, {
    rapor_hitam_aktif: false,
    rapor_hitam_tanggal: null,
    rapor_hitam_anulir_at: new Date().toISOString(),
  });
}