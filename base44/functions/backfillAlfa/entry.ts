import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  getTahunAjaranAktif, getKodeData, getBackfillAktif, buildPelanggaranRecord,
  KODE_KEHADIRAN, SISTEM_BACKFILL_ID, SISTEM_BACKFILL_NAMA, BACKFILL_KETERANGAN,
} from "../../shared/pelanggaranAlfa.ts";

const LIBUR_KATEGORI = ["Hari Libur Nasional", "Libur Sekolah"];

// Tanggal hari ini dalam zona Asia/Jakarta (UTC+7) -> "YYYY-MM-DD"
function jakartaTodayStr() {
  const now = new Date();
  const jakarta = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return jakarta.toISOString().slice(0, 10);
}
function toDate(s: string) { return new Date(s + "T00:00:00"); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }
function fmt(d: Date) { return d.toISOString().slice(0, 10); }

async function buildHolidaySet(base44, tahunAjaran) {
  const events = await base44.asServiceRole.entities.KalenderAkademik.filter({ tahun_ajaran: tahunAjaran }, undefined, 2000);
  const set = new Set();
  for (const ev of events || []) {
    if (!LIBUR_KATEGORI.includes(ev.kategori)) continue;
    if (!ev.tanggal_mulai) continue;
    const start = toDate(ev.tanggal_mulai);
    const end = ev.tanggal_selesai ? toDate(ev.tanggal_selesai) : start;
    let cur = start;
    while (cur.getTime() <= end.getTime()) { set.add(fmt(cur)); cur = addDays(cur, 1); }
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

    // Master switch
    const aktif = await getBackfillAktif(base44);
    if (!aktif) {
      return Response.json({ error: "Fitur Backfill sedang dinonaktifkan. Aktifkan master switch terlebih dahulu." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const tahunAjaran = await getTahunAjaranAktif(base44);
    const y1 = (tahunAjaran || "").split("/")[0];
    const defaultStart = y1 ? `${y1}-07-01` : `${new Date().getFullYear()}-07-01`;
    const startStr: string = body?.start_date || defaultStart;
    const todayStr = jakartaTodayStr();
    let endStr: string = body?.end_date || todayStr;
    if (endStr > todayStr) endStr = todayStr; // cap ke hari ini

    const start = toDate(startStr);
    const end = toDate(endStr);
    if (start.getTime() > end.getTime()) {
      return Response.json({ error: "Tanggal mulai setelah tanggal selesai" }, { status: 400 });
    }

    const holidaySet = await buildHolidaySet(base44, tahunAjaran);

    // Hari kerja: Senin-Jumat, bukan libur KalenderAkademik
    const workingDates: string[] = [];
    let cur = start;
    while (cur.getTime() <= end.getTime()) {
      const dow = cur.getUTCDay(); // 0=Min..6=Sab
      const ds = fmt(cur);
      if (dow >= 1 && dow <= 5 && !holidaySet.has(ds)) workingDates.push(ds);
      cur = addDays(cur, 1);
    }
    if (workingDates.length === 0) {
      return Response.json({ status: "no_working_days", message: "Tidak ada hari sekolah (Senin-Jumat) dalam rentang." });
    }

    // Kode pelanggaran F-02 (Kehadiran). Backfill hanya membuat Alfa Kehadiran + F-02.
    const kodeData = await getKodeData(base44, KODE_KEHADIRAN);

    // Kelas & siswa aktif
    const kelasList = await base44.asServiceRole.entities.Kelas.list("-updated_date", 2000);
    const siswaList = await base44.asServiceRole.entities.Siswa.filter({ status: "Aktif" }, undefined, 5000);
    const siswaByKelas = {};
    for (const s of siswaList || []) {
      if (!s.kelas_id) continue;
      if (!siswaByKelas[s.kelas_id]) siswaByKelas[s.kelas_id] = [];
      siswaByKelas[s.kelas_id].push(s);
    }

    // Absensi Kehadiran (jenis != Jumat) -> map tanggal -> kelas_id -> Set(siswa_id)
    const allAbsensi = await base44.asServiceRole.entities.Absensi.list("-tanggal", 20000);
    const kehadiranByDateKelas = {};
    for (const a of allAbsensi || []) {
      if (!a.tanggal || a.jenis_absensi === "Jumat") continue;
      if (!kehadiranByDateKelas[a.tanggal]) kehadiranByDateKelas[a.tanggal] = {};
      if (!kehadiranByDateKelas[a.tanggal][a.kelas_id]) kehadiranByDateKelas[a.tanggal][a.kelas_id] = new Set();
      kehadiranByDateKelas[a.tanggal][a.kelas_id].add(a.siswa_id);
    }

    // Dedup pelanggaran backfill existing (pelapor Sistem-Backfill)
    const existingBackfillPel = await base44.asServiceRole.entities.PelanggaranImprovement.filter({ pelapor_id: SISTEM_BACKFILL_ID }, undefined, 20000);
    const dedupKey = (p) => `${p.siswa_id}|${p.tanggal}|${p.kode}`;
    const existingBackfillKeys = new Set((existingBackfillPel || []).map(dedupKey));

    const absensiToCreate: any[] = [];
    const pelanggaranToCreate: any[] = [];
    let classesSkipped = 0;
    let classesProcessed = 0;

    for (const ds of workingDates) {
      const dateMap = kehadiranByDateKelas[ds] || {};
      for (const kelas of kelasList || []) {
        const students = siswaByKelas[kelas.id] || [];
        if (students.length === 0) continue;
        const recorded = dateMap[kelas.id];
        // Hanya proses kelas yang absensinya SUDAH diisi petugas (>=1 record Kehadiran hari itu).
        if (!recorded || recorded.size === 0) { classesSkipped++; continue; }
        classesProcessed++;
        for (const s of students) {
          if (recorded.has(s.id)) continue; // sudah ada record (Hadir/Sakit/Izin/Alfa)
          const absensi = {
            tanggal: ds, siswa_id: s.id, nis: s.nis || "", nama_siswa: s.nama,
            kelas_id: kelas.id, nama_kelas: kelas.nama_kelas || "",
            status: "Alfa", jenis_absensi: "Kehadiran", metode: "Manual",
            keterangan: BACKFILL_KETERANGAN,
          };
          absensiToCreate.push(absensi);
          const pk = `${s.id}|${ds}|${KODE_KEHADIRAN}`;
          if (kodeData && !existingBackfillKeys.has(pk)) {
            pelanggaranToCreate.push(buildPelanggaranRecord(kodeData, absensi, tahunAjaran, SISTEM_BACKFILL_ID, SISTEM_BACKFILL_NAMA));
            existingBackfillKeys.add(pk);
          }
        }
      }
    }

    let absensiCreated = 0;
    for (const batch of chunk(absensiToCreate, 500)) {
      await base44.asServiceRole.entities.Absensi.bulkCreate(batch);
      absensiCreated += batch.length;
    }
    let pelanggaranCreated = 0;
    for (const batch of chunk(pelanggaranToCreate, 500)) {
      await base44.asServiceRole.entities.PelanggaranImprovement.bulkCreate(batch);
      pelanggaranCreated += batch.length;
    }

    return Response.json({
      status: "success",
      tahun_ajaran: tahunAjaran,
      start_date: startStr,
      end_date: endStr,
      today: todayStr,
      working_days: workingDates.length,
      kelas_count: (kelasList || []).length,
      siswa_aktif: (siswaList || []).length,
      classes_processed: classesProcessed,
      classes_skipped: classesSkipped,
      absensi_created: absensiCreated,
      pelanggaran_created: pelanggaranCreated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}