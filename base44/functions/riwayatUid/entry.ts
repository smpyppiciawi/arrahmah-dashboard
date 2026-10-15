import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Menelusuri seluruh riwayat lintas modul seorang siswa/pegawai via UID.
 * UID sama = semua record utama (periode lama & baru); riwayat lama yang
 * masih tertaut ID internal record lama tetap ditemukan via $in id.
 * Input: { tipe: 'Siswa'|'Guru', uid?, siswa_id?, guru_id? }
 */
const SISWA_MODULES = [
  { nama: 'Absensi', entity: 'Absensi', field: 'siswa_id', sort: '-tanggal' },
  { nama: 'Nilai', entity: 'Nilai', field: 'siswa_id', sort: '-created_date' },
  { nama: 'Keuangan', entity: 'Keuangan', field: 'siswa_id', sort: '-tanggal' },
  { nama: 'Pelanggaran', entity: 'PelanggaranImprovement', field: 'siswa_id', sort: '-tanggal' },
  { nama: 'Improvement', entity: 'Improvement', field: 'siswa_id', sort: '-tanggal' },
  { nama: 'Hapalan', entity: 'HapalanSiswa', field: 'siswa_id', sort: '-tanggal_setor' },
  { nama: 'Periodik', entity: 'PeriodikSiswa', field: 'siswa_id', sort: '-tanggal' },
  { nama: 'Izin', entity: 'IzinSiswa', field: 'siswa_id', sort: '-tanggal' },
  { nama: 'Home Visit', entity: 'HomeVisit', field: 'siswa_id', sort: '-created_date' },
  { nama: 'Iuran Muka', entity: 'IuranMuka', field: 'siswa_id', sort: '-created_date' },
  { nama: 'Mutasi Masuk', entity: 'SiswaMasuk', field: 'siswa_id', sort: '-created_date' },
];

const GURU_MODULES = [
  { nama: 'Absensi Pegawai', entity: 'AbsensiPegawai', field: 'guru_id', sort: '-tanggal' },
  { nama: 'Wali Kelas', entity: 'Kelas', field: 'wali_kelas_id', sort: '-created_date' },
];

const PICK_KEYS = [
  'tanggal', 'tanggal_setor', 'tanggal_keluar', 'created_date', 'nama_kelas', 'nama_pegawai',
  'status', 'mapel', 'semester', 'jenis_penilaian', 'kompetensi_bab', 'label', 'nilai', 'tahun_ajaran',
  'jenis', 'tipe_transaksi', 'uraian', 'jumlah', 'bulan_dibayar', 'bulan',
  'kode', 'uraian_pelanggaran', 'poin', 'poin_pengurangan', 'kegiatan_pembinaan_nama',
  'nama_item', 'sudah_hapal', 'tingkat', 'alasan', 'jam_izin', 'tindak_lanjut',
  'tinggi_badan', 'berat_badan', 'lingkar_kepala', 'nama', 'nama_sekolah_asal', 'tanggal_masuk',
  'jabatan', 'nominal', 'nama_iuran', 'tahun_ajaran_tujuan',
];

const pick = (it) => {
  const out = { id: it.id };
  for (const k of PICK_KEYS) {
    if (it[k] !== undefined && it[k] !== null && it[k] !== '') out[k] = it[k];
  }
  return out;
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const tipe = body.tipe === 'Guru' ? 'Guru' : 'Siswa';

    let uid = body.uid;
    if (!uid) {
      const seedId = body.siswa_id || body.guru_id;
      if (seedId) {
        const seed = await base44.entities[tipe].get(seedId);
        uid = seed?.uid;
      }
    }
    if (!uid) {
      return Response.json({ error: 'Record belum memiliki UID. Jalankan Migrasi UID terlebih dahulu.' }, { status: 400 });
    }

    const records = await base44.entities[tipe].filter({ uid }, { limit: 50 });
    const ids = (records || []).map((r) => r.id);
    if (ids.length === 0) {
      return Response.json({ error: 'Tidak ada record utama dengan UID tersebut.' }, { status: 404 });
    }

    const modulCfg = tipe === 'Siswa' ? SISWA_MODULES : GURU_MODULES;
    const modul = [];
    for (const m of modulCfg) {
      let jumlah = 0;
      try {
        jumlah = await base44.entities[m.entity].count({ [m.field]: { $in: ids } });
      } catch { jumlah = -1; }
      let items = [];
      if (jumlah > 0) {
        const page = await base44.entities[m.entity].filter(
          { [m.field]: { $in: ids } },
          { sort: m.sort, limit: 10 }
        );
        items = (page.items || []).map(pick);
      }
      modul.push({ nama: m.nama, jumlah, items });
    }

    return Response.json({
      uid,
      tipe,
      identitas: records.map((r) => ({
        id: r.id,
        nama: r.nama,
        nis: r.nis || '',
        nisn: r.nisn || '',
        nuptk: r.nuptk || '',
        nama_kelas: r.nama_kelas || '',
        status: r.status || '',
        is_arsip: !!r.is_arsip,
        tahun_lulus: r.tahun_lulus || '',
        created_date: r.created_date,
      })),
      modul,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}