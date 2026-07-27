import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Printer, RotateCcw, FileText } from "lucide-react";
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const formatNumber = (v) => new Intl.NumberFormat('id-ID').format(v || 0);

const DEFAULT_MARGINS = { left: 6, right: 6, top: 4, bottom: 4, fontSize: 11 };

export default function KuitansiPrintDialog({ isOpen, onClose, transaksi }) {
  const [margins, setMargins] = useState(DEFAULT_MARGINS);

  const update = (key, val) => setMargins(prev => ({ ...prev, [key]: val }));
  const handleReset = () => setMargins(DEFAULT_MARGINS);

  const handlePrint = () => {
    const html = buildKuitansiHtml(transaksi, margins);
    const printWindow = window.open('', '', 'width=480,height=700');
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
    onClose();
  };

  if (!transaksi) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Printer className="w-5 h-5 text-teal-600" />
            Pengaturan Cetak Kuitansi
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0">
          {/* Settings Panel */}
          <div className="p-5 space-y-4 border-r border-slate-100 bg-slate-50/50">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-700">
                <FileText className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold">Kertas &amp; Margin</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ukuran kertas 12 × 14 cm (Portrait) untuk printer Epson LX-310.
                Atur margin agar posisi cetak pas di tengah area printable.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <MarginInput label="Kiri (mm)" value={margins.left} onChange={v => update('left', v)} />
              <MarginInput label="Kanan (mm)" value={margins.right} onChange={v => update('right', v)} />
              <MarginInput label="Atas (mm)" value={margins.top} onChange={v => update('top', v)} />
              <MarginInput label="Bawah (mm)" value={margins.bottom} onChange={v => update('bottom', v)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Ukuran Font (px)</Label>
              <Input
                type="number"
                value={margins.fontSize}
                onChange={e => update('fontSize', Number(e.target.value))}
                className="h-8 text-sm w-full"
              />
            </div>

            <Button variant="outline" size="sm" onClick={handleReset} className="w-full text-xs h-8">
              <RotateCcw className="w-3 h-3 mr-1.5" /> Reset Default
            </Button>
          </div>

          {/* Preview Panel */}
          <div className="p-5 bg-slate-100 flex flex-col items-center">
            <p className="text-xs font-medium text-slate-500 mb-3">Preview Kuitansi</p>
            <div className="bg-white shadow-lg rounded-sm" style={{ width: '12cm', maxWidth: '100%' }}>
              <div
                className="text-black bg-white overflow-hidden rounded-sm"
                style={{
                  padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`,
                  fontSize: `${margins.fontSize}px`,
                  fontFamily: '"Courier New", Courier, monospace',
                  boxSizing: 'border-box',
                  lineHeight: 1.4,
                }}
                dangerouslySetInnerHTML={{ __html: buildKuitansiInnerHtml(transaksi, margins.fontSize) }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-white">
          <Button variant="outline" onClick={onClose} className="min-w-[80px]">Batal</Button>
          <Button onClick={handlePrint} className="bg-teal-600 hover:bg-teal-700 min-w-[100px]">
            <Printer className="w-4 h-4 mr-1.5" /> Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarginInput({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="h-8 text-sm"
      />
    </div>
  );
}

function buildKuitansiInnerHtml(transaksi, fontSize = 11) {
  const tgl = format(new Date(transaksi.tanggal), 'd MMMM yyyy', { locale: idLocale });
  const nominal = formatNumber(transaksi.jumlah);
  const terbilang = transaksi.terbilang || '';
  const uraian = transaksi.uraian || '-';
  const penerimaName = transaksi.penerima || transaksi.pic || 'Bendahara';

  const isSiswa = !!transaksi.nama_siswa;
  const isDonatur = !!transaksi.nama_donatur && !transaksi.nama_siswa && !transaksi.guru_id;
  const isPegawai = !!transaksi.guru_id || !!transaksi.nama_pegawai;

  let jenisLabel = 'UMUM';
  if (isSiswa) jenisLabel = 'SISWA';
  else if (isDonatur) jenisLabel = 'DONATUR';
  else if (isPegawai) jenisLabel = 'PEGAWAI';

  const row = (label, value) => `
    <tr>
      <td style="font-weight:bold;white-space:nowrap;vertical-align:top;padding:1px 4px 1px 0;width:125px;font-size:${fontSize}px">${label}</td>
      <td style="vertical-align:top;padding:1px 2px 1px 0;width:6px;font-size:${fontSize}px">:</td>
      <td style="vertical-align:top;padding:1px 0;word-break:break-word;font-size:${fontSize}px">${value || '-'}</td>
    </tr>
  `;

  let bodyRows = '';
  if (isSiswa) {
    bodyRows = `
      ${row('JENIS', transaksi.jenis === 'Pemasukan' ? 'MASUK' : 'KELUAR')}
      ${row('TELAH TERIMA DARI', transaksi.nama_siswa || '-')}
      ${row('NIS/KELAS', `${transaksi.nis || '-'} / ${transaksi.kelas || '-'}`)}
      <tr><td colspan="3" style="padding:3px 0"></td></tr>
      ${row('URAIAN TRANSAKSI', uraian)}
      <tr><td colspan="3" style="padding:3px 0"></td></tr>
      ${row('NOMINAL', `Rp. ${nominal}`)}
      ${row('TERBILANG', `<em>${terbilang}</em>`)}
    `;
  } else if (isDonatur) {
    bodyRows = `
      ${row('JENIS', 'MASUK')}
      ${row('TELAH TERIMA DARI', 'BENDAHARA SEKOLAH')}
      <tr><td colspan="3" style="padding:3px 0"></td></tr>
      ${row('URAIAN TRANSAKSI', uraian)}
      <tr><td colspan="3" style="padding:3px 0"></td></tr>
      ${row('NOMINAL', `Rp. ${nominal}`)}
      <tr><td colspan="3" style="padding:3px 0"></td></tr>
      ${row('TERBILANG', `<em>${terbilang}</em>`)}
    `;
  } else if (isPegawai) {
    bodyRows = `
      ${row('JENIS', transaksi.jenis === 'Pemasukan' ? 'MASUK' : 'KELUAR')}
      ${row('TELAH TERIMA DARI', transaksi.nama_pegawai || '-')}
      ${row('NIP/JABATAN', `${transaksi.nip_pegawai || '-'} / ${transaksi.jabatan_pegawai || '-'}`)}
      <tr><td colspan="3" style="padding:3px 0"></td></tr>
      ${row('URAIAN TRANSAKSI', uraian)}
      <tr><td colspan="3" style="padding:3px 0"></td></tr>
      ${row('NOMINAL', `Rp. ${nominal}`)}
      ${row('TERBILANG', `<em>${terbilang}</em>`)}
    `;
  } else {
    bodyRows = `
      ${row('JENIS', transaksi.jenis === 'Pemasukan' ? 'MASUK' : 'KELUAR')}
      ${row('TELAH TERIMA DARI', 'BENDAHARA SEKOLAH')}
      <tr><td colspan="3" style="padding:3px 0"></td></tr>
      ${row('URAIAN TRANSAKSI', uraian)}
      <tr><td colspan="3" style="padding:3px 0"></td></tr>
      ${row('NOMINAL', `Rp. ${nominal}`)}
      <tr><td colspan="3" style="padding:3px 0"></td></tr>
      ${row('TERBILANG', `<em>${terbilang}</em>`)}
    `;
  }

  const signerName = isSiswa
    ? (transaksi.pic || penerimaName)
    : isDonatur
    ? (transaksi.nama_donatur || '-')
    : penerimaName;

  return `
    <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:3px;margin-bottom:4px">
      <div style="font-weight:bold;font-size:${fontSize + 2}px;letter-spacing:0.3px">YAYASAN PENDIDIKAN PEMUDA ISLAM</div>
      <div style="font-weight:bold;font-size:${fontSize + 1}px;margin:1px 0">SMP YPPI AR-RAHMAH</div>
      <div style="font-style:italic;font-size:${fontSize - 1}px;line-height:1.3">Jl. R.M. Toha blk 509/30 RT. 4/7 Ds. Bendungan Kec. Ciawi<br/>Kab. Bogor - Prov. Jawa Barat, 16720</div>
    </div>
    <div style="text-align:center;border-top:1px solid #000;border-bottom:1px solid #000;padding:1px 0;margin-bottom:2px">
      <span style="font-weight:bold;font-size:${fontSize + 1}px;letter-spacing:4px">K U I T A N S I</span>
    </div>
    <div style="text-align:center;font-weight:bold;font-size:${fontSize + 1}px;letter-spacing:6px;margin-bottom:6px">${jenisLabel}</div>
    <table style="width:100%;border-collapse:collapse">${bodyRows}</table>
    <div style="text-align:right;margin-top:24px;line-height:1.5">
      <div>Ciawi, ${tgl}</div>
      <div>Penerima,</div>
      <div style="margin-top:36px;font-weight:bold;text-decoration:underline;display:inline-block">${signerName}</div>
    </div>
  `;
}

function buildKuitansiHtml(transaksi, opts = {}) {
  const { left = 6, right = 6, top = 4, bottom = 4, fontSize = 11 } = opts;
  const inner = buildKuitansiInnerHtml(transaksi, fontSize);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Kuitansi</title>
      <style>
        @page { size: 12cm 14cm; margin: ${top}mm ${right}mm ${bottom}mm ${left}mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', Courier, monospace; color: #000; }
      </style>
    </head>
    <body>
      ${inner}
    </body>
    </html>
  `;
}