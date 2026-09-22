import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Loader2, CheckCircle2, XCircle, Copy, Info, FileImage, Trash2 } from 'lucide-react';
import { processFotoSiswa } from '@/lib/imageCompress';
import { parseFotoFilename, resolveSlotField, slotLabel } from '@/lib/fotoSiswa';

const MAX_SIZE = 10 * 1024 * 1024;
const BATCH_SIZE = 4;

export default function FotoMassalTab({ siswaList, kelasList }) {
  const [mode, setMode] = useState('all');
  const [kelasId, setKelasId] = useState('');
  const [items, setItems] = useState([]);
  const [running, setRunning] = useState(false);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const kelasNama = kelasList.find((k) => k.id === kelasId)?.nama_kelas;

  const handleFiles = (files) => {
    const nisMap = new Map(siswaList.filter((s) => s.nis).map((s) => [String(s.nis), s]));
    const newItems = files.map((f, i) => {
      const fail = (reason) => ({ id: i, file: f, status: 'gagal', reason });
      const parsed = parseFotoFilename(f.name);
      if (!parsed) return fail('Format nama salah — gunakan NIS.jpg, NIS_7/_8/_9.jpg, atau NIS_AYAH/_IBU/_WALI.jpg');
      const siswa = nisMap.get(parsed.nis);
      if (!siswa) return fail(`NIS ${parsed.nis} tidak ditemukan`);
      if (mode === 'kelas') {
        if (!kelasId) return fail('Pilih kelas terlebih dahulu');
        if (siswa.kelas_id !== kelasId) return fail(`Bukan siswa kelas ${kelasNama || 'terpilih'}`);
      }
      if (!f.type.startsWith('image/')) return fail('File bukan gambar');
      if (f.size > MAX_SIZE) return fail('Ukuran file melebihi 10 MB');
      const field = resolveSlotField(siswa, parsed.slot);
      if (!field) return fail('Jenjang aktif tidak diketahui — gunakan sufiks _7/_8/_9');
      return { id: i, file: f, siswa, field, status: 'menunggu' };
    });
    setItems(newItems);
  };

  const runUpload = async () => {
    const queue = items.filter((i) => i.status === 'menunggu');
    if (!queue.length) return;
    setRunning(true);
    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      const batch = queue.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async (item) => {
        try {
          const processed = await processFotoSiswa(item.file);
          const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: processed });
          await base44.entities.Siswa.update(item.siswa.id, { [item.field]: file_url });
          return { ...item, status: 'sukses' };
        } catch (err) {
          return { ...item, status: 'gagal', reason: err.message || 'Gagal mengunggah' };
        }
      }));
      setItems((prev) => {
        const byId = new Map(results.map((r) => [r.id, r]));
        return prev.map((p) => byId.get(p.id) || p);
      });
    }
    setRunning(false);
    queryClient.invalidateQueries({ queryKey: ['siswa'] });
    toast({ title: 'Upload massal selesai' });
  };

  const pendingCount = items.filter((i) => i.status === 'menunggu').length;
  const doneCount = items.length - pendingCount;
  const okCount = items.filter((i) => i.status === 'sukses').length;
  const failItems = items.filter((i) => i.status === 'gagal');
  const progressPct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const finished = items.length > 0 && pendingCount === 0 && !running;

  const copyFails = () => {
    const text = failItems.map((i) => `${i.file.name} — ${i.reason}`).join('\n');
    navigator.clipboard?.writeText(text);
    toast({ title: 'Daftar gagal disalin', description: `${failItems.length} file` });
  };

  return (
    <div className="space-y-4">
      {/* Panduan */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-700">Panduan penamaan file (nama = NIS siswa):</p>
          <p><code className="bg-white px-1.5 py-0.5 rounded font-mono">NIS.jpg</code> → foto jenjang aktif siswa (7/8/9 sesuai kelas saat ini)</p>
          <p><code className="bg-white px-1.5 py-0.5 rounded font-mono">NIS_7.jpg</code> / <code className="bg-white px-1.5 py-0.5 rounded font-mono">NIS_8.jpg</code> / <code className="bg-white px-1.5 py-0.5 rounded font-mono">NIS_9.jpg</code> → slot jenjang spesifik (koreksi / multi-jenjang sekaligus)</p>
          <p><code className="bg-white px-1.5 py-0.5 rounded font-mono">NIS_AYAH.jpg</code> / <code className="bg-white px-1.5 py-0.5 rounded font-mono">NIS_IBU.jpg</code> / <code className="bg-white px-1.5 py-0.5 rounded font-mono">NIS_WALI.jpg</code> → foto orang tua/wali</p>
          <p className="text-slate-400">Foto otomatis dipotong rasio 3:4 & dikompresi (maks 1600px, JPEG). File di bawah 200x267 px atau di atas 10 MB ditolak.</p>
        </div>
      </div>

      {/* Mode + pilih file */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Select
          value={mode}
          onValueChange={(v) => { setMode(v); setKelasId(''); setItems([]); }}
        >
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Seluruh Siswa</SelectItem>
            <SelectItem value="kelas">Per Kelas</SelectItem>
          </SelectContent>
        </Select>
        {mode === 'kelas' && (
          <Select value={kelasId} onValueChange={(v) => { setKelasId(v); setItems([]); }}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
            <SelectContent>
              {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={running || (mode === 'kelas' && !kelasId)}>
            <FileImage className="w-4 h-4 mr-2" /> Pilih File
          </Button>
          {items.length > 0 && !running && (
            <Button variant="outline" className="text-red-500" onClick={() => setItems([])}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={runUpload} disabled={running || pendingCount === 0}>
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {running ? 'Mengunggah...' : `Mulai Unggah (${pendingCount})`}
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
        />
      </div>

      {/* Progress */}
      {items.length > 0 && (
        <div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {doneCount}/{items.length} file diproses {running && '— jangan tutup halaman ini'}
          </p>
        </div>
      )}

      {/* Hasil akhir */}
      {finished && (
        <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${failItems.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <p className="text-sm font-medium text-slate-700">
            {okCount} berhasil, {failItems.length} gagal
          </p>
          {failItems.length > 0 && (
            <Button size="sm" variant="outline" className="sm:ml-auto" onClick={copyFails}>
              <Copy className="w-3.5 h-3.5 mr-2" /> Salin daftar gagal
            </Button>
          )}
        </div>
      )}

      {/* Daftar file */}
      {items.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white max-h-80 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0">
              {item.status === 'sukses' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                : item.status === 'gagal' ? <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                : item.status === 'menunggu' ? <FileImage className="w-4 h-4 text-slate-300 flex-shrink-0" />
                : <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-700 truncate">{item.file.name}</p>
                {item.siswa ? (
                  <p className="text-[11px] text-slate-400 truncate">
                    {item.siswa.nama} {item.siswa.nama_kelas ? `(${item.siswa.nama_kelas})` : ''} → {slotLabel(item.field)}
                  </p>
                ) : (
                  <p className="text-[11px] text-red-400 truncate">{item.reason}</p>
                )}
              </div>
              {item.status === 'gagal' && item.siswa && (
                <span className="text-[11px] text-red-400 hidden md:block max-w-64 truncate">{item.reason}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}