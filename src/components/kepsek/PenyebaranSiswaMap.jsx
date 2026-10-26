import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Home, Maximize2, Minimize2, X } from 'lucide-react';
import MapResizer from '@/components/ui/MapResizer';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Warna pin per kategori bantuan (dari BiayaKhusus) — data rincian tepat per siswa
const KATEGORI_WARNA = {
  'Yatim/Yatim Piatu Full': '#f97316',
  'Yatim': '#f59e0b',
  'Beasiswa Yayasan': '#8b5cf6',
  'Kurang Mampu': '#f43f5e',
  'Prestasi': '#0ea5e9',
};
const WARNA_HOMEVISIT_YATIM = '#f97316'; // Yatim dari HomeVisit (tanpa BiayaKhusus)

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

const BLUE_PIN = makePinIcon('#3b82f6');

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

// Kategori bantuan siswa — presisi dari BiayaKhusus dulu, baru HomeVisit
function kategoriDibantu(hv, biayaKhususList) {
  const bk = (biayaKhususList || []).find(b => b.siswa_id === hv.siswa_id && KATEGORI_WARNA[b.kategori]);
  if (bk) return bk;
  if (hv.keadaan_orang_tua && hv.keadaan_orang_tua.includes('Yatim')) {
    return { kategori: 'Yatim/Yatim Piatu', warna: WARNA_HOMEVISIT_YATIM };
  }
  return null;
}

export default function PenyebaranSiswaMap({ homeVisitList = [], biayaKhususList = [], isDark = true }) {
  const [fullscreen, setFullscreen] = useState(false);

  const markers = useMemo(() => {
    return homeVisitList
      .filter(hv => hv.koordinat_rumah)
      .map(hv => {
        const kat = kategoriDibantu(hv, biayaKhususList);
        return { ...hv, pos: parseCoord(hv.koordinat_rumah), kat };
      })
      .filter(hv => hv.pos);
  }, [homeVisitList, biayaKhususList]);

  const kategoriCounts = useMemo(() => {
    const map = {};
    markers.forEach(m => { if (m.kat) map[m.kat.kategori] = (map[m.kat.kategori] || 0) + 1; });
    return map;
  }, [markers]);

  const center = markers.length > 0 ? markers[0].pos : [-6.2, 106.8];

  // Teks mengikuti tema aktif agar selalu kontras & terbaca
  const panelCls = isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200 shadow-sm';
  const titleCls = isDark ? 'text-slate-100' : 'text-slate-800';
  const mutedCls = isDark ? 'text-slate-400' : 'text-slate-500';
  const btnCls = isDark
    ? 'bg-slate-700/70 hover:bg-slate-600 text-slate-200 border-slate-600'
    : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200';
  const mapBorder = isDark ? 'border-slate-600' : 'border-slate-200';

  if (markers.length === 0) {
    return (
      <div className={`xp-map-card rounded-2xl backdrop-blur border p-4 ${panelCls}`}>
        <h3 className={`font-bold text-sm flex items-center gap-2 mb-3 ${titleCls}`}>
          <MapPin className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} /> Penyebaran Rumah Siswa
        </h3>
        <div className="text-center py-10">
          <Home className={`w-10 h-10 mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
          <p className={`text-xs ${mutedCls}`}>Belum ada data koordinat rumah siswa</p>
        </div>
      </div>
    );
  }

  const jumlahDibantu = markers.filter(m => m.kat).length;

  const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

  const legend = (overlay = false) => (
    <div className={`flex items-center gap-3 text-[10px] flex-wrap ${overlay ? 'text-white/80' : mutedCls}`}>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Reguler ({markers.length - jumlahDibantu})</span>
      {Object.entries(kategoriCounts).map(([kategori, n]) => (
        <span key={kategori} className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: KATEGORI_WARNA[kategori] || WARNA_HOMEVISIT_YATIM }} />
          {kategori} ({n})
        </span>
      ))}
    </div>
  );

  const mapBody = (heightClass) => (
    <div className={`${heightClass} w-full rounded-lg overflow-hidden border ${mapBorder} z-0 relative`}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <MapResizer />
        <TileLayer
          url="https://mt{s}.google.com/vt/lyrs=m&hl=id&x={x}&y={y}&z={z}"
          subdomains={['0', '1', '2', '3']}
          attribution='&copy; Google'
        />
        {markers.map(hv => (
          <Marker key={hv.id} position={hv.pos} icon={hv.kat ? makePinIcon(hv.kat.warna) : BLUE_PIN}>
            <Popup>
              <div className="text-xs space-y-1" style={{ minWidth: '180px' }}>
                <p className="font-bold text-sm">{hv.nama_siswa}</p>
                <p>Kelas: {hv.nama_kelas}</p>
                {hv.kat && (
                  <p className="font-semibold" style={{ color: hv.kat.warna }}>
                    {hv.kat.kategori}
                  </p>
                )}
                {hv.keadaan_orang_tua && <p>Orang Tua: {hv.keadaan_orang_tua}</p>}
                {hv.pembiayaan_sekolah && <p>Pembiayaan: {hv.pembiayaan_sekolah}</p>}
                {(biayaKhususList || []).filter(b => b.siswa_id === hv.siswa_id).map(b => (
                  <p key={b.id}>
                    {b.nama_iuran || 'Iuran'}: {b.is_gratis ? 'Gratis' : formatRupiah(b.nominal_khusus)}
                    {b.kategori ? ` (${b.kategori})` : ''}
                  </p>
                ))}
                {hv.keadaan_rumah && <p>Rumah: {hv.keadaan_rumah}</p>}
                {hv.tinggal_dengan && <p>Tinggal: {hv.tinggal_dengan}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );

  return (
    <>
      <div className={`xp-map-card rounded-2xl backdrop-blur border p-4 ${panelCls}`}>
        <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
          <h3 className={`font-bold text-sm flex items-center gap-2 ${titleCls}`}>
            <MapPin className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} /> Penyebaran Rumah Siswa
            <span className={`text-xs font-normal ${mutedCls}`}>({markers.length} siswa)</span>
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {legend(false)}
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
        {!fullscreen && mapBody('h-72 md:h-[420px]')}
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/95 backdrop-blur p-2 md:p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-white font-bold text-sm md:text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" /> Penyebaran Rumah Siswa
              <span className="text-white/60 text-xs font-normal">({markers.length} siswa)</span>
            </h3>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20"
              title="Tutup layar penuh"
            >
              <Minimize2 className="w-3.5 h-3.5" /> Tutup
            </button>
          </div>
          <div className="flex-1 min-h-0">{mapBody('h-full')}</div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {legend(true)}
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="md:hidden flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/20"
            >
              <X className="w-3.5 h-3.5" /> Keluar
            </button>
          </div>
        </div>
      )}
    </>
  );
}