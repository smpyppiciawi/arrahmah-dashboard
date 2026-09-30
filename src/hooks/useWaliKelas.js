import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

/**
 * Mendeteksi apakah user Guru adalah Wali Kelas.
 * Kunci utama: Kelas.wali_kelas_id === ID record Guru (relasi ber-ID, tahan perubahan gelar/nama).
 * Fallback sementara: pencocokan nama toleran gelar (untuk data lama yang belum ter-backfill).
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

  // Cocokkan wali_kelas terhadap nama Guru maupun full_name (fallback nama saja)
  // + toleransi gelar: "Henofefa S.Ag., Gr." dikenali sama dengan "Henofefa"
  const normNama = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const tanpaGelar = (s) => normNama(
    String(s || '')
      .split(',')
      .filter(seg => {
        const t = seg.trim();
        if (!t) return false;
        if (t.includes('.')) return false; // gelar belakang berformat S.Ag., Gr., M.Pd. dst
        return !['h', 'hj', 'dr', 'prof', 'ir'].includes(t.toLowerCase()); // gelar depan tanpa titik
      })
      .join(' ')
  );

  const cocokNama = (w) => {
    const nama = String(w || '').trim();
    if (!nama) return false;
    const kandidatUser = [guruNama, userFullName].filter(Boolean);
    return kandidatUser.some(n =>
      nama === n || tanpaGelar(nama) === tanpaGelar(n)
    );
  };

  // Prioritas relasi ber-ID; hanya jika wali_kelas_id kosong (data lama) pakai pencocokan nama
  const waliKelasIds = isGuru
    ? kelasList.filter(k => {
        if (k.wali_kelas_id) return !!guruData && k.wali_kelas_id === guruData.id;
        return cocokNama(k.wali_kelas);
      }).map(k => k.id)
    : [];
  const isWaliKelas = isGuru ? waliKelasIds.length > 0 : false;
  const hasSiswa = isGuru ? siswaAktif.some(s => waliKelasIds.includes(s.kelas_id)) : false;

  return { isGuru, guruData, guruNama, waliKelasIds, isWaliKelas, hasSiswa, kelasList, siswaAktif };
}