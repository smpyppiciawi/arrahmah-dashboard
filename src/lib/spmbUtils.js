import { base44 } from '@/api/base44Client';

export const fmtRp = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0);

export function tanggalHariIni() {
  return new Date().toISOString().slice(0, 10);
}

// Buat draf HomeVisit dari data wawancara SPMB (dipanggil saat finalisasi atau manual dari tab Wawancara)
export async function buatDrafHomeVisit(bridge, siswa, tahunAjaran) {
  if (!bridge.finalized || !bridge.siswa_id) return null;
  if (bridge.homevisit_id) return bridge.homevisit_id;
  let s = siswa;
  if (!s) {
    try { s = await base44.entities.Siswa.get(bridge.siswa_id); } catch (e) { s = null; }
  }
  const jawaban = (bridge.interview_answers || []).map((a) => `${a.no}: ${a.jawaban}`).join('; ');
  const catatan =
    `Hasil wawancara SPMB (${bridge.interview_officer || '-'}${bridge.interview_date ? ', ' + bridge.interview_date : ''}). ` +
    `${bridge.interview_notes || ''}${jawaban ? ' | Jawaban: ' + jawaban : ''}`;
  const hv = await base44.entities.HomeVisit.create({
    siswa_id: bridge.siswa_id,
    nis: s?.nis || '',
    nama_siswa: bridge.nama,
    kelas_id: s?.kelas_id || '',
    nama_kelas: s?.nama_kelas || '',
    tanggal_homevisit: tanggalHariIni(),
    tahun_ajaran: tahunAjaran || '',
    catatan_tambahan: catatan.slice(0, 2000),
  });
  await base44.entities.SiswaSPMB.update(bridge.id, { homevisit_id: hv.id });
  return hv.id;
}

// Finalisasi pendaftar Diterima menjadi Siswa aktif
export async function finalisasiPendaftar(bridge, kelas, tahunAjaran) {
  const kontak = [];
  if (bridge.father_phone) kontak.push({ no_telp: bridge.father_phone, hubungan: 'Ayah' });
  if (bridge.mother_phone) kontak.push({ no_telp: bridge.mother_phone, hubungan: 'Ibu' });
  if (bridge.guardian_phone) kontak.push({ no_telp: bridge.guardian_phone, hubungan: 'Wali' });

  const siswa = await base44.entities.Siswa.create({
    nis: '',
    nama: bridge.nama,
    nisn: bridge.nisn || '',
    nik: bridge.nik || '',
    jenis_kelamin: bridge.gender || undefined,
    tempat_lahir: bridge.birth_place || '',
    tanggal_lahir: bridge.birth_date || '',
    agama: bridge.religion || 'Islam',
    alamat: bridge.address || '',
    rt: bridge.rt || '',
    rw: bridge.rw || '',
    kelurahan: bridge.village || '',
    kecamatan: bridge.district || '',
    kelas_id: kelas.id,
    nama_kelas: kelas.nama_kelas,
    registrasi: 'Siswa Baru',
    status: 'Aktif',
    nama_ayah_kandung: bridge.father_name || '',
    nama_ibu_kandung: bridge.mother_name || '',
    nama_wali: bridge.guardian_name || '',
    kontak_list: kontak,
  });

  const update = {
    siswa_id: siswa.id,
    finalized: true,
    finalized_at: new Date().toISOString(),
  };
  await base44.entities.SiswaSPMB.update(bridge.id, update);

  // Draf HomeVisit otomatis dari data wawancara
  const hasInterview = (bridge.interview_answers || []).length > 0 || (bridge.interview_notes || '').trim();
  let homevisit_id = '';
  if (hasInterview) {
    try { homevisit_id = (await buatDrafHomeVisit({ ...bridge, ...update }, siswa, tahunAjaran)) || ''; } catch (e) { /* non-fatal */ }
  }
  return { siswa, homevisit_id };
}