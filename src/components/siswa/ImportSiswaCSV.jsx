import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Upload, Loader2, CheckCircle } from "lucide-react";

/**
 * Smart Import CSV dengan NIS sebagai kunci utama.
 * - NIS sudah ada & data tidak berubah → tidak diubah
 * - NIS sudah ada & data berubah → diperbarui (contoh: kelas baru)
 * - NIS baru → ditambahkan sebagai siswa baru
 * Riwayat data (Absensi, Nilai, dll) tetap aman karena siswa_id tidak berubah.
 */
export default function ImportSiswaCSV({ disabled }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setResult(null);
    setConfirmOpen(true);
    e.target.value = '';
  };

  const parseCSV = (text) => {
    const rows = text.split(/\r?\n/).slice(1).filter(r => r.trim());
    return rows.map(row => {
      const cols = row.split(',').map(s => (s || '').trim().replace(/^"|"$/g, ''));
      return {
        nis: cols[0] || '',
        nama: cols[1] || '',
        jenis_kelamin: cols[2] || 'Laki-laki',
        nama_kelas: cols[3] || '',
        tanggal_lahir: cols[4] || '',
        alamat: cols[5] || '',
        nama_ortu: cols[6] || '',
        no_telp_ortu: cols[7] || '',
      };
    }).filter(r => r.nis);
  };

  const confirmImport = async () => {
    if (!pendingFile) return;
    setConfirmOpen(false);
    setImporting(true);
    setProgress('Memparsing CSV...');
    setResult(null);

    try {
      const text = await pendingFile.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        throw new Error('CSV kosong atau format tidak sesuai. Gunakan tombol Template untuk format yang benar.');
      }

      const nisCounts = {};
      parsed.forEach(r => { nisCounts[r.nis] = (nisCounts[r.nis] || 0) + 1; });
      const dupes = Object.entries(nisCounts).filter(([, c]) => c > 1).map(([n]) => n);
      if (dupes.length > 0) {
        throw new Error(`Ditemukan NIS duplikat dalam CSV: ${dupes.join(', ')}. Setiap NIS harus unik.`);
      }

      // Siapkan kelas (auto-create bila belum ada)
      setProgress('Menyiapkan kelas...');
      const currentKelas = await base44.entities.Kelas.list('nama_kelas', 200);
      const classMap = new Map();
      currentKelas.forEach(k => classMap.set(k.nama_kelas, k.id));

      const tahunAjaran = new Date().getFullYear() + '/' + (new Date().getFullYear() + 1);
      for (const row of parsed) {
        if (row.nama_kelas && !classMap.has(row.nama_kelas)) {
          const tingkat = row.nama_kelas.match(/\d+/)?.[0] || '7';
          const newClass = await base44.entities.Kelas.create({
            nama_kelas: row.nama_kelas, tingkat, tahun_ajaran: tahunAjaran,
          });
          classMap.set(row.nama_kelas, newClass.id);
        }
      }

      // Fetch existing students
      setProgress('Mengambil data siswa existing...');
      const existingSiswa = await base44.entities.Siswa.list('nis', 500);
      const nisToExisting = new Map();
      existingSiswa.forEach(s => { if (s.nis) nisToExisting.set(s.nis, s); });

      // Categorize: create vs update vs unchanged
      const toCreate = [];
      const toUpdate = [];
      let unchangedCount = 0;
      const updatedDetails = [];

      for (const row of parsed) {
        const kelasId = classMap.get(row.nama_kelas) || '';
        const existing = nisToExisting.get(row.nis);

        if (existing) {
          const changes = {};
          if (existing.nama !== row.nama) changes.nama = row.nama;
          if (existing.jenis_kelamin !== row.jenis_kelamin) changes.jenis_kelamin = row.jenis_kelamin;
          if (existing.nama_kelas !== row.nama_kelas) { changes.nama_kelas = row.nama_kelas; }
          if (kelasId && existing.kelas_id !== kelasId) { changes.kelas_id = kelasId; changes.nama_kelas = row.nama_kelas; }
          if (row.tanggal_lahir && existing.tanggal_lahir !== row.tanggal_lahir) changes.tanggal_lahir = row.tanggal_lahir;
          if (row.alamat && existing.alamat !== row.alamat) changes.alamat = row.alamat;
          if (row.nama_ortu && existing.nama_ortu !== row.nama_ortu) changes.nama_ortu = row.nama_ortu;
          if (row.no_telp_ortu && existing.no_telp_ortu !== row.no_telp_ortu) changes.no_telp_ortu = row.no_telp_ortu;

          if (Object.keys(changes).length > 0) {
            toUpdate.push({ id: existing.id, ...changes });
            updatedDetails.push({ nis: row.nis, nama: row.nama, fields: Object.keys(changes) });
          } else {
            unchangedCount++;
          }
        } else {
          toCreate.push({
            nis: row.nis, nama: row.nama, jenis_kelamin: row.jenis_kelamin,
            nama_kelas: row.nama_kelas, kelas_id: kelasId,
            tanggal_lahir: row.tanggal_lahir, alamat: row.alamat,
            nama_ortu: row.nama_ortu, no_telp_ortu: row.no_telp_ortu,
            status: 'Aktif',
          });
        }
      }

      if (toCreate.length > 0) {
        setProgress(`Menyimpan ${toCreate.length} siswa baru...`);
        await base44.entities.Siswa.bulkCreate(toCreate);
      }

      if (toUpdate.length > 0) {
        setProgress(`Memperbarui ${toUpdate.length} siswa yang berubah...`);
        await base44.entities.Siswa.bulkUpdate(toUpdate);
      }

      ['siswa', 'kelas', 'absensi', 'nilai'].forEach(k =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );

      setResult({
        success: true,
        created: toCreate.length,
        updated: toUpdate.length,
        unchanged: unchangedCount,
        updatedDetails: updatedDetails.slice(0, 10),
      });
    } catch (err) {
      console.error('Import CSV error:', err);
      setResult({ success: false, error: err.message || String(err) });
    } finally {
      setImporting(false);
      setProgress('');
      setPendingFile(null);
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
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Upload className="w-5 h-5" /> Konfirmasi Import CSV
            </DialogTitle>
            <DialogDescription className="text-left pt-2">
              Import CSV akan <b>memperbarui data siswa berdasarkan NIS</b>:
              <br /><br />
              • <b>NIS sudah ada & data tidak berubah</b> → tidak diubah
              <br />
              • <b>NIS sudah ada & data berubah</b> → diperbarui (contoh: kelas baru)
              <br />
              • <b>NIS baru</b> → ditambahkan sebagai siswa baru
              <br /><br />
              <b>Riwayat data (Absensi, Nilai, dll) tetap aman</b> karena siswa_id tidak berubah. Gunakan tombol <b>Template</b> untuk format yang benar.
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
          <DialogHeader>
            <DialogTitle>{importing ? 'Memproses Import CSV' : (result?.success ? 'Import Berhasil' : 'Import Gagal')}</DialogTitle>
          </DialogHeader>
          {importing ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <p className="text-sm text-slate-600">{progress}</p>
            </div>
          ) : result?.success ? (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-emerald-700">{result.created}</p>
                  <p className="text-xs text-emerald-600">Siswa Baru</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{result.updated}</p>
                  <p className="text-xs text-blue-600">Diperbarui</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-600">{result.unchanged}</p>
                  <p className="text-xs text-slate-500">Tidak Berubah</p>
                </div>
              </div>
              {result.updatedDetails && result.updatedDetails.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-slate-500 mb-1">Detail siswa yang diperbarui:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {result.updatedDetails.map((d, i) => (
                      <div key={i} className="text-xs text-slate-600 flex items-center gap-2">
                        <span className="font-mono text-slate-400">{d.nis}</span>
                        <span className="flex-1 truncate">{d.nama}</span>
                        <span className="text-blue-500">{d.fields.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-2 text-sm text-red-600">⚠️ {result?.error || 'Terjadi kesalahan tidak diketahui.'}</div>
          )}
          {!importing && (
            <DialogFooter><Button onClick={() => setResult(null)}>Tutup</Button></DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}