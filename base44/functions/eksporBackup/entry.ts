import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { fetchAllPages } from '../../shared/uidCore.ts';
import { str } from '../../shared/rekonsiliasiCore.ts';

const DEFAULT_ENTITIES = [
  'Siswa', 'Guru', 'Kelas', 'Keuangan', 'BiayaKhusus', 'IuranMuka', 'TarifIuran', 'TipeTransaksi',
  'Nilai', 'Absensi', 'AbsensiPegawai', 'IzinSiswa', 'IzinPegawai', 'PelanggaranImprovement', 'Improvement',
  'HapalanSiswa', 'PeriodikSiswa', 'HomeVisit', 'BukuTamu', 'DataLulusan', 'SiswaMasuk', 'SiswaKeluar',
  'SiswaSPMB', 'ArsipKeuangan', 'ArsipNilai', 'HistoryStatusSiswa', 'LogTahunAjaran', 'Mapel', 'Golongan',
  'SumberDana', 'Donatur', 'UKS', 'Menstruasi', 'Prestasi', 'Pengumuman', 'ProfilSekolah',
];

const FIELDS_BERKAS = ['bukti_file', 'foto_url', 'photo_url', 'foto_7', 'foto_8', 'foto_9', 'foto_ayah', 'foto_ibu', 'foto_wali'];

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function uploadDrive(accessToken, filename, content) {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=media&name=${encodeURIComponent(filename)}`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: content,
    }
  );
  const uploaded = await res.json();
  if (uploaded.error) throw new Error(uploaded.error.message || 'Gagal mengunggah ke Drive');
  return uploaded.id;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Akses ditolak. Hanya Admin yang dapat menjalankan ekspor backup.' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const entitasNama = Array.isArray(body.entitas) && body.entitas.length ? body.entitas : DEFAULT_ENTITIES;

    const { accessToken } = await svc.connectors.getConnection('googledrive');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    const hasil = [];
    const errors = [];
    let totalRecord = 0;
    const berkasUrls = new Set();

    for (const nama of entitasNama) {
      try {
        const entity = svc.entities[nama];
        if (!entity) {
          errors.push(`${nama}: entitas tidak ditemukan`);
          continue;
        }
        const records = await fetchAllPages(entity);
        for (const r of records) {
          for (const f of FIELDS_BERKAS) {
            if (r[f]) berkasUrls.add(String(r[f]).slice(0, 500));
          }
        }
        const json = JSON.stringify({ entity: nama, jumlah: records.length, records });
        const sha = await sha256Hex(json);
        const driveId = await uploadDrive(accessToken, `arrahmah-backup-${stamp}-${nama}.json`, json);
        hasil.push({
          nama,
          jumlah: records.length,
          file_sha256: sha,
          drive_file_id: driveId,
          drive_url: `https://drive.google.com/file/d/${driveId}/view`,
        });
        totalRecord += records.length;
      } catch (e) {
        errors.push(`${nama}: ${str(e && e.message ? e.message : e).slice(0, 150)}`);
      }
    }

    const pengaturan = (await svc.entities.PengaturanAplikasi.list())[0] || {};
    const manifest = {
      aplikasi: 'Arrahmah Dashboard',
      diekspor_pada: new Date().toISOString(),
      operator: user.full_name || 'Admin',
      tahun_ajaran_aktif: pengaturan.tahun_ajaran_aktif || '',
      algoritma_hash: 'SHA-256',
      entitas: hasil,
      gagal: errors,
      berkas: {
        jumlah: berkasUrls.size,
        catatan: 'Inventaris URL berkas (foto/bukti) pada storage aplikasi. Salinan berkas tersendiri direkomendasikan sebelum migrasi besar.',
        urls: [...berkasUrls].slice(0, 2000),
      },
    };
    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestSha = await sha256Hex(manifestJson);
    const manifestId = await uploadDrive(accessToken, `arrahmah-backup-${stamp}-MANIFEST.json`, manifestJson);
    const manifestUrl = `https://drive.google.com/file/d/${manifestId}/view`;

    await svc.entities.EksporBackupLog.create({
      tanggal: new Date().toISOString().slice(0, 10),
      operator_id: user.id,
      operator_nama: user.full_name || 'Admin',
      status: 'Berhasil',
      total_record: totalRecord,
      jumlah_entitas: hasil.length,
      manifest_url: manifestUrl,
      drive_file_ids: manifestId,
      catatan: `SHA-256 manifest: ${manifestSha}${errors.length ? ` · Gagal: ${errors.join(' | ').slice(0, 300)}` : ''}`,
    });

    return Response.json({
      ok: true,
      total_record: totalRecord,
      jumlah_entitas: hasil.length,
      manifest_sha256: manifestSha,
      manifest_url: manifestUrl,
      entitas: hasil.map((h) => ({ nama: h.nama, jumlah: h.jumlah })),
      gagal: errors,
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}