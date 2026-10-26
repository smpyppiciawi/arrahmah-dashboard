/**
 * Helper pencatatan Riwayat Identitas (seumur hidup, lintas modul).
 * Dipakai fungsi backend (finalisasi, backfill) maupun alur frontend
 * (via SDK dari src/lib/riwayatIdentitas.js).
 */
import { str } from './rekonsiliasiCore.ts';

/** Potongan identitas standar untuk record RiwayatIdentitas. */
export function snapIdentitas(tipe, r) {
  return {
    tipe,
    uid: str(r.uid),
    record_id: str(r.id),
    nis: tipe === 'Siswa' ? str(r.nis) : '',
    nuptk: tipe === 'Guru' ? str(r.nuptk) : '',
    nama: str(r.nama),
    jenis_kelamin: str(r.jenis_kelamin),
  };
}