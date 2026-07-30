import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MapPin, Crosshair, ExternalLink, Maximize2 } from "lucide-react";
import MapResizer from "@/components/ui/MapResizer";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER = [-6.2, 106.8];

function LocationClicker({ onClick }) {
  useMapEvents({ click(e) { onClick(e.latlng); } });
  return null;
}

function parseCoord(v) {
  if (!v) return null;
  const parts = v.split(',');
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  return null;
}

function MapView({ center, markerPos, onClick, interactive }) {
  return (
    <MapContainer center={center} zoom={15} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
      <MapResizer />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
      {interactive && <LocationClicker onClick={onClick} />}
      {markerPos && <Marker position={[markerPos.lat, markerPos.lng]} />}
    </MapContainer>
  );
}

export default function MapPicker({ value, onChange, height = '320px' }) {
  const [manualInput, setManualInput] = useState(value || '');
  const [fullscreen, setFullscreen] = useState(false);
  const parsed = parseCoord(value);
  const [center, setCenter] = useState(parsed ? [parsed.lat, parsed.lng] : DEFAULT_CENTER);

  useEffect(() => {
    setManualInput(value || '');
    const p = parseCoord(value);
    if (p) setCenter([p.lat, p.lng]);
  }, [value]);

  const handleMapClick = (latlng) => {
    const coordStr = `${latlng.lat.toFixed(6)},${latlng.lng.toFixed(6)}`;
    onChange(coordStr);
    setManualInput(coordStr);
  };

  const handleManualBlur = () => {
    const p = parseCoord(manualInput);
    if (p) { onChange(manualInput); setCenter([p.lat, p.lng]); }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coordStr = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
          onChange(coordStr);
          setManualInput(coordStr);
          setCenter([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.error('Geolocation error:', err)
      );
    }
  };

  const markerPos = parseCoord(value);
  const gmapsUrl = value ? `https://www.google.com/maps?q=${value}` : '#';

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
          <Input value={manualInput} onChange={(e) => setManualInput(e.target.value)} onBlur={handleManualBlur} placeholder="-6.200000,106.800000" className="pl-9 font-mono text-xs" />
        </div>
        <Button type="button" variant="outline" size="icon" onClick={handleGetCurrentLocation} title="Lokasi saat ini">
          <Crosshair className="w-4 h-4 text-blue-500" />
        </Button>
        {value && (
          <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" title="Buka di Google Maps">
            <Button type="button" variant="outline" size="icon">
              <ExternalLink className="w-4 h-4 text-emerald-600" />
            </Button>
          </a>
        )}
        <Button type="button" variant="outline" size="icon" onClick={() => setFullscreen(true)} title="Peta fullscreen">
          <Maximize2 className="w-4 h-4 text-slate-600" />
        </Button>
      </div>
      <div style={{ height }} className="rounded-lg overflow-hidden border border-slate-200 z-0">
        <MapView center={center} markerPos={markerPos} onClick={handleMapClick} interactive />
      </div>
      <p className="text-xs text-slate-400">Klik peta untuk menentukan titik, gunakan tombol lokasi saat ini, atau buka fullscreen untuk tampilan penuh.</p>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-3xl h-[80vh] p-0 overflow-hidden">
          <div className="w-full h-full">
            <MapView center={center} markerPos={markerPos} onClick={handleMapClick} interactive />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}