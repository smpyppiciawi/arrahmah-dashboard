import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { fetchAllPages, normAngka } from '../../shared/uidCore.ts';
import { str } from '../../shared/rekonsiliasiCore.ts';

/**
 * Audit UID & relasi lintas modul (read-only, admin-only).
 * Melaporkan: record tanpa UID, UID ganda pada entitas utama,
 * dan record riwayat dengan relasi kosong / menunjuk ID yang tidak dikenal.
 */
const RELASI = [
  { modul: 'Absensi', entity: 'Absensi', field: 'siswa_id', tipe: 'Siswa' },
  { modul: 'Nilai', entity: 'Nilai', field: 'siswa_id', tipe: 'Siswa' },
  { modul: 'Keuangan', entity: 'Keuangan', field: 'siswa_id', tipe: 'Siswa' },
  { modul: 'Pelanggaran', entity: 'PelanggaranImprovement', field: 'siswa_id', tipe: 'Siswa' },
  { modul: 'Improvement', entity: 'Improvement', field: 'siswa_id', tipe: 'Siswa' },
  { modul: 'Hapalan', entity: 'HapalanSiswa', field: 'siswa_id', tipe: 'Siswa' },
  { modul: 'Periodik', entity: 'PeriodikSiswa', field: 'siswa_id', tipe: 'Siswa' },
  { modul: 'Izin', entity: 'IzinSiswa', field: 'siswa_id', tipe: 'Siswa' },
  { modul: 'Home Visit', entity: 'HomeVisit', field: 'siswa_id', tipe: 'Siswa' },
  { modul: 'Iuran Muka', entity: 'IuranMuka', field: 'siswa_id', tipe: 'Siswa' },
  { modul: 'SPMB Final', entity: 'SiswaSPMB', field: 'siswa_id', tipe: 'Siswa' },
  { modul: 'Keuangan Pegawai', entity: 'Keuangan', field: 'guru_id', tipe: 'Guru' },
  { modul: 'Absensi Pegawai', entity: 'AbsensiPegawai', field: 'guru_id', tipe: 'Guru' },
  { modul: 'Wali Kelas', entity: 'Kelas', field: 'wali_kelas_id', tipe: 'Guru' },
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const laporan = {};
    const mainIds = { Siswa: new Set(), Guru: new Set() };
    const siswaInfo = new Map();

    for (const tipe of ['Siswa', 'Guru']) {
      const records = await fetchAllPages(base44.entities[tipe], {
        fields: ['uid', 'nis', 'nama', 'status'],
      });
      records.forEach((r) => mainIds[tipe].add(r.id));
      if (tipe === 'Siswa') records.forEach((r) => siswaInfo.set(r.id, { uid: str(r.uid), nis: str(r.nis) }));
      const uidMap = new Map();
      let tanpaUid = 0;
      records.forEach((r) => {
        if (!r.uid) tanpaUid += 1;
        else if (!uidMap.has(r.uid)) uidMap.set(r.uid, [r]);
        else uidMap.get(r.uid).push(r);
      });
      const duplikat = [...uidMap.entries()]
        .filter(([, rs]) => rs.length > 1)
        .map(([uid, rs]) => ({
          uid,
          jumlah: rs.length,
          contoh: rs.slice(0, 5).map((r) => r.nis || r.nama),
        }));
      laporan[tipe.toLowerCase()] = { total: records.length, tanpa_uid: tanpaUid, duplikat };
    }

    const relasi = [];
    for (const r of RELASI) {
      const ids = mainIds[r.tipe];
      let total = 0;
      let kosong = 0;
      let tidakDitemukan = 0;
      let cursor;
      let guard = 0;
      do {
        const page = await base44.entities[r.entity].list({
          limit: 1000,
          fields: [r.field],
          ...(cursor ? { cursor } : {}),
        });
        (page.items || []).forEach((it) => {
          total += 1;
          const v = it[r.field];
          if (!v) kosong += 1;
          else if (!ids.has(v)) tidakDitemukan += 1;
        });
        cursor = page.has_more ? page.next_cursor : undefined;
        guard += 1;
      } while (cursor && guard < 60);
      relasi.push({
        modul: r.modul,
        tipe: r.tipe,
        total,
        kosong,
        tidak_ditemukan: tidakDitemukan,
      });
    }

    // Integritas keuangan: UID permanen & kecocokan NIS pada transaksi siswa
    let totalTrxSiswa = 0;
    let trxTanpaUid = 0;
    let nisTakSesuai = 0;
    {
      let cursor;
      let guard = 0;
      do {
        const page = await base44.entities.Keuangan.list({
          limit: 1000,
          fields: ['siswa_id', 'siswa_uid', 'nis'],
          ...(cursor ? { cursor } : {}),
        });
        (page.items || []).forEach((it) => {
          const sid = str(it.siswa_id);
          if (!sid || !mainIds.Siswa.has(sid)) return;
          totalTrxSiswa += 1;
          if (!str(it.siswa_uid)) trxTanpaUid += 1;
          const s = siswaInfo.get(sid);
          const a = normAngka(it.nis);
          const b = s ? normAngka(s.nis) : '';
          if (a && b && a !== b) nisTakSesuai += 1;
        });
        cursor = page.has_more ? page.next_cursor : undefined;
        guard += 1;
      } while (cursor && guard < 60);
    }
    laporan.keuangan = { transaksi_siswa: totalTrxSiswa, tanpa_uid: trxTanpaUid, nis_tak_sesuai: nisTakSesuai };

    return Response.json({ ...laporan, relasi });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}