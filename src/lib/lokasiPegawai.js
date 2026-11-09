// Utilitas pelacakan lokasi pegawai saat hadir (absensi wajah).
import { base44 } from '@/api/base44Client';

export const INTERVAL_UPDATE_MS = 60 * 1000;      // kirim posisi tiap 60 detik
export const STALE_MS = 5 * 60 * 1000;            // titik dianggap kedaluwarsa setelah 5 menit tanpa update
export const AKURASI_MAKS = 300;                  // meter — akurasi lebih buruk tidak dicatat sebagai pembaruan
export const EVENT_LOKASI_BERUBAH = 'lokasi-pegawai-berubah';

/**
 * Ambil posisi GPS perangkat saat ini.
 * Resolve { lat, lng, akurasi } atau reject dengan pesan yang bisa ditampilkan.
 */
export function posisiSekarang(opts = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Perangkat atau browser ini tidak mendukung GPS.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        akurasi: Math.round(p.coords.accuracy),
      }),
      (err) => reject(new Error(err.message || 'Gagal mengambil lokasi GPS.')),
      {
        enableHighAccuracy: true,
        timeout: opts.timeout ?? 15000,
        maximumAge: opts.maximumAge ?? 60000,
      }
    );
  });
}

/**
 * Simpan titik lokasi aktif setelah absensi masuk via wajah berhasil.
 * `geo` = hasil validateGeofence() yang memuat coords/accuracy/distance.
 */
export async function catatLokasiMasuk({ guru, absensiId, tanggal, status, jamMasuk, geo }) {
  if (!guru?.id || !geo?.coords) return null;
  const [lat, lng] = geo.coords;
  const now = new Date().toISOString();
  const rec = await base44.entities.LokasiPegawai.create({
    tanggal,
    guru_id: guru.id,
    nip: guru.nuptk || '',
    nama_pegawai: guru.nama,
    jabatan: guru.jabatan || '',
    absensi_id: absensiId || '',
    status_absensi: status === 'Terlambat' ? 'Terlambat' : 'Hadir',
    metode: 'FaceRecognition',
    lat,
    lng,
    ...(geo.accuracy ? { akurasi: Math.round(geo.accuracy) } : {}),
    ...(typeof geo.distance === 'number' ? { jarak_sekolah: geo.distance } : {}),
    aktif: true,
    jam_masuk: jamMasuk,
    dimulai_at: now,
    terakhir_update: now,
  });
  window.dispatchEvent(new Event(EVENT_LOKASI_BERUBAH));
  return rec;
}

/**
 * Hentikan pelacakan saat pegawai absen pulang: titik tidak lagi tampil di peta.
 */
export async function hentikanLokasi(guruId, tanggal) {
  if (!guruId) return 0;
  const rows = await base44.entities.LokasiPegawai.filter({ guru_id: guruId, tanggal, aktif: true });
  const selesaiAt = new Date().toISOString();
  for (const r of rows || []) {
    await base44.entities.LokasiPegawai.update(r.id, { aktif: false, selesai_at: selesaiAt });
  }
  window.dispatchEvent(new Event(EVENT_LOKASI_BERUBAH));
  return (rows || []).length;
}

/** Umur pembaruan terakhir dalam milidetik. */
export function umurUpdate(iso) {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Date.now() - t;
}