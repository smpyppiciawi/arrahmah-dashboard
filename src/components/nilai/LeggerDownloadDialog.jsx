import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

function unduhBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

const escHtml = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default function LeggerDownloadDialog({ open, onOpenChange, availableKelas, kelasList, dataPerSiswa, rowsDef, semesterLabel, tahunAjaran, initialKelas = 'all' }) {
  const [kelasId, setKelasId] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    if (open) setKelasId(initialKelas || 'all');
  }, [open, initialKelas]);

  // Data legger per kelas terpilih: siswa urut nama + peringkat per kelas
  const tabelData = useMemo(() => {
    const ids = kelasId === 'all' ? [...new Set(dataPerSiswa.map(s => s.kelas_id))] : [kelasId];
    return ids.map(kid => {
      const kelas = kelasList.find(k => k.id === kid);
      const list = dataPerSiswa
        .filter(s => s.kelas_id === kid)
        .sort((a, b) => a.nama.localeCompare(b.nama));
      const sorted = [...list].sort((a, b) => (b.rata ?? -1) - (a.rata ?? -1));
      const rank = new Map();
      let lastRata = null, lastRank = 0;
      sorted.forEach((s, i) => {
        const r = (s.rata === lastRata) ? lastRank : i + 1;
        rank.set(s.siswa_id, r);
        lastRata = s.rata; lastRank = r;
      });
      return { nama_kelas: kelas?.nama_kelas || '-', wali_kelas: kelas?.wali_kelas || '', list, rank };
    }).filter(k => k.list.length > 0);
  }, [kelasId, kelasList, dataPerSiswa]);

  const kodeCols = useMemo(() => rowsDef.map(r => r.kode || r.label), [rowsDef]);
  const judul = `DAFTAR NILAI SUMATIF TENGAH SEMESTER ${String(semesterLabel).toUpperCase()} T.P. ${tahunAjaran}`;
  const namaFile = () => {
    const k = kelasId === 'all' ? 'Semua_Kelas' : (kelasList.find(x => x.id === kelasId)?.nama_kelas || 'Kelas');
    return `Legger_PTS_${String(k).replace(/\s+/g, '_')}_${String(semesterLabel).replace(/\s+/g, '_')}`;
  };

  const unduhCsv = () => {
    if (!tabelData.length) { toast({ title: 'Belum ada data', description: 'Tidak ada data nilai PTS sesuai kelas yang dipilih.', variant: 'destructive' }); return; }
    const sep = ';';
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [esc(judul)];
    tabelData.forEach(k => {
      lines.push('');
      lines.push([esc('Kelas'), esc(k.nama_kelas), esc('Wali Kelas'), esc(k.wali_kelas)].join(sep));
      lines.push([esc('NO'), esc('NIS'), esc('NAMA SISWA'), ...kodeCols.map(esc), esc('JML'), esc('RATA2'), esc('RANK')].join(sep));
      k.list.forEach((s, i) => {
        lines.push([
          i + 1, s.nis, s.nama,
          ...rowsDef.map(r => s.nilaiByRow?.[r.label] ?? ''),
          s.jumlah ?? '', s.rata ?? '', k.rank.get(s.siswa_id) ?? '',
        ].map(esc).join(sep));
      });
    });
    unduhBlob(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), `${namaFile()}.csv`);
    onOpenChange(false);
  };

  const unduhExcel = () => {
    if (!tabelData.length) { toast({ title: 'Belum ada data', description: 'Tidak ada data nilai PTS sesuai kelas yang dipilih.', variant: 'destructive' }); return; }
    let html = `<html><head><meta charset="utf-8"></head><body>`;
    html += `<p style="font-family:Arial;font-size:12pt;font-weight:bold;text-align:center">${escHtml(judul)}</p>`;
    tabelData.forEach(k => {
      html += `<p style="font-family:Arial;font-size:10pt"><b>Kelas:</b> ${escHtml(k.nama_kelas)} &nbsp;&nbsp; <b>Wali Kelas:</b> ${escHtml(k.wali_kelas)}</p>`;
      html += `<table border="1" cellspacing="0" style="font-family:Arial;font-size:10pt;border-collapse:collapse">`;
      html += `<tr>${['NO', 'NIS', 'NAMA SISWA', ...kodeCols, 'JML', 'RATA2', 'RANK'].map(c => `<th style="background:#e2e8f0">${escHtml(c)}</th>`).join('')}</tr>`;
      k.list.forEach((s, i) => {
        html += `<tr><td align="center">${i + 1}</td><td align="center">${escHtml(s.nis)}</td><td>${escHtml(s.nama)}</td>`;
        html += rowsDef.map(r => `<td align="center">${s.nilaiByRow?.[r.label] ?? ''}</td>`).join('');
        html += `<td align="center">${s.jumlah ?? ''}</td><td align="center">${s.rata ?? ''}</td><td align="center">${k.rank.get(s.siswa_id) ?? ''}</td></tr>`;
      });
      html += `</table><br/>`;
    });
    html += `</body></html>`;
    unduhBlob(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }), `${namaFile()}.xls`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-sm">
        <DialogHeader><DialogTitle>Download Legger PTS</DialogTitle></DialogHeader>
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Filter Kelas</p>
          <Select value={kelasId} onValueChange={setKelasId}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {availableKelas.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-[11px] text-slate-400">
          {tabelData.length ? `${tabelData.reduce((a, k) => a + k.list.length, 0)} siswa • ${tabelData.length} kelas` : 'Belum ada data nilai PTS pada filter ini.'}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button className="gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={unduhExcel} disabled={!tabelData.length}>
            <FileSpreadsheet className="w-4 h-4" /> Excel (.xls)
          </Button>
          <Button variant="outline" className="gap-2 rounded-full border-slate-300" onClick={unduhCsv} disabled={!tabelData.length}>
            <FileText className="w-4 h-4" /> CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}