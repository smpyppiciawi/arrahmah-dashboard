import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Home, Search, Edit2, Trash2, MapPin, CloudOff, RefreshCw, Wifi, CheckCircle2, Maximize2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import FloatingAddButton from "@/components/ui/FloatingAddButton";
import HomeVisitForm from "@/components/homevisit/HomeVisitForm";
import MapResizer from "@/components/ui/MapResizer";
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAuth } from '@/lib/AuthContext';
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
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const { user: currentUser } = useAuth();
  const { activeAcademicYear } = useActiveAcademicYear();
  const { pendingCount, pendingItems, syncing, syncNow, addPending, removePending, isOnline } = useOfflineSync();

  const { data: siswaListAll = [] } = useQuery({ queryKey: ['siswa'], queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }) });
  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });
  const { data: homeVisitListAll = [], isLoading } = useQuery({ queryKey: ['homeVisit'], queryFn: () => base44.entities.HomeVisit.list('-tanggal_homevisit') });

  const userRole = currentUser?.role || 'guru';
  const isGuru = userRole === 'guru';
  const waliKelasIds = isGuru
    ? kelasList.filter(k => k.wali_kelas === currentUser?.full_name).map(k => k.id)
    : [];
  const siswaList = isGuru ? siswaListAll.filter(s => waliKelasIds.includes(s.kelas_id)) : siswaListAll;
  const homeVisitList = isGuru ? homeVisitListAll.filter(hv => waliKelasIds.includes(hv.kelas_id)) : homeVisitListAll;

  // Hak akses
  const canCreate = ['admin', 'tu', 'guru'].includes(userRole);
  const canEdit = ['admin', 'tu', 'guru'].includes(userRole);
  const canDelete = userRole === 'admin';

  // Guru yang bukan Wali Kelas tidak memiliki akses menu Home Visit
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
  const belumHomeVisit = siswaList.filter(s => !siswaSudahHomeVisit.has(s.id));

  const filteredList = homeVisitList.filter(hv => {
    const matchSearch = !searchQuery || hv.nama_siswa?.toLowerCase().includes(searchQuery.toLowerCase()) || hv.nis?.includes(searchQuery);
    const matchKelas = filterKelas === 'all' || hv.kelas_id === filterKelas;
    return matchSearch && matchKelas;
  });

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
    { key: 'keadaan_rumah', label: 'Keadaan Rumah', render: (row) => row.keadaan_rumah ? <Badge className={row.keadaan_rumah === 'Layak Huni' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{row.keadaan_rumah}</Badge> : '-' },
    { key: 'tanggal_homevisit', label: 'Tgl Home Visit', render: (row) => row.tanggal_homevisit || '-' },
    { key: 'sync', label: 'Status', sortable: false, filterable: false, render: () => (
      <Badge className="bg-emerald-100 text-emerald-700 gap-1 inline-flex items-center"><CheckCircle2 className="w-3 h-3" /> Tersimpan</Badge>
    )},
    {
      key: 'aksi', label: 'Aksi', sortable: false, filterable: false,
      render: (row) => (
        <div className="flex gap-1">
          {canEdit && <Button size="sm" variant="ghost" onClick={() => { setEditingData(row); setIsOpen(true); }} title="Edit"><Edit2 className="w-4 h-4" /></Button>}
          {canDelete && <Button size="sm" variant="ghost" onClick={() => handleDelete(row)} title="Hapus" className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>}
          {row.koordinat_rumah && (
            <a href={`https://www.google.com/maps?q=${row.koordinat_rumah}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent" title="Lihat Lokasi">
              <MapPin className="w-4 h-4 text-blue-500" />
            </a>
          )}
        </div>
      )
    },
  ];

  const renderMap = () => (
    <MapContainer center={mapCenter} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
      <MapResizer />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
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
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 rounded-xl"><Home className="w-7 h-7 text-indigo-600" /></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Home Visit</h1>
              <p className="text-slate-500 mt-0.5 text-sm">Hasil home visit wali kelas ke rumah siswa</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {isOnline ? <><Wifi className="w-3.5 h-3.5" /> Online</> : <><CloudOff className="w-3.5 h-3.5" /> Mode Offline</>}
          </div>
        </div>

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

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Sudah Home Visit', value: stats.sudah, color: 'text-slate-700' },
            { label: 'Belum Home Visit', value: stats.belum, color: 'text-amber-600' },
            { label: 'Layak Huni', value: stats.layak, color: 'text-emerald-600' },
            { label: 'Tidak Layak Huni', value: stats.tidakLayak, color: 'text-red-600' },
            { label: 'Yatim/Piatu', value: stats.yatim, color: 'text-purple-600' },
          ].map((stat, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {markersWithCoord.length > 0 && (
          <Card className="border-0 shadow-sm mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" /> Penyebaran Rumah Siswa ({markersWithCoord.length})</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setMapFullscreen(true)}><Maximize2 className="w-4 h-4 mr-1" /> Fullscreen</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ height: '450px' }} className="rounded-lg overflow-hidden border border-slate-200 z-0">
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
              <Select value={filterKelas} onValueChange={setFilterKelas}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                </SelectContent>
              </Select>
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
            ) : (
              <DataTable columns={columns} data={filteredList} pageSize={10} />
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
        />
      )}

      <Dialog open={mapFullscreen} onOpenChange={setMapFullscreen}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden">
          <div className="w-full h-full">{renderMap()}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}