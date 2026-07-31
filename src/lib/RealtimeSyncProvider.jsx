import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Entitas inti yang perubahan datanya harus tercermin real-time di seluruh halaman aktif.
const SYNCED_ENTITIES = [
  'Siswa', 'Guru', 'Kelas', 'Absensi', 'AbsensiPegawai', 'Keuangan', 'Nilai',
  'Pelanggaran', 'Prestasi', 'UKS', 'Menstruasi', 'IzinSiswa', 'IzinPegawai',
  'HomeVisit', 'PeriodikSiswa', 'KartuAbsensi', 'DataWajah', 'JadwalAbsensi',
  'JadwalBel', 'TarifIuran', 'BiayaKhusus', 'UangKas', 'Sarpras', 'DataLulusan',
  'SiswaKeluar', 'KalenderAkademik', 'Pengumuman', 'Materi', 'Pembelajaran',
  'JadwalPelajaran', 'Mapel', 'RencanaBelanja', 'TindakLanjut', 'KodePelanggaran',
  'Golongan', 'TipeTransaksi', 'KategoriTransaksi', 'SumberDana', 'PengaturanAplikasi'
];

/**
 * Berlangganan perubahan data (create/update/delete) pada entitas inti
 * dan meng-invalidasi cache react-query secara global (dengan debounce)
 * sehingga setiap halaman aktif otomatis me-refresh datanya tanpa reload.
 */
export default function RealtimeSyncProvider({ children }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let timer = null;
    const triggerSync = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        queryClient.invalidateQueries();
      }, 350);
    };

    const unsubs = SYNCED_ENTITIES.map((name) => {
      try {
        return base44.entities[name]?.subscribe?.(() => triggerSync());
      } catch {
        return null;
      }
    }).filter(Boolean);

    return () => {
      if (timer) clearTimeout(timer);
      unsubs.forEach((u) => {
        try { u(); } catch { /* noop */ }
      });
    };
  }, [queryClient]);

  return children;
}