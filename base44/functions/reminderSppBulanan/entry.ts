import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { getFiturNotif, sendFonnteWA, pilihKontakOrtu } from '../../shared/waSender.ts';

// Pengingat iuran SPP otomatis setiap tanggal 10 (dijalankan workflow terjadwal).
// - Hormati sakelar Notifikasi Gateway: fitur "Pengingat Tagihan SPP" (WhatsApp).
// - Hanya siswa Aktif yang BELUM membayar SPP bulan berjalan yang dikirimi pengingat.
// - Penerima: WhatsApp orang tua/wali (Ibu → Ayah → Wali → no_telp_ortu).
// - Dedup per siswa per bulan lewat entitas PengingatSpp (satu pengingat / bulan).

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
async function fetchAll(query, svc, fields) {
  const out = [];
  let cursor;
  for (;;) {
    const page = await svc.entities.Keuangan.filter(
      query,
      { limit: 1000, cursor, fields }
    );
    out.push(...(page.items || []));
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return out;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Bila dipanggil pengguna, batasi ke peran pengelola keuangan/administrasi
    let user = null;
    try { user = await base44.auth.me(); } catch (e) { user = null; }
    if (user && !['admin', 'tu', 'bendahara', 'kepsek'].includes(user.role)) {
      return Response.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const fitur = await getFiturNotif(svc);
    if (!fitur.siswa_spp) {
      return Response.json({ status: 'gateway_off', message: 'Pengingat Tagihan SPP dijeda di Pengaturan › Notifikasi Gateway' });
    }

    const token = secrets.get('WA_FONNTE_TOKEN');
    if (!token) return Response.json({ error: 'WA_FONNTE_TOKEN belum diatur' }, { status: 500 });

    // WIB (UTC+7)
    const now = new Date(Date.now() + 7 * 3600000);
    const yyyy = now.getUTCFullYear();
    const mm = now.getUTCMonth(); // 0-11
    const bulanNama = BULAN[mm];
    const bulanKey = `${yyyy}-${String(mm + 1).padStart(2, '0')}`;
    const todayStr = now.toISOString().slice(0, 10);
    const akhirBulan = `${yyyy}-${String(mm + 1).padStart(2, '0')}-31`;

    const [pengaturanList, siswaList, tarifList, payByBulan, payByTanggal] = await Promise.all([
      svc.entities.PengaturanAplikasi.list(),
      svc.entities.Siswa.filter({ status: 'Aktif', is_arsip: { $ne: true } }),
      svc.entities.TarifIuran.filter({ jenis_iuran: 'SPP' }),
      fetchAll({ jenis: 'Pemasukan', bulan_dibayar: { $in: [bulanNama] } }, svc, ['siswa_id', 'siswa_uid', 'nis', 'kategori', 'tarif_iuran_id', 'bulan_dibayar', 'jumlah']),
      fetchAll({ jenis: 'Pemasukan', tanggal: { $gte: `${yyyy}-${String(mm + 1).padStart(2, '0')}-01`, $lte: akhirBulan } }, svc, ['siswa_id', 'siswa_uid', 'nis', 'kategori', 'tarif_iuran_id', 'bulan_dibayar', 'jumlah']),
    ]);

    const tahunAjaran = (pengaturanList || [])[0]?.tahun_ajaran_aktif || '';
    const tarifSpp = (tarifList || []).filter((t) => t.status !== 'Tidak Aktif');
    const sppIds = new Set(tarifSpp.map((t) => t.id));

    const nominalSpp = (siswa) => {
      const tingkat = (siswa.nama_kelas || '')[0];
      const t = tarifSpp.find((x) => {
        const arr = Array.isArray(x.tingkat) ? x.tingkat : [x.tingkat || 'Semua'];
        return arr.includes('Semua') || arr.includes(tingkat);
      });
      return t?.nominal || 0;
    };

    // Kumpulan identitas siswa yang sudah membayar SPP bulan ini
    const sudahBayar = new Set();
    const tandai = (k) => {
      if (k.siswa_uid) sudahBayar.add(`uid:${k.siswa_uid}`);
      if (k.nis) sudahBayar.add(`nis:${k.nis}`);
      if (k.siswa_id) sudahBayar.add(`id:${k.siswa_id}`);
    };
    payByBulan.forEach(tandai);
    payByTanggal.forEach((k) => {
      const isSpp = k.kategori === 'SPP' || (k.tarif_iuran_id && sppIds.has(k.tarif_iuran_id));
      const bulanCocok = !Array.isArray(k.bulan_dibayar) || k.bulan_dibayar.length === 0 || k.bulan_dibayar.includes(bulanNama);
      if (isSpp && bulanCocok) tandai(k);
    });

    const lunas = (s) =>
      sudahBayar.has(`uid:${s.uid}`) || sudahBayar.has(`nis:${s.nis}`) || sudahBayar.has(`id:${s.id}`);

    const belum = (siswaList || []).filter((s) => !lunas(s));

    if (belum.length === 0) {
      return Response.json({ status: 'all_paid', bulan: bulanNama, tahun: yyyy, message: 'Semua siswa aktif sudah membayar SPP bulan ini' });
    }

    // Dedup: satu pengingat per siswa per bulan
    const existing = await svc.entities.PengingatSpp.filter({ bulan_key: bulanKey });
    const sudahDikirim = new Set((existing || []).filter((r) => r.wa_terkirim).map((r) => r.siswa_id));
    const target = belum.filter((s) => !sudahDikirim.has(s.id) && pilihKontakOrtu(s).phone);

    const hasil = [];
    for (let i = 0; i < target.length; i += 5) {
      const chunk = target.slice(i, i + 5);
      const res = await Promise.allSettled(chunk.map(async (s) => {
        const { phone, hubungan } = pilihKontakOrtu(s);
        const nominal = nominalSpp(s);
        const pesan = `*PENGINGAT IURAN SPP*\n\n` +
          `Assalamu'alaikum Bpk/Ibu ${s.nama_ibu_kandung || s.nama_ayah_kandung || 'Orang Tua/Wali'},\n\n` +
          `Kami mengingatkan pembayaran iuran *SPP ${bulanNama} ${yyyy}* untuk:\n` +
          `Nama: ${s.nama}\n` +
          `Kelas: ${s.nama_kelas || '-'}\n` +
          `${nominal > 0 ? `Nominal: Rp ${nominal.toLocaleString('id-ID')}\n` : ''}\n` +
          `Pembayaran dapat dilakukan melalui Bendahara Sekolah. Bila Bapak/Ibu sudah membayar, mohon abaikan pesan ini.\n\n` +
          `Terima kasih.\n- Sistem Informasi Sekolah YPPI ARRAHMAH`;
        const wa = await sendFonnteWA(phone, pesan, token);
        return { siswa: s, phone, hubungan, nominal, wa };
      }));
      res.forEach((r) => { if (r.status === 'fulfilled') hasil.push(r.value); });
    }

    const terkirim = hasil.filter((h) => h.wa?.sent === true);
    if (terkirim.length > 0) {
      await svc.entities.PengingatSpp.bulkCreate(terkirim.map((h) => ({
        siswa_id: h.siswa.id,
        nis: h.siswa.nis || '',
        nama_siswa: h.siswa.nama || '',
        nama_kelas: h.siswa.nama_kelas || '',
        phone: h.phone,
        bulan: bulanNama,
        bulan_key: bulanKey,
        tahun_ajaran: tahunAjaran,
        nominal: h.nominal,
        tanggal: todayStr,
        wa_terkirim: true,
      })));
    }

    return Response.json({
      status: 'done',
      bulan: bulanNama,
      tahun: yyyy,
      tahun_ajaran: tahunAjaran,
      belum_bayar: belum.length,
      target_wa: target.length,
      terkirim: terkirim.length,
      gagal: target.length - terkirim.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}