import { useAuth } from '@/lib/AuthContext';

// Role dengan hak akses hanya melihat data (read-only)
export function useReadOnly() {
  const { user } = useAuth();
  return user?.role === 'yayasan';
}