import { jsPDF } from 'jspdf';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function tanggalIndo() {
  const d = new Date();
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function nilaiTeks(v) {
  return (v === null || v === undefined || v === '') ? '' : String(v);
}

// Singkat nama mapel untuk header legger, mis. "Pendidikan Agama Islam" -> "P. A. Islam"
function singkatMapel(nama) {
  const words = String(nama || '').split(/\s+/).filter(Boolean);
  return words.map((w, i) => (i === words.length - 1 || w.length <= 4) ? w : `${w[0]}.`).join(' ');
}

function kopSekolah(doc, profil, lebar) {
  const nama = (profil?.nama_sekolah || 'YPPI Arrahmah').toUpperCase();
  const alamat = [profil?.alamat_jalan, profil?.desa_kelurahan, profil?.kecamatan, profil?.kab_kota].filter(Boolean).join(', ');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(nama, lebar / 2, 15, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  if (alamat) doc.text(alamat, lebar / 2, 20, { align: 'center' });
  const garisY = alamat ? 23.5 : 19;
  doc.setLineWidth(0.7);
  doc.line(15, garisY, lebar - 15, garisY);
  doc.setLineWidth(0.25);
  doc.line(15, garisY + 1.4, lebar - 15, garisY + 1.4);
}

/* ============ RAPOR PTS (A4 portrait, 1 halaman per siswa) ============ */

function halamanRapor(doc, { profil, siswa, semester, tahunAjaran }) {
  const W = 210;
  kopSekolah(doc, profil, W);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN HASIL BELAJAR (RAPOR)', W / 2, 37, { align: 'center' });
  doc.setFontSize(11);
  doc.text('PENILAIAN TENGAH SEMESTER (PTS)', W / 2, 43.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Semester ${semester} - Tahun Ajaran ${tahunAjaran}`, W / 2, 49.5, { align: 'center' });

  // Blok identitas
  let y = 58;
  doc.setFontSize(10);
  const kiri = [['Nama Siswa', siswa.nama], ['NIS', siswa.nis || '-'], ['Kelas', siswa.nama_kelas || '-']];
  const kanan = [['Wali Kelas', siswa.wali_kelas || '-'], ['Semester', semester], ['Tahun Ajaran', tahunAjaran]];
  kiri.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, 25, y);
    doc.text(':', 60, y);
    doc.setFont('helvetica', 'bold');
    doc.text(String(val), 63, y);
    y += 6.5;
  });
  y = 58;
  kanan.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, 115, y);
    doc.text(':', 152, y);
    doc.text(String(val), 155, y);
    y += 6.5;
  });

  // Tabel nilai
  const items = siswa.mapelNilai || [];
  const headerTop = 82;
  const avail = 235 - (headerTop + 8);
  const rowH = items.length ? Math.min(7.5, Math.max(5, avail / items.length)) : 7.5;
  const tableBottom = headerTop + 8 + rowH * items.length;

  doc.setFillColor(241, 245, 249);
  doc.rect(25, headerTop, 160, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('No', 30, headerTop + 5.3, { align: 'center' });
  doc.text('Mata Pelajaran', 70, headerTop + 5.3, { align: 'center' });
  doc.text('Nilai', 115, headerTop + 5.3, { align: 'center' });
  doc.text('KKM', 135, headerTop + 5.3, { align: 'center' });
  doc.text('Ketuntasan', 165, headerTop + 5.3, { align: 'center' });

  let ry = headerTop + 8;
  doc.setFont('helvetica', 'normal');
  items.forEach((m, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(25, ry, 160, rowH, 'F');
    }
    const cy = ry + rowH / 2 + 1;
    doc.text(String(i + 1), 30, cy, { align: 'center' });
    doc.text(String(m.mapel || ''), 28, cy);
    doc.text(nilaiTeks(m.nilai) || '-', 115, cy, { align: 'center' });
    doc.text(nilaiTeks(m.kkm), 135, cy, { align: 'center' });
    doc.text(m.status || '-', 165, cy, { align: 'center' });
    ry += rowH;
  });

  // Garis tabel
  doc.setDrawColor(120);
  doc.rect(25, headerTop, 160, tableBottom - headerTop);
  [35, 105, 125, 145].forEach(x => doc.line(x, headerTop, x, tableBottom));
  let ly = headerTop + 8;
  for (let i = 0; i < items.length; i++) {
    ly += rowH;
    doc.line(25, ly, 185, ly);
  }
  doc.line(25, headerTop + 8, 185, headerTop + 8);

  // Rata-rata
  const nilaiAda = items.map(m => m.nilai).filter(v => v !== null && v !== undefined);
  if (nilaiAda.length) {
    const avg = nilaiAda.reduce((a, b) => a + Number(b), 0) / nilaiAda.length;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`Rata-rata Nilai PTS : ${Math.round(avg * 10) / 10}`, 25, tableBottom + 7);
  }

  // Tanda tangan
  const sigY = 248;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${profil?.kab_kota || '................'}, ${tanggalIndo()}`, 185, sigY, { align: 'right' });
  doc.text('Orang Tua/Wali,', 45, sigY + 8, { align: 'center' });
  doc.text('( ______________ )', 45, sigY + 28, { align: 'center' });
  doc.text('Kepala Sekolah,', 105, sigY + 8, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(profil?.nama_kepala_sekolah || '( ______________ )', 105, sigY + 28, { align: 'center' });
  if (profil?.nip_kepala_sekolah) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`NIP. ${profil.nip_kepala_sekolah}`, 105, sigY + 33.5, { align: 'center' });
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Wali Kelas,', 165, sigY + 8, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(siswa.wali_kelas || '( ______________ )', 165, sigY + 28, { align: 'center' });
}

export function buatRaporPtsPdf({ profil, siswaList, semester, tahunAjaran }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  siswaList.forEach((s, idx) => {
    if (idx > 0) doc.addPage();
    halamanRapor(doc, { profil, siswa: s, semester, tahunAjaran });
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

/* ============ LEGGER PTS (A4 landscape, grid siswa x mapel) ============ */

const LEG_M = 12;          // margin kiri
const LEG_NO_W = 8;
const LEG_NIS_W = 20;
const LEG_NAMA_W = 44;
const LEG_HEADER_H = 26;   // tinggi header utk label mapel diputar
const LEG_ROW_H = 6.3;

function leggerHeader(doc, { profil, kelas, semester, tahunAjaran, topY }) {
  const W = 297;
  kopSekolah(doc, profil, W);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`LEGGER NILAI - PENILAIAN TENGAH SEMESTER (PTS) - KELAS ${kelas.nama_kelas || '-'}`, W / 2, topY - 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Semester ${semester} - Tahun Ajaran ${tahunAjaran} - Wali Kelas: ${kelas.wali_kelas || '-'} - Jumlah Siswa: ${kelas.siswaList.length}`,
    W / 2, topY - 0.5, { align: 'center' }
  );
}

function gambarHeaderTabel(doc, { mapels, topY }) {
  const areaX = LEG_M + LEG_NO_W + LEG_NIS_W + LEG_NAMA_W;
  const areaW = (297 - LEG_M) - areaX;
  const colW = mapels.length ? Math.min(13, areaW / mapels.length) : 0;
  const tableRight = areaX + colW * mapels.length;
  const bottom = topY + LEG_HEADER_H;

  doc.setFillColor(241, 245, 249);
  doc.rect(LEG_M, topY, tableRight - LEG_M, LEG_HEADER_H, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('No', LEG_M + LEG_NO_W / 2, topY + LEG_HEADER_H / 2 + 1, { align: 'center' });
  doc.text('NIS', LEG_M + LEG_NO_W + LEG_NIS_W / 2, topY + LEG_HEADER_H / 2 + 1, { align: 'center' });
  doc.text('Nama Siswa', LEG_M + LEG_NO_W + LEG_NIS_W + LEG_NAMA_W / 2, topY + LEG_HEADER_H / 2 + 1, { align: 'center' });

  doc.setFontSize(6.5);
  mapels.forEach((m, i) => {
    const x = areaX + i * colW;
    doc.text(singkatMapel(m).slice(0, 18), x + colW - 1.2, bottom - 1.5, { angle: 90 });
  });

  // garis
  doc.setDrawColor(120);
  doc.rect(LEG_M, topY, tableRight - LEG_M, LEG_HEADER_H);
  let vx = LEG_M + LEG_NO_W;
  doc.line(vx, topY, vx, bottom);
  vx += LEG_NIS_W;
  doc.line(vx, topY, vx, bottom);
  vx += LEG_NAMA_W;
  doc.line(vx, topY, vx, bottom);
  for (let i = 1; i < mapels.length; i++) {
    doc.line(areaX + i * colW, topY, areaX + i * colW, bottom);
  }

  return { areaX, colW, tableRight, bottom };
}

function gambarBaris(doc, { s, no, y, mapels, areaX, colW, tableRight }) {
  if (no % 2 === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(LEG_M, y, tableRight - LEG_M, LEG_ROW_H, 'F');
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const cy = y + LEG_ROW_H / 2 + 1;
  doc.text(String(no), LEG_M + LEG_NO_W / 2, cy, { align: 'center' });
  doc.text(nilaiTeks(s.nis), LEG_M + LEG_NO_W + LEG_NIS_W / 2, cy, { align: 'center' });
  doc.text(String(s.nama || '').slice(0, 30), LEG_M + LEG_NO_W + LEG_NIS_W + 1.5, cy);
  mapels.forEach((m, i) => {
    const v = s.nilaiByMapel?.[m];
    doc.text(nilaiTeks(v), areaX + i * colW + colW / 2, cy, { align: 'center' });
  });
}

function gambarKelasLegger(doc, { profil, kelas, mapels, semester, tahunAjaran, mulaiHalaman }) {
  const topY = 38;
  const bottomLimit = 198;
  const perPage = Math.max(1, Math.floor((bottomLimit - (topY + LEG_HEADER_H)) / LEG_ROW_H));

  let hal = 0;
  let rowIdx = 0;
  const rows = kelas.siswaList;
  while (rowIdx < rows.length || hal === 0) {
    if (hal > 0) doc.addPage();
    leggerHeader(doc, { profil, kelas, semester, tahunAjaran, topY });
    const { areaX, colW, tableRight } = gambarHeaderTabel(doc, { mapels, topY });
    let y = topY + LEG_HEADER_H;
    let halCount = 0;
    while (rowIdx < rows.length && halCount < perPage) {
      gambarBaris(doc, { s: rows[rowIdx], no: rowIdx + 1, y, mapels, areaX, colW, tableRight });
      doc.setDrawColor(120);
      doc.line(LEG_M, y + LEG_ROW_H, tableRight, y + LEG_ROW_H);
      y += LEG_ROW_H;
      rowIdx++;
      halCount++;
    }
    // garis vertikal tabel
    doc.setDrawColor(120);
    let vx = LEG_M + LEG_NO_W;
    doc.line(vx, topY, vx, y);
    vx += LEG_NIS_W;
    doc.line(vx, topY, vx, y);
    vx += LEG_NAMA_W;
    doc.line(vx, topY, vx, y);
    for (let i = 1; i < mapels.length; i++) {
      doc.line(areaX + i * colW, topY, areaX + i * colW, y);
    }
    doc.rect(LEG_M, topY, tableRight - LEG_M, y - topY);
    hal++;
    if (rows.length === 0) break;
  }
  if (!rows.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Belum ada data nilai PTS untuk kelas ini.', 297 / 2, topY + LEG_HEADER_H + 10, { align: 'center' });
  }
}

export function buatLeggerPtsPdf({ profil, kelasList, mapels, semester, tahunAjaran }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  kelasList.forEach((kelas, idx) => {
    if (idx > 0) doc.addPage();
    gambarKelasLegger(doc, { profil, kelas, mapels, semester, tahunAjaran, mulaiHalaman: idx === 0 });
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