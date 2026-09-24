// Utilitas cetak Laporan Tunggakan (Menu Bendahara → Laporan → Tunggakan Siswa)
// Dipakai bersama oleh Popup Detail Siswa & Popup Pilihan Cetak.

const fmt = (v) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
}).format(v || 0);

const statusColor = (st) => st === 'Lunas' ? '#15803d' : st === 'Cicilan' ? '#b45309' : '#b91c1c';

const BASE_STYLES = `
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 24px; color: #111827; }
  h2 { text-align: center; margin: 0 0 4px; letter-spacing: 1px; }
  .sub { text-align: center; margin: 0 0 10px; font-size: 11px; color: #374151; }
  .info { margin: 0 0 12px; font-size: 10px; color: #4b5563; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #475569; padding: 4px 6px; vertical-align: top; }
  th { background: #e2e8f0; font-size: 10px; text-transform: uppercase; }
  .right { text-align: right; }
  .red { color: #b91c1c; font-weight: 600; }
  .green { color: #15803d; }
  .total td { font-weight: bold; background: #f1f5f9; }
  .noborder, .noborder td { border: none; padding: 1px 4px; }
  h3.section { margin: 20px 0 2px; border-bottom: 2px solid #111827; padding-bottom: 3px; text-transform: uppercase; font-size: 12px; }
  .block { page-break-inside: avoid; margin-bottom: 10px; }
  .foot { margin-top: 24px; text-align: right; font-size: 10px; color: #6b7280; }
`;

function openPrintWindow(title, body) {
  const w = window.open('', '', 'width=900,height=650');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>${BASE_STYLES}</style></head><body>${body}<p class="foot">Dicetak: ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p></body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); w.close(); }, 250);
}

/** Blok detail satu siswa (identitas + tabel per jenis iuran) */
export function siswaDetailBlock(s) {
  const itemRows = (s.status_items || []).map(it => `
    <tr>
      <td>${it.nama}${it.gratis ? ' (Gratis)' : ''}</td>
      <td>${it.periode || '-'}</td>
      <td class="right">${fmt(it.tagihan)}</td>
      <td class="right green">${fmt(it.dibayar)}</td>
      <td class="right ${it.sisa_setahun > 0 ? 'red' : 'green'}">${fmt(it.sisa_setahun)}</td>
      <td style="color:${statusColor(it.status)}; font-weight:bold">${it.status}</td>
    </tr>`).join('');
  return `
    <div class="block">
      <table class="noborder">
        <tr>
          <td width="90">Nama</td><td>: <b>${s.nama}</b></td>
          <td width="70">NIS</td><td>: ${s.nis}</td>
          <td width="60">Kelas</td><td>: ${s.nama_kelas}</td>
        </tr>
      </table>
      <table>
        <thead>
          <tr><th>Jenis Iuran</th><th>Periode</th><th>Tagihan</th><th>Sudah Dibayar</th><th>Sisa Bayar</th><th>Status</th></tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr class="total">
            <td colspan="3">TOTAL</td>
            <td class="right">${fmt(s.total_dibayar)}</td>
            <td class="right ${s.sisa_setahun > 0 ? 'red' : 'green'}">${fmt(s.sisa_setahun)}</td>
            <td style="color:${statusColor(s.status_keuangan)}">${s.status_keuangan}</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

/** Tabel ringkas daftar siswa */
function ringkasTable(list) {
  return `
    <table>
      <thead>
        <tr><th>No</th><th>NIS</th><th>Nama</th><th>Kelas</th><th>Total Dibayar</th><th>Sisa (Jatuh Tempo)</th><th>Sisa (Setahun)</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${list.map((s, i) => `
          <tr>
            <td>${i + 1}</td><td>${s.nis}</td><td>${s.nama}</td><td>${s.nama_kelas}</td>
            <td class="right">${fmt(s.total_dibayar)}</td>
            <td class="right ${s.sisa_jatuh_tempo > 0 ? 'red' : ''}">${fmt(s.sisa_jatuh_tempo)}</td>
            <td class="right ${s.sisa_setahun > 0 ? 'red' : ''}">${fmt(s.sisa_setahun)}</td>
            <td style="color:${statusColor(s.status_keuangan)}; font-weight:bold">${s.status_keuangan}</td>
          </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr class="total">
          <td colspan="4">TOTAL (${list.length} siswa)</td>
          <td class="right">${fmt(list.reduce((a, s) => a + (s.total_dibayar || 0), 0))}</td>
          <td class="right">${fmt(list.reduce((a, s) => a + (s.sisa_jatuh_tempo || 0), 0))}</td>
          <td class="right">${fmt(list.reduce((a, s) => a + (s.sisa_setahun || 0), 0))}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>`;
}

/** Cetak data satu siswa (dari popup detail) */
export function printSiswaStatement(s, taLabel) {
  if (!s) return;
  openPrintWindow(`Tunggakan ${s.nama || 'Siswa'}`, `
    <h2>DATA PEMBAYARAN &amp; TUNGGAKAN SISWA</h2>
    <p class="sub">Tahun Ajaran: ${taLabel || '-'}</p>
    ${siswaDetailBlock(s)}
    <p class="info" style="margin-top:10px">
      Sisa Bayar (Jatuh Tempo): <b>${fmt(s.sisa_jatuh_tempo)}</b> ·
      Sisa Bayar (Setahun): <b>${fmt(s.sisa_setahun)}</b> ·
      Status: <b style="color:${statusColor(s.status_keuangan)}">${s.status_keuangan}</b>
    </p>`);
}

/**
 * Cetak laporan tunggakan sesuai mode pilihan.
 * mode: 'global' | 'kelas' | 'siswa' | 'iuran' | 'status'
 * pick: pilihan spesifik per mode (id siswa / nama kelas / nama iuran), '' = semua
 */
export function printTunggakanReport({ rows = [], taLabel = '', kelasLabel = 'Semua Kelas', iuranLabel = 'Semua Iuran', mode = 'global', pick = '', onlySisa = false, showDetail = false }) {
  const list = onlySisa ? rows.filter(s => (s.sisa_setahun || 0) > 0) : [...rows];
  const detailBlocks = (l) => showDetail ? `<h3 class="section">Detail per Jenis Iuran</h3>${l.map(siswaDetailBlock).join('')}` : '';
  let title = 'LAPORAN TUNGGAKAN IURAN SISWA';
  let body = '';

  if (mode === 'kelas') {
    title += ' — PER KELAS';
    const kelasNames = [...new Set(list.map(s => s.nama_kelas).filter(Boolean))].sort();
    (pick ? kelasNames.filter(k => k === pick) : kelasNames).forEach(k => {
      const perKelas = list.filter(s => s.nama_kelas === k);
      if (perKelas.length === 0) return;
      body += `<h3 class="section">Kelas ${k} (${perKelas.length} siswa)</h3>${ringkasTable(perKelas)}${detailBlocks(perKelas)}`;
    });
  } else if (mode === 'siswa') {
    title += ' — PER SISWA';
    const target = pick ? list.filter(s => s.id === pick) : list;
    body = target.map(siswaDetailBlock).join('') + (target.length > 1 ? `<h3 class="section">Rekapitulasi</h3>${ringkasTable(target)}` : '');
  } else if (mode === 'iuran') {
    title += ' — PER JENIS IURAN';
    const allIuran = [...new Set(list.flatMap(s => (s.status_items || []).map(it => it.nama)))].sort();
    (pick ? allIuran.filter(n => n === pick) : allIuran).forEach(nm => {
      const rowsIuran = list.filter(s => (s.status_items || []).some(it => it.nama === nm));
      if (rowsIuran.length === 0) return;
      body += `<h3 class="section">Iuran: ${nm}</h3>${ringkasTable(rowsIuran)}`;
    });
  } else if (mode === 'status') {
    title += ' — PER STATUS';
    ['Menunggak', 'Cicilan', 'Lunas'].forEach(st => {
      const perStatus = list.filter(s => s.status_keuangan === st);
      if (perStatus.length === 0) return;
      body += `<h3 class="section">Status ${st} (${perStatus.length} siswa)</h3>${ringkasTable(perStatus)}${detailBlocks(perStatus)}`;
    });
  } else {
    body = ringkasTable(list) + detailBlocks(list);
  }

  const counts = `Lunas: ${list.filter(s => s.status_keuangan === 'Lunas').length} · Cicilan: ${list.filter(s => s.status_keuangan === 'Cicilan').length} · Menunggak: ${list.filter(s => s.status_keuangan === 'Menunggak').length}`;
  openPrintWindow('Laporan Tunggakan Siswa', `
    <h2>${title}</h2>
    <p class="sub">${counts}</p>
    <p class="info">Tahun Ajaran: <b>${taLabel || 'Semua'}</b> · Kelas: <b>${kelasLabel}</b> · Iuran: <b>${iuranLabel}</b> · Jumlah Data: <b>${list.length} siswa</b></p>
    ${body || '<p>Tidak ada data sesuai pilihan.</p>'}`);
}