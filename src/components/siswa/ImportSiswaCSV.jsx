import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Upload, AlertTriangle, Loader2 } from "lucide-react";

/**
 * Replace All Import CSV dengan NIS sebagai kunci utama.
 * - Hapus SEMUA siswa lama
 * - BulkCreate siswa baru dari CSV
 * - Re-link siswa_id di Absensi/Nilai/Pelanggaran/Prestasi/UKS berdasarkan NIS
 *   sehingga riwayat siswa tetap terhubung meskipun siswa_id berubah.
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
      // Support quoted commas minimally: split by comma
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

      // Validasi NIS duplikat di dalam CSV
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
            nama_kelas: row.nama_kelas,
            tingkat,
            tahun_ajaran: tahunAjaran,
          });
          classMap.set(row.nama_kelas, newClass.id);
        }
      }

      const newRecords = parsed.map(r => ({
        nis: r.nis,
        nama: r.nama,
        jenis_kelamin: r.jenis_kelamin,
        nama_kelas: r.nama_kelas,
        kelas_id: classMap.get(r.nama_kelas) || '',
        tanggal_lahir: r.tanggal_lahir,
        alamat: r.alamat,
        nama_ortu: r.nama_ortu,
        no_telp_ortu: r.no_telp_ortu,
        status: 'Aktif',
      }));

      // Replace All: hapus SEMUA siswa lama (cascade TIDAK di-trigger di deleteMany)
      setProgress(`Menghapus ${newRecords.length > 0 ? 'data siswa lama' : ''}...`);
      await base44.entities.Siswa.deleteMany({});

      // BulkCreate siswa baru
      setProgress(`Menyimpan ${newRecords.length} siswa baru...`);
      await base44.entities.Siswa.bulkCreate(newRecords);

      // Ambil siswa baru untuk memetakan NIS -> siswa_id
      setProgress('Menghubungkan riwayat via NIS...');
      const newSiswa = await base44.entities.Siswa.list('nis', 500);
      const nisToNewId = new Map();
      newSiswa.forEach(s => { if (s.nis) nisToNewId.set(s.nis, s.id); });

      // Re-link siswa_id di seluruh entitas riwayat berdasarkan NIS
      const relinkEntities = ['Absensi', 'Nilai', 'Pelanggaran', 'Prestasi', 'UKS'];
      let totalRelinked = 0;
      for (const entityName of relinkEntities) {
        setProgress(`Menghubungkan riwayat: ${entityName}...`);
        const records = await base44.entities[entityName].list('-updated_date', 500);
        const toUpdate = [];
        records.forEach(r => {
          if (r.nis && nisToNewId.has(r.nis) && r.siswa_id !== nisToNewId.get(r.nis)) {
            toUpdate.push({ id: r.id, siswa_id: nisToNewId.get(r.nis) });
          }
        });
        if (toUpdate.length > 0) {
          await base44.entities[entityName].bulkUpdate(toUpdate);
          totalRelinked += toUpdate.length;
        }
      }

      // Invalidate semua query terkait
      ['siswa', 'kelas', 'absensi', 'nilai', 'pelanggaran', 'prestasi', 'uks'].forEach(k =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );

      setResult({
        success: true,
        total: newRecords.length,
        relinked: totalRelinked,
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

      {/* Konfirmasi Replace All */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Konfirmasi Replace All
            </DialogTitle>
            <DialogDescription className="text-left pt-2">
              Import CSV akan <b>menghapus SEMUA data siswa yang ada</b> dan menggantinya dengan data dari CSV.
              <br /><br />
              <b>Riwayat data siswa (Absensi, Nilai, Pelanggaran, Prestasi, UKS) akan dipertahankan</b> dan otomatis dihubungkan ulang ke siswa baru berdasarkan <b>NIS</b>.
              <br /><br />
              Pastikan CSV berisi <b>semua siswa aktif</b> untuk tahun ajaran ini. Gunakan tombol <b>Template</b> untuk format yang benar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setPendingFile(null); }}>
              Batal
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={confirmImport}>
              Ya, Replace All & Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress & hasil */}
      <Dialog open={importing || !!result} onOpenChange={(o) => { if (!importing) setResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {importing ? 'Memproses Import CSV' : (result?.success ? 'Import Berhasil' : 'Import Gagal')}
            </DialogTitle>
          </DialogHeader>
          {importing ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <p className="text-sm text-slate-600">{progress}</p>
            </div>
          ) : result?.success ? (
            <div className="space-y-2 py-2 text-sm">
              <p className="text-slate-700">✅ <b>{result.total}</b> siswa berhasil diimport.</p>
              <p className="text-slate-700">🔗 <b>{result.relinked}</b> record riwayat (Absensi, Nilai, Catatan Siswa) telah dihubungkan ulang via NIS.</p>
            </div>
          ) : (
            <div className="py-2 text-sm text-red-600">
              ⚠️ {result?.error || 'Terjadi kesalahan tidak diketahui.'}
            </div>
          )}
          {!importing && (
            <DialogFooter>
              <Button onClick={() => setResult(null)}>Tutup</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}