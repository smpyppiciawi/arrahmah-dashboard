import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Printer, RotateCcw } from "lucide-react";
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const formatNumber = (v) => new Intl.NumberFormat('id-ID').format(v || 0);

export default function KuitansiPrintDialog({ isOpen, onClose, transaksi }) {
  const [marginLeft, setMarginLeft] = useState(6);
  const [marginRight, setMarginRight] = useState(6);
  const [marginTop, setMarginTop] = useState(4);
  const [marginBottom, setMarginBottom] = useState(4);
  const [fontSize, setFontSize] = useState(11);

  const handleReset = () => {
    setMarginLeft(6); setMarginRight(6); setMarginTop(4); setMarginBottom(4); setFontSize(11);
  };

  const handlePrint = () => {
    const html = buildKuitansiHtml(transaksi, { marginLeft, marginRight, marginTop, marginBottom, fontSize });
    const printWindow = window.open('', '', 'width=480,height=700');
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
    onClose();
  };

  if (!transaksi) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-teal-600" />
            Pengaturan Cetak Kuitansi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-700 mb-1">Kertas: 12 × 14 cm (Portrait)</p>
            <p>Printer Epson LX-310 Dot Matrix — atur margin agar posisi cetak pas di tengah area cetak (bolong kiri/kanan 1.5cm).</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Margin Kiri (mm)</Label>
              <Input type="number" value={marginLeft} onChange={e => setMarginLeft(Number(e.target.value))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Margin Kanan (mm)</Label>
              <Input type="number" value={marginRight} onChange={e => setMarginRight(Number(e.target.value))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Margin Atas (mm)</Label>
              <Input type="number" value={marginTop} onChange={e => setMarginTop(Number(e.target.value))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Margin Bawah (mm)</Label>
              <Input type="number" value={marginBottom} onChange={e => setMarginBottom(Number(e.target.value))} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Ukuran Font (px)</Label>
            <Input type="number" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="mt-1 w-24" />
          </div>

          <div className="flex justify-start">
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
              <RotateCcw className="w-3 h-3 mr-1" /> Reset Default
            </Button>
          </div>

          {/* Preview */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-2 bg-white overflow-hidden">
            <div
              className="mx-auto bg-white text-black"
              style={{
                width: '12cm',
                height: '14cm',
                padding: `${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm`,
                fontSize: `${fontSize}px`,
                fontFamily: '"Courier New", Courier, monospace',
                overflow: 'hidden',
                boxSizing: 'border-box',
                position: 'relative',
              }}
              dangerouslySetInnerHTML={{ __html: buildKuitansiInnerHtml(transaksi, { fontSize }) }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handlePrint} className="bg-teal-600 hover:bg-teal-700">
            <Printer className="w-4 h-4 mr-1" /> Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildKuitansiInnerHtml(transaksi, opts) {
  const { fontSize = 11 } = opts;
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
      <td style="font-weight:bold;white-space:nowrap;vertical-align:top;padding:2px 4px 2px 0;width:130px;font-size:${fontSize}px">${label}</td>
      <td style="vertical-align:top;padding:2px 4px 2px 0;width:8px;font-size:${fontSize}px">:</td>
      <td style="vertical-align:top;padding:2px 0;word-break:break-word;font-size:${fontSize}px">${value || '-'}</td>
    </tr>
  `;

  let bodyRows = '';
  if (isSiswa) {
    bodyRows = `
      ${row('JENIS', transaksi.jenis === 'Pemasukan' ? 'MASUK' : 'KELUAR')}
      ${row('TELAH TERIMA DARI', transaksi.nama_siswa || '-')}
      ${row('NIS/KELAS', `${transaksi.nis || '-'} / ${transaksi.kelas || '-'}`)}
      <tr><td colspan="3" style="padding:4px 0"></td></tr>
      ${row('URAIAN TRANSAKSI', uraian)}
      <tr><td colspan="3" style="padding:4px 0"></td></tr>
      ${row('NOMINAL', `Rp. ${nominal}`)}
      ${row('TERBILANG', `<em>${terbilang}</em>`)}
    `;
  } else if (isDonatur) {
    bodyRows = `
      ${row('JENIS', 'MASUK')}
      ${row('TELAH TERIMA DARI', 'BENDAHARA SEKOLAH')}
      <tr><td colspan="3" style="padding:4px 0"></td></tr>
      ${row('URAIAN TRANSAKSI', uraian)}
      <tr><td colspan="3" style="padding:4px 0"></td></tr>
      ${row('NOMINAL', `Rp. ${nominal}`)}
      <tr><td colspan="3" style="padding:4px 0"></td></tr>
      ${row('TERBILANG', `<em>${terbilang}</em>`)}
    `;
  } else if (isPegawai) {
    bodyRows = `
      ${row('JENIS', transaksi.jenis === 'Pemasukan' ? 'MASUK' : 'KELUAR')}
      ${row('TELAH TERIMA DARI', transaksi.nama_pegawai || '-')}
      ${row('NIP/JABATAN', `${transaksi.nip_pegawai || '-'} / ${transaksi.jabatan_pegawai || '-'}`)}
      <tr><td colspan="3" style="padding:4px 0"></td></tr>
      ${row('URAIAN TRANSAKSI', uraian)}
      <tr><td colspan="3" style="padding:4px 0"></td></tr>
      ${row('NOMINAL', `Rp. ${nominal}`)}
      ${row('TERBILANG', `<em>${terbilang}</em>`)}
    `;
  } else {
    bodyRows = `
      ${row('JENIS', transaksi.jenis === 'Pemasukan' ? 'MASUK' : 'KELUAR')}
      ${row('TELAH TERIMA DARI', 'BENDAHARA SEKOLAH')}
      <tr><td colspan="3" style="padding:4px 0"></td></tr>
      ${row('URAIAN TRANSAKSI', uraian)}
      <tr><td colspan="3" style="padding:4px 0"></td></tr>
      ${row('NOMINAL', `Rp. ${nominal}`)}
      <tr><td colspan="3" style="padding:4px 0"></td></tr>
      ${row('TERBILANG', `<em>${terbilang}</em>`)}
    `;
  }

  const signerName = isSiswa
    ? (transaksi.pic || penerimaName)
    : isDonatur
    ? (transaksi.nama_donatur || '-')
    : penerimaName;

  return `
    <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:6px">
      <div style="font-weight:bold;font-size:${fontSize + 3}px;letter-spacing:0.5px">YAYASAN PENDIDIKAN PEMUDA ISLAM</div>
      <div style="font-weight:bold;font-size:${fontSize + 2}px;margin:2px 0">SMP YPPI AR-RAHMAH</div>
      <div style="font-style:italic;font-size:${fontSize - 1}px;line-height:1.4">Jl. K.H. Rohimin 558/38 RT. 4/7 Ds. Bojong Kec. Ciamis<br/>Kab. Bogor - 16320</div>
    </div>
    <div style="text-align:center;border-top:1px solid #000;border-bottom:1px solid #000;padding:2px 0;margin-bottom:4px">
      <span style="font-weight:bold;font-size:${fontSize + 1}px;letter-spacing:4px">K U I T A N S I</span>
    </div>
    <div style="text-align:center;font-weight:bold;font-size:${fontSize + 2}px;letter-spacing:6px;margin-bottom:8px">${jenisLabel}</div>
    <table style="width:100%;border-collapse:collapse">${bodyRows}</table>
    <div style="text-align:right;margin-top:28px;line-height:1.6">
      <div>Ciamis, ${tgl}</div>
      <div>Penerima,</div>
      <div style="margin-top:40px;font-weight:bold;text-decoration:underline">${signerName}</div>
    </div>
  `;
}

function buildKuitansiHtml(transaksi, opts = {}) {
  const { marginLeft = 6, marginRight = 6, marginTop = 4, marginBottom = 4, fontSize = 11 } = opts;
  const inner = buildKuitansiInnerHtml(transaksi, { fontSize });
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Kuitansi</title>
      <style>
        @page { size: 12cm 14cm; margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm; }
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