import { useAuth } from '@/lib/AuthContext';
import { SPMB_AKSES, SPMB_PENUH } from '@/lib/spmbAkses';

export const SPMB_ROLES = SPMB_PENUH;

export default function SpmbGuard({ children, penuh = false }) {
  const { user } = useAuth();
  const role = user?.role || 'guru';
  const izin = penuh ? SPMB_PENUH : SPMB_AKSES;

  if (!izin.includes(role)) {
    return (
      <div className="p-10 text-center text-slate-500">
        <p className="font-semibold text-slate-700">Akses ditolak</p>
        <p className="text-sm mt-1">
          {penuh
            ? 'Halaman ini hanya untuk Admin, TU, Kepala Sekolah, dan Bendahara.'
            : 'Menu SPMB hanya untuk Admin, TU, Kepala Sekolah, Bendahara, Guru, dan Operator.'}
        </p>
      </div>
    );
  }
  return children;
}