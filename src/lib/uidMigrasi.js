import { base44 } from '@/api/base44Client';

/**
 * Menjalankan migrasi UID permanen (fungsi backend 'migrasiUid') sampai tuntas.
 * Idempoten & dapat dilanjutkan: record yang sudah ber-UID dilewati.
 */
export async function runMigrasiUid() {
  const summary = { siswa: 0, guru: 0, sisa_siswa: 0, sisa_guru: 0 };
  for (let i = 0; i < 20; i++) {
    const res = await base44.functions.invoke('migrasiUid', { limit: 500 });
    const d = res.data || {};
    summary.siswa += d.siswa?.diproses || 0;
    summary.guru += d.guru?.diproses || 0;
    summary.sisa_siswa = d.siswa?.sisa || 0;
    summary.sisa_guru = d.guru?.sisa || 0;
    if (d.selesai) break;
  }
  return summary;
}