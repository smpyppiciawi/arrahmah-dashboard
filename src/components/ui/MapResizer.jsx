import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Memaksa Leaflet menghitung ulang ukuran container.
 * Mengatasi map yang hanya tampil 1 kotak ketika dirender di dalam Dialog
 * atau container yang baru terlihat (Leaflet perlu invalidateSize).
 */
export default function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const resize = () => map.invalidateSize();
    resize();
    const t = setTimeout(resize, 200);
    const t2 = setTimeout(resize, 600);
    let ro;
    try {
      ro = new ResizeObserver(resize);
      ro.observe(map.getContainer());
    } catch { /* ignore */ }
    return () => { clearTimeout(t); clearTimeout(t2); if (ro) ro.disconnect(); };
  }, [map]);
  return null;
}