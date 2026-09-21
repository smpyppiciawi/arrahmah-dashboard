import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Render daftar elemen halaman dokumen menjadi PDF A4.
// Halaman yang lebih tinggi dari A4 otomatis diiris ke beberapa halaman PDF.
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
    const sliceH = Math.round(PH * pxPerMm);
    let offset = 0;
    while (offset < canvas.height - 1) {
      const h = Math.min(sliceH, canvas.height - offset);
      const c = document.createElement('canvas');
      c.width = canvas.width;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(canvas, 0, -offset);
      if (!isFirst) pdf.addPage();
      pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, PW, h / pxPerMm);
      isFirst = false;
      offset += h;
    }
  }

  pdf.save(filename);
}