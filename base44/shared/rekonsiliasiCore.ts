import { fetchAllPages } from './uidCore.ts';

export const str = (v) => (v === null || v === undefined ? '' : String(v));

/**
 * Menautkan transaksi SPMB yang belum terhubung ke siswa final.
 * Pencocokan PASTI saja: ref_payment_id sama persis, atau uraian memuat reg_number.
 * Tidak mengubah apa pun bila tidak ada kecocokan pasti (data ambigu masuk
 * antrean rekonsiliasi manual lewat deteksiRekonsiliasi).
 * Idempoten: aman dijalankan berulang tanpa membuat duplikat.
 */
export async function tautkanSpmbKeuangan(svc) {
  const keuSpmb = await svc.entities.Keuangan.filter({ sumber_rekening: 'SPMB' });
  const belum = keuSpmb.filter((k) => !str(k.siswa_id));
  if (belum.length === 0) return { diperbarui: 0, keuangan_id_dibackfill: 0 };

  const bridges = await fetchAllPages(svc.entities.SiswaSPMB);
  const siswaSemua = await fetchAllPages(svc.entities.Siswa);
  const siswaById = new Map(siswaSemua.map((s) => [s.id, s]));

  const byPid = new Map();
  for (const b of bridges) {
    for (const p of (b.pembayaran || [])) {
      if (str(p.payment_id)) byPid.set(str(p.payment_id), b);
    }
  }

  let updated = 0;
  let backfill = 0;

  for (const k of belum) {
    let target = null;
    let pid = str(k.ref_payment_id);
    if (pid && byPid.has(pid)) {
      target = byPid.get(pid);
    }
    if (!target) {
      for (const b of bridges) {
        const reg = str(b.reg_number);
        if (reg && str(k.uraian).includes(reg)) {
          target = b;
          break;
        }
      }
    }
    if (!target || !target.finalized || !str(target.siswa_id)) continue;
    const siswa = siswaById.get(str(target.siswa_id));
    if (!siswa) continue;

    await svc.entities.Keuangan.update(k.id, {
      siswa_id: siswa.id,
      siswa_uid: str(siswa.uid),
      nis: str(siswa.nis || k.nis),
      nama_siswa: str(siswa.nama || k.nama_siswa),
      kelas: str(siswa.nama_kelas || k.kelas),
    });
    updated++;

    // Isi ulang keuangan_id pada riwayat pembayaran SPMB yang masih kosong
    if (pid) {
      const list = Array.isArray(target.pembayaran) ? target.pembayaran : [];
      const entry = list.find((p) => str(p.payment_id) === pid && !str(p.keuangan_id));
      if (entry) {
        entry.keuangan_id = k.id;
        const totalDibayar = list.reduce((a, p) => a + (Number(p.nominal) || 0), 0);
        await svc.entities.SiswaSPMB.update(target.id, { pembayaran: list, total_dibayar: totalDibayar });
        backfill++;
      }
    }
  }

  return { diperbarui: updated, keuangan_id_dibackfill: backfill };
}