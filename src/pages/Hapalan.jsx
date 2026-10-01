import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, Search, Plus, Trash2, Check, Clock, ChevronRight, Grid3X3, List, CheckCircle2, Circle } from "lucide-react";
import { useAuth } from '@/lib/AuthContext';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { JUZ30_SURAHS } from '@/lib/juz30Surahs';
import { useWaliKelas } from '@/hooks/useWaliKelas';
import { useReadOnly } from '@/hooks/useReadOnly';

const TINGKAT_OPTIONS = ['7', '8', '9'];

// =================== DATA HAPALAN PAGE ===================
function DataHapalanTab() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('surah');
  const [addSurahOpen, setAddSurahOpen] = useState(false);
  const [addDoaOpen, setAddDoaOpen] = useState(false);
  const [tingkat, setTingkat] = useState('7');
  const [selectedSurahs, setSelectedSurahs] = useState([]);
  const [doaList, setDoaList] = useState([{ nama: '' }]);
  const [saving, setSaving] = useState(false);

  const { data: hapalanItems = [] } = useQuery({
    queryKey: ['hapalan-items'],
    queryFn: () => base44.entities.HapalanItem.list('urutan'),
  });

  const surahByTingkat = useMemo(() => {
    const m = { '7': [], '8': [], '9': [] };
    hapalanItems.filter(h => h.jenis === 'Surah').forEach(h => { if (m[h.tingkat]) m[h.tingkat].push(h); });
    return m;
  }, [hapalanItems]);

  const doaByTingkat = useMemo(() => {
    const m = { '7': [], '8': [], '9': [] };
    hapalanItems.filter(h => h.jenis === 'Doa').forEach(h => { if (m[h.tingkat]) m[h.tingkat].push(h); });
    return m;
  }, [hapalanItems]);

  // Surah yg belum ada di database untuk tingkat tertentu
  const availableSurahs = useMemo(() => {
    const existing = new Set(surahByTingkat[tingkat]?.map(h => h.nomor_surah) || []);
    return JUZ30_SURAHS.filter(s => !existing.has(s.nomor));
  }, [surahByTingkat, tingkat]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HapalanItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hapalan-items'] }),
  });

  const handleSaveSurah = async () => {
    if (!selectedSurahs.length) return;
    setSaving(true);
    const existing = hapalanItems.filter(h => h.jenis === 'Surah' && h.tingkat === tingkat).length;
    await base44.entities.HapalanItem.bulkCreate(
      selectedSurahs.map((s, i) => ({
        jenis: 'Surah', nama: s.nama, tingkat, nomor_surah: s.nomor, urutan: existing + i + 1,
      }))
    );
    queryClient.invalidateQueries({ queryKey: ['hapalan-items'] });
    setSelectedSurahs([]);
    setAddSurahOpen(false);
    setSaving(false);
  };

  const handleSaveDoa = async () => {
    const valid = doaList.filter(d => d.nama.trim());
    if (!valid.length) return;
    setSaving(true);
    const existing = hapalanItems.filter(h => h.jenis === 'Doa' && h.tingkat === tingkat).length;
    await base44.entities.HapalanItem.bulkCreate(
      valid.map((d, i) => ({ jenis: 'Doa', nama: d.nama.trim(), tingkat, urutan: existing + i + 1 }))
    );
    queryClient.invalidateQueries({ queryKey: ['hapalan-items'] });
    setDoaList([{ nama: '' }]);
    setAddDoaOpen(false);
    setSaving(false);
  };

  const toggleSurah = (s) => {
    setSelectedSurahs(prev => prev.find(x => x.nomor === s.nomor) ? prev.filter(x => x.nomor !== s.nomor) : [...prev, s]);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="surah">Surah</TabsTrigger>
          <TabsTrigger value="doa">Doa</TabsTrigger>
        </TabsList>

        <TabsContent value="surah" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              {TINGKAT_OPTIONS.map(t => (
                <button key={t} onClick={() => setTingkat(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${tingkat === t ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200 hover:border-green-400'}`}>
                  Kelas {t}
                </button>
              ))}
            </div>
            <Button onClick={() => setAddSurahOpen(true)} className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-1" /> Tambah Surah</Button>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4">
              {surahByTingkat[tingkat]?.length === 0 ? (
                <div className="text-center py-8 text-slate-400"><BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>Belum ada surah untuk Kelas {tingkat}</p></div>
              ) : (
                <div className="space-y-1">
                  {surahByTingkat[tingkat]?.map((item, i) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{item.nama}</p>
                          {item.nomor_surah && <p className="text-xs text-slate-400">QS. {item.nomor_surah}</p>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doa" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              {TINGKAT_OPTIONS.map(t => (
                <button key={t} onClick={() => setTingkat(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${tingkat === t ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-400'}`}>
                  Kelas {t}
                </button>
              ))}
            </div>
            <Button onClick={() => setAddDoaOpen(true)} className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-1" /> Tambah Doa</Button>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4">
              {doaByTingkat[tingkat]?.length === 0 ? (
                <div className="text-center py-8 text-slate-400"><BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>Belum ada doa untuk Kelas {tingkat}</p></div>
              ) : (
                <div className="space-y-1">
                  {doaByTingkat[tingkat]?.map((item, i) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                        <p className="text-sm font-medium">{item.nama}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Tambah Surah */}
      <Dialog open={addSurahOpen} onOpenChange={setAddSurahOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Tambah Surah — Kelas {tingkat}</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            {TINGKAT_OPTIONS.map(t => (
              <button key={t} onClick={() => setTingkat(t)} className={`px-3 py-1 rounded-lg text-sm font-medium border transition ${tingkat === t ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200'}`}>Kelas {t}</button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mb-2">Pilih surah Juz 30 yang belum ditambahkan:</p>
          <div className="overflow-y-auto flex-1 border rounded-lg">
            {availableSurahs.length === 0 ? (
              <p className="text-center py-6 text-sm text-slate-400">Semua surah Juz 30 sudah ditambahkan untuk Kelas {tingkat}</p>
            ) : availableSurahs.map(s => {
              const checked = !!selectedSurahs.find(x => x.nomor === s.nomor);
              return (
                <button key={s.nomor} type="button" onClick={() => toggleSurah(s)} className={`w-full flex items-center gap-3 px-3 py-2 text-sm border-b hover:bg-slate-50 text-left ${checked ? 'bg-green-50' : ''}`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border ${checked ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span>{s.nama}</span>
                  <span className="ml-auto text-xs text-slate-400">QS.{s.nomor}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 pt-3 border-t mt-2">
            <Button variant="outline" onClick={() => { setSelectedSurahs([]); setAddSurahOpen(false); }} className="flex-1">Batal</Button>
            <Button onClick={handleSaveSurah} disabled={!selectedSurahs.length || saving} className="flex-1 bg-green-600 hover:bg-green-700">
              Simpan ({selectedSurahs.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Tambah Doa */}
      <Dialog open={addDoaOpen} onOpenChange={setAddDoaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tambah Doa — Kelas {tingkat}</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            {TINGKAT_OPTIONS.map(t => (
              <button key={t} onClick={() => setTingkat(t)} className={`px-3 py-1 rounded-lg text-sm font-medium border transition ${tingkat === t ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200'}`}>Kelas {t}</button>
            ))}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {doaList.map((d, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input value={d.nama} onChange={e => setDoaList(prev => prev.map((x, j) => j === i ? { ...x, nama: e.target.value } : x))} placeholder={`Nama doa ${i + 1}...`} />
                {doaList.length > 1 && <Button size="sm" variant="ghost" className="text-red-400 px-2" onClick={() => setDoaList(prev => prev.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setDoaList(prev => [...prev, { nama: '' }])} className="w-full border-dashed"><Plus className="w-3.5 h-3.5 mr-1" /> Tambah Doa Lagi</Button>
          <div className="flex gap-2 pt-2 border-t mt-1">
            <Button variant="outline" onClick={() => { setDoaList([{ nama: '' }]); setAddDoaOpen(false); }} className="flex-1">Batal</Button>
            <Button onClick={handleSaveDoa} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-700">Simpan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =================== SETOR HAPALAN PAGE ===================
function SetorHapalanTab({ currentUser, readOnly = false }) {
  const queryClient = useQueryClient();
  const { activeAcademicYear } = useActiveAcademicYear();
  const { waliKelasIds } = useWaliKelas();
  const [selectedKelas, setSelectedKelas] = useState('');
  const [searchSiswa, setSearchSiswa] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });
  const { data: siswaAll = [] } = useQuery({ queryKey: ['siswa'], queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }) });
  const { data: hapalanItems = [] } = useQuery({ queryKey: ['hapalan-items'], queryFn: () => base44.entities.HapalanItem.list('urutan') });
  const { data: hapalanSiswaAll = [] } = useQuery({ queryKey: ['hapalan-siswa'], queryFn: () => base44.entities.HapalanSiswa.list() });

  const isWaliKelas = waliKelasIds.length > 0;
  const myKelas = isWaliKelas ? kelasList.filter(k => waliKelasIds.includes(k.id)) : kelasList;

  const siswaDiKelas = useMemo(() => {
    let list = selectedKelas ? siswaAll.filter(s => s.kelas_id === selectedKelas) : isWaliKelas ? siswaAll.filter(s => waliKelasIds.includes(s.kelas_id)) : siswaAll;
    if (searchSiswa) list = list.filter(s => s.nama.toLowerCase().includes(searchSiswa.toLowerCase()) || s.nis?.includes(searchSiswa));
    return list.sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaAll, selectedKelas, searchSiswa, waliKelasIds, isWaliKelas]);

  // Progress per siswa
  const siswaProgress = useMemo(() => {
    const map = {};
    siswaDiKelas.forEach(s => {
      const tingkat = s.nama_kelas?.charAt(0) || '7';
      const items = hapalanItems.filter(h => h.tingkat === tingkat);
      const sudah = hapalanSiswaAll.filter(hs => hs.siswa_id === s.id && hs.sudah_hapal);
      map[s.id] = { total: items.length, sudah: sudah.length, pct: items.length ? Math.round(sudah.length / items.length * 100) : 0 };
    });
    return map;
  }, [siswaDiKelas, hapalanItems, hapalanSiswaAll]);

  const filteredSiswa = useMemo(() => {
    if (filterStatus === 'all') return siswaDiKelas;
    if (filterStatus === 'done') return siswaDiKelas.filter(s => siswaProgress[s.id]?.pct === 100);
    if (filterStatus === 'partial') return siswaDiKelas.filter(s => { const p = siswaProgress[s.id]; return p && p.pct > 0 && p.pct < 100; });
    if (filterStatus === 'none') return siswaDiKelas.filter(s => siswaProgress[s.id]?.pct === 0);
    return siswaDiKelas;
  }, [siswaDiKelas, filterStatus, siswaProgress]);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select value={selectedKelas} onValueChange={setSelectedKelas}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Semua Kelas</SelectItem>
                {myKelas.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="done">Selesai (100%)</SelectItem>
                <SelectItem value="partial">Sebagian</SelectItem>
                <SelectItem value="none">Belum Ada</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 relative min-w-40">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Cari siswa..." value={searchSiswa} onChange={e => setSearchSiswa(e.target.value)} />
            </div>
            <div className="flex border rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('list')} className={`px-3 py-2 ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}><List className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('grid')} className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}><Grid3X3 className="w-4 h-4" /></button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === 'list' ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-2">
            <div className="divide-y">
              {filteredSiswa.map(s => {
                const prog = siswaProgress[s.id] || { total: 0, sudah: 0, pct: 0 };
                return (
                  <div key={s.id} className="flex items-center justify-between py-3 hover:bg-slate-50 px-2 rounded cursor-pointer" onClick={() => setSelectedSiswa(s)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${prog.pct === 100 ? 'bg-green-500' : prog.pct > 0 ? 'bg-amber-500' : 'bg-slate-400'}`}>
                        {prog.pct === 100 ? <Check className="w-5 h-5" /> : s.nama.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.nama}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className="bg-blue-100 text-blue-700 text-xs">{s.nama_kelas}</Badge>
                          <span className="text-xs text-slate-400">{prog.sudah}/{prog.total} hapalan</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="w-24 bg-slate-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${prog.pct === 100 ? 'bg-green-500' : prog.pct > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} style={{ width: `${prog.pct}%` }} />
                      </div>
                      <span className="text-xs font-medium w-10 text-right">{prog.pct}%</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
              {filteredSiswa.length === 0 && <p className="text-center py-8 text-slate-400">Tidak ada siswa ditemukan</p>}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredSiswa.map(s => {
            const prog = siswaProgress[s.id] || { total: 0, sudah: 0, pct: 0 };
            return (
              <div key={s.id} onClick={() => setSelectedSiswa(s)} className="bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold mx-auto mb-3 ${prog.pct === 100 ? 'bg-green-500' : prog.pct > 0 ? 'bg-amber-500' : 'bg-slate-400'}`}>
                  {prog.pct === 100 ? <Check className="w-6 h-6" /> : s.nama.charAt(0)}
                </div>
                <p className="text-sm font-semibold text-center truncate">{s.nama}</p>
                <p className="text-xs text-center text-slate-400 mb-2">{s.nama_kelas}</p>
                <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                  <div className={`h-2 rounded-full ${prog.pct === 100 ? 'bg-green-500' : prog.pct > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} style={{ width: `${prog.pct}%` }} />
                </div>
                <p className="text-xs text-center text-slate-500">{prog.sudah}/{prog.total} · {prog.pct}%</p>
              </div>
            );
          })}
        </div>
      )}

      {selectedSiswa && (
        <HapalanSiswaDialog
          siswa={selectedSiswa}
          hapalanItems={hapalanItems}
          hapalanSiswaAll={hapalanSiswaAll}
          currentUser={currentUser}
          readOnly={readOnly}
          activeAcademicYear={activeAcademicYear}
          onClose={() => setSelectedSiswa(null)}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ['hapalan-siswa'] })}
        />
      )}
    </div>
  );
}

function HapalanSiswaDialog({ siswa, hapalanItems, hapalanSiswaAll, currentUser, readOnly = false, activeAcademicYear, onClose, onUpdated }) {
  const tingkat = siswa.nama_kelas?.charAt(0) || '7';
  const items = hapalanItems.filter(h => h.tingkat === tingkat);
  const surahItems = items.filter(h => h.jenis === 'Surah');
  const doaItems = items.filter(h => h.jenis === 'Doa');

  // Map hapalan_item_id -> record
  const hapalanMap = useMemo(() => {
    const m = {};
    hapalanSiswaAll.filter(hs => hs.siswa_id === siswa.id).forEach(hs => { m[hs.hapalan_item_id] = hs; });
    return m;
  }, [hapalanSiswaAll, siswa.id]);

  const [saving, setSaving] = useState({});

  const handleToggle = async (item) => {
    const existing = hapalanMap[item.id];
    setSaving(prev => ({ ...prev, [item.id]: true }));
    try {
      if (existing) {
        await base44.entities.HapalanSiswa.update(existing.id, {
          sudah_hapal: !existing.sudah_hapal,
          tanggal_setor: !existing.sudah_hapal ? new Date().toISOString().split('T')[0] : null,
          validator_id: !existing.sudah_hapal ? currentUser?.id : null,
          validator_nama: !existing.sudah_hapal ? currentUser?.full_name : null,
        });
      } else {
        await base44.entities.HapalanSiswa.create({
          siswa_id: siswa.id, nis: siswa.nis, nama_siswa: siswa.nama,
          kelas_id: siswa.kelas_id, nama_kelas: siswa.nama_kelas, tingkat,
          hapalan_item_id: item.id, nama_item: item.nama, jenis: item.jenis,
          sudah_hapal: true,
          tanggal_setor: new Date().toISOString().split('T')[0],
          validator_id: currentUser?.id, validator_nama: currentUser?.full_name,
          tahun_ajaran: activeAcademicYear,
        });
      }
      onUpdated();
    } finally {
      setSaving(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const totalSudah = Object.values(hapalanMap).filter(hs => hs.sudah_hapal).length;
  const pct = items.length ? Math.round(totalSudah / items.length * 100) : 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-600" />
            Hapalan — {siswa.nama}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-3">
          <Badge className="bg-blue-100 text-blue-700">{siswa.nama_kelas}</Badge>
          <div className="flex-1 bg-slate-200 rounded-full h-2.5">
            <div className={`h-2.5 rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-semibold">{totalSudah}/{items.length} ({pct}%)</span>
        </div>
        <div className="overflow-y-auto flex-1 space-y-4">
          {surahItems.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-green-700 mb-2 px-1">Surah ({surahItems.filter(s => hapalanMap[s.id]?.sudah_hapal).length}/{surahItems.length})</h4>
              <div className="space-y-1">
                {surahItems.map((item, i) => {
                  const rec = hapalanMap[item.id];
                  const sudah = rec?.sudah_hapal;
                  return (
                    <button key={item.id} type="button" onClick={() => handleToggle(item)} disabled={saving[item.id] || readOnly}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition ${sudah ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-green-300'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition ${sudah ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                        {sudah && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className={`text-sm flex-1 ${sudah ? 'font-medium text-green-700' : 'text-slate-700'}`}>{item.nama}</span>
                      {rec?.tanggal_setor && sudah && <span className="text-xs text-slate-400">{rec.tanggal_setor}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {doaItems.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-2 px-1">Doa ({doaItems.filter(d => hapalanMap[d.id]?.sudah_hapal).length}/{doaItems.length})</h4>
              <div className="space-y-1">
                {doaItems.map((item, i) => {
                  const rec = hapalanMap[item.id];
                  const sudah = rec?.sudah_hapal;
                  return (
                    <button key={item.id} type="button" onClick={() => handleToggle(item)} disabled={saving[item.id] || readOnly}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition ${sudah ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200 hover:border-purple-300'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition ${sudah ? 'bg-purple-500 border-purple-500' : 'border-slate-300'}`}>
                        {sudah && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className={`text-sm flex-1 ${sudah ? 'font-medium text-purple-700' : 'text-slate-700'}`}>{item.nama}</span>
                      {rec?.tanggal_setor && sudah && <span className="text-xs text-slate-400">{rec.tanggal_setor}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {items.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">Belum ada data hapalan untuk Kelas {tingkat}. Silakan tambahkan di tab Data Hapalan.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// PAI-related mapel keywords for Data Hapalan access
const PAI_MAPEL_KEYWORDS = ['pai', 'akidah', 'akhlak', 'btaq', 'al-qur', 'quran', 'tajwid', 'fiqih', 'fiqh'];

function isPaiGuru(currentUser, pembelajaranList) {
  if (!currentUser) return false;
  const role = currentUser.role;
  if (role === 'admin' || role === 'tu') return true;
  if (role !== 'guru') return false;
  // Check if guru teaches any PAI-related mapel
  const myMapels = pembelajaranList
    .filter(p => p.guru_id === currentUser.id)
    .map(p => (p.mapel || '').toLowerCase());
  return myMapels.some(m => PAI_MAPEL_KEYWORDS.some(kw => m.includes(kw)));
}

// =================== MAIN PAGE ===================
export default function Hapalan() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('setor');
  const readOnly = useReadOnly();

  const { data: pembelajaranList = [] } = useQuery({
    queryKey: ['pembelajaran'],
    queryFn: () => base44.entities.Pembelajaran.list(),
  });

  const canAccessDataHapalan = isPaiGuru(currentUser, pembelajaranList);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-green-100 rounded-xl"><BookOpen className="w-7 h-7 text-green-600" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Hapalan</h1>
            <p className="text-slate-500 text-sm">Setor & monitoring hapalan surah dan doa siswa</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="setor">Setor Hapalan</TabsTrigger>
            {canAccessDataHapalan && !readOnly && (
              <TabsTrigger value="data">Data Hapalan</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="setor">
            <SetorHapalanTab currentUser={currentUser} readOnly={readOnly} />
          </TabsContent>
          {canAccessDataHapalan && !readOnly && (
            <TabsContent value="data">
              <DataHapalanTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}