import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'operator', 'kepsek'].includes(user.role)) {
      return Response.json({ error: 'Akses ditolak. Hanya admin/kepsek yang dapat menjalankan finalisasi.' }, { status: 403 });
    }

    const body = await req.json();
    const { tahun_ajaran_lama, tahun_ajaran_baru, catatan } = body;
    if (!tahun_ajaran_lama || !tahun_ajaran_baru) {
      return Response.json({ error: 'Tahun ajaran lama dan baru wajib diisi.' }, { status: 400 });
    }
    if (tahun_ajaran_lama === tahun_ajaran_baru) {
      return Response.json({ error: 'Tahun ajaran lama dan baru tidak boleh sama.' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const now = new Date().toISOString();

    // Step 1: Buat LogTahunAjaran dengan status In Progress
    const logRecord = await svc.entities.LogTahunAjaran.create({
      tahun_ajaran_lama,
      tahun_ajaran_baru,
      tanggal_migrasi: now,
      operator_id: user.id,
      operator_nama: user.full_name || 'Unknown',
      status: 'In Progress',
      catatan: catatan || '',
    });

    let jumlahSiswaDiarsip = 0;
    let jumlahSiswaLulus = 0;
    let jumlahNilaiDiarsip = 0;
    let jumlahTunggakanDiarsip = 0;
    let totalSaldoSebelum = 0;
    let totalSaldoSesudah = 0;

    // Step 2: Pre-flight - ambil semua data tahun ajaran lama
    const allSiswa = await svc.entities.Siswa.filter({ status: 'Aktif' }, undefined, 2000);
    const allBiayaKhusus = await svc.entities.BiayaKhusus.filter({}, undefined, 2000);
    const biayaKhususTahunLama = allBiayaKhusus.filter(b =>
      !b.tahun_ajaran || b.tahun_ajaran === tahun_ajaran_lama
    );
    const allNilai = await svc.entities.Nilai.filter({ tahun_ajaran: tahun_ajaran_lama }, undefined, 2000);
    const allKelas = await svc.entities.Kelas.list();
    const kelas9Ids = allKelas.filter(k => k.tingkat === '9').map(k => k.id);

    // Step 3: Hitung checksum sebelum migrasi (total sisa tunggakan)
    biayaKhususTahunLama.forEach(b => {
      const tagihan = b.nominal_khusus || 0;
      const bayar = b.sudah_bayar || 0;
      const sisa = Math.max(0, tagihan - bayar);
      if (!b.is_gratis && sisa > 0) totalSaldoSebelum += sisa;
    });

    // Step 4: Migrasi BiayaKhusus → ArsipKeuangan (hanya sisa > 0)
    const arsipKeuanganRecords = [];
    biayaKhususTahunLama.forEach(b => {
      const tagihan = b.nominal_khusus || 0;
      const bayar = b.sudah_bayar || 0;
      const sisa = Math.max(0, tagihan - bayar);
      if (b.is_gratis || sisa <= 0) return;
      const siswa = allSiswa.find(s => s.id === b.siswa_id);
      const kelas = siswa ? allKelas.find(k => k.id === siswa.kelas_id) : null;
      arsipKeuanganRecords.push({
        siswa_id: b.siswa_id,
        nis: b.nis || siswa?.nis || '',
        nama_siswa: b.nama_siswa || siswa?.nama || '',
        nama_kelas: b.nama_kelas || kelas?.nama_kelas || '',
        tingkat: kelas?.tingkat || '',
        tahun_ajaran_asal: tahun_ajaran_lama,
        nama_iuran: b.nama_iuran || '',
        jenis_iuran: 'Mutasi',
        tarif_iuran_id: b.tarif_iuran_id || '',
        biaya_khusus_id: b.id,
        nominal_tagihan: tagihan,
        nominal_bayar: bayar,
        sisa_tunggakan: sisa,
        status: sisa <= 0 ? 'Lunas' : (bayar > 0 ? 'Cicil' : 'Belum Lunas'),
        kategori: b.kategori || '',
        migrated_at: now,
        migrate_log_id: logRecord.id,
      });
    });

    if (arsipKeuanganRecords.length > 0) {
      await svc.entities.ArsipKeuangan.bulkCreate(arsipKeuanganRecords);
      jumlahTunggakanDiarsip = arsipKeuanganRecords.length;
      totalSaldoSesudah = arsipKeuanganRecords.reduce((sum, r) => sum + r.sisa_tunggakan, 0);
    }

    // Step 5: Migrasi Nilai → ArsipNilai
    if (allNilai.length > 0) {
      const arsipNilaiRecords = allNilai.map(n => {
        const siswa = allSiswa.find(s => s.id === n.siswa_id);
        const kelas = siswa ? allKelas.find(k => k.id === siswa.kelas_id) : null;
        return {
          siswa_id: n.siswa_id,
          nis: n.nis || siswa?.nis || '',
          nama_siswa: n.nama_siswa || siswa?.nama || '',
          nama_kelas: n.nama_kelas || kelas?.nama_kelas || '',
          tingkat: kelas?.tingkat || '',
          tahun_ajaran: tahun_ajaran_lama,
          semester: n.semester || '',
          mapel: n.mapel || '',
          jenis_penilaian: n.jenis_penilaian || '',
          nilai: n.nilai || 0,
          kkm: n.kkm || 75,
          status_ketuntasan: n.status_ketuntasan || '',
          migrated_at: now,
          migrate_log_id: logRecord.id,
        };
      });
      await svc.entities.ArsipNilai.bulkCreate(arsipNilaiRecords);
      jumlahNilaiDiarsip = arsipNilaiRecords.length;
    }

    // Step 6: HistoryStatusSiswa untuk semua siswa aktif
    const historyRecords = allSiswa.map(s => {
      const kelas = allKelas.find(k => k.id === s.kelas_id);
      const isLulus = kelas9Ids.includes(s.kelas_id);
      return {
        siswa_id: s.id,
        nis: s.nis || '',
        nama_siswa: s.nama || '',
        nama_kelas: s.nama_kelas || kelas?.nama_kelas || '',
        tingkat: kelas?.tingkat || '',
        tahun_ajaran: tahun_ajaran_lama,
        status_akhir: isLulus ? 'Lulus' : 'Aktif',
        tahun_lulus: isLulus ? tahun_ajaran_lama : '',
        tanggal_catat: now.split('T')[0],
        migrate_log_id: logRecord.id,
        keterangan: isLulus ? 'Lulus otomatis via Finalisasi Tahun Ajaran' : 'Status aktif dicatat sebagai riwayat',
      };
    });
    if (historyRecords.length > 0) {
      await svc.entities.HistoryStatusSiswa.bulkCreate(historyRecords);
      jumlahSiswaDiarsip = historyRecords.length;
    }

    // Step 7: Luluskan siswa kelas 9 → DataLulusan + update status
    const siswaKelas9 = allSiswa.filter(s => kelas9Ids.includes(s.kelas_id));
    if (siswaKelas9.length > 0) {
      const dataLulusanRecords = siswaKelas9.map(s => ({
        nis: s.nis,
        nama: s.nama,
        jenis_kelamin: s.jenis_kelamin,
        tanggal_lahir: s.tanggal_lahir,
        alamat: s.alamat,
        nama_ortu: s.nama_ortu,
        no_telp_ortu: s.no_telp_ortu,
        kelas_terakhir: s.nama_kelas,
        tahun_lulus: tahun_ajaran_lama,
        siswa_id: s.id,
        status: 'Lulus',
      }));
      await svc.entities.DataLulusan.bulkCreate(dataLulusanRecords);
      // Update status siswa kelas 9 → Lulus
      await svc.entities.Siswa.updateMany(
        { kelas_id: { $in: kelas9Ids } },
        { $set: { status: 'Lulus', tahun_lulus: tahun_ajaran_lama } }
      );
      jumlahSiswaLulus = siswaKelas9.length;
    }

    // Step 8: Update LogTahunAjaran → Completed
    await svc.entities.LogTahunAjaran.update(logRecord.id, {
      status: 'Completed',
      jumlah_siswa_diarsip: jumlahSiswaDiarsip,
      jumlah_siswa_lulus: jumlahSiswaLulus,
      jumlah_nilai_diarsip: jumlahNilaiDiarsip,
      jumlah_tunggakan_diarsip: jumlahTunggakanDiarsip,
      total_saldo_keuangan_sebelum: totalSaldoSebelum,
      total_saldo_keuangan_sesudah: totalSaldoSesudah,
      completed_at: now,
    });

    // Step 9: Update tahun ajaran aktif ke tahun baru
    const settings = await svc.entities.PengaturanAplikasi.list();
    if (settings[0]?.id) {
      await svc.entities.PengaturanAplikasi.update(settings[0].id, { tahun_ajaran_aktif: tahun_ajaran_baru });
    } else {
      await svc.entities.PengaturanAplikasi.create({ tahun_ajaran_aktif: tahun_ajaran_baru });
    }

    return Response.json({
      success: true,
      log_id: logRecord.id,
      summary: {
        tahun_ajaran_lama,
        tahun_ajaran_baru,
        jumlah_siswa_diarsip: jumlahSiswaDiarsip,
        jumlah_siswa_lulus: jumlahSiswaLulus,
        jumlah_nilai_diarsip: jumlahNilaiDiarsip,
        jumlah_tunggakan_diarsip: jumlahTunggakanDiarsip,
        total_saldo_sebelum: totalSaldoSebelum,
        total_saldo_sesudah: totalSaldoSesudah,
        checksum_match: totalSaldoSebelum === totalSaldoSesudah,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}