import { base44 } from '@/api/base44Client';

/**
 * Mencatat peristiwa siklus hidup ke RiwayatIdentitas (seumur hidup, lintas modul).
 * Pelengkap: kegagalan pencatatan TIDAK membatalkan aksi utama yang sedang berjalan.
 */
export async function catatRiwayatIdentitas(tipe, record, event, opts = {}) {
  try {
    await base44.entities.RiwayatIdentitas.create({
      tipe,
      uid: record?.uid || '',
      record_id: record?.id || '',
      nis: tipe === 'Siswa' ? (record?.nis || '') : '',
      nuptk: tipe === 'Guru' ? (record?.nuptk || '') : '',
      nama: record?.nama || '',
      jenis_kelamin: record?.jenis_kelamin || '',
      event,
      tanggal_event: opts.tanggal_event || '',
      tahun_ajaran: opts.tahun_ajaran || '',
      detail: opts.detail || '',
      snapshot: opts.snapshot || {},
      sumber: opts.sumber || '',
    });
  } catch (e) {
    console.warn('Gagal mencatat riwayat identitas:', e?.message || e);
  }
}