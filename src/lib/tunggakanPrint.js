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

// SPP difokuskan ke bulan terpilih: tagihan/dibayar/sisa & status dihitung ulang per bulan
function sppItemFokusBulan(it, bulan) {
  const nominal = it.nominal_per_bulan || 0;
  const paid = new Set(it.paid_months || []);
  const gratis = new Set(it.gratis_months || []);
  const nonGratis = bulan.filter(m => !gratis.has(m));
  const tagihan = nominal * nonGratis.length;
  const dibayar = nominal * nonGratis.filter(m => paid.has(m)).length;
  const sisa = Math.max(0, tagihan - dibayar);
  return {
    ...it,
    tagihan,
    tagihan_jatuh_tempo: tagihan,
    dibayar,
    sisa_jatuh_tempo: sisa,
    sisa_setahun: sisa,
    status: sisa <= 0 ? 'Lunas' : (dibayar > 0 ? 'Cicilan' : 'Menunggak'),
    fokus_bulan: bulan,
  };
}

// Item iuran yang tampil sesuai pilihan (ceklisan jenis iuran & bulan SPP)
function prepItems(s, opts = {}) {
  let items = (s.status_items || []).slice();
  if (opts.iuranPilihan) items = items.filter(it => opts.iuranPilihan.has(it.key));
  if (opts.bulanPilihan && opts.bulanPilihan.length) {
    items = items.map(it => (it.jenis === 'SPP' ? sppItemFokusBulan(it, opts.bulanPilihan) : it));
  }
  return items;
}

// Rekap angka (dibayar/sisa/status) dari item yang tampil
function rekapDariItems(items, fallbackStatus) {
  const totalDibayar = items.reduce((a, it) => a + it.dibayar, 0);
  const totalSisa = items.reduce((a, it) => a + it.sisa_setahun, 0);
  const status = fallbackStatus
    ? fallbackStatus
    : (totalSisa <= 0 ? 'Lunas' : (totalDibayar > 0 ? 'Cicilan' : 'Menunggak'));
  return { totalDibayar, totalSisa, status };
}

/** Blok detail satu siswa (identitas + tabel per jenis iuran) */
export function siswaDetailBlock(s, opts = {}) {
  const items = prepItems(s, opts);
  const difilter = !!(opts.iuranPilihan || (opts.bulanPilihan && opts.bulanPilihan.length));
  const { totalDibayar, totalSisa, status } = rekapDariItems(items, difilter ? null : s.status_keuangan);
  const itemRows = items.map(it => `
    <tr>
      <td>${it.nama}${it.gratis ? ' (Gratis)' : ''}</td>
      <td>${it.periode || '-'}</td>
      <td class="right">${fmt(it.tagihan)}</td>
      <td class="right green">${fmt(it.dibayar)}</td>
      <td class="right ${it.sisa_setahun > 0 ? 'red' : 'green'}">${fmt(it.sisa_setahun)}</td>
      <td style="color:${statusColor(it.status)}; font-weight:bold">${it.status}</td>
    </tr>`).join('');

  // Rincian SPP per bulan terpilih (mode Data Per Bulan)
  const sppFokus = items.find(it => it.fokus_bulan);
  const rincianSpp = sppFokus ? `
      <table style="margin-top:4px">
        <thead>
          <tr><th>Rincian SPP — Bulan Terpilih (${sppFokus.fokus_bulan.length})</th><th>Nominal per Bulan</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${sppFokus.fokus_bulan.map(m => {
            const isGratis = (sppFokus.gratis_months || []).includes(m);
            const isPaid = (sppFokus.paid_months || []).includes(m);
            const st = isGratis ? 'Gratis' : isPaid ? 'Lunas' : 'Belum Bayar';
            return `<tr><td>${m}</td><td class="right">${fmt(sppFokus.nominal_per_bulan || 0)}</td><td class="${st === 'Belum Bayar' ? 'red' : 'green'}" style="font-weight:bold">${st}</td></tr>`;
          }).join('')}
        </tbody>
      </table>` : '';

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
            <td class="right">${fmt(totalDibayar)}</td>
            <td class="right ${totalSisa > 0 ? 'red' : 'green'}">${fmt(totalSisa)}</td>
            <td style="color:${statusColor(status)}">${status}</td>
          </tr>
        </tfoot>
      </table>
      ${rincianSpp}
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

/**
 * Cetak data satu siswa (dari popup detail).
 * opts: { iuranPilihan: Set<key item>, bulanPilihan: [nama bulan] (mode Data Per Bulan) }
 */
export function printSiswaStatement(s, taLabel, opts = {}) {
  if (!s) return;
  const items = prepItems(s, opts);
  const difilter = !!(opts.iuranPilihan || (opts.bulanPilihan && opts.bulanPilihan.length));
  const { totalDibayar, totalSisa, status } = rekapDariItems(items, difilter ? null : s.status_keuangan);
  const bulanInfo = opts.bulanPilihan && opts.bulanPilihan.length ? ` · Bulan Terpilih: ${opts.bulanPilihan.join(', ')}` : '';
  openPrintWindow(`Tunggakan ${s.nama || 'Siswa'}`, `
    <h2>DATA PEMBAYARAN &amp; TUNGGAKAN SISWA</h2>
    <p class="sub">Tahun Ajaran: ${taLabel || '-'}${bulanInfo}</p>
    ${siswaDetailBlock(s, opts)}
    <p class="info" style="margin-top:10px">
      Total Dibayar: <b class="green">${fmt(totalDibayar)}</b> ·
      Sisa Bayar: <b class="${totalSisa > 0 ? 'red' : 'green'}">${fmt(totalSisa)}</b> ·
      Status: <b style="color:${statusColor(status)}">${status}</b>
    </p>`);
}

/**
 * Cetak laporan tunggakan sesuai mode pilihan.
 * mode: 'global' | 'kelas' | 'siswa' | 'iuran' | 'status'
 * pick: pilihan spesifik per mode (id siswa / nama kelas), '' = semua
 * iuranPicks: [nama iuran] terpilih lewat ceklisan (mode 'iuran'); null/[] = semua
 */
export function printTunggakanReport({ rows = [], taLabel = '', kelasLabel = 'Semua Kelas', iuranLabel = 'Semua Iuran', mode = 'global', pick = '', iuranPicks = null, onlySisa = false, showDetail = false }) {
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
    const dipilih = Array.isArray(iuranPicks) && iuranPicks.length
      ? allIuran.filter(n => iuranPicks.includes(n))
      : (pick ? allIuran.filter(n => n === pick) : allIuran);
    dipilih.forEach(nm => {
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