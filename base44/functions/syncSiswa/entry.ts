import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { students, activeAcademicYear } = body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return Response.json({ error: 'Data siswa kosong atau format tidak sesuai' }, { status: 400 });
    }

    // --- 1. Fetch & create missing classes ---
    const existingKelas = await base44.entities.Kelas.list('nama_kelas', 500);
    const classMap = new Map();
    existingKelas.forEach(k => classMap.set(k.nama_kelas, k.id));

    const tahunAjaran = activeAcademicYear || (new Date().getFullYear() + '/' + (new Date().getFullYear() + 1));
    for (const row of students) {
      if (row.nama_kelas && !classMap.has(row.nama_kelas)) {
        const tingkat = row.nama_kelas.match(/\d+/)?.[0] || '7';
        const newClass = await base44.entities.Kelas.create({ nama_kelas: row.nama_kelas, tingkat, tahun_ajaran: tahunAjaran });
        classMap.set(row.nama_kelas, newClass.id);
      }
    }

    // --- 2. Fetch existing students (all, not just Aktif) ---
    const existingSiswa = await base44.entities.Siswa.list('nis', 1000);
    const nisToExisting = new Map();
    existingSiswa.forEach(s => { if (s.nis) nisToExisting.set(s.nis, s); });

    // --- 3. Compare & classify each row ---
    const toCreate = [];
    const toUpdate = [];
    let unchangedCount = 0;
    const periodikToCreate = [];
    const updatedDetails = [];
    const today = new Date().toISOString().split('T')[0];

    const fieldsToSync = [
      'nisn', 'nama', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'nik', 'agama',
      'alamat', 'rt', 'rw', 'kelurahan', 'kecamatan',
      'nama_ayah_kandung', 'nama_ibu_kandung', 'nama_wali',
      'tahun_lahir_ayah', 'pendidikan_ayah', 'pekerjaan_ayah', 'penghasilan_ayah', 'nik_ayah',
      'tahun_lahir_ibu', 'pendidikan_ibu', 'pekerjaan_ibu', 'penghasilan_ibu', 'nik_ibu',
      'tahun_lahir_wali', 'pendidikan_wali', 'pekerjaan_wali', 'penghasilan_wali', 'nik_wali',
      'penerima_kip', 'koordinat'
    ];

    const buildPeriodik = (siswaId, kelasIdVal, namaKelas, row) => {
      const bb = row.berat_badan ? Number(row.berat_badan) : null;
      const tb = row.tinggi_badan ? Number(row.tinggi_badan) : null;
      const lk = row.lingkar_kepala ? Number(row.lingkar_kepala) : null;
      if (bb || tb || lk) {
        return {
          siswa_id: siswaId,
          nis: row.nis,
          nama_siswa: row.nama,
          kelas_id: kelasIdVal || undefined,
          nama_kelas: namaKelas || undefined,
          tanggal: today,
          berat_badan: bb || undefined,
          tinggi_badan: tb || undefined,
          lingkar_kepala: lk || undefined,
          input_by: user.full_name || undefined,
          input_by_id: user.id || undefined,
        };
      }
      return null;
    };

    for (const row of students) {
      const kelasId = classMap.get(row.nama_kelas) || '';
      const existing = nisToExisting.get(row.nis);

      // Build changes dict — only fields that differ
      const changes = {};
      for (const f of fieldsToSync) {
        if (row[f] && (!existing || existing[f] !== row[f])) {
          changes[f] = row[f];
        }
      }
      if (kelasId && (!existing || existing.kelas_id !== kelasId)) {
        changes.kelas_id = kelasId;
        changes.nama_kelas = row.nama_kelas;
      }

      if (existing) {
        if (Object.keys(changes).length > 0) {
          toUpdate.push({ id: existing.id, ...changes });
          updatedDetails.push({ nis: row.nis, nama: row.nama, fields: Object.keys(changes) });
        } else {
          unchangedCount++;
        }
        // Periodik for existing student
        const periodik = buildPeriodik(existing.id, kelasId || existing.kelas_id, row.nama_kelas || existing.nama_kelas, row);
        if (periodik) periodikToCreate.push(periodik);
      } else {
        // New student — don't set status if CSV doesn't specify; default to Aktif
        const payload = { ...changes, nis: row.nis, status: 'Aktif' };
        toCreate.push(payload);
      }
    }

    // --- 4. Bulk create new students ---
    let createdSiswa = [];
    if (toCreate.length > 0) {
      createdSiswa = await base44.entities.Siswa.bulkCreate(toCreate);
    }

    // --- 5. Build periodik for newly created students ---
    for (let i = 0; i < createdSiswa.length; i++) {
      const row = students.find(r => r.nis === createdSiswa[i].nis);
      if (row) {
        const periodik = buildPeriodik(createdSiswa[i].id, createdSiswa[i].kelas_id, createdSiswa[i].nama_kelas, row);
        if (periodik) periodikToCreate.push(periodik);
      }
    }

    // --- 6. Bulk update existing students ---
    if (toUpdate.length > 0) {
      await base44.entities.Siswa.bulkUpdate(toUpdate);
    }

    // --- 7. Bulk create periodik records ---
    if (periodikToCreate.length > 0) {
      await base44.entities.PeriodikSiswa.bulkCreate(periodikToCreate);
    }

    return Response.json({
      success: true,
      totalProcessed: students.length,
      created: toCreate.length,
      updated: toUpdate.length,
      unchanged: unchangedCount,
      periodik: periodikToCreate.length,
      updatedDetails: updatedDetails.slice(0, 20),
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}