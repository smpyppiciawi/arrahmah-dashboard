import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { fetchAllPages, cariKandidatSiswa, cariKandidatGuru } from '../../shared/uidCore.ts';

/**
 * Mencari kandidat siswa/pegawai lama yang kemungkinan orang yang sama
 * (masuk kembali / keluar lalu kembali) untuk konfirmasi admin.
 * Input: { tipe: 'Siswa'|'Guru', nis, nisn, nik, nama, jenis_kelamin, tanggal_lahir, nuptk }
 * Output: { kandidat: [{ id, uid, ..., alasan, skor }] }
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const tipe = body.tipe === 'Guru' ? 'Guru' : 'Siswa';

    const fields = tipe === 'Siswa'
      ? ['uid', 'nis', 'nisn', 'nik', 'nama', 'jenis_kelamin', 'tanggal_lahir', 'status', 'is_arsip']
      : ['uid', 'nuptk', 'nama', 'jenis_kelamin', 'status', 'is_arsip'];

    const records = await fetchAllPages(base44.entities[tipe], { fields });
    const kandidat = tipe === 'Siswa'
      ? cariKandidatSiswa(body, records)
      : cariKandidatGuru(body, records);

    return Response.json({
      kandidat: kandidat.map((k) => ({
        id: k.record.id,
        uid: k.record.uid,
        nis: k.record.nis || '',
        nisn: k.record.nisn || '',
        nik: k.record.nik || '',
        nuptk: k.record.nuptk || '',
        nama: k.record.nama,
        jenis_kelamin: k.record.jenis_kelamin || '',
        tanggal_lahir: k.record.tanggal_lahir || '',
        status: k.record.status || '',
        is_arsip: !!k.record.is_arsip,
        alasan: k.alasan,
        skor: k.skor,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}