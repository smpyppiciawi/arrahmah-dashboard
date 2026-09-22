import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { useToast } from '@/components/ui/use-toast';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { Award, Upload, TrendingUp, TrendingDown, Trophy, Search } from 'lucide-react';

const MAPEL_TKA = [
  { key: 'matematika', label: 'Matematika' },
  { key: 'bahasa_indonesia', label: 'Bahasa Indonesia' },
];

// Parse satu baris CSV (mendukung quote "...")
function splitCsvLine(line, delim) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
    } else if (c === delim && !inQ) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

const parseNilai = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
};

// Parse CSV TKA: NIS, NISN, NAMA PESERTA, NILAI MATEMATIKA, KRITERIA MATEMATIKA,
// NILAI BAHASA INDONESIA, KRITERIA BAHASA INDONESIA (urutan bebas, header dinormalisasi)
function parseCsvTka(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const delim = (lines[0].split(';').length > lines[0].split(',').length) ? ';' : ',';
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const headers = splitCsvLine(lines[0], delim).map(norm);
  const findCol = (names) => headers.findIndex(h => names.includes(h));
  const colNis = findCol(['nis']);
  const colNisn = findCol(['nisn']);
  const colNama = findCol(['namapeserta', 'nama']);
  const colNilaiMat = findCol(['nilaimatematika']);
  const colKritMat = findCol(['kriteriamatematika']);
  const colNilaiBin = findCol(['nilaibahasaindonesia']);
  const colKritBin = findCol(['kriteriabahasaindonesia']);
  if (colNis < 0) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const c = splitCsvLine(lines[i], delim);
    const nis = c[colNis] || '';
    if (!nis) continue;
    rows.push({
      nis,
      nisn: colNisn >= 0 ? (c[colNisn] || '') : '',
      nama: colNama >= 0 ? (c[colNama] || '') : '',
      nilai_matematika: colNilaiMat >= 0 ? parseNilai(c[colNilaiMat]) : null,
      kriteria_matematika: colKritMat >= 0 ? (c[colKritMat] || '') : '',
      nilai_bahasa_indonesia: colNilaiBin >= 0 ? parseNilai(c[colNilaiBin]) : null,
      kriteria_bahasa_indonesia: colKritBin >= 0 ? (c[colKritBin] || '') : '',
    });
  }
  return rows;
}

// Tab TKA — Tes Kemampuan Akademik (siswa Kelas 9)
export default function TkaTab({ userRole, guruData, kelasList = [], siswaList = [], currentUser }) {
  const { activeAcademicYear, pengaturan } = useActiveAcademicYear();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [toggling, setToggling] = useState(false);

  const tugasTambahanLc = String(guruData?.tugas_tambahan || '').toLowerCase();
  const isWaka = userRole === 'guru' && tugasTambahanLc.includes('waka') && (tugasTambahanLc.includes('kurikulum') || tugasTambahanLc.includes('kesiswaan'));
  const isStaff = ['admin', 'tu', 'kepsek'].includes(userRole);
  const waliKelas9Ids = useMemo(() => {
    if (userRole !== 'guru' || !guruData) return [];
    return kelasList
      .filter(k => String(k.nama_kelas || '').trim().startsWith('9') && (k.wali_kelas === guruData.nama || k.wali_kelas === currentUser?.full_name))
      .map(k => k.id);
  }, [kelasList, guruData, currentUser, userRole]);
  const isWaliKelas9 = userRole === 'guru' && waliKelas9Ids.length > 0;
  const canManage = isStaff || isWaka;

  const { data: tkaList = [], isLoading } = useQuery({
    queryKey: ['nilai-tka', activeAcademicYear],
    queryFn: () => activeAcademicYear
      ? base44.entities.NilaiTKA.filter({ tahun_ajaran: activeAcademicYear })
      : base44.entities.NilaiTKA.list(),
  });

  // Wali Kelas 9 hanya melihat siswa kelasnya sendiri
  const tkaScoped = (isWaliKelas9 && !canManage) ? tkaList.filter(t => waliKelas9Ids.includes(t.kelas_id)) : tkaList;

  const tkaTampil = !!pengaturan?.tka_tampil_beranda;
  const handleToggle = async (checked) => {
    setToggling(true);
    try {
      if (pengaturan?.id) await base44.entities.PengaturanAplikasi.update(pengaturan.id, { tka_tampil_beranda: checked });
      else await base44.entities.PengaturanAplikasi.create({ tahun_ajaran_aktif: activeAcademicYear || '', tka_tampil_beranda: checked });
      queryClient.invalidateQueries({ queryKey: ['pengaturan-aplikasi'] });
      toast({ title: checked ? '✅ Nilai TKA tampil di Beranda Akun Siswa' : 'Nilai TKA disembunyikan dari Beranda Akun Siswa' });
    } catch {
      toast({ title: 'Gagal mengubah pengaturan TKA', variant: 'destructive' });
    } finally {
      setToggling(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsvTka(text);
    if (parsed.length === 0) {
      toast({ title: 'Format CSV tidak dikenali', description: 'Pastikan ada kolom NIS, NISN, NAMA PESERTA, NILAI MATEMATIKA, KRITERIA MATEMATIKA, NILAI BAHASA INDONESIA, KRITERIA BAHASA INDONESIA', variant: 'destructive' });
      return;
    }
    const byNis = new Map(siswaList.map(s => [String(s.nis || '').trim(), s]));
    const seen = new Set();
    const matched = [], notFound = [];
    parsed.forEach(row => {
      const key = String(row.nis).trim();
      if (seen.has(key)) return; // duplikat NIS — ambil yang pertama
      seen.add(key);
      const s = byNis.get(key);
      if (s) matched.push({ siswa: s, data: row });
      else notFound.push(row);
    });
    setPreview({ matched, notFound });
  };

  const handleUploadSave = async () => {
    if (!preview || preview.matched.length === 0) return;
    setUploading(true);
    try {
      const tahun = activeAcademicYear || '';
      const existingByNis = new Map(tkaList.map(t => [String(t.nis || '').trim(), t]));
      const toCreate = [], toUpdate = [];
      preview.matched.forEach(({ siswa, data }) => {
        const payload = {
          nis: siswa.nis,
          nisn: data.nisn || siswa.nisn || '',
          nama_siswa: data.nama || siswa.nama,
          siswa_id: siswa.id,
          kelas_id: siswa.kelas_id,
          nama_kelas: siswa.nama_kelas,
          nilai_matematika: data.nilai_matematika,
          kriteria_matematika: data.kriteria_matematika,
          nilai_bahasa_indonesia: data.nilai_bahasa_indonesia,
          kriteria_bahasa_indonesia: data.kriteria_bahasa_indonesia,
          tahun_ajaran: tahun,
        };
        const ex = existingByNis.get(String(siswa.nis || '').trim());
        if (ex) toUpdate.push({ id: ex.id, ...payload });
        else toCreate.push(payload);
      });
      if (toCreate.length) await base44.entities.NilaiTKA.bulkCreate(toCreate);
      if (toUpdate.length) await base44.entities.NilaiTKA.bulkUpdate(toUpdate);
      queryClient.invalidateQueries({ queryKey: ['nilai-tka'] });
      toast({ title: `✅ ${toCreate.length} nilai TKA tersimpan, ${toUpdate.length} diperbarui`, description: preview.notFound.length ? `${preview.notFound.length} baris tidak ditemukan (NIS tidak cocok)` : undefined });
      setUploadOpen(false);
      setPreview(null);
    } catch {
      toast({ title: 'Gagal menyimpan nilai TKA', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // Nilai tertinggi & terendah per mapel
  const statsMapel = MAPEL_TKA.map(({ key, label }) => {
    const withVal = tkaScoped.filter(t => t[`nilai_${key}`] != null);
    const sorted = [...withVal].sort((a, b) => b[`nilai_${key}`] - a[`nilai_${key}`]);
    return { key, label, tinggi: sorted[0] || null, rendah: sorted.length ? sorted[sorted.length - 1] : null, jumlah: withVal.length };
  });

  // 5 besar (total nilai gabungan)
  const top5 = useMemo(() => [...tkaScoped]
    .map(t => ({ ...t, total: (t.nilai_matematika || 0) + (t.nilai_bahasa_indonesia || 0) }))
    .filter(t => t.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5), [tkaScoped]);

  const filteredData = tkaScoped.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.nama_siswa?.toLowerCase().includes(q) || t.nis?.includes(q);
    const matchKelas = filterKelas === 'all' || t.nama_kelas === filterKelas;
    return matchSearch && matchKelas;
  });

  const kelasOptions = [...new Set(tkaScoped.map(t => t.nama_kelas).filter(Boolean))].sort();

  return (
    <div className="space-y-5">
      {/* Header: toggle tampil di Beranda + Upload CSV */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <p className="font-bold text-slate-800">Tes Kemampuan Akademik (TKA)</p>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Nilai TKA siswa Kelas 9{isWaliKelas9 && !canManage ? ' — kelas Anda' : ''} · T.A. {activeAcademicYear || '-'}
            </p>
          </div>
          {canManage && (
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Switch checked={tkaTampil} onCheckedChange={handleToggle} disabled={toggling} />
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-slate-700">{tkaTampil ? 'ON' : 'OFF'}</p>
                  <p className="text-[10px] text-slate-400">Tampil di Beranda Akun Siswa</p>
                </div>
              </div>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white gap-2" onClick={() => { setPreview(null); setUploadOpen(true); }}>
                <Upload className="w-4 h-4" /> Upload CSV
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nilai Tertinggi & Terendah per Mapel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {statsMapel.map(s => (
          <Card key={s.key} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-bold text-slate-700 mb-3">{s.label} <span className="text-xs font-normal text-slate-400">({s.jumlah} siswa)</span></p>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{s.tinggi?.nama_siswa || '-'}</p>
                      <p className="text-[10px] text-slate-400">{s.tinggi?.nama_kelas || ''}</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-emerald-600 shrink-0">{s.tinggi ? s.tinggi[`nilai_${s.key}`] : '-'}</span>
                </div>
                <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <TrendingDown className="w-4 h-4 text-red-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{s.rendah?.nama_siswa || '-'}</p>
                      <p className="text-[10px] text-slate-400">{s.rendah?.nama_kelas || ''}</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-red-600 shrink-0">{s.rendah ? s.rendah[`nilai_${s.key}`] : '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 5 Besar */}
      {top5.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> 5 Besar Nilai Tertinggi
            </p>
            <div className="space-y-2">
              {top5.map((t, i) => (
                <div key={t.id || i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{t.nama_siswa}</p>
                    <p className="text-[10px] text-slate-400">{t.nama_kelas || ''} · Mat {t.nilai_matematika ?? '-'} · Bindo {t.nilai_bahasa_indonesia ?? '-'}</p>
                  </div>
                  <span className="text-lg font-black text-slate-800 shrink-0">{t.total}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daftar Siswa — Filter + Paginasi */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Cari nama atau NIS..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="all">Semua Kelas</option>
              {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <DataTable
            columns={[
              { key: 'nama_siswa', label: 'Siswa', render: (row) => (
                <div>
                  <p className="font-medium text-sm text-slate-800">{row.nama_siswa}</p>
                  <p className="text-xs text-slate-400 font-mono">{row.nis}</p>
                </div>
              )},
              { key: 'nama_kelas', label: 'Kelas', render: (row) => (
                <Badge className="bg-blue-50 text-blue-700 text-xs border-0">{row.nama_kelas || '-'}</Badge>
              )},
              { key: 'nilai_matematika', label: 'Matematika', render: (row) => (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-800">{row.nilai_matematika ?? '-'}</span>
                  {row.kriteria_matematika && <Badge className="bg-amber-50 text-amber-700 text-[10px] border-0">{row.kriteria_matematika}</Badge>}
                </div>
              )},
              { key: 'nilai_bahasa_indonesia', label: 'B. Indonesia', render: (row) => (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-800">{row.nilai_bahasa_indonesia ?? '-'}</span>
                  {row.kriteria_bahasa_indonesia && <Badge className="bg-indigo-50 text-indigo-700 text-[10px] border-0">{row.kriteria_bahasa_indonesia}</Badge>}
                </div>
              )},
              { key: 'total', label: 'Total', sortable: false, filterable: false, render: (row) => (
                <span className="text-sm font-bold text-amber-600">{(row.nilai_matematika || 0) + (row.nilai_bahasa_indonesia || 0)}</span>
              )},
            ]}
            data={filteredData}
            pageSize={10}
          />
          {isLoading && <p className="text-center text-sm text-slate-400 py-6">Memuat data TKA...</p>}
        </CardContent>
      </Card>

      {/* Dialog Upload CSV */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload Nilai TKA (CSV)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-600 mb-1">Format kolom CSV (header bebas urutan):</p>
              <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
                NIS, NISN, NAMA PESERTA, NILAI MATEMATIKA, KRITERIA MATEMATIKA, NILAI BAHASA INDONESIA, KRITERIA BAHASA INDONESIA
              </p>
              <p className="text-[10px] text-slate-400 mt-1.5">NIS dicocokkan dengan Data Siswa — hanya NIS yang cocok yang tersimpan. Biasanya peserta TKA adalah siswa Kelas 9.</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Pilih File CSV</Label>
              <Input type="file" accept=".csv" onChange={handleFile} className="mt-1" />
            </div>
            {preview && (
              <div className="border border-slate-200 rounded-xl p-3 text-sm">
                <p className="text-emerald-600 font-semibold">✓ {preview.matched.length} siswa cocok</p>
                {preview.notFound.length > 0 && (
                  <div className="mt-2">
                    <p className="text-red-500 font-semibold text-xs">✗ {preview.notFound.length} baris NIS tidak ditemukan:</p>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
                      {preview.notFound.map(r => `${r.nis} (${r.nama})`).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setUploadOpen(false)}>Batal</Button>
              <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" disabled={!preview || preview.matched.length === 0 || uploading} onClick={handleUploadSave}>
                {uploading ? 'Menyimpan...' : 'Simpan Nilai TKA'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}