import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { getTahunAjaranAktif, getKodeData, buildPelanggaranRecord, kodeByJenis } from "../../shared/pelanggaranAlfa.ts";

const LIBUR_KATEGORI = ["Hari Libur Nasional", "Libur Sekolah"];

// Tanggal hari ini dalam zona Asia/Jakarta (UTC+7) -> "YYYY-MM-DD"
function jakartaTodayStr() {
  const now = new Date();
  const jakarta = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return jakarta.toISOString().slice(0, 10);
}

function toDate(s: string) {
  return new Date(s + "T00:00:00");
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function buildHolidaySet(base44, tahunAjaran) {
  const events = await base44.asServiceRole.entities.KalenderAkademik.filter({ tahun_ajaran: tahunAjaran });
  const set = new Set();
  for (const ev of events || []) {
    if (!LIBUR_KATEGORI.includes(ev.kategori)) continue;
    if (!ev.tanggal_mulai) continue;
    const start = toDate(ev.tanggal_mulai);
    const end = ev.tanggal_selesai ? toDate(ev.tanggal_selesai) : start;
    let cur = start;
    while (cur.getTime() <= end.getTime()) {
      set.add(fmt(cur));
      cur = addDays(cur, 1);
    }
  }
  return set;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "operator", "tu", "kepsek"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const overrideStart = body?.start_date; // optional "YYYY-MM-DD"

    const tahunAjaran = await getTahunAjaranAktif(base44);
    let startDateStr: string;
    if (overrideStart) {
      startDateStr = overrideStart;
    } else {
      const y1 = (tahunAjaran || "").split("/")[0];
      startDateStr = y1 ? `${y1}-07-01` : `${new Date().getFullYear()}-07-01`;
    }
    const todayStr = jakartaTodayStr();
    const start = toDate(startDateStr);
    const today = toDate(todayStr);
    if (start.getTime() > today.getTime()) {
      return Response.json({ error: "Tanggal mulai setelah hari ini" }, { status: 400 });
    }

    const holidaySet = await buildHolidaySet(base44, tahunAjaran);

    // Daftar hari kerja (Senin-Jumat) selain libur
    const workingDates: { date: string; isJumat: boolean }[] = [];
    let cur = start;
    while (cur.getTime() <= today.getTime()) {
      const dow = cur.getUTCDay(); // 0=Min..6=Sab
      const ds = fmt(cur);
      if (dow >= 1 && dow <= 5 && !holidaySet.has(ds)) {
        workingDates.push({ date: ds, isJumat: dow === 5 });
      }
      cur = addDays(cur, 1);
    }

    if (workingDates.length === 0) {
      return Response.json({ status: "no_working_days", message: "Tidak ada hari kerja dalam rentang." });
    }

    // Ambil data kode pelanggaran sekali (F-02 & F-05)
    const kodeKehadiran = await getKodeData(base44, "F-02");
    const kodeJumat = await getKodeData(base44, "F-05");

    // Load semua siswa aktif & seluruh absensi rentang (sekali)
    const siswaList = await base44.asServiceRole.entities.Siswa.filter({ status: "Aktif" });
    const allAbsensi = await base44.asServiceRole.entities.Absensi.list("-tanggal", 20000);
    const absensiByDate = new Map<string, Set<string>>();
    for (const a of allAbsensi || []) {
      if (!a.tanggal) continue;
      if (!absensiByDate.has(a.tanggal)) absensiByDate.set(a.tanggal, new Set());
      absensiByDate.get(a.tanggal)!.add(a.siswa_id);
    }

    const absensiToCreate: any[] = [];
    const pelanggaranToCreate: any[] = [];
    let siswaSkipped = 0;

    for (const wd of workingDates) {
      const existingIds = absensiByDate.get(wd.date) || new Set<string>();
      const kodeData = wd.isJumat ? kodeJumat : kodeKehadiran;
      if (!kodeData) continue; // lewati jika kode belum tersedia
      for (const s of siswaList) {
        if (existingIds.has(s.id)) {
          siswaSkipped++;
          continue;
        }
        const absensi = {
          tanggal: wd.date,
          siswa_id: s.id,
          nis: s.nis || "",
          nama_siswa: s.nama,
          kelas_id: s.kelas_id || "",
          nama_kelas: s.nama_kelas || "",
          status: "Alfa",
          jenis_absensi: wd.isJumat ? "Jumat" : "Kehadiran",
          metode: "Manual",
          keterangan: "Backfill otomatis",
        };
        absensiToCreate.push(absensi);
        pelanggaranToCreate.push(buildPelanggaranRecord(kodeData, absensi, tahunAjaran));
      }
    }

    if (absensiToCreate.length === 0) {
      return Response.json({
        status: "nothing_to_create",
        tahun_ajaran: tahunAjaran,
        start_date: startDateStr,
        today: todayStr,
        working_days: workingDates.length,
        absensi_created: 0,
        pelanggaran_created: 0,
        siswa_skipped_existing: siswaSkipped,
      });
    }

    // BulkCreate Absensi (500/batch). bulkCreate tidak memicu entity trigger,
    // jadi pelanggaran dibuat langsung di bawah (tidak ada duplikat dari trigger).
    let absensiCreated = 0;
    for (const batch of chunk(absensiToCreate, 500)) {
      await base44.asServiceRole.entities.Absensi.bulkCreate(batch);
      absensiCreated += batch.length;
    }

    // BulkCreate PelanggaranImprovement (500/batch) dengan dedup ringan: skip bila
    // sudah ada record sistem aktif untuk siswa+tanggal+kode (menghindari duplikat saat re-run parsial).
    const existingSystem = await base44.asServiceRole.entities.PelanggaranImprovement.filter({
      pelapor_nama: "Admin/Sistem",
    });
    const dedupKey = (p) => `${p.siswa_id}|${p.tanggal}|${p.kode}`;
    const activeSystemKeys = new Set(
      (existingSystem || []).filter((p) => p.status !== "Dibatalkan").map(dedupKey)
    );
    const pelanggaranFinal = pelanggaranToCreate.filter((p) => !activeSystemKeys.has(dedupKey(p)));
    let pelanggaranCreated = 0;
    for (const batch of chunk(pelanggaranFinal, 500)) {
      await base44.asServiceRole.entities.PelanggaranImprovement.bulkCreate(batch);
      pelanggaranCreated += batch.length;
    }

    return Response.json({
      status: "success",
      tahun_ajaran: tahunAjaran,
      start_date: startDateStr,
      today: todayStr,
      working_days: workingDates.length,
      siswa_aktif: siswaList.length,
      absensi_created: absensiCreated,
      pelanggaran_created: pelanggaranCreated,
      pelanggaran_dedup_skipped: pelanggaranToCreate.length - pelanggaranFinal.length,
      siswa_skipped_existing: siswaSkipped,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}