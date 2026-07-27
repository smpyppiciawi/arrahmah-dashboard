import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Upload, Loader2, CheckCircle } from "lucide-react";
import { normalizePenghasilan } from '@/lib/dapodikConstants';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';

export default function ImportSiswaCSV({ disabled }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();
  const { activeAcademicYear } = useActiveAcademicYear();

  const handleFileSelect = (e) => { const file = e.target.files[0]; if (!file) return; setPendingFile(file); setResult(null); setConfirmOpen(true); e.target.value = ''; };

  // Robust CSV parser that handles quoted fields with commas
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += char; }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(r => r.trim());
    if (lines.length < 2) return [];
    // Detect header to find column indices
    const header = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const colMap = {};
    header.forEach((h, i) => { colMap[h] = i; });

    return lines.slice(1).map(line => {
      const cols = parseCSVLine(line);
      const get = (name) => cols[colMap[name]] || '';
      return {
        nis: get('nis'),
        nisn: get('nisn'),
        nama: get('nama'),
        jenis_kelamin: get('jenis_kelamin') || 'Laki-laki',
        nama_kelas: get('kelas'),
        tempat_lahir: get('tempat_lahir'),
        tanggal_lahir: get('tanggal_lahir'),
        nik: get('nik'),
        agama: get('agama') || 'Islam',
        alamat: get('alamat'),
        rt: get('rt'),
        rw: get('rw'),
        kelurahan: get('kelurahan'),
        kecamatan: get('kecamatan'),
        nama_ayah_kandung: get('nama_ayah'),
        tahun_lahir_ayah: get('tahun_lahir_ayah'),
        pendidikan_ayah: get('pendidikan_ayah'),
        pekerjaan_ayah: get('pekerjaan_ayah'),
        penghasilan_ayah: normalizePenghasilan(get('penghasilan_ayah')),
        nik_ayah: get('nik_ayah'),
        nama_ibu_kandung: get('nama_ibu'),
        tahun_lahir_ibu: get('tahun_lahir_ibu'),
        pendidikan_ibu: get('pendidikan_ibu'),
        pekerjaan_ibu: get('pekerjaan_ibu'),
        penghasilan_ibu: normalizePenghasilan(get('penghasilan_ibu')),
        nik_ibu: get('nik_ibu'),
        nama_wali: get('nama_wali'),
        tahun_lahir_wali: get('tahun_lahir_wali'),
        pendidikan_wali: get('pendidikan_wali'),
        pekerjaan_wali: get('pekerjaan_wali'),
        penghasilan_wali: normalizePenghasilan(get('penghasilan_wali')),
        nik_wali: get('nik_wali'),
        penerima_kip: get('penerima_kip') === 'Ya' ? 'Ya' : 'Tidak',
        berat_badan: get('berat_badan'),
        tinggi_badan: get('tinggi_badan'),
        lingkar_kepala: get('lingkar_kepala'),
        koordinat: get('koordinat'),
      };
    }).filter(r => r.nis);
  };

  const confirmImport = async () => {
    if (!pendingFile) return;
    setConfirmOpen(false); setImporting(true); setProgress('Memparsing CSV...'); setResult(null);
    try {
      const text = await pendingFile.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) throw new Error('CSV kosong atau format tidak sesuai.');
      const nisCounts = {}; parsed.forEach(r => { nisCounts[r.nis] = (nisCounts[r.nis] || 0) + 1; });
      const dupes = Object.entries(nisCounts).filter(([, c]) => c > 1).map(([n]) => n);
      if (dupes.length > 0) throw new Error(`NIS duplikat dalam CSV: ${dupes.join(', ')}.`);

      setProgress(`Mengirim ${parsed.length} data ke server untuk sinkronisasi...`);
      const response = await base44.functions.invoke('syncSiswa', {
        students: parsed,
        activeAcademicYear
      });
      const data = response.data || response;

      ['siswa', 'kelas', 'absensi', 'nilai', 'periodikSiswa'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
      setResult({
        success: true,
        created: data.created || 0,
        updated: data.updated || 0,
        unchanged: data.unchanged || 0,
        periodik: data.periodik || 0,
        totalProcessed: data.totalProcessed || parsed.length,
        updatedDetails: data.updatedDetails || [],
      });
    } catch (err) {
      console.error('Import CSV error:', err);
      const errMsg = err?.response?.data?.error || err.message || String(err);
      setResult({ success: false, error: errMsg });
    } finally {
      setImporting(false); setProgress(''); setPendingFile(null);
    }
  };

  return (
    <>
      <label>
        <Button variant="outline" disabled={disabled || importing} size="sm" asChild>
          <span>
            {importing ? <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" /> : <Upload className="w-4 h-4 sm:mr-2" />}
            <span className="hidden sm:inline">{importing ? 'Memproses...' : 'Import CSV'}</span>
          </span>
        </Button>
        <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
      </label>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600"><Upload className="w-5 h-5" /> Konfirmasi Import CSV</DialogTitle>
            <DialogDescription className="text-left pt-2">
              Import CSV akan <b>memperbarui data siswa berdasarkan NIS</b> (NIS tetap jadi kunci utama):<br/><br/>
              • <b>NIS sudah ada & data berubah</b> → diperbarui<br/>
              • <b>NIS baru</b> → ditambahkan<br/>
              • <b>Data periodik (TB/BB/Lingkar)</b> → otomatis tersimpan ke Menu Periodik<br/><br/>
              <b>Riwayat data (Absensi, Nilai, dll) tetap aman</b> karena siswa_id tidak berubah.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setPendingFile(null); }}>Batal</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={confirmImport}>Ya, Import & Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importing || !!result} onOpenChange={(o) => { if (!importing) setResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{importing ? 'Memproses Import CSV' : (result?.success ? 'Import Berhasil' : 'Import Gagal')}</DialogTitle></DialogHeader>
          {importing ? (
            <div className="flex items-center gap-3 py-4"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /><p className="text-sm text-slate-600">{progress}</p></div>
          ) : result?.success ? (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center"><CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" /><p className="text-lg font-bold text-emerald-700">{result.created}</p><p className="text-xs text-emerald-600">Baru</p></div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center"><p className="text-lg font-bold text-blue-700">{result.updated}</p><p className="text-xs text-blue-600">Update</p></div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center"><p className="text-lg font-bold text-slate-600">{result.unchanged}</p><p className="text-xs text-slate-500">Tetap</p></div>
                <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-center"><p className="text-lg font-bold text-violet-700">{result.periodik || 0}</p><p className="text-xs text-violet-600">Periodik</p></div>
              </div>
              {result.updatedDetails?.length > 0 && (
                <div><p className="text-xs font-medium text-slate-500 mb-1">Detail diperbarui:</p><div className="max-h-32 overflow-y-auto space-y-1">{result.updatedDetails.map((d, i) => (<div key={i} className="text-xs text-slate-600 flex items-center gap-2"><span className="font-mono text-slate-400">{d.nis}</span><span className="flex-1 truncate">{d.nama}</span><span className="text-blue-500">{d.fields.length} field</span></div>))}</div></div>
              )}
            </div>
          ) : (<div className="py-2 text-sm text-red-600">⚠️ {result?.error || 'Terjadi kesalahan.'}</div>)}
          {!importing && <DialogFooter><Button onClick={() => setResult(null)}>Tutup</Button></DialogFooter>}
        </DialogContent>
      </Dialog>
    </>
  );
}