import { jsPDF } from 'jspdf';
import { terbilang } from '@/lib/terbilang';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** '2026-09-24' -> '24 September 2026' */
export function formatTanggalIndo(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d} ${BULAN[m - 1]} ${y}`;
}

function nilaiTeks(v) {
  return (v === null || v === undefined || v === '') ? '' : String(v);
}

// Nilai huruf (terbilang) untuk kolom "Huruf" pada rapor, mis. 85 -> "Delapan Puluh Lima"
function nilaiHuruf(v) {
  if (v === null || v === undefined || v === '') return '';
  return terbilang(Math.round(Number(v))).replace(/\s?rupiah$/i, '');
}

// Singkat nama mapel untuk fallback kode legger
function singkatMapel(nama) {
  const words = String(nama || '').split(/\s+/).filter(Boolean);
  return words.map((w, i) => (i === words.length - 1 || w.length <= 4) ? w : `${w[0]}.`).join(' ');
}

/* ===== Kop surat — susunan baris dihitung dinamis dari Profil Sekolah ===== */

function kopLayout(profil) {
  const lines = [];
  if (profil?.nama_yayasan) lines.push({ text: profil.nama_yayasan.toUpperCase(), size: 9, bold: true });
  lines.push({ text: (profil?.nama_sekolah || 'YPPI Arrahmah').toUpperCase(), size: 13, bold: true });
  const idLine = [profil?.nss ? `NSM/NSS: ${profil.nss}` : null, profil?.npsn ? `NPSN: ${profil.npsn}` : null].filter(Boolean).join('  |  ');
  if (idLine) lines.push({ text: idLine, size: 8.5 });
  const alamat = [profil?.alamat_jalan, profil?.desa_kelurahan, profil?.kecamatan, profil?.kab_kota, profil?.kode_pos].filter(Boolean).join(', ');
  if (alamat) lines.push({ text: alamat, size: 8.5 });
  const kontak = [profil?.telepon ? `Telp. ${profil.telepon}` : null, profil?.email].filter(Boolean).join('  |  ');
  if (kontak) lines.push({ text: kontak, size: 8.5 });
  let y = 15;
  const pos = lines.map((l, i) => {
    if (i > 0) y += (lines[i - 1].size >= 13 ? 5.5 : 4.5);
    return { ...l, y };
  });
  return { pos, bottom: y + 5 };
}

function kopSekolah(doc, profil, lebar) {
  const { pos, bottom } = kopLayout(profil);
  pos.forEach(l => {
    doc.setFont('helvetica', l.bold ? 'bold' : 'normal');
    doc.setFontSize(l.size);
    doc.text(l.text, lebar / 2, l.y, { align: 'center' });
  });
  doc.setLineWidth(0.7);
  doc.line(15, bottom, lebar - 15, bottom);
  doc.setLineWidth(0.25);
  doc.line(15, bottom + 1.4, lebar - 15, bottom + 1.4);
  return bottom + 1.4;
}

/* ================= RAPOR / LHBS (A4 portrait, 1 halaman per siswa) ================= */
/* Format mengikuti template: LAPORAN HASIL BELAJAR SISWA (LHBS) */

function halamanRapor(doc, { profil, siswa, semesterLabel, tahunAjaran, tanggalRapor, rows }) {
  const W = 210;
  const kopBottom = kopSekolah(doc, profil, W);
  doc.setTextColor(30, 41, 59);

  // Judul (posisi mengikuti tinggi kop)
  const t0 = kopBottom + 11;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('LAPORAN HASIL BELAJAR SISWA ( LHBS )', W / 2, t0, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`SUMATIF TENGAH SEMESTER ${String(semesterLabel).toUpperCase()}`, W / 2, t0 + 6, { align: 'center' });
  doc.setFontSize(10.5);
  doc.text(`TAHUN PELAJARAN ${tahunAjaran}`, W / 2, t0 + 11.5, { align: 'center' });

  // Blok identitas: NIS / Nama Siswa (kiri), Kelas / Semester (kanan)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let iy = t0 + 20;
  [['NIS', siswa.nis || '-'], ['Nama Siswa', siswa.nama || '-']].forEach(([l, v]) => {
    doc.text(l, 25, iy); doc.text(':', 62, iy); doc.text(String(v), 65, iy); iy += 6;
  });
  iy = t0 + 20;
  [['Kelas', siswa.nama_kelas || '-'], ['Semester', semesterLabel]].forEach(([l, v]) => {
    doc.text(l, 112, iy); doc.text(':', 152, iy); doc.text(String(v), 155, iy); iy += 6;
  });

  // Geometri tabel
  const xNo = 25, wNo = 10, xMapel = 35, wMapel = 60, xKkm = 95, wKkm = 14;
  const xAngka = 109, wAngka = 16, xHuruf = 125, wHuruf = 34, xKet = 159, wKet = 26, xRight = 185;
  const headerTop = t0 + 35.5;
  const hH1 = 7, hH2 = 5.5, hGroup = 6, hFooter = 7.5;

  const groups = [
    { huruf: 'A', judul: 'MUATAN NASIONAL', list: rows.filter(r => r.kelompok !== 'Mulok') },
    { huruf: 'B', judul: 'MUATAN LOKAL (MULOK)', list: rows.filter(r => r.kelompok === 'Mulok') },
  ].filter(g => g.list.length);
  const nData = groups.reduce((a, g) => a + g.list.length, 0);
  const reserved = headerTop + hH1 + hH2 + groups.length * hGroup + 3 * hFooter;
  const maxTableBottom = 246;
  const rowH = nData ? Math.min(7.5, Math.max(5, (maxTableBottom - reserved) / nData)) : 7.5;

  const dataByLabel = siswa.rowValues || {};

  // Header tabel
  doc.setFillColor(241, 245, 249);
  doc.rect(xNo, headerTop, xRight - xNo, hH1 + hH2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const hcY = headerTop + (hH1 + hH2) / 2 + 1;
  doc.text('No', xNo + wNo / 2, hcY, { align: 'center' });
  doc.text('Mata Pelajaran', xMapel + wMapel / 2, hcY, { align: 'center' });
  doc.text('KKM', xKkm + wKkm / 2, hcY, { align: 'center' });
  doc.text('Nilai', xAngka + (wAngka + wHuruf) / 2, headerTop + hH1 / 2 + 1, { align: 'center' });
  doc.text('Angka', xAngka + wAngka / 2, headerTop + hH1 + hH2 / 2 + 1, { align: 'center' });
  doc.text('Huruf', xHuruf + wHuruf / 2, headerTop + hH1 + hH2 / 2 + 1, { align: 'center' });
  doc.text('Keterangan', xKet + wKet / 2, hcY, { align: 'center' });

  let y = headerTop + hH1 + hH2;
  // Grup + baris mapel (nomor per grup, reset tiap grup)
  groups.forEach(group => {
    doc.setFillColor(248, 250, 252);
    doc.rect(xNo, y, xRight - xNo, hGroup, 'F');
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(8.5);
    const cy = y + hGroup / 2 + 1;
    doc.text(group.huruf, xNo + wNo / 2, cy, { align: 'center' });
    doc.text(group.judul, xMapel + 2, cy);
    y += hGroup;
    let no = 1;
    group.list.forEach(row => {
      const d = dataByLabel[row.label] || {};
      const cy2 = y + rowH / 2 + 1;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(String(no), xNo + wNo / 2, cy2, { align: 'center' });
      const namaMapel = String(row.label || '');
      doc.setFontSize(namaMapel.length > 30 ? 7 : 8.5);
      doc.text(namaMapel, xMapel + 2, cy2);
      doc.setFontSize(8.5);
      doc.text(nilaiTeks(d.nilai) || '-', xAngka + wAngka / 2, cy2, { align: 'center' });
      doc.text(nilaiHuruf(d.nilai), xHuruf + 2, cy2);
      doc.setFontSize(7.5);
      doc.text(d.keterangan || '-', xKet + wKet / 2, cy2, { align: 'center' });
      no += 1;
      y += rowH;
    });
  });
  const dataBottom = y;

  // Baris footer: Jumlah Nilai + Predikat, Rata-Rata, Peringkat
  const footer = [
    { label: 'Jumlah Nilai', angka: siswa.jumlah != null ? String(siswa.jumlah) : '-', huruf: 'Predikat', ket: siswa.predikat || '-' },
    { label: 'Rata - Rata Nilai', angka: siswa.rata != null ? String(siswa.rata) : '-', huruf: '', ket: '' },
    { label: 'Peringkat Ke', angka: siswa.peringkat != null ? String(siswa.peringkat) : '-', huruf: 'Dari sebanyak', ket: siswa.total_siswa != null ? String(siswa.total_siswa) : '-' },
  ];
  doc.setFontSize(8.5);
  footer.forEach(f => {
    const cy = y + hFooter / 2 + 1;
    doc.setFont('helvetica', 'bold');
    doc.text(f.label, xNo + 3, cy);
    doc.setFont('helvetica', 'normal');
    doc.text(f.angka, xAngka + wAngka / 2, cy, { align: 'center' });
    doc.text(f.huruf, xHuruf + 2, cy);
    doc.text(f.ket, xKet + wKet / 2, cy, { align: 'center' });
    y += hFooter;
  });
  const tableBottom = y;

  // Garis tabel
  doc.setDrawColor(120);
  doc.rect(xNo, headerTop, xRight - xNo, tableBottom - headerTop);
  doc.line(xAngka, headerTop + hH1, xKet, headerTop + hH1); // bawah baris "Nilai" (area Angka-Huruf saja)
  [xMapel, xKkm].forEach(x => doc.line(x, headerTop, x, dataBottom));
  [xAngka, xHuruf, xKet].forEach(x => doc.line(x, headerTop, x, tableBottom));
  let ly = headerTop + hH1 + hH2;
  groups.forEach(group => {
    doc.line(xNo, ly, xRight, ly);
    ly += hGroup;
    group.list.forEach(() => { ly += rowH; doc.line(xNo, ly, xRight, ly); });
  });
  doc.line(xNo, dataBottom, xRight, dataBottom);
  footer.forEach(() => { ly += hFooter; doc.line(xNo, ly, xRight, ly); });

  // Blok tanda tangan: Wali Murid | Wali Kelas | Kepala Sekolah
  const sigTop = Math.max(228, tableBottom + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Ciawi, ${tanggalRapor || '.....................'}`, 160, sigTop, { align: 'center' });
  const labelY = sigTop + 7;
  doc.text('Wali Murid', 55, labelY, { align: 'center' });
  doc.text('Wali Kelas', 105, labelY, { align: 'center' });
  doc.text('Kepala Sekolah,', 160, labelY, { align: 'center' });
  const nameY = sigTop + 30;
  doc.text('( __________________ )', 55, nameY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(siswa.wali_kelas || '( ______________ )', 105, nameY, { align: 'center' });
  doc.text('Hadi Teguh Raharjo, S.Pd.', 160, nameY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (siswa.nuptk_wali) doc.text(`NUPTK. ${siswa.nuptk_wali}`, 105, nameY + 5.5, { align: 'center' });
  doc.text('NRKS. 19023L0720205231096408', 160, nameY + 5.5, { align: 'center' });
}

export function buatRaporPtsPdf({ profil, siswaList, semesterLabel, tahunAjaran, tanggalRapor, rows }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  siswaList.forEach((s, idx) => {
    if (idx > 0) doc.addPage();
    halamanRapor(doc, { profil, siswa: s, semesterLabel, tahunAjaran, tanggalRapor, rows });
  });
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Halaman ${p} dari ${total}`, W / 2, 291, { align: 'center' });
    doc.setTextColor(30, 41, 59);
  }
  return doc;
}

/* ============ LEGGER PTS (A4 landscape, kolom kode mapel hasil pemetaan) ============ */

const LG = { m: 12, noW: 8, nisW: 20, namaW: 42, jmlW: 11, rataW: 12, rankW: 10, ketW: 16, rowH: 6.3, h1: 6 };

function geometriLegger(rows) {
  const areaX = LG.m + LG.noW + LG.nisW + LG.namaW;
  const right = 297 - LG.m;
  const areaW = right - areaX - (LG.jmlW + LG.rataW + LG.rankW + LG.ketW);
  const colW = rows.length ? areaW / rows.length : 0;
  const jmlX = areaX + areaW;
  const rataX = jmlX + LG.jmlW;
  const rankX = rataX + LG.rataW;
  const ketX = rankX + LG.rankW;
  return { areaX, areaW, colW, jmlX, rataX, rankX, ketX, right };
}

function kodeLegger(row) {
  return row.kode || singkatMapel(row.label).slice(0, 6);
}

function hitungRank(siswaList) {
  const sorted = [...siswaList].sort((a, b) => (b.rata ?? -1) - (a.rata ?? -1));
  const map = new Map();
  let lastRata = null, lastRank = 0;
  sorted.forEach((s, i) => {
    const r = (s.rata === lastRata) ? lastRank : i + 1;
    map.set(s, r);
    lastRata = s.rata;
    lastRank = r;
  });
  return map;
}

function gambarHeaderLegger(doc, { profil, kelas, semesterLabel, tahunAjaran, lanjutan, titleY, infoY }) {
  const W = 297;
  kopSekolah(doc, profil, W);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(
    `DAFTAR NILAI SUMATIF TENGAH SEMESTER ${String(semesterLabel).toUpperCase()} T.P. ${tahunAjaran}${lanjutan ? ' (LANJUTAN)' : ''}`,
    W / 2, titleY, { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  let iy = infoY;
  [['Kelas', kelas.nama_kelas || '-'], ['Wali Kelas', kelas.wali_kelas || '-']].forEach(([l, v]) => {
    doc.text(l, 15, iy); doc.text(':', 45, iy); doc.text(String(v), 48, iy); iy += 5.5;
  });
  iy = infoY;
  [['Semester', semesterLabel], ['Tahun Pelajaran', tahunAjaran]].forEach(([l, v]) => {
    doc.text(l, 165, iy); doc.text(':', 207, iy); doc.text(String(v), 210, iy); iy += 5.5;
  });
}

function gambarTabelHeaderLegger(doc, { rows, g, topY }) {
  const codes = rows.map(r => {
    const kode = kodeLegger(r);
    return { kode, rotate: kode.length * 1.15 > g.colW - 1.5 };
  });
  const h2 = Math.max(7, ...codes.map(c => (c.rotate ? c.kode.length * 1.15 + 2.5 : 7)), 7);
  const headerBottom = topY + LG.h1 + h2;

  doc.setFillColor(241, 245, 249);
  doc.rect(LG.m, topY, g.right - LG.m, LG.h1 + h2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const hcY = topY + (LG.h1 + h2) / 2 + 1;
  doc.text('NO', LG.m + LG.noW / 2, hcY, { align: 'center' });
  doc.text('NIS', LG.m + LG.noW + LG.nisW / 2, hcY, { align: 'center' });
  doc.text('NAMA SISWA', LG.m + LG.noW + LG.nisW + LG.namaW / 2, hcY, { align: 'center' });
  doc.text('MATA PELAJARAN', g.areaX + g.areaW / 2, topY + LG.h1 / 2 + 1, { align: 'center' });
  doc.text('JML', g.jmlX + LG.jmlW / 2, hcY, { align: 'center' });
  doc.text('RATA2', g.rataX + LG.rataW / 2, hcY, { align: 'center' });
  doc.text('RANK', g.rankX + LG.rankW / 2, hcY, { align: 'center' });
  doc.text('KET', g.ketX + LG.ketW / 2, hcY, { align: 'center' });
  // Baris kode mapel
  rows.forEach((r, i) => {
    const x = g.areaX + i * g.colW;
    const c = codes[i];
    if (c.rotate) {
      doc.setFontSize(6);
      doc.text(c.kode, x + g.colW - 1.2, headerBottom - 1.2, { angle: 90 });
    } else {
      doc.setFontSize(6.5);
      doc.text(c.kode, x + g.colW / 2, topY + LG.h1 + h2 / 2 + 1, { align: 'center' });
    }
  });
  return { headerBottom, h2 };
}

function gambarBarisLegger(doc, { s, no, y, rows, g, rank }) {
  const cy = y + LG.rowH / 2 + 1;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(String(no), LG.m + LG.noW / 2, cy, { align: 'center' });
  doc.text(nilaiTeks(s.nis), LG.m + LG.noW + LG.nisW / 2, cy, { align: 'center' });
  doc.text(String(s.nama || '').slice(0, 30), LG.m + LG.noW + LG.nisW + 1.5, cy);
  rows.forEach((r, i) => {
    const v = s.nilaiByRow?.[r.label];
    doc.text(nilaiTeks(v), g.areaX + i * g.colW + g.colW / 2, cy, { align: 'center' });
  });
  doc.text(s.jumlah != null ? String(s.jumlah) : '', g.jmlX + LG.jmlW / 2, cy, { align: 'center' });
  doc.text(s.rata != null ? String(s.rata) : '', g.rataX + LG.rataW / 2, cy, { align: 'center' });
  doc.text(rank != null ? String(rank) : '', g.rankX + LG.rankW / 2, cy, { align: 'center' });
}

function gambarKelasLegger(doc, { profil, kelas, rows, semesterLabel, tahunAjaran }) {
  const g = geometriLegger(rows);
  // Posisi judul/info/tabel mengikuti tinggi kop (kop digambar tiap halaman sama)
  const kopBottom = kopLayout(profil).bottom + 1.4;
  const titleY = kopBottom + 7;
  const infoY = kopBottom + 13.5;
  const topY = kopBottom + 27;
  const bottomLimit = 199;
  const rankMap = hitungRank(kelas.siswaList);
  const list = kelas.siswaList;
  // h2 bervariasi, hitung dulu untuk kapasitas halaman
  const codes = rows.map(r => ({ kode: kodeLegger(r), rotate: kodeLegger(r).length * 1.15 > g.colW - 1.5 }));
  const h2 = Math.max(7, ...codes.map(c => (c.rotate ? c.kode.length * 1.15 + 2.5 : 7)), 7);
  const perPage = Math.max(1, Math.floor((bottomLimit - (topY + LG.h1 + h2)) / LG.rowH));

  let hal = 0, rowIdx = 0;
  while (rowIdx < list.length || hal === 0) {
    if (hal > 0) doc.addPage();
    gambarHeaderLegger(doc, { profil, kelas, semesterLabel, tahunAjaran, lanjutan: hal > 0, titleY, infoY });
    const { headerBottom } = gambarTabelHeaderLegger(doc, { rows, g, topY });
    let y = headerBottom;
    let halCount = 0;
    while (rowIdx < list.length && halCount < perPage) {
      if (rowIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(LG.m, y, g.right - LG.m, LG.rowH, 'F');
      }
      gambarBarisLegger(doc, { s: list[rowIdx], no: rowIdx + 1, y, rows, g, rank: rankMap.get(list[rowIdx]) });
      y += LG.rowH;
      rowIdx++; halCount++;
    }
    // Garis
    doc.setDrawColor(120);
    let vx = LG.m + LG.noW;
    doc.line(vx, topY, vx, y); vx += LG.nisW;
    doc.line(vx, topY, vx, y); vx += LG.namaW;
    doc.line(vx, topY, vx, y);
    for (let i = 1; i < rows.length; i++) doc.line(g.areaX + i * g.colW, topY, g.areaX + i * g.colW, y);
    doc.line(g.jmlX, topY, g.jmlX, y);
    doc.line(g.rataX, topY, g.rataX, y);
    doc.line(g.rankX, topY, g.rankX, y);
    doc.line(g.ketX, topY, g.ketX, y);
    doc.line(LG.m, topY + LG.h1 + h2, g.right, topY + LG.h1 + h2);
    let ly = headerBottom;
    for (let i = 0; i < halCount; i++) { ly += LG.rowH; doc.line(LG.m, ly, g.right, ly); }
    doc.rect(LG.m, topY, g.right - LG.m, y - topY);
    hal++;
    if (!list.length) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('Belum ada data nilai PTS untuk kelas ini.', 297 / 2, headerBottom + 10, { align: 'center' });
      break;
    }
  }
}

export function buatLeggerPtsPdf({ profil, kelasList, rows, semesterLabel, tahunAjaran }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  kelasList.forEach((kelas, idx) => {
    if (idx > 0) doc.addPage();
    gambarKelasLegger(doc, { profil, kelas, rows, semesterLabel, tahunAjaran });
  });
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Halaman ${p} dari ${total}`, 297 / 2, 205.5, { align: 'center' });
    doc.setTextColor(30, 41, 59);
  }
  return doc;
}