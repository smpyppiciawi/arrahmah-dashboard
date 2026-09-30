import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { ShieldCheck, Search, UserPlus, X, Loader2, Users, Eye, EyeOff, CalendarClock } from 'lucide-react';

const HARI_OPTS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const HARI_COLORS = {
  Senin: 'border-blue-200 bg-blue-50/40',
  Selasa: 'border-emerald-200 bg-emerald-50/40',
  Rabu: 'border-amber-200 bg-amber-50/40',
  Kamis: 'border-purple-200 bg-purple-50/40',
  Jumat: 'border-cyan-200 bg-cyan-50/40',
  Sabtu: 'border-rose-200 bg-rose-50/40',
};

export default function JadwalPiketPegawai() {
  const { user } = useAuth();
  const userRole = user?.role || 'guru';
  const isReadOnly = userRole === 'operator';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState({});
  const [showAddFor, setShowAddFor] = useState(null);

  const { data: guruList = [], isLoading: loadingGuru } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list(),
  });

  const { data: piketList = [], isLoading: loadingPiket } = useQuery({
    queryKey: ['jadwal-piket'],
    queryFn: () => base44.entities.JadwalPiket.list(),
  });

  const { data: settings } = useQuery({
    queryKey: ['pengaturan-app'],
    queryFn: () => base44.entities.PengaturanAplikasi.list(),
  });

  const settingRecord = (settings || [])[0];
  const tampilkanStatus = settingRecord?.tampilkan_status_kehadiran_piket !== false;

  const sortedGuru = useMemo(() =>
    [...guruList].filter(g => g.status !== 'Keluar').sort((a, b) => (a.nama || '').localeCompare(b.nama || '')),
    [guruList]);

  const piketByHari = useMemo(() => {
    const map = {};
    HARI_OPTS.forEach(h => { map[h] = { id: null, petugas: [], aktif: true }; });
    piketList.forEach(p => {
      if (p.hari && map[p.hari]) {
        map[p.hari] = { id: p.id, petugas: p.petugas || [], aktif: p.aktif !== false };
      }
    });
    return map;
  }, [piketList]);

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: ['jadwal-piket'] });
    queryClient.invalidateQueries({ queryKey: ['pengaturan-app'] });
  };

  const addPetugas = async (hari, guru) => {
    const existing = piketByHari[hari];
    if (existing.petugas.some(p => p.guru_id === guru.id)) {
      toast({ title: 'Pegawai sudah terdaftar di hari ini' });
      return;
    }
    const newPetugas = [...existing.petugas, { guru_id: guru.id, nama_pegawai: guru.nama, nip: guru.nuptk || '' }];
    try {
      if (existing.id) {
        await base44.entities.JadwalPiket.update(existing.id, { petugas: newPetugas });
      } else {
        await base44.entities.JadwalPiket.create({ hari, petugas: newPetugas, aktif: true });
      }
      toast({ title: 'Petugas ditambahkan', description: `${guru.nama} → ${hari}` });
      reload();
      setSearch(s => ({ ...s, [hari]: '' }));
    } catch (e) {
      toast({ title: 'Gagal menambah', description: e.message, variant: 'destructive' });
    }
  };

  const removePetugas = async (hari, guruId) => {
    const existing = piketByHari[hari];
    const newPetugas = existing.petugas.filter(p => p.guru_id !== guruId);
    try {
      if (existing.id) {
        await base44.entities.JadwalPiket.update(existing.id, { petugas: newPetugas });
      }
      toast({ title: 'Petugas dihapus' });
      reload();
    } catch (e) {
      toast({ title: 'Gagal menghapus', description: e.message, variant: 'destructive' });
    }
  };

  const toggleAktifHari = async (hari) => {
    const existing = piketByHari[hari];
    if (!existing.id) return;
    try {
      await base44.entities.JadwalPiket.update(existing.id, { aktif: existing.aktif === false });
      reload();
    } catch (e) {
      toast({ title: 'Gagal mengubah status', description: e.message, variant: 'destructive' });
    }
  };

  const toggleTampilkanStatus = async (val) => {
    try {
      if (settingRecord?.id) {
        await base44.entities.PengaturanAplikasi.update(settingRecord.id, { tampilkan_status_kehadiran_piket: val });
      } else {
        await base44.entities.PengaturanAplikasi.create({
          tahun_ajaran_aktif: new Date().getFullYear().toString(),
          tampilkan_status_kehadiran_piket: val,
        });
      }
      toast({ title: val ? 'Status kehadiran ditampilkan' : 'Status kehadiran disembunyikan' });
      reload();
    } catch (e) {
      toast({ title: 'Gagal mengubah pengaturan', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-emerald-500" />
              Jadwal Petugas Piket
            </h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              {isReadOnly ? 'Daftar petugas piket pegawai per hari (read-only)' : 'Atur petugas piket pegawai & tampilan status kehadiran di Dashboard'}
            </p>
          </div>
        </div>

        {/* Global Setting - Show/Hide Status Kehadiran */}
        <Card className="border-2 border-emerald-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {tampilkanStatus ? <Eye className="w-5 h-5 text-emerald-600" /> : <EyeOff className="w-5 h-5 text-slate-400" />}
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Tampilkan Status Kehadiran Petugas Piket di Dashboard</h3>
                  <p className="text-xs text-slate-500">Saat aktif, nama & status kehadiran petugas piket tampil di tab Kehadiran Dashboard</p>
                </div>
              </div>
              <Switch
                checked={tampilkanStatus}
                onCheckedChange={toggleTampilkanStatus}
                disabled={isReadOnly}
              />
            </div>
          </CardContent>
        </Card>

        {isReadOnly && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Anda dalam mode read-only. Pengaturan jadwal piket dilakukan oleh Admin/TU.
          </div>
        )}

        {/* Day Cards */}
        {loadingPiket || loadingGuru ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HARI_OPTS.map(hari => {
              const data = piketByHari[hari];
              const q = (search[hari] || '').toLowerCase();
              const filteredGuru = sortedGuru.filter(g =>
                g.nama?.toLowerCase().includes(q) && !data.petugas.some(p => p.guru_id === g.id)
              );
              return (
                <Card key={hari} className={`border-2 shadow-sm ${data.aktif ? HARI_COLORS[hari] : 'border-slate-200 bg-slate-50/50 opacity-70'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-slate-500" />
                        {hari}
                        <Badge className="bg-white/70 text-slate-600 text-xs border-0">{data.petugas.length} petugas</Badge>
                      </CardTitle>
                      {!isReadOnly && data.id && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Aktif</span>
                          <Switch checked={data.aktif} onCheckedChange={() => toggleAktifHari(hari)} />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Petugas list */}
                    {data.petugas.length === 0 ? (
                      <p className="text-sm text-slate-400 py-2 text-center">Belum ada petugas piket</p>
                    ) : (
                      <div className="space-y-1.5">
                        {data.petugas.map((p, idx) => (
                          <div key={p.guru_id} className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </div>
                            <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{p.nama_pegawai}</p>
                              {p.nip && <p className="text-[11px] text-slate-400">NUPTK: {p.nip}</p>}
                            </div>
                            {!isReadOnly && (
                              <button
                                onClick={() => removePetugas(hari, p.guru_id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Hapus dari hari ini"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add petugas */}
                    {!isReadOnly && (
                      <div className="border-t border-slate-200/60 pt-3">
                        {showAddFor === hari ? (
                          <div className="space-y-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input
                                className="pl-9 h-9 text-sm"
                                placeholder="Cari pegawai..."
                                value={search[hari] || ''}
                                onChange={(e) => setSearch(s => ({ ...s, [hari]: e.target.value }))}
                                autoFocus
                              />
                            </div>
                            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                              {filteredGuru.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-3">Tidak ada pegawai ditemukan</p>
                              ) : filteredGuru.slice(0, 8).map(g => (
                                <button
                                  key={g.id}
                                  onClick={() => addPetugas(hari, g)}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 transition-colors text-left border-b border-slate-100 last:border-0"
                                >
                                  <UserPlus className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 truncate">{g.nama}</p>
                                    {g.jabatan && <p className="text-[11px] text-slate-400">{g.jabatan}</p>}
                                  </div>
                                </button>
                              ))}
                            </div>
                            <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddFor(null)}>
                              Selesai
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-dashed text-emerald-600 hover:bg-emerald-50"
                            onClick={() => setShowAddFor(hari)}
                          >
                            <UserPlus className="w-4 h-4 mr-1.5" /> Tambah Petugas
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}