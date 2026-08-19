// Utilitas geolokasi & geofence untuk absensi pegawai/siswa.
import { base44 } from '@/api/base44Client';

/**
 * Haversine distance dalam meter antara dua koordinat [lat, lng].
 */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // meter
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Parse string koordinat "lat,lng" → [lat, lng] atau null.
 */
export function parseCoord(coordStr) {
  if (!coordStr || typeof coordStr !== 'string') return null;
  const parts = coordStr.split(',').map((s) => parseFloat(s.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  return parts;
}

/**
 * Validasi geofence: ambil posisi GPS saat ini, bandingkan dengan koordinat sekolah
 * dari ProfilSekolah. Mengembalikan { ok, distance, radius, coords, message }.
 */
export async function validateGeofence() {
  // Ambil profil sekolah (asumsi 1 record aktif)
  const profilList = await base44.entities.ProfilSekolah.list('-updated_date', 1);
  const profil = profilList[0];
  if (!profil || !profil.koordinat) {
    return { ok: true, reason: 'no_profile', message: 'Koordinat sekolah belum diset — geofence dilewati.' };
  }
  const schoolCoord = parseCoord(profil.koordinat);
  if (!schoolCoord) {
    return { ok: true, reason: 'invalid_coord', message: 'Koordinat sekolah tidak valid — geofence dilewati.' };
  }
  const radius = profil.radius_absensi_meter || 1000;

  // Ambil posisi GPS
  const pos = await new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolokasi tidak didukung perangkat ini.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => reject(new Error(err.message || 'Gagal mengambil lokasi GPS.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });

  const distance = haversineMeters(pos.lat, pos.lng, schoolCoord[0], schoolCoord[1]);
  const ok = distance <= radius;
  return {
    ok,
    distance,
    radius,
    coords: [pos.lat, pos.lng],
    accuracy: pos.accuracy,
    schoolCoord,
    message: ok
      ? `Berada dalam radius sekolah (${distance}m / ${radius}m).`
      : `Di luar radius sekolah (${distance}m > ${radius}m). Absensi diblokir.`,
  };
}