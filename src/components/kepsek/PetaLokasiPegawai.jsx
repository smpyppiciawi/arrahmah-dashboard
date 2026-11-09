import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { MapPin, Radio, Loader2, Maximize2, Minimize2, Navigation, RefreshCw } from 'lucide-react';
import MapResizer from '@/components/ui/MapResizer';
import { STALE_MS, umurUpdate } from '@/lib/lokasiPegawai';
import { wibNow } from '@/lib/wib';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const WARNA = { Hadir: '#10b981', Terlambat: '#f59e0b', Stale: '#94a3b8' };

const iconCache = {};
const makePinIcon = (color) => {
  if (!iconCache[color]) {
    iconCache[color] = L.divIcon({
      className: 'custom-pin-icon',
      html: `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.7 13 21 13 21s13-11.3 13-21C26 5.8 20.2 0 13 0z" fill="${color}" stroke="white" stroke-width="1.5"/><circle cx="13" cy="13" r="4.5" fill="white" opacity="0.9"/></svg>`,
      iconSize: [26, 34],
      iconAnchor: [13, 34],
      popupAnchor: [0, -32],
    });
  }
  return iconCache[color];
};

const jamDari = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : format(d, 'HH:mm');
};

const umurTeks = (iso) => {
  const ms = umurUpdate(iso);
  if (!Number.isFinite(ms)) return 'belum pernah';
  const menit = Math.floor(ms / 60000);
  if (menit < 1) return 'baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  return `${Math.floor(menit / 60)} jam lalu`;
};

export default function PetaLokasiPegawai({ isDark = true }) {
  const [fullscreen, setFullscreen] = useState(false);

  const { data: lokasiList = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['lokasiPegawai-aktif'],
    queryFn: () => base44.entities.LokasiPegawai.filter({ aktif: true, tanggal: format(wibNow(), 'yyyy-MM-dd') }),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const markers = useMemo(() => (lokasiList || [])
    .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
    .map((r) => {
      const stale = umurUpdate(r.terakhir_update) > STALE_MS;
      return { ...r, pos: [r.lat, r.lng], stale, warna: stale ? WARNA.Stale : (WARNA[r.status_absensi] || WARNA.Hadir) };
    }), [lokasiList]);

  const jumlahStale = markers.filter((m) => m.stale).length;

  const panelCls = isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200 shadow-sm';
  const titleCls = isDark ? 'text-slate-100' : 'text-slate-800';
  const mutedCls = isDark ? 'text-slate-400' : 'text-slate-500';
  const btnCls = isDark
    ? 'bg-slate-700/70 hover:bg-slate-600 text-slate-200 border-slate-600'
    : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200';
  const mapBorder = isDark ? 'border-slate-600' : 'border-slate-200';

  const legend = (
    <div className={`flex items-center gap-3 text-[10px] flex-wrap ${mutedCls}`}>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: WARNA.Hadir }} /> Hadir</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: WARNA.Terlambat }} /> Terlambat</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: WARNA.Stale }} /> Tanpa update &gt; 5 mnt</span>
    </div>
  );

  const mapBody = (heightClass) => {
    const center = markers.length > 0 ? markers[0].pos : [-6.2, 106.8];
    return (
      <div className={`${heightClass} w-full rounded-lg overflow-hidden border ${mapBorder} z-0 relative`}>
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          <MapResizer />
          <TileLayer
            url="https://mt{s}.google.com/vt/lyrs=m&hl=id&x={x}&y={y}&z={z}"
            subdomains={['0', '1', '2', '3']}
            attribution='&copy; Google'
          />
          {markers.map((m) => (
            <Marker key={m.id} position={m.pos} icon={makePinIcon(m.warna)}>
              <Popup>
                <div className="text-xs space-y-1" style={{ minWidth: '190px' }}>
                  <p className="font-bold text-sm">{m.nama_pegawai}</p>
                  <p>{m.jabatan || 'Pegawai'}{m.nip ? ` · ${m.nip}` : ''}</p>
                  <p className="font-semibold" style={{ color: m.warna }}>
                    {m.status_absensi}{m.stale ? ' · titik kedaluwarsa' : ''}
                  </p>
                  <p>Masuk: {m.jam_masuk || '-'}</p>
                  <p>Update terakhir: {jamDari(m.terakhir_update)} ({umurTeks(m.terakhir_update)})</p>
                  {typeof m.akurasi === 'number' && <p>Akurasi GPS: ±{m.akurasi} m</p>}
                  {typeof m.jarak_sekolah === 'number' && <p>Jarak ke sekolah: {m.jarak_sekolah} m</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    );
  };

  return (
    <>
      <div className={`xp-map-card rounded-2xl backdrop-blur border p-4 ${panelCls}`}>
        <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
          <div className="min-w-0">
            <h3 className={`font-bold text-sm flex items-center gap-2 ${titleCls}`}>
              <Navigation className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} /> Lokasi Pegawai Hadir
              <span className={`text-xs font-normal ${mutedCls}`}>({markers.length} terpantau)</span>
            </h3>
            <p className={`text-[10px] mt-0.5 ${mutedCls}`}>
              Titik aktif selama pegawai berstatus hadir (absensi wajah) — hilang otomatis saat absen pulang.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border ${btnCls}`}>
              <Radio className="w-3 h-3 text-emerald-500" /> {isFetching ? 'memperbarui…' : 'otomatis 30 dtk'}
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors ${btnCls}`}
              title="Muat ulang posisi"
            >
              <RefreshCw className="w-3 h-3" /> Muat Ulang
            </button>
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors ${btnCls}`}
              title="Perbesar peta (layar penuh)"
            >
              <Maximize2 className="w-3 h-3" /> Layar Penuh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            <span className={`text-xs ${mutedCls}`}>Memuat posisi pegawai…</span>
          </div>
        ) : markers.length === 0 ? (
          <div className="text-center py-10">
            <MapPin className={`w-10 h-10 mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-xs ${mutedCls}`}>Belum ada pegawai hadir dengan lokasi terpantau hari ini</p>
          </div>
        ) : (
          <>
            {!fullscreen && mapBody('h-72 md:h-[420px]')}
            <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
              {legend}
              {jumlahStale > 0 && <span className="text-[10px] text-amber-500">{jumlahStale} titik tanpa update &gt; 5 menit</span>}
            </div>
          </>
        )}
      </div>

      {fullscreen && markers.length > 0 && (
        <div className="fixed inset-0 z-[80] bg-slate-950/95 backdrop-blur p-2 md:p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-white font-bold text-sm md:text-base flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-400" /> Lokasi Pegawai Hadir
              <span className="text-white/60 text-xs font-normal">({markers.length} terpantau)</span>
            </h3>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20"
            >
              <Minimize2 className="w-3.5 h-3.5" /> Tutup
            </button>
          </div>
          <div className="flex-1 min-h-0">{mapBody('h-full')}</div>
        </div>
      )}
    </>
  );
}