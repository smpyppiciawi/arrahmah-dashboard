import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

const ALLOWED_ROLES = ['admin', 'tu', 'kepsek', 'bendahara'];

function str(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Auth: user dari UI harus punya peran yang diizinkan; panggilan dari workflow (service) tanpa user diizinkan
    let user = null;
    try { user = await base44.auth.me(); } catch (e) { user = null; }
    if (user && !ALLOWED_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const token = secrets.get('SPMB_API_TOKEN');
    const appId = secrets.get('SPMB_APP_ID');
    if (!token || !appId) {
      return Response.json({ error: 'SPMB belum dikonfigurasi (token/app id kosong)' }, { status: 400 });
    }
    const base = `https://${appId}.base44.app/api/apps/${appId}/entities`;
    const H = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const svc = base44.asServiceRole;

    // ===== 1. Tarik Student dari SPMB (paginasi limit=100) =====
    const students = [];
    let skip = 0;
    while (true) {
      const res = await fetch(`${base}/Student?limit=100&skip=${skip}`, { headers: H });
      if (!res.ok) return Response.json({ error: `SPMB Student HTTP ${res.status}` }, { status: 502 });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.data || data.items || []);
      students.push(...arr);
      if (arr.length < 100) break;
      skip += 100;
    }

    // ===== 2. Tarik Payment dari SPMB =====
    await sleep(2000); // throttle antar request SPMB
    const payments = [];
    skip = 0;
    while (true) {
      const res = await fetch(`${base}/Payment?limit=100&skip=${skip}`, { headers: H });
      if (!res.ok) return Response.json({ error: `SPMB Payment HTTP ${res.status}` }, { status: 502 });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.data || data.items || []);
      payments.push(...arr);
      if (arr.length < 100) break;
      skip += 100;
    }
    const paymentsByStudent = {};
    for (const p of payments) {
      const sid = str(p.student_id);
      if (sid) (paymentsByStudent[sid] = paymentsByStudent[sid] || []).push(p);
    }

    // ===== 3. Data pendukung internal =====
    const pengaturanList = await svc.entities.PengaturanAplikasi.list();
    const pengaturan = pengaturanList[0] || {};
    const taAktif = pengaturan.tahun_ajaran_aktif || '';

    const tarifList = await svc.entities.TarifIuran.filter({ status: 'Aktif' });
    const tarifPPDB = tarifList.filter((t) => str(t.jenis_iuran).includes('PPDB'));
    const tipeList = await svc.entities.TipeTransaksi.list();

    // ===== 4. Upsert SiswaSPMB + sinkron pembayaran =====
    const existing = await svc.entities.SiswaSPMB.list();
    const byReg = {};
    for (const e of existing) byReg[str(e.reg_number)] = e;

    let created = 0, updated = 0, paymentsNew = 0, keuanganCreated = 0;
    const errors = [];

    for (const s of students) {
      const reg = str(s.registration_number);
      if (!reg) continue;
      const answers = [];
      for (let i = 1; i <= 27; i++) {
        const v = s[`interview_q${i}`];
        if (v !== null && v !== undefined && v !== '') {
          answers.push({ no: `q${i}`, jawaban: str(v) });
        }
      }
      const payload = {
        reg_number: reg,
        spmb_student_id: str(s.id),
        nama: str(s.full_name),
        nickname: str(s.nickname),
        gender: str(s.gender),
        nisn: str(s.nisn),
        nik: str(s.nik),
        birth_place: str(s.birth_place),
        birth_date: str(s.birth_date),
        religion: str(s.religion),
        address: str(s.address),
        rt: str(s.rt),
        rw: str(s.rw),
        village: str(s.village),
        district: str(s.district),
        city: str(s.city),
        province: str(s.province),
        postal_code: str(s.postal_code),
        wave: str(s.wave),
        registration_date: str(s.registration_date),
        status: str(s.status),
        payment_status: str(s.payment_status),
        interview_status: str(s.interview_status),
        interview_date: str(s.interview_date),
        interview_officer: str(s.interview_officer),
        interview_notes: str(s.interview_notes),
        interview_answers: answers,
        father_name: str(s.father_name),
        father_phone: str(s.father_phone),
        father_job: str(s.father_job),
        mother_name: str(s.mother_name),
        mother_phone: str(s.mother_phone),
        mother_job: str(s.mother_job),
        guardian_name: str(s.guardian_name),
        guardian_phone: str(s.guardian_phone),
        previous_school: str(s.previous_school),
        photo_url: str(s.photo_url),
        spmb_updated_at: str(s.updated_date),
        tahun_ajaran: taAktif
      };

      let bridge = byReg[reg];
      if (bridge) {
        // update hanya jika ada perubahan dari SPMB
        if (str(bridge.spmb_updated_at) !== str(s.updated_date) || str(bridge.status) !== str(s.status)) {
          await svc.entities.SiswaSPMB.update(bridge.id, payload);
          updated++;
          bridge = { ...bridge, ...payload };
        }
      } else {
        bridge = await svc.entities.SiswaSPMB.create(payload);
        created++;
        byReg[reg] = bridge;
      }
      if (!bridge) { errors.push(`Gagal membuat record ${reg}`); continue; }

      // ===== sinkron pembayaran pendaftar ini =====
      const list = paymentsByStudent[str(s.id)] || [];
      const existingPays = Array.isArray(bridge.pembayaran) ? bridge.pembayaran : [];
      const knownIds = new Set(existingPays.map((p) => str(p.payment_id)));
      const totalBefore = existingPays.reduce((a, p) => a + (Number(p.nominal) || 0), 0);
      let total = existingPays.map((p) => ({ ...p }));
      let hasNew = false;
      for (const p of list) {
        const pid = str(p.id);
        if (!pid || knownIds.has(pid)) continue;
        const nominal = Number(p.amount) || 0;
        const tanggal = str(p.payment_date) || str(p.created_date).slice(0, 10);
        const notes = str(p.notes);

        // pemetaan tarif PPDB by nominal
        let label = '';
        let tipeTransaksi = 'Transaksi Khusus';
        let kategori = 'Lainnya';
        const matched = tarifPPDB.find((t) => Number(t.nominal) === nominal);
        if (matched) {
          label = str(matched.nama);
          kategori = 'Daftar Ulang';
          if (matched.tipe_transaksi_id) {
            const tt = tipeList.find((t) => t.id === matched.tipe_transaksi_id);
            if (tt) tipeTransaksi = str(tt.nama);
          }
        }

        let keuanganId = '';
        try {
          const keu = await svc.entities.Keuangan.create({
            tanggal,
            jenis: 'Pemasukan',
            tipe_transaksi: tipeTransaksi,
            kategori,
            uraian: `SPMB ${reg} — ${str(s.full_name)}${label ? ' (' + label + ')' : ''}${notes ? ' — ' + notes : ''}`,
            jumlah: nominal,
            siswa_id: bridge.finalized && bridge.siswa_id ? bridge.siswa_id : '',
            nama_siswa: str(s.full_name),
            nama_donatur: '',
            sumber_rekening: 'SPMB',
            pic: 'Sinkronisasi SPMB',
            status_bayar: 'Lunas',
            tahun_ajaran: taAktif
          });
          keuanganId = keu.id;
          keuanganCreated++;
        } catch (e) {
          errors.push(`Keuangan ${reg}/${pid}: ${str(e && e.message ? e.message : e).slice(0, 120)}`);
        }

        total.push({ payment_id: pid, tanggal, nominal, catatan: notes, keuangan_id: keuanganId });
        paymentsNew++;
        hasNew = true;
      }
      if (hasNew) {
        const totalDibayar = total.reduce((a, p) => a + (Number(p.nominal) || 0), 0);
        await svc.entities.SiswaSPMB.update(bridge.id, { pembayaran: total, total_dibayar: totalDibayar });
      }
    }

    return Response.json({
      ok: true,
      pendaftar: students.length,
      dibuat: created,
      diperbarui: updated,
      pembayaran_baru: paymentsNew,
      keuangan_dibuat: keuanganCreated,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}