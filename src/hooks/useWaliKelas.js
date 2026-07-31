import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

/**
 * Mendeteksi apakah user Guru adalah Wali Kelas.
 * Dicocokkan via nama Guru (entitas Guru) terhadap field `wali_kelas` pada Data Kelas,
 * karena `wali_kelas` menyimpan nama Guru, bukan full_name akun User.
 */
export function useWaliKelas() {
  const { user } = useAuth();
  const isGuru = user?.role === 'guru';

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
    enabled: isGuru,
  });
  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
    enabled: isGuru,
  });
  const { data: siswaAktif = [] } = useQuery({
    queryKey: ['siswa-aktif'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
    enabled: isGuru,
  });

  const guruData = isGuru && user?.email ? guruList.find(g => g.email === user.email) : null;
  const guruNama = guruData?.nama || '';
  const userFullName = user?.full_name || '';

  // Cocokkan wali_kelas terhadap nama Guru maupun full_name (toleransi kedua format)
  const waliKelasIds = isGuru
    ? kelasList.filter(k => (guruNama && k.wali_kelas === guruNama) || k.wali_kelas === userFullName).map(k => k.id)
    : [];
  const isWaliKelas = isGuru ? waliKelasIds.length > 0 : false;
  const hasSiswa = isGuru ? siswaAktif.some(s => waliKelasIds.includes(s.kelas_id)) : false;

  return { isGuru, guruData, guruNama, waliKelasIds, isWaliKelas, hasSiswa, kelasList, siswaAktif };
}