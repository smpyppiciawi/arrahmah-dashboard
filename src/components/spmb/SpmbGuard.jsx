import { useAuth } from '@/lib/AuthContext';

export const SPMB_ROLES = ['admin', 'tu', 'kepsek', 'bendahara'];

export default function SpmbGuard({ children }) {
  const { user } = useAuth();
  const role = user?.role || 'guru';
  if (!SPMB_ROLES.includes(role)) {
    return (
      <div className="p-10 text-center text-slate-500">
        <p className="font-semibold text-slate-700">Akses ditolak</p>
        <p className="text-sm mt-1">Menu SPMB hanya untuk Admin, TU, Kepala Sekolah, dan Bendahara.</p>
      </div>
    );
  }
  return children;
}