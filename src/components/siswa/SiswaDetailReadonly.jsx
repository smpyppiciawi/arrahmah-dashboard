import React, { useState } from 'react';
import SiswaDetailDialog from '@/components/siswa/SiswaDetailDialog';
import SiswaFotoViewer from '@/components/siswa/SiswaFotoViewer';

// Popup detail siswa untuk laporan/dashboard: isi sama dengan Menu Siswa,
// tanpa tombol aksi (read-only) — hanya foto & data.
export default function SiswaDetailReadonly({ siswa, onClose }) {
  const [foto, setFoto] = useState(null);
  if (!siswa) return null;

  return (
    <>
      <SiswaDetailDialog
        siswa={siswa}
        onClose={onClose}
        canEdit={false}
        onLihatFoto={(s) => setFoto(s)}
      />
      {foto && <SiswaFotoViewer siswa={foto} onClose={() => setFoto(null)} />}
    </>
  );
}