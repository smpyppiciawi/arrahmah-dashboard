import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Upload, Loader2, CheckCircle } from "lucide-react";
import { normalizePenghasilan } from '@/lib/dapodikConstants';

export default function ImportSiswaCSV({ disabled }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

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

      setProgress('Menyiapkan kelas...');
      const currentKelas = await base44.entities.Kelas.list('nama_kelas', 200);
      const classMap = new Map(); currentKelas.forEach(k => classMap.set(k.nama_kelas, k.id));
      const tahunAjaran = new Date().getFullYear() + '/' + (new Date().getFullYear() + 1);
      for (const row of parsed) {
        if (row.nama_kelas && !classMap.has(row.nama_kelas)) {
          const tingkat = row.nama_kelas.match(/\d+/)?.[0] || '7';
          const newClass = await base44.entities.Kelas.create({ nama_kelas: row.nama_kelas, tingkat, tahun_ajaran: tahunAjaran });
          classMap.set(row.nama_kelas, newClass.id);
        }
      }

      setProgress('Mengambil data siswa existing...');
      const existingSiswa = await base44.entities.Siswa.list('nis', 500);
      const nisToExisting = new Map(); existingSiswa.forEach(s => { if (s.nis) nisToExisting.set(s.nis, s); });

      const toCreate = []; const toUpdate = []; let unchangedCount = 0; const updatedDetails = [];
      const periodikToCreate = [];

      for (const row of parsed) {
        const kelasId = classMap.get(row.nama_kelas) || '';
        const existing = nisToExisting.get(row.nis);

        const buildPayload = (existing) => {
          const changes = {};
          const fieldsToSync = ['nisn', 'nama', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'nik', 'agama', 'alamat', 'rt', 'rw', 'kelurahan', 'kecamatan',
            'nama_ayah_kandung', 'nama_ibu_kandung', 'nama_wali', 'tahun_lahir_ayah', 'pendidikan_ayah', 'pekerjaan_ayah', 'penghasilan_ayah', 'nik_ayah',
            'tahun_lahir_ibu', 'pendidikan_ibu', 'pekerjaan_ibu', 'penghasilan_ibu', 'nik_ibu',
            'tahun_lahir_wali', 'pendidikan_wali', 'pekerjaan_wali', 'penghasilan_wali', 'nik_wali',
            'penerima_kip', 'koordinat'];
          for (const f of fieldsToSync) {
            if (row[f] && (!existing || existing[f] !== row[f])) changes[f] = row[f];
          }
          if (kelasId && (!existing || existing.kelas_id !== kelasId)) { changes.kelas_id = kelasId; changes.nama_kelas = row.nama_kelas; }
          return changes;
        };

        if (existing) {
          const changes = buildPayload(existing);
          if (Object.keys(changes).length > 0) { toUpdate.push({ id: existing.id, ...changes }); updatedDetails.push({ nis: row.nis, nama: row.nama, fields: Object.keys(changes) }); }
          else unchangedCount++;
          // Periodik data for existing student
          if (row.berat_badan || row.tinggi_badan || row.lingkar_kepala) {
            periodikToCreate.push({ siswa_id: existing.id, nis: row.nis, nama_siswa: row.nama, kelas_id: kelasId || existing.kelas_id, nama_kelas: row.nama_kelas || existing.nama_kelas, tanggal: new Date().toISOString().split('T')[0], berat_badan: row.berat_badan ? Number(row.berat_badan) : undefined, tinggi_badan: row.tinggi_badan ? Number(row.tinggi_badan) : undefined, lingkar_kepala: row.lingkar_kepala ? Number(row.lingkar_kepala) : undefined });
          }
        } else {
          const payload = { ...buildPayload(null), nis: row.nis, status: 'Aktif' };
          toCreate.push(payload);
          // We can't create periodik for new students yet (no ID), will handle after bulkCreate
        }
      }

      // Create new students
      let createdSiswa = [];
      if (toCreate.length > 0) {
        setProgress(`Menyimpan ${toCreate.length} siswa baru...`);
        createdSiswa = await base44.entities.Siswa.bulkCreate(toCreate);
      }
      // Build periodik for newly created students
      for (let i = 0; i < createdSiswa.length; i++) {
        const row = parsed.find(r => r.nis === createdSiswa[i].nis);
        if (row && (row.berat_badan || row.tinggi_badan || row.lingkar_kepala)) {
          periodikToCreate.push({ siswa_id: createdSiswa[i].id, nis: row.nis, nama_siswa: row.nama, kelas_id: createdSiswa[i].kelas_id, nama_kelas: createdSiswa[i].nama_kelas, tanggal: new Date().toISOString().split('T')[0], berat_badan: row.berat_badan ? Number(row.berat_badan) : undefined, tinggi_badan: row.tinggi_badan ? Number(row.tinggi_badan) : undefined, lingkar_kepala: row.lingkar_kepala ? Number(row.lingkar_kepala) : undefined });
        }
      }

      if (toUpdate.length > 0) { setProgress(`Memperbarui ${toUpdate.length} siswa...`); await base44.entities.Siswa.bulkUpdate(toUpdate); }
      if (periodikToCreate.length > 0) { setProgress(`Menyimpan ${periodikToCreate.length} data periodik...`); await base44.entities.PeriodikSiswa.bulkCreate(periodikToCreate); }

      ['siswa', 'kelas', 'absensi', 'nilai', 'periodikSiswa'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
      setResult({ success: true, created: toCreate.length, updated: toUpdate.length, unchanged: unchangedCount, periodik: periodikToCreate.length, updatedDetails: updatedDetails.slice(0, 10) });
    } catch (err) { console.error('Import CSV error:', err); setResult({ success: false, error: err.message || String(err) }); }
    finally { setImporting(false); setProgress(''); setPendingFile(null); }
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