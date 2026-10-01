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

// Pin dari SVG: biru = reguler, orange = Yatim/Piatu/Yatim Piatu/Beasiswa
const makePinIcon = (color) => L.divIcon({
  className: 'custom-pin-icon',
  html: `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.7 13 21 13 21s13-11.3 13-21C26 5.8 20.2 0 13 0z" fill="${color}" stroke="white" stroke-width="1.5"/><circle cx="13" cy="13" r="4.5" fill="white" opacity="0.9"/></svg>`,
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -32],
});

const BLUE_PIN = makePinIcon('#3b82f6');
const ORANGE_PIN = makePinIcon('#f97316');

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

// Siswa terdata dibantu: Yatim/Piatu/Yatim Piatu (HomeVisit) atau
// kategori BiayaKhusus mengandung Yatim/Beasiswa
function isDibantu(hv, biayaKhususList) {
  if (hv.keadaan_orang_tua && hv.keadaan_orang_tua.includes('Yatim')) return true;
  return (biayaKhususList || []).some(b =>
    b.siswa_id === hv.siswa_id &&
    ((b.kategori || '').includes('Yatim') || (b.kategori || '').includes('Beasiswa'))
  );
}

export default function PenyebaranSiswaMap({ homeVisitList = [], biayaKhususList = [] }) {
  const markers = useMemo(() => {
    return homeVisitList
      .filter(hv => hv.koordinat_rumah)
      .map(hv => ({ ...hv, pos: parseCoord(hv.koordinat_rumah), dibantu: isDibantu(hv, biayaKhususList) }))
      .filter(hv => hv.pos);
  }, [homeVisitList, biayaKhususList]);

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

  const jumlahDibantu = markers.filter(m => m.dibantu).length;

  return (
    <div className="rounded-2xl bg-slate-800/50 backdrop-blur border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-slate-100 font-bold text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" /> Penyebaran Rumah Siswa
          <span className="text-xs text-slate-400 font-normal">({markers.length} siswa)</span>
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Reguler</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Yatim/Piatu/Beasiswa ({jumlahDibantu})</span>
        </div>
      </div>
      <div style={{ height: '320px' }} className="rounded-lg overflow-hidden border border-slate-600 z-0">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://mt{s}.google.com/vt/lyrs=m&hl=id&x={x}&y={y}&z={z}"
            subdomains={['0', '1', '2', '3']}
            attribution='&copy; Google'
          />
          {markers.map(hv => (
            <Marker key={hv.id} position={hv.pos} icon={hv.dibantu ? ORANGE_PIN : BLUE_PIN}>
              <Popup>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-sm">{hv.nama_siswa}</p>
                  <p>Kelas: {hv.nama_kelas}</p>
                  {hv.keadaan_rumah && <p>Rumah: {hv.keadaan_rumah}</p>}
                  {hv.tinggal_dengan && <p>Tinggal: {hv.tinggal_dengan}</p>}
                  {hv.pembiayaan_sekolah && <p>Pembiayaan: {hv.pembiayaan_sekolah}</p>}
                  {hv.dibantu && <p className="text-orange-600 font-semibold">Yatim/Piatu/Beasiswa</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}