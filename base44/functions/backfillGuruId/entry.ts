import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Normalisasi nama: lowercase, rapikan spasi
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Buang gelar depan & belakang agar pencocokan nama toleran gelar
const GELAR_BELAKANG = [
  's.pd', 'm.pd', 's.ag', 'gr', 'm.pd.i', 's.kom', 'm.kom', 's.si', 's.s',
  's.pd.i', 'm.si', 'm.m', 'm.ed', 'm.h', 's.e', 'm.e', 'a.ma', 's.t', 'm.t', 's. fils', 'm.fils'
];
const stripGelar = (s) => {
  let t = norm(s);
  if (!t) return '';
  const GELAR_DEPAN = ['h.', 'hj.', 'dr.', 'prof.', 'ir.', 'kh.', 'drs.'];
  for (const g of GELAR_DEPAN) {
    if (t.startsWith(g + ' ')) t = t.slice(g.length + 1).trim();
  }
  t = t
    .split(',')
    .map((x) => x.trim())
    .filter((x) => {
      if (!x) return false;
      if (x.includes('.')) return false; // gelar belakang berformat S.Ag., Gr., M.Pd. dst
      const y = x.toLowerCase().replace(/\./g, '').trim();
      if (GELAR_BELAKANG.includes(y)) return false;
      if (['h', 'hj', 'dr', 'prof', 'ir'].includes(y)) return false;
      return true;
    })
    .join(' ');
  return t.replace(/\s+/g, ' ').trim();
};

const keysFor = (nama) => {
  const t = norm(nama);
  const s = stripGelar(nama);
  return [...new Set([t, s].filter(Boolean))];
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'tu'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole.entities;

    // Index pegawai: nama (semua variasi) -> id
    const gurus = await svc.Guru.filter({});
    const byNama = new Map();
    gurus.forEach((g) => {
      keysFor(g.nama).forEach((k) => {
        if (k && !byNama.has(k)) byNama.set(k, g.id);
      });
    });
    const lookup = (nama) => {
      for (const key of keysFor(nama)) {
        if (byNama.has(key)) return byNama.get(key);
      }
      return null;
    };

    const summary = { guru_pensiun_migrasi: 0, entities: {} };

    // 1. Migrasi status Pensiun lama -> Keluar (alasan: Pensiun)
    const pensiun = gurus.filter((g) => g.status === 'Pensiun');
    if (pensiun.length) {
      await svc.Guru.bulkUpdate(
        pensiun.map((g) => ({ id: g.id, status: 'Keluar', alasan_keluar: 'Pensiun' }))
      );
      summary.guru_pensiun_migrasi = pensiun.length;
    }

    // 2. Kelas: isi wali_kelas_id dari nama wali_kelas
    const kelasList = await svc.Kelas.filter({});
    const kelasUpdates = kelasList
      .filter((k) => !k.wali_kelas_id && k.wali_kelas)
      .map((k) => ({ id: k.id, wali_kelas_id: lookup(k.wali_kelas) }))
      .filter((u) => u.wali_kelas_id);
    if (kelasUpdates.length) await svc.Kelas.bulkUpdate(kelasUpdates);
    summary.entities['Kelas'] = kelasUpdates.length;

    // 3. Backfill field guru_id/pegawai id dari nama tersimpan
    const tasks = [
      ['HomeVisit', 'guru_id', 'nama_guru'],
      ['AbsensiPegawai', 'guru_id', 'nama_pegawai'],
      ['TugasMateri', 'guru_id', 'nama_guru'],
      ['IzinPegawai', 'guru_id', 'nama_pegawai'],
      ['Keuangan', 'guru_id', 'nama_pegawai'],
      ['BukuTamu', 'ingin_bertemu_pegawai_id', 'ingin_bertemu'],
      ['PelanggaranImprovement', 'pelapor_id', 'pelapor_nama'],
      ['Improvement', 'validator_id', 'validator_nama'],
    ];
    for (const [entity, idField, nameField] of tasks) {
      const records = await svc[entity].filter({});
      const updates = records
        .filter((r) => !r[idField] && r[nameField])
        .map((r) => ({ id: r.id, [idField]: lookup(r[nameField]) }))
        .filter((u) => u[idField]);
      if (updates.length) await svc[entity].bulkUpdate(updates);
      summary.entities[entity] = updates.length;
    }

    // 4. KalenderAkademik: pegawai_ids dari pegawai_names
    const kal = await svc.KalenderAkademik.filter({});
    const kalUpdates = kal
      .filter((k) => (!k.pegawai_ids || k.pegawai_ids.length === 0) && (k.pegawai_names || []).length > 0)
      .map((k) => ({
        id: k.id,
        pegawai_ids: (k.pegawai_names || []).map((n) => lookup(n)).filter(Boolean),
      }))
      .filter((u) => u.pegawai_ids.length > 0);
    if (kalUpdates.length) await svc.KalenderAkademik.bulkUpdate(kalUpdates);
    summary.entities['KalenderAkademik'] = kalUpdates.length;

    // 5. JadwalPiket: petugas[].guru_id dari nama_pegawai
    const piket = await svc.JadwalPiket.filter({});
    const piketUpdates = [];
    for (const p of piket) {
      const petugas = p.petugas || [];
      if (petugas.some((t) => !t.guru_id && t.nama_pegawai)) {
        piketUpdates.push({
          id: p.id,
          petugas: petugas.map((t) => ({
            ...t,
            guru_id: t.guru_id || lookup(t.nama_pegawai) || '',
          })),
        });
      }
    }
    if (piketUpdates.length) await svc.JadwalPiket.bulkUpdate(piketUpdates);
    summary.entities['JadwalPiket'] = piketUpdates.length;

    return Response.json({ ok: true, summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}