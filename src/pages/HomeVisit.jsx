import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Home, Search, Edit2, Trash2, MapPin, CloudOff, RefreshCw, Wifi, CheckCircle2, Maximize2, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import FloatingAddButton from "@/components/ui/FloatingAddButton";
import HomeVisitForm from "@/components/homevisit/HomeVisitForm";
import HomeVisitDetailDialog from "@/components/homevisit/HomeVisitDetailDialog";
import MapResizer from "@/components/ui/MapResizer";
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAuth } from '@/lib/AuthContext';
import { useWaliKelas } from '@/hooks/useWaliKelas';
import { useIsMobile } from "@/hooks/use-mobile";
import AppHeader from '@/components/appui/AppHeader';
import SummaryScroll from '@/components/appui/SummaryScroll';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function parseCoord(v) {
  if (!v) return null;
  const parts = v.split(',');
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  return null;
}

export default function HomeVisit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [filterYatim, setFilterYatim] = useState('all');
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapLayer, setMapLayer] = useState('peta');
  const [detailData, setDetailData] = useState(null);
  const isMobile = useIsMobile();
  const [mobileSort, setMobileSort] = useState('terbaru');
  const [mobilePage, setMobilePage] = useState(1);
  const { user: currentUser } = useAuth();
  const { activeAcademicYear } = useActiveAcademicYear();
  const { pendingCount, pendingItems, syncing, syncNow, addPending, removePending, isOnline } = useOfflineSync();

  const { data: siswaListAll = [] } = useQuery({ queryKey: ['siswa'], queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }) });
  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });
  const { data: homeVisitListAll = [], isLoading } = useQuery({ queryKey: ['homeVisit'], queryFn: () => base44.entities.HomeVisit.list('-tanggal_homevisit') });

  const userRole = currentUser?.role || 'guru';
  const isGuru = userRole === 'guru';
  const { waliKelasIds } = useWaliKelas();
  const siswaList = isGuru ? siswaListAll.filter(s => waliKelasIds.includes(s.kelas_id)) : siswaListAll;
  const homeVisitList = isGuru ? homeVisitListAll.filter(hv => waliKelasIds.includes(hv.kelas_id)) : homeVisitListAll;

  // Auto-set kelas pertama milik wali kelas saat komponen dimuat
  React.useEffect(() => {
    if (isGuru && waliKelasIds.length > 0 && filterKelas === 'all') {
      setFilterKelas(waliKelasIds[0]);
    }
  }, [isGuru, waliKelasIds]);

  // Hak akses
  const canCreate = ['admin', 'tu', 'guru'].includes(userRole);
  const canEdit = ['admin', 'tu', 'guru'].includes(userRole);
  const canDelete = ['admin', 'tu'].includes(userRole);

  // Guru yang bukan Wali Kelas tidak memiliki akses menu Home Visit
  const REQUIRED_HV_FIELDS = ['tinggal_dengan','keadaan_orang_tua','pekerjaan_orang_tua','status_tempat_tinggal','keadaan_rumah','siswa_mengaji','orang_tua_merokok','punya_hp_pribadi','pembiayaan_sekolah','periode_uang_jajan'];
  const hvBySiswaId = useMemo(() => {
    const m = {};
    homeVisitList.forEach(hv => { m[hv.siswa_id] = hv; });
    return m;
  }, [homeVisitList]);

  if (isGuru && waliKelasIds.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="p-3 bg-slate-100 rounded-2xl w-fit mx-auto mb-3"><Home className="w-8 h-8 text-slate-400" /></div>
          <h2 className="text-lg font-bold text-slate-700">Menu Home Visit Tidak Tersedia</h2>
          <p className="text-sm text-slate-500 mt-1">Menu ini khusus untuk Guru yang ditunjuk sebagai Wali Kelas dan memiliki siswa. Hubungi Administrator jika merasa ini kekeliruan.</p>
        </div>
      </div>
    );
  }

  const siswaSudahHomeVisit = new Set(homeVisitList.map(hv => hv.siswa_id));
  const getSiswaHvStatus = (siswaId) => {
    const hv = hvBySiswaId[siswaId];
    if (!hv) return 'none';
    const incomplete = REQUIRED_HV_FIELDS.some(f => !hv[f]);
    return incomplete ? 'partial' : 'complete';
  };
  const belumHomeVisit = siswaList.filter(s => !siswaSudahHomeVisit.has(s.id));

  const filteredList = homeVisitList.filter(hv => {
    const matchSearch = !searchQuery || hv.nama_siswa?.toLowerCase().includes(searchQuery.toLowerCase()) || hv.nis?.includes(searchQuery);
    const matchKelas = filterKelas === 'all' || hv.kelas_id === filterKelas;
    const matchYatim = filterYatim === 'all' ||
      (filterYatim === 'yatim' && hv.keadaan_orang_tua?.includes('Yatim'));
    return matchSearch && matchKelas && matchYatim;
  });

  // Urutkan & paginasi khusus tampilan grid mobile
  const mobileSortedList = [...filteredList].sort((a, b) => {
    if (mobileSort === 'nama-asc') return (a.nama_siswa || '').localeCompare(b.nama_siswa || '');
    if (mobileSort === 'nama-desc') return (b.nama_siswa || '').localeCompare(a.nama_siswa || '');
    if (mobileSort === 'terlama') return new Date(a.tanggal_homevisit || 0) - new Date(b.tanggal_homevisit || 0);
    return new Date(b.tanggal_homevisit || 0) - new Date(a.tanggal_homevisit || 0);
  });
  const mobileTotalPages = Math.max(1, Math.ceil(mobileSortedList.length / 5));
  const mobilePageSafe = Math.min(mobilePage, mobileTotalPages);
  const mobilePagedList = mobileSortedList.slice((mobilePageSafe - 1) * 5, mobilePageSafe * 5);

  const markersWithCoord = homeVisitList.filter(hv => hv.koordinat_rumah).map(hv => ({ ...hv, pos: parseCoord(hv.koordinat_rumah) })).filter(hv => hv.pos);
  const mapCenter = markersWithCoord[0]?.pos || [-6.2, 106.8];

  const stats = {
    sudah: homeVisitList.length,
    belum: belumHomeVisit.length,
    layak: homeVisitList.filter(h => h.keadaan_rumah === 'Layak Huni').length,
    tidakLayak: homeVisitList.filter(h => h.keadaan_rumah === 'Tidak Layak Huni').length,
    yatim: homeVisitList.filter(h => h.keadaan_orang_tua?.includes('Yatim')).length,
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus data home visit ${row.nama_siswa}?`)) return;
    try {
      await base44.entities.HomeVisit.delete(row.id);
      queryClient.invalidateQueries({ queryKey: ['homeVisit'] });
      toast({ title: 'Data home visit dihapus' });
    } catch (e) {
      toast({ title: 'Gagal menghapus', description: e.message, variant: 'destructive' });
    }
  };

  const columns = [
    { key: 'nama_siswa', label: 'Nama Siswa' },
    { key: 'nis', label: 'NIS' },
    { key: 'nama_kelas', label: 'Kelas', render: (row) => <Badge className="bg-blue-100 text-blue-700">{row.nama_kelas || '-'}</Badge> },
    { key: 'keadaan_rumah', label: 'Rumah', render: (row) => row.keadaan_rumah ? <Badge className={row.keadaan_rumah === 'Layak Huni' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{row.keadaan_rumah === 'Layak Huni' ? 'Layak' : 'Tidak'}</Badge> : '-' },
    { key: 'keadaan_orang_tua', label: 'Yatim/Piatu', render: (row) => row.keadaan_orang_tua?.includes('Yatim') ? <Badge className="bg-purple-100 text-purple-700">{row.keadaan_orang_tua}</Badge> : '-' },
    { key: 'koordinat_rumah', label: 'Titik', sortable: false, filterable: false, render: (row) => row.koordinat_rumah ? (
      <a href={`https://www.google.com/maps?q=${row.koordinat_rumah}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title={`Buka titik: ${row.koordinat_rumah}`}>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
          <MapPin className="w-3.5 h-3.5 text-blue-500" /> Terisi
        </Button>
      </a>
    ) : <span className="text-xs text-slate-300">-</span> },
    { key: 'sync', label: 'Kelengkapan', sortable: false, filterable: false, render: (row) => {
      const status = getSiswaHvStatus(row.siswa_id);
      if (status === 'complete') return <Badge className="bg-emerald-100 text-emerald-700 gap-1 inline-flex items-center"><CheckCircle2 className="w-3 h-3" /> Lengkap</Badge>;
      if (status === 'partial') return <Badge className="bg-amber-100 text-amber-700 gap-1 inline-flex items-center"><Clock className="w-3 h-3" /> Sebagian</Badge>;
      return <Badge className="bg-slate-100 text-slate-500">-</Badge>;
    }},
  ];

  const renderMap = () => (
    <div className="relative w-full h-full">
      <MapContainer center={mapCenter} zoom={13} scrollWheelZoom className="relative isolate z-0 overflow-hidden" style={{ height: '100%', width: '100%' }}>
        <MapResizer />
        {mapLayer === 'peta' ? (
          <TileLayer key="peta" url="https://mt{s}.google.com/vt/lyrs=m&hl=id&x={x}&y={y}&z={z}" subdomains={['0', '1', '2', '3']} attribution='&copy; Google' />
        ) : (
          <TileLayer key="satelit" url="https://mt{s}.google.com/vt/lyrs=y&hl=id&x={x}&y={y}&z={z}" subdomains={['0', '1', '2', '3']} attribution='&copy; Google' />
        )}
        {markersWithCoord.map(hv => (
          <Marker key={hv.id} position={hv.pos}>
            <Popup>
              <strong>{hv.nama_siswa}</strong><br />
              Kelas: {hv.nama_kelas}<br />
              {hv.keadaan_rumah && <span>Rumah: {hv.keadaan_rumah}</span>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute top-2 right-2 z-10 flex rounded-lg overflow-hidden border border-slate-200 bg-white shadow-md text-xs font-medium">
        <button type="button" onClick={() => setMapLayer('peta')} className={`px-3 py-1.5 ${mapLayer === 'peta' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Peta</button>
        <button type="button" onClick={() => setMapLayer('satelit')} className={`px-3 py-1.5 ${mapLayer === 'satelit' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Satelit</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <AppHeader
          icon={Home}
          tint="indigo"
          title="Home Visit"
          subtitle="Hasil home visit wali kelas ke rumah siswa"
          right={
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {isOnline ? <><Wifi className="w-3.5 h-3.5" /> Online</> : <><CloudOff className="w-3.5 h-3.5" /> Offline</>}
            </div>
          }
        />

        <div className="mb-5" />

        {pendingCount > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CloudOff className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-700">{pendingCount} data home visit menunggu sinkronisasi</p>
                <p className="text-xs text-amber-500">{isOnline ? 'Klik "Sync Sekarang" untuk mengirim ke database' : 'Akan otomatis terkirim saat ada koneksi internet'}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing} className="border-amber-300 text-amber-600">
              {syncing ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Sync...</> : 'Sync Sekarang'}
            </Button>
          </div>
        )}

        {pendingItems.length > 0 && (
          <Card className="border-amber-200 shadow-sm mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><CloudOff className="w-4 h-4 text-amber-500" /> Draft Offline — Menunggu Sync ({pendingItems.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {pendingItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-amber-50 rounded-lg border border-amber-100 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{item.data?.nama_siswa || 'Tanpa Nama'} — {item.data?.nama_kelas || '-'}</p>
                    <p className="text-xs text-slate-400">{item.data?.tanggal_homevisit || '-'} · {new Date(item.created_at).toLocaleString('id-ID')}</p>
                    <Badge className="bg-amber-100 text-amber-700 mt-1">Menunggu Sync</Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing} className="border-amber-300 text-amber-600 h-8 px-2">
                      {syncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Sync'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (window.confirm('Hapus draft offline ini?')) removePending(item.id); }} className="text-red-500 h-8 px-2"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <SummaryScroll items={[
          { label: 'Sudah Visit', value: stats.sudah, accent: 'slate' },
          { label: 'Belum Visit', value: stats.belum, accent: 'amber' },
          { label: 'Layak Huni', value: stats.layak, accent: 'emerald' },
          { label: 'Tidak Layak', value: stats.tidakLayak, accent: 'red' },
          { label: 'Yatim/Piatu', value: stats.yatim, accent: 'purple' },
        ]} />

        {markersWithCoord.length > 0 && (
          <Card className="border-0 shadow-sm mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" /> Penyebaran Rumah Siswa ({markersWithCoord.length})</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setMapFullscreen(true)}><Maximize2 className="w-4 h-4 mr-1" /> Fullscreen</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ height: '450px' }} className="relative isolate rounded-lg overflow-hidden border border-slate-200">
                {renderMap()}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input className="pl-9" placeholder="Cari nama atau NIS siswa..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:contents">
                <Select value={filterKelas} onValueChange={setFilterKelas}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterYatim} onValueChange={setFilterYatim}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="yatim">Yatim/Piatu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Daftar Home Visit ({filteredList.length})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-slate-400">Memuat data...</div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-10">
                <Home className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">Belum ada data home visit</p>
              </div>
            ) : isMobile ? (
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Select value={mobileSort} onValueChange={setMobileSort}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="terbaru">Terbaru</SelectItem>
                      <SelectItem value="terlama">Terlama</SelectItem>
                      <SelectItem value="nama-asc">Nama A-Z</SelectItem>
                      <SelectItem value="nama-desc">Nama Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={mobilePageSafe <= 1} onClick={() => setMobilePage(mobilePageSafe - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="tabular-nums">{mobilePageSafe}/{mobileTotalPages}</span>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={mobilePageSafe >= mobileTotalPages} onClick={() => setMobilePage(mobilePageSafe + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                {mobilePagedList.map(hv => {
                  const status = getSiswaHvStatus(hv.siswa_id);
                  return (
                    <button key={hv.id} type="button" onClick={() => setDetailData(hv)} className="text-left w-full min-w-0 p-3 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-colors overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">{hv.nama_siswa}</span>
                        {status === 'complete' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 gap-1 inline-flex items-center shrink-0"><CheckCircle2 className="w-3 h-3" /> Lengkap</Badge>
                        ) : status === 'partial' ? (
                          <Badge className="bg-amber-100 text-amber-700 gap-1 inline-flex items-center shrink-0"><Clock className="w-3 h-3" /> Sebagian</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 shrink-0">-</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge className="bg-blue-100 text-blue-700">{hv.nama_kelas || '-'}</Badge>
                        {hv.keadaan_rumah && <Badge className={hv.keadaan_rumah === 'Layak Huni' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{hv.keadaan_rumah === 'Layak Huni' ? 'Layak' : 'Tidak'}</Badge>}
                        {hv.keadaan_orang_tua?.includes('Yatim') && <Badge className="bg-purple-100 text-purple-700">{hv.keadaan_orang_tua}</Badge>}
                        {hv.koordinat_rumah && <Badge className="bg-sky-100 text-sky-700 gap-1 inline-flex items-center"><MapPin className="w-3 h-3" /> Titik</Badge>}
                      </div>
                    </button>
                  );
                })}
                </div>
              </div>
            ) : (
              <DataTable columns={columns} data={filteredList} pageSize={10} onRowClick={(row) => setDetailData(row)} />
            )}
          </CardContent>
        </Card>
      </div>

      {canCreate && !isOpen && <FloatingAddButton onClick={() => { setEditingData(null); setIsOpen(true); }} label="Tambah Home Visit" color="indigo" icon={Home} />}

      {isOpen && (
        <HomeVisitForm
          isOpen={isOpen}
          onClose={() => { setIsOpen(false); setEditingData(null); }}
          editingData={editingData}
          siswaList={siswaList}
          kelasList={kelasList}
          currentUser={currentUser}
          activeAcademicYear={activeAcademicYear}
          addPending={addPending}
          waliKelasIds={waliKelasIds}
        />
      )}

      <Dialog open={mapFullscreen} onOpenChange={setMapFullscreen}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden">
          <div className="w-full h-full relative isolate">{renderMap()}</div>
        </DialogContent>
      </Dialog>

      {detailData && (
        <HomeVisitDetailDialog
          data={detailData}
          canEdit={canEdit}
          canDelete={canDelete}
          onClose={() => setDetailData(null)}
          onEdit={(row) => { setDetailData(null); setEditingData(row); setIsOpen(true); }}
          onDelete={(row) => { setDetailData(null); handleDelete(row); }}
        />
      )}
    </div>
  );
}