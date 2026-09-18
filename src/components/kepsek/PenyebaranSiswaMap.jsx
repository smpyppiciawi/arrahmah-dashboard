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

export default function PenyebaranSiswaMap({ homeVisitList = [] }) {
  const markers = useMemo(() => {
    return homeVisitList
      .filter(hv => hv.koordinat_rumah)
      .map(hv => ({ ...hv, pos: parseCoord(hv.koordinat_rumah) }))
      .filter(hv => hv.pos);
  }, [homeVisitList]);

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

  return (
    <div className="rounded-2xl bg-slate-800/50 backdrop-blur border border-slate-700 p-4">
      <h3 className="text-slate-100 font-bold text-sm flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-blue-400" /> Penyebaran Rumah Siswa
        <span className="text-xs text-slate-400 font-normal">({markers.length} siswa)</span>
      </h3>
      <div style={{ height: '320px' }} className="rounded-lg overflow-hidden border border-slate-600 z-0">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
            subdomains={['a', 'b', 'c', 'd']}
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          />
          {markers.map(hv => (
            <Marker key={hv.id} position={hv.pos}>
              <Popup>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-sm">{hv.nama_siswa}</p>
                  <p>Kelas: {hv.nama_kelas}</p>
                  {hv.keadaan_rumah && <p>Rumah: {hv.keadaan_rumah}</p>}
                  {hv.tinggal_dengan && <p>Tinggal: {hv.tinggal_dengan}</p>}
                  {hv.pembiayaan_sekolah && <p>Pembiayaan: {hv.pembiayaan_sekolah}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}