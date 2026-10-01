import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Home } from 'lucide-react';

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

export default function PenyebaranSiswaMap({ homeVisitList = [], biayaKhususList = [] }) {
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

  if (markers.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-800/50 backdrop-blur border border-slate-700 p-4">
        <h3 className="text-slate-100 font-bold text-sm flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-blue-400" /> Penyebaran Rumah Siswa
        </h3>
        <div className="text-center py-10">
          <Home className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-xs">Belum ada data koordinat rumah siswa</p>
        </div>
      </div>
    );
  }

  const jumlahDibantu = markers.filter(m => m.kat).length;

  const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

  return (
    <div className="rounded-2xl bg-slate-800/50 backdrop-blur border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-slate-100 font-bold text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" /> Penyebaran Rumah Siswa
          <span className="text-xs text-slate-400 font-normal">({markers.length} siswa)</span>
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Reguler ({markers.length - jumlahDibantu})</span>
          {Object.entries(kategoriCounts).map(([kategori, n]) => (
            <span key={kategori} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: KATEGORI_WARNA[kategori] || WARNA_HOMEVISIT_YATIM }} />
              {kategori} ({n})
            </span>
          ))}
        </div>
      </div>
      <div className="h-72 md:h-[480px] rounded-lg overflow-hidden border border-slate-600 z-0">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
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
    </div>
  );
}