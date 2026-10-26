# AUDIT LANJUTAN — SISTEM SEKOLAH TERPADU ARRAHMAH
**Tanggal:** 26 Oktober 2026 (WIB) · **Mode:** Read-only, tanpa perubahan data produksi
**Lingkup:** Semua entitas, fungsi backend, workflow, halaman, integrasi, dan data live
**Status akhir:** Tidak ada migrasi, cutover, koreksi massal, atau penghapusan yang dijalankan. Semua gerbang implementasi TERTUTUP sampai prasyarat TAHAP E terpenuhi.

---

## METODOLOGI & BATASAN

- Bukti berupa: (1) pembacaan langsung kode sumber `base44/functions/*`, `base44/workflows/*`, `base44/shared/*`, skema entitas; (2) kueri data live read-only (list/filter/aggregate) atas basis data produksi; (3) eksekusi uji fungsi `cariKandidatUid`, `riwayatUid`, `auditUidRelasi` (semua read-only).
- Keterbatasan platform yang DIBUKTIKAN dan harus dinyatakan terbuka:
  - **Operasi CRUD platform TIDAK ATOMIK lintas record/tabel.** Rangkaian `create/bulkCreate/update` di dalam satu fungsi tidak memiliki rollback. Setiap rancangan multi-langkah (sinkronisasi, finalisasi, migrasi) wajib memakai pola idempoten + log status + rekonsiliasi, BUKAN diasumsikan atomik.
  - **Backup/pulihkan tingkat database tidak diekspos sebagai API yang dapat dipanggil dari kode.** Backup harus dilakukan lewat ekspor data + berkas, divalidasi dengan manifest hash.
  - **Ekspor portabel otomatis belum tersedia** — dirancang di TAHAP E, belum diimplementasikan.

---

## TAHAP A — INVENTARISASI

### A.1 Hasil inventarisasi
| Komponen | Jumlah | Catatan |
|---|---|---|
| Entitas | 63 file skema | 1 dengan aturan RLS (NotifAbsen3Hari); 62 tanpa RLS eksplisit |
| Fungsi backend | 23 | auditUidRelasi, cariKandidatUid, riwayatUid, migrasiUid, migrasiJenisNilai, backfillAlfa, backfillGuruId, cancelBackfill, autoPelanggaranAlfa, cleanupDuplicate{Absensi,Nilai,PelanggaranAlfa}, notif{Absensi,Absen3Hari,TugasPegawai}, sendWANotif, sendAbsensiEmail, h2Notification, rekapKehadiran, syncSiswa, syncSpmb, prosesFinalisasi, uploadToGoogleDrive |
| Workflow | 7 | Sinkronisasi SPMB (interval 15 menit); Notifikasi Absen 3 Hari; H-1 Tugas; H-2 Kalender; Pelanggaran Otomatis Alfa; 2× Pembersihan Duplikat harian |
| Modul bersama (shared) | 4 | uidCore.ts, absen3Hari.ts, pelanggaranAlfa.ts, waSender.ts |
| Agents (WA/dashboard) | 3 | kepsek_assistant, wa_kepsek_bot, wa_guru_bot |
| Integrasi | Google Drive connector (drive.file, email); Fonnte WA (secret); SPMB (secret) | |

### A.2 Verifikasi temuan audit sebelumnya
| # | Temuan sebelumnya | Status | Bukti |
|---|---|---|---|
| 1 | Transaksi SPMB tidak tertaut ke siswa final | **MASIH TERBUKTI (kode)** | `syncSpmb/entry.ts` baris 184: `siswa_id: bridge.finalized && bridge.siswa_id ? bridge.siswa_id : ''` — transaksi yang tercatat sebelum finalisasi tidak pernah diperbarui saat finalisasi. Verifikasi data live: NOT RUN (tabel SiswaSPMB kosong saat audit; kemungkinan dibersihkan/diganti TA). |
| 2 | Finalisasi gagal mengarsipkan tunggakan SPP/iuran lama | **MASIH TERBUKTI** | `prosesFinalisasi/entry.ts` hanya mengarsipkan BiayaKhusus → ArsipKeuangan (baris 60–94). Tunggakan dalam Keuangan (status_bayar ≠ Lunas) tidak dipindah/ditandai. |
| 3 | Modul Keuangan tanpa audit log edit/hapus | **MASIH TERBUKTI** | Tidak ada entitas log transaksi keuangan; tidak ada pencatatan edit/hapus di kode transaksi. |
| 4 | Device Fonnte WA terputus | **BLOCKED** | State device eksternal, tidak dapat diverifikasi dari kode/data; token terpasang. |
| 5 | Inkonsistensi desktop/mobile | **NOT RUN** | Memerlukan pengujian UI perangkat (di luar audit read-only ini). |
| 6 | Latensi Nilai/HomeVisit | **NOT RUN** | Perlu pengukuran runtime terpisah. |

### A.3 Temuan baru dari verifikasi kode & data
| # | Temuan | Bukti | Dampak |
|---|---|---|---|
| N1 | **RLS hanya pada 1 dari 63 entitas.** Menurut ketentuan platform, entitas tanpa aturan terbuka (termasuk pengunjung tanpa login) | grep skema: hanya `NotifAbsen3Hari.jsonc` berisi `rls` | KRITIS — data pribadi anak (Siswa, Nilai, Keuangan, UKS, Menstruasi, dll.) tidak dilindungi di lapisan data |
| N2 | **sendWANotif = relay terbuka**: cukup login apa pun (tanpa cek peran) untuk kirim pesan bebas ke nomor mana pun | `sendWANotif/entry.ts` baris 8–9: hanya `if (!user) 401` | Sedang — risiko penyalahgunaan gateway biaya kirim |
| N3 | **NIS ganda pada siswa aktif**: 3 kasus (NIS "0" ×2, "242507104" ×2, "262708194" ×2) | Kueri data live | Sedang — NIS bukan lagi kunci unik; sementara UID sudah jadi kunci identitas |
| N4 | **Checksum finalisasi lemah**: `total_saldo_sesudah` dihitung dari record yang baru saja dibuat dari nilai yang sama, sehingga `checksum_match` selalu true | `prosesFinalisasi` baris 93 vs 57 | Sedang — kontrol rekonsiliasi tidak mendeteksi apa pun |
| N5 | Gap idempotensi SPMB: jika `Keuangan.create` sukses tetapi update `SiswaSPMB.pembayaran` gagal, run berikutnya membuat Keuangan duplikat (payment_id belum tercatat) | `syncSpmb` baris 177–204 | Rendah–Sedang |
| N6 | Keuangan tanpa `siswa_id`: 722 record — 320 SPP, 239 Saldo Awal, 38 BOS, 33 Lainnya, 25 Daftar Ulang, 25 PPDB, 21 Donatur, 18 "Tunggakan " (kategori dengan spasi ekstra — data hygiene), 3 Ulangan Semester | Kueri data live | Sedang — sebagian wajar (non-siswa), sebagian perlu rekonsiliasi (SPP/Daftar Ulang/PPDB) |
| N7 | Pesan error prosesFinalisasi menyebut "Hanya admin/kepsek" padahal operator diizinkan | `prosesFinalisasi` baris 8 | Kosmetik |

---

## TAHAP B — IDENTITAS PERMANEN

Pemetaan konsep addendum → implementasi aktual:
| Konsep addendum | Implementasi aktual | Status |
|---|---|---|
| PersonIdentity / StudentUID | Field `uid` (UUID) di Siswa & Guru; 100% terisi tanpa duplikat (bukti: 617/28 record, kueri live) | **PASS** |
| LegacyMapping | `base44/shared/uidCore.ts` + `cariKandidatUid` (pencocokan multi-atribut: NISN/NIK/NUPTK sama persis, atau nama+jenis kelamin+tanggal lahir untuk Siswa; nama-saja tidak pernah cukup) | **PASS** |
| Penggabungan data ambigu | Tidak otomatis: kandidat selalu lewat dialog konfirmasi Admin (UidMatchDialog); "Orang Sama" = pakai UID lama, "Orang Berbeda" = UID baru | **PASS** |
| Identitas lama tidak ditimpa/dihapus | Arsip (is_arsip) + restore; tidak ada penghapusan otomatis identitas di jalur UID | **PASS** |
| StatusEvent | HistoryStatusSiswa (status per tahun ajaran, terkait migrasi) | **PASS (parsial)** — belum memuat snapshot penuh (kelas/wali/kontak) |
| Graduation / Alumni | DataLulusan + status Lulus + tahun_lulus pada prosesFinalisasi | **PASS (parsial)** — DataLulusan belum membawa `uid` (melink via `siswa_id`) |
| StudentMembership / Enrollment | Kelas (wali_kelas_id + snapshot nama) + Siswa.kelas_id + SiswaMasuk/SiswaKeluar | **PASS (parsial)** — riwayat kenaikan kelas per TA belum entitas eksplisit |
| AcademicYear | PengaturanAplikasi.tahun_ajaran_aktif + LogTahunAjaran (dengan log_id pada semua arsip migrasi) | **PASS** |

**Kunci relasi:** modul-modul riwayat (Absensi, Nilai, Keuangan, Pelanggaran, Improvement, Hapalan, Periodik, Izin, Home Visit, Iuran Muka) mengait via `siswa_id`; identitas permanen via `uid`. NIS/NISN/nama/tanggal lahir **tidak** dipakai sebagai satu-satunya kunci — sesuai tuntutan. **PASS.**

**Kesenjangan:** (a) DataLulusan belum ber-UID; (b) arsip belum memuat snapshot penuh identitas+kelas+wali (tercatat di open todos sebelumnya); (c) NIS ganda aktif (N3) harus diselesaikan Admin sebelum NIS dipakai kembali sebagai kunci tampilan.

---

## TAHAP C — INTEGRITAS MODUL

| Pemeriksaan | Status | Bukti |
|---|---|---|
| Sinkronisasi SPMB idempoten (payment_id anti-dobel) | **PASS** | `syncSpmb` baris 150: `knownIds` Set; pembayaran baru saja yang dibuat |
| Sinkronisasi SPMB peran dibatasi (admin/tu/kepsek/bendahara; workflow diizinkan) | **PASS** | `syncSpmb` baris 4, 17 |
| Transaksi menyimpan snapshot (nama_siswa, kelas, nis) sehingga perubahan data master tidak mengubah historis | **PASS** | Skema Keuangan, Nilai, ArsipNilai, ArsipKeuangan menyimpan snapshot nama/kelas |
| Perubahan wali kelas tidak merusak riwayat | **PASS (parsial)** | Kelas.wali_kelas_id (relasi) + wali_kelas (snapshot) — riwayat wali kelas per TA belum entitas tersendiri |
| Finalisasi TA: arsip nilai → ArsipNilai | **PASS** | prosesFinalisasi Step 5, dengan migrate_log_id |
| Finalisasi TA: arsip tunggakan | **FAIL (parsial)** | Hanya BiayaKhusus; tunggakan Keuangan/SPP tidak diarsipkan (Temuan #2) |
| Finalisasi TA: lulus kelas 9 → DataLulusan + status | **PASS (parsial)** | Step 7; tanpa uid, tanpa pembaruan riwayat kelas per TA |
| Finalisasi TA: non-atomik | **DIKETAHUI & DIRANCANG-SEBAGAI-DEMODUL** | LogTahunAjaran status In Progress→Completed memberi titik pemulihan; TIDAK ada rollback otomatis — jika gagal di tengah, status tetap In Progress (petunjuk pemulihan manual) |
| Konsistensi per tahun ajaran pada transaksi/nilai/kalender | **PASS (parsial)** | Field tahun_ajaran ada di Keuangan, Nilai, KalenderAkademik, Pelanggaran; verifikasi menyeluruh nilai kosong belum dilakukan |
| Ceklis Dapo, UKS, Hapalan, Absensi (dedup harian workflow) | **PASS (parsial)** | Workflow Pembersihan Duplikat berjalan; data-level dedup hasilnya belum direkonsiliasi dalam audit ini |

---

## TAHAP D — KEAMANAN & KEUANGAN

| Pemeriksaan | Status | Bukti |
|---|---|---|
| Sekresi API (token tidak pernah di kode/前端) | **PASS** | Semua token via `secrets.get()` (SPMB_APP_ID, SPMB_API_TOKEN, WA_FONNTE_TOKEN); grep kode = 0 kebocoran |
| Proteksi peran fungsi sensitif | **PASS (parsial)** | migrasiUid, auditUidRelasi, backfillGuruId, prosesFinalisasi, syncSpmb memeriksa peran; cleanupDuplicate* dan migrasiJenisNilai TIDAK memeriksa peran (harus admin-only) |
| sendWANotif | **FAIL** | Relay terbuka untuk semua user login (N2) |
| RLS entitas | **FAIL** | 1/63 entitas (N1) |
| Keunikan ID | **PASS** | UID unik 100%; ID database platform-increment unik; payment_id anti-dobel |
| Idempotensi | **PASS (parsial)** | SPMB PASS; gap kecil N5 |
| Transaksi atomik | **TIDAK TERJAMIN PLATFORM — DISATAKAN** | Sesuai batasan; semua alur multi-langkah wajib pola idempoten+log+rekonsiliasi. Finalisasi & syncSpmb sudah memakai pola ini sebagian; arsip Keuangan belum |
| Audit log (keuangan & perubahan data master) | **FAIL** | Tidak ada entitas audit log untuk edit/hapus transaksi (Temuan #3) |
| Dokumen/berkas (foto, bukti transaksi) | **PASS (parsial)** | Upload via integrasi platform; kebijakan publik vs privat belum diklasifikasi per kategori (lihat TAHAP E) |
| Pencegahan transaksi ganda di UI | **PASS (parsial)** | Peringatan transaksi ganda via tarif_iuran_id + dedup harian; belum ada kendala unik level data |

---

## TAHAP E — ARSIP LINTAS GENERASI (RANCANGAN — belum diimplementasikan)

### E.1 ArchivePreservationPlan (desain)
1. **Ekspor portabel penuh** (satu kali per semester + sebelum setiap migrasi/cutover):
   - `data/*.json` — seluruh record tiap entitas (batch paginasi, bukan satu fetch penuh).
   - `schema/*.json` — salinan skema entitas.
   - `files/` — berkas asli (foto, bukti transaksi) dengan nama relatif yang dirujuk manifest.
   - `manifest.json` — daftar entitas: jumlah record, sha256 per berkas ekspor, versi skema, tanggal ekspor, alat ekspor.
   - `relations.json` — peta relasi antarentitas (siswa_id ↔ uid ↔ modul) agar riwayat tetap dapat direkonstruksi tanpa platform.
   - **Integritas:** hash sha256 per berkas + hash keseluruhan manifest; verifikasi ulang saat restore uji.
2. **Backup & pemulihan:** ekspor disimpan di minimal 2 lokasi independen (di luar penyedia aplikasi); uji pemulihan wajib: impor ekspor ke salinan bersih, verifikasi jumlah record per entitas vs manifest, verifikasi hash, uji buka dokumen resmi.
3. **Migrasi format:** data JSON + CSV per entitas (CSV untuk keterbacaan manusia); dokumen resmi PDF utuh; skema didokumentasikan versi demi versi.
4. **Keterlanjutan tanpa Base44/penyedia penyimpanan:** manifest mencantumkan cara merekonstruksi relasi (uid permanen, snapshot nama) sehingga data dapat dimuat ke basis data SQL sederhana; kunci pembuka tidak bergantung vendor.
5. **Klasifikasi & retensi** (kebijakan yang diusulkan — butuh persetujuan Yayasan & kepatuhan perlindungan data anak):
   - Data pribadi anak (Siswa, UKS, Menstruasi, Home Visit, kontak ortu): **privat, retensi terbatas**, akses admin/kewenangan sekolah saja, hapus/perakukan setelah batas retensi yang disahkan.
   - Data akademik historis (Nilai, ArsipNilai, Rapor, Hapalan, Buku Induk): retensi jangka panjang, akses terbatas.
   - Keuangan (Keuangan, ArsipKeuangan, IuranMuka): retensi sesuai kewajiban pembukuan sekolah/yayasan.
   - Pegawai: retensi menurut ketentuan kepegawaian.
   - **Prasyarat sebelum pola retensi dieksekusi: RLS diberlakukan (N1) — tanpa itu klasifikasi tidak melekat pada akses.**

**Status TAHAP E: BELUM DIIMPLEMENTASIKAN — gerbang untuk migrasi/cutover TERTUTUP sampai backup terverifikasi + pemulihan teruji.**

---

## TAHAP F — LAPORAN

### F.1 ReconciliationReport (bukti data live, 26-10-2026)
| Area | Temuan | Tindak lanjut yang direkomendasikan |
|---|---|---|
| UID Siswa | 617 record, 0 tanpa uid, 0 duplikat | — |
| UID Guru | 28 record, 0 tanpa uid, 0 duplikat | — |
| NIS aktif ganda | 3 kasus ("0", "242507104", "262708194") | Admin verifikasi identitas via Riwayat UID, perbaiki NIS salah satu |
| Keuangan tanpa siswa_id | 722: 320 SPP, 239 Saldo Awal, 38 BOS, 25 Daftar Ulang, 25 PPDB, 21 Donatur, 33 Lainnya, 18 "Tunggakan ", 3 Ulangan Semester | Non-siswa (BOS/Donatur/Saldo Awal) = wajar; SPP/Daftar Ulang/PPDB perlu pencocokan manual; perbaiki kategori "Tunggakan " (spasi) |
| Absensi tidak ditemukan | 5 record menunjuk ID siswa tak dikenal | Identifikasi via dialog Audit UID; tandai/perbaiki manual |
| Izin kosong siswa_id | 2 record | Idem |
| SPMB | Tabel SiswaSPMB kosong saat audit | Verifikasi ulang setelah sinkronisasi berjalan; putuskan apakah riwayat SPMB TA lalu perlu diarsip sebelum dibersihkan |

### F.2 RiskRegister (utama)
| ID | Risiko | Tingkat | Mitigasi direkomendasikan |
|---|---|---|---|
| R1 | Data pribadi anak tidak dilindungi RLS | KRITIS | Tambahkan RLS owner-or-admin pada entitas pribadi; baca publik hanya untuk konten publik |
| R2 | Relay WA terbuka | Tinggi | Batasi sendWANotif ke peran admin/tu/kepsek + whitelist tujuan dari data siswa/pegawai |
| R3 | Tunggakan tidak terarsip saat finalisasi | Tinggi | Perluas prosesFinalisasi: pindahkan/tandai tunggakan Keuangan ke ArsipKeuangan |
| R4 | Tidak ada audit log keuangan | Tinggi | Entitas LogKeuangan + pencatatan pada edit/hapus |
| R5 | NIS ganda | Sedang | Rekonsiliasi manual 3 kasus |
| R6 | Non-atomik alur multi-langkah | Sedang | Terapkan pola idempoten + log status + rekonsiliasi (sebagian sudah ada) |
| R7 | Ekspor/backup belum ada | Tinggi | Implementasikan fungsi ekspor per TAHAP E sebelum migrasi tahun ajaran berikutnya |
| R8 | Gap idempotensi SPMB kecil | Rendah | Catat payment_id sebelum create Keuangan, atau tandai dulu lalu isi keuangan_id |

### F.3 CapabilityMatrix (ringkas)
| Kemampuan | Status |
|---|---|
| Identitas permanen lintas modul | PASS |
| Pencocokan identitas ambigu (dengan konfirmasi admin) | PASS |
| Riwayat via UID (11 modul siswa, 2 modul pegawai) | PASS |
| Audit relasi UID | PASS |
| Proteksi data (RLS) | FAIL |
| Audit log keuangan | FAIL |
| Ekspor portabel + manifest | BELUM ADA |
| Uji pemulihan backup | BELUM DIJALANKAN |
| Transaksi atomik platform | TIDAK TERJAMIN (dinyatakan, dimitigasi pola idempoten) |

### F.4 EntityRelationshipMap (inti)
```
PengaturanAplikasi (TA aktif) ──> semua modul (field tahun_ajaran)
Siswa (uid, nis, kelas_id) ── siswa_id ──> Absensi, Nilai, Keuangan, Pelanggaran(+Improvement),
    Improvement, Hapalan, Periodik, Izin, HomeVisit, IuranMuka, CeklisDapo, SiswaMasuk/Keluar,
    BukuTamu(ortu), NotifAbsen3Hari, HistoryStatusSiswa, ArsipNilai/Keuangan
Guru (uid, nuptk) ──> AbsensiPegawai, IzinPegawai, wali_kelas_id (Kelas), pelapor/pencatat, golongan gaji
Kelas ──> Siswa (kelas_id + snapshot nama_kelas)
SiswaSPMB (reg_number, spmb_student_id) ──finalisasi──> Siswa (siswa_id) ; pembayaran[] ──> Keuangan
TarifIuran ──tarif_iuran_id──> Keuangan, BiayaKhusus
ArsipNilai / ArsipKeuangan / HistoryStatusSiswa / DataLulusan ── hasil finalisasi (migrate_log_id ──> LogTahunAjaran)
IuranMuka ──transaksi_setoran_id/penerapan[]──> Keuangan (is_iuran_muka / aplikasi_iuran_muka)
```

### F.5 LegacyProtectionManifest
| Objek lama | Perlindungan aktif |
|---|---|
| Record siswa/pegawai lama (pre-UID) | UID dimigrasi tanpa mengubah NIS/NISN/ID internal; migrasiUid idempoten, resumable |
| Identitas lama (masuk ulang) | Hanya lewat konfirmasi Admin; UID lama dipakai, tidak pernah ditimpa |
| Nama/gelar pegawai berubah | Kelas & dokumen memakai wali_kelas_id + snapshot nama; nama gabung hanya untuk tampilan |
| NIS berubah | UID tetap; riwayat modul tetap tertaut |
| Arsip (is_arsip) | Disembunyikan dari daftar aktif; profil & riwayat tersimpan; dapat dipulihkan |
| Riwayat via ID internal lama | riwayatUid juga mencari modul via siswa_id/nama sehingga riwayat pra-UID tetap tampil |

### F.6 DataLifecycleMap
```
SPMB (pendaftar) ──sync 15 mnt──> SiswaSPMB ──finalisasi (admin)──> Siswa Aktif (uid) ──> hidup 3 TA (kelas 7→9)
   ──> Lulus (DataLulusan, tahun_lulus) / Keluar-Pindah (SiswaKeluar) ──> Arsip (is_arsip) ──> (opsional) hapus permanen admin-only
   riwayat: Absensi/Nilai/Keuangan/Pelanggaran/Improvement/Hapalan/Periodik ──akhir TA──> ArsipNilai/HistoryStatusSiswa
   tunggakan ──akhir TA──> ArsipKeuangan (BELUM untuk SPP — R3)
   uang masuk awal tahun ──> IuranMuka ──penerapan──> Keuangan resmi
   pegawai: Aktif/Cuti ──> Keluar (tanggal_keluar, alasan) ──> Arsip
```

### F.7 AcceptanceTestMatrix (gerbang implementasi)
| Gerbang | Kriteria | Status |
|---|---|---|
| G1 RLS | Semua entitas pribadi beraturan; uji akses lintas pengguna | **NOT RUN — terbuka** |
| G2 WA relay | sendWANotif menolak tanpa peran sah | **NOT RUN — terbuka** |
| G3 Rekonsiliasi keuangan | SPP/Daftar Ulang/PPDB kosong siswa_id = 0 setelah pencocokan | **NOT RUN** |
| G4 Tunggakan terarsip | Finalisasi uji (bukan produksi) memindahkan semua tunggakan | **NOT RUN** |
| G5 Backup terverifikasi | Ekspor + manifest hash cocok; restore uji berhasil | **NOT RUN — prasyarat semua migrasi** |
| G6 Audit log keuangan | Setiap edit/hapus transaksi tercatat | **NOT RUN** |
| G7 NIS unik aktif | 0 duplikat | **FAIL saat ini (3 kasus)** |
| G8 UID lengkap & unik | 0 tanpa uid, 0 duplikat | **PASS** |

**Aturan gerbang: TIDAK ADA migrasi tahun ajaran, cutover, atau koreksi massal sebelum G5 (backup terverifikasi + pemulihan teruji) dan G1–G2 selesai, plus otorisasi tertulis Yayasan/Kepala Sekolah.**

### F.8 MigrationRunbook (rancangan — untuk disetujui, BUKAN untuk dijalankan sekarang)
1. **Pra-syarat:** G1, G2, G5 selesai; salinan manifest backup tersimpan di 2 lokasi; otorisasi aktivasi tertulis.
2. **Beku:** hentikan input (jarang, di luar jam operasional); jalankan ekspor cadangan sesaat; catat checksum.
3. **Eksekusi bertahap per entitas** dengan pola yang sudah terbukti (pola migrasiUid): idempoten, resumable, log per langkah (LogTahunAjaran), limit batch, ulang-aman.
4. **Rekonsiliasi pasca:** hitung ulang checksum dari data sumber vs target (bukan dari record yang baru dibuat — perbaiki kontrol N4); bandingkan jumlah per entitas vs manifest.
5. **Uji terima:** buka riwayat via UID untuk sampel acak (siswa lulus, siswa arsip, pegawai keluar); verifikasi dokumen resmi tetap terbuka.
6. **Rollback:** restore dari backup terverifikasi; log In Progress = sinyal pemulihan manual.
7. **Aktivasi:** perubahan PengaturanAplikasi.tahun_ajaran_aktif dilakukan paling akhir, setelah semua rekonsiliasi PASS.

---

## KESIMPULAN
1. Fondasi identitas permanen (UID, pencocokan dengan konfirmasi admin, riwayat lintas modul, audit relasi) **berfungsi dan terverifikasi di data live** — sesuai tuntutan TAHAP B.
2. Dua kegagalan prioritas mutlak yang harus dibereskan sebelum fitur apa pun berikutnya: **RLS (R1)** dan **relay WA (R2)** — keduanya menyangkut keselamatan data asli dan keamanan akses.
3. Integrasi SPMB dan finalisasi berjalan dengan pola idempoten, tetapi mempunyai 3 celah terbukti: tautan siswa pasca-finalisasi, arsip tunggakan SPP, dan audit log keuangan.
4. Seluruh gerbang migrasi/cutover TERTUTUP sampai ekspor terverifikasi + uji pemulihan dilakukan. Tidak ada data produksi yang diubah selama audit ini.