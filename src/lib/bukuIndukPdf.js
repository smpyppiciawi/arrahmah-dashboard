import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Render daftar elemen halaman dokumen menjadi PDF A4.
// Irisan setinggi satu halaman A4 selalu ditempatkan tepat 297mm penuh;
// hanya irisian terakhir (parsial) yang memakai tinggi proporsionalnya,
// sehingga halaman PDF presisi dan simetris dengan hasil print browser.
export async function exportBukuIndukPdf(pageEls, filename) {
  const PW = 210;
  const PH = 297;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let isFirst = true;

  for (const el of pageEls) {
    // eslint-disable-next-line no-await-in-loop
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const pxPerMm = canvas.width / PW;
    const fullH = Math.round(PH * pxPerMm);
    let offset = 0;
    // Abaikan sisa < 4px (tepi putih pembulatan) agar tidak membuat halaman nyaris kosong
    while (canvas.height - offset > 4) {
      const remaining = canvas.height - offset;
      const isFullSlice = remaining >= fullH;
      const sliceH = Math.min(fullH, remaining);
      const c = document.createElement('canvas');
      c.width = canvas.width;
      c.height = sliceH;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(canvas, 0, -offset);
      if (!isFirst) pdf.addPage();
      // Irisan penuh = tepat satu halaman A4 (297mm); parsial = tinggi proporsional
      pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, PW, isFullSlice ? PH : sliceH / pxPerMm);
      isFirst = false;
      offset += sliceH;
    }
  }

  pdf.save(filename);
}