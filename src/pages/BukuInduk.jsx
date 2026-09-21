import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { useAuth } from '@/lib/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookText, FileDown, Loader2, ShieldAlert, Users } from 'lucide-react';
import { collectBukuIndukData } from '@/lib/bukuIndukData';
import BukuIndukPreviewDialog from '@/components/bukinduk/BukuIndukPreviewDialog';

export default function BukuInduk() {
  const { activeAcademicYear } = useActiveAcademicYear();
  const { user } = useAuth();
  const role = user?.role;
  const allowed = ['admin', 'tu', 'kepsek'].includes(role);

  const [source, setSource] = useState('aktif'); // aktif | lulusan
  const [kelasId, setKelasId] = useState('');
  const [angkatan, setAngkatan] = useState('');
  const [nis, setNis] = useState('');
  const [gen, setGen] = useState(null);
  const [bundles, setBundles] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [defaultDownload, setDefaultDownload] = useState('gabungan');

  const { data: siswaList = [], isLoading } = useQuery({
    queryKey: ['siswa-buku-induk'],
    queryFn: () => base44.entities.Siswa.list('nama', 1000),
    enabled: allowed,
  });
  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-buku-induk'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas', 500),
    enabled: allowed,
  });

  // Pintasan dari Data Lulusan: ?nis=XXX otomatis memilih siswa
  useEffect(() => {
    const urlNis = new URLSearchParams(window.location.search).get('nis');
    if (urlNis && siswaList.length && !nis) {
      const s = siswaList.find((x) => x.nis === urlNis);
      if (s) {
        setSource(s.status === 'Lulus' ? 'lulusan' : 'aktif');
        if (s.status === 'Lulus') setAngkatan(s.tahun_lulus || s.tahun_ajaran || '');
        else setKelasId(s.kelas_id || '');
        setNis(s.nis);
      }
    }
  }, [siswaList]);

  const kelasAktifList = useMemo(
    () => kelasList.filter((k) => !activeAcademicYear || k.tahun_ajaran === activeAcademicYear),
    [kelasList, activeAcademicYear]
  );
  const angkatanList = useMemo(() => {
    const set = new Set(
      siswaList.filter((s) => s.status === 'Lulus').map((s) => s.tahun_lulus || s.tahun_ajaran).filter(Boolean)
    );
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [siswaList]);

  const siswaKelas = useMemo(
    () => siswaList.filter((s) => s.status !== 'Lulus' && s.kelas_id === kelasId).sort((a, b) => (a.nama || '').localeCompare(b.nama || '')),
    [siswaList, kelasId]
  );
  const siswaAngkatan = useMemo(
    () => siswaList
      .filter((s) => s.status === 'Lulus' && (s.tahun_lulus || s.tahun_ajaran) === angkatan)
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || '')),
    [siswaList, angkatan]
  );

  const siswaOptions = source === 'lulusan' ? siswaAngkatan : siswaKelas;
  const selectedSiswa = useMemo(() => siswaList.find((s) => s.nis === nis) || null, [siswaList, nis]);

  const runGenerate = async (list, dlMode) => {
    if (!list?.length) return;
    setPreviewOpen(false);
    setBundles(null);
    setGen({ done: 0, total: list.length, name: list[0]?.nama });
    try {
      const out = [];
      for (let i = 0; i < list.length; i++) {
        setGen({ done: i, total: list.length, name: list[i].nama });
        // beri jeda agar UI progress tetap responsif
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 0));
        // eslint-disable-next-line no-await-in-loop
        out.push(await collectBukuIndukData(list[i], activeAcademicYear));
      }
      setBundles(out);
      setDefaultDownload(dlMode || 'gabungan');
      setPreviewOpen(true);
    } finally {
      setGen(null);
    }
  };

  if (!allowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="border-0 shadow-sm max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Akses tidak diizinkan</p>
            <p className="text-sm text-slate-500 mt-1">Menu Buku Induk hanya untuk Admin, Tata Usaha, dan Kepala Sekolah.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <BookText className="w-8 h-8 text-indigo-600" />
            Buku Induk Digital
          </h1>
          <p className="text-slate-500 mt-1">
            Arsip data lengkap siswa (registrasi, legger nilai, rekap kehadiran, catatan, hapalan) — generate, preview, lalu print / unduh PDF.
          </p>
        </div>

        <Tabs defaultValue="siswa">
          <TabsList className="mb-4">
            <TabsTrigger value="siswa">Per Siswa</TabsTrigger>
            <TabsTrigger value="kelas">Per Kelas / Angkatan</TabsTrigger>
          </TabsList>

          <TabsContent value="siswa">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sumber Data</label>
                    <Select
                      value={source}
                      onValueChange={(v) => { setSource(v); setNis(''); setKelasId(''); setAngkatan(''); }}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aktif">Siswa Aktif</SelectItem>
                        <SelectItem value="lulusan">Lulusan (per Angkatan)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {source === 'aktif' ? (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kelas</label>
                      <Select value={kelasId} onValueChange={(v) => { setKelasId(v); setNis(''); }}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                        <SelectContent>
                          {kelasAktifList.map((k) => (
                            <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Angkatan Lulus</label>
                      <Select value={angkatan} onValueChange={(v) => { setAngkatan(v); setNis(''); }}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Tahun Lulus" /></SelectTrigger>
                        <SelectContent>
                          {angkatanList.map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Siswa</label>
                    <Select value={nis} onValueChange={setNis} disabled={siswaOptions.length === 0}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={siswaOptions.length ? 'Pilih Siswa' : 'Pilih kelas/angkatan dulu'} />
                      </SelectTrigger>
                      <SelectContent>
                        {siswaOptions.map((s) => (
                          <SelectItem key={s.id} value={s.nis}>
                            {s.nama} — {s.nis}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedSiswa && (
                  <div className="text-sm text-slate-600 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2.5">
                    <span className="font-semibold text-indigo-700">{selectedSiswa.nama}</span>
                    {' '}· NIS {selectedSiswa.nis}
                    {selectedSiswa.nama_kelas ? ` · ${selectedSiswa.nama_kelas}` : ''}
                    {selectedSiswa.status === 'Lulus' ? ` · Lulus ${selectedSiswa.tahun_lulus || ''}` : ''}
                  </div>
                )}

                <Button
                  className="gap-2"
                  disabled={!selectedSiswa || !!gen}
                  onClick={() => runGenerate([selectedSiswa], 'gabungan')}
                >
                  {gen ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  Generate Buku Induk
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kelas">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sumber Data</label>
                    <Select value={source} onValueChange={(v) => { setSource(v); setKelasId(''); setAngkatan(''); }}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aktif">Kelas Aktif</SelectItem>
                        <SelectItem value="lulusan">Angkatan Lulus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {source === 'aktif' ? (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kelas</label>
                      <Select value={kelasId} onValueChange={setKelasId}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                        <SelectContent>
                          {kelasAktifList.map((k) => (
                            <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Angkatan Lulus</label>
                      <Select value={angkatan} onValueChange={setAngkatan}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Tahun Lulus" /></SelectTrigger>
                        <SelectContent>
                          {angkatanList.map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-end">
                    <div className="flex items-center gap-2 text-sm text-slate-600 px-3 py-2 rounded-lg bg-slate-100 w-full">
                      <Users className="w-4 h-4 text-slate-400 shrink-0" />
                      <span><b>{siswaOptions.length}</b> siswa akan diproses</span>
                    </div>
                  </div>
                </div>

                {siswaOptions.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 text-sm text-slate-600 grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1">
                    {siswaOptions.map((s) => (
                      <span key={s.id} className="truncate">{s.nama}</span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button className="gap-2" disabled={siswaOptions.length === 0 || !!gen} onClick={() => runGenerate(siswaOptions, 'gabungan')}>
                    {gen ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    Generate — PDF Gabungan
                  </Button>
                  <Button variant="outline" className="gap-2" disabled={siswaOptions.length === 0 || !!gen} onClick={() => runGenerate(siswaOptions, 'perSiswa')}>
                    <FileDown className="w-4 h-4" />
                    Generate — PDF Per Siswa
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {gen && (
          <Card className="border-0 shadow-lg fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,420px)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">
                    Mengumpulkan data… {gen.done + 1}/{gen.total}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{gen.name}</p>
                  <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${gen.total ? Math.round((gen.done / gen.total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        )}
      </div>

      <BukuIndukPreviewDialog
        open={previewOpen}
        bundles={bundles}
        defaultDownload={defaultDownload}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}