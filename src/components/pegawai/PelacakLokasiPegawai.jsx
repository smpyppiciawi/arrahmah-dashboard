import { useEffect } from 'react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { wibNow } from '@/lib/wib';
import {
  posisiSekarang, INTERVAL_UPDATE_MS, AKURASI_MAKS, EVENT_LOKASI_BERUBAH,
} from '@/lib/lokasiPegawai';

// Pelacak lokasi latar: hanya mengirim posisi selama pengguna punya titik aktif
// (sudah absen masuk via wajah dan belum absen pulang). Tidak menampilkan UI.
export default function PelacakLokasiPegawai() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    let berjalan = true;
    let recordId = null;
    let tick = 0;

    const cari = async () => {
      try {
        const rows = await base44.entities.LokasiPegawai.filter({
          aktif: true,
          tanggal: format(wibNow(), 'yyyy-MM-dd'),
        });
        recordId = (rows || []).find((r) => r.created_by_id === user.id)?.id || null;
      } catch (e) {
        recordId = null;
      }
    };

    const kirim = async () => {
      if (!berjalan || !recordId || document.hidden) return;
      try {
        const pos = await posisiSekarang();
        if (!pos || pos.akurasi > AKURASI_MAKS) return;
        await base44.entities.LokasiPegawai.update(recordId, {
          lat: pos.lat,
          lng: pos.lng,
          akurasi: pos.akurasi,
          terakhir_update: new Date().toISOString(),
        });
      } catch (e) {
        // titik tidak lagi dapat diperbarui (mis. sudah pulang) — berhenti mencoba
        recordId = null;
      }
    };

    const putaran = async () => {
      if (!berjalan) return;
      if (!recordId) {
        // tanpa titik aktif, cukup periksa tiap 5 putaran (±5 menit)
        if (tick % 5 === 0) await cari();
        tick++;
        return;
      }
      await kirim();
    };

    const reset = () => { recordId = null; tick = 0; putaran(); };

    putaran();
    const timer = setInterval(putaran, INTERVAL_UPDATE_MS);
    window.addEventListener(EVENT_LOKASI_BERUBAH, reset);
    return () => {
      berjalan = false;
      clearInterval(timer);
      window.removeEventListener(EVENT_LOKASI_BERUBAH, reset);
    };
  }, [user?.id]);

  return null;
}