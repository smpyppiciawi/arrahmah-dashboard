import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function PiketHariIniBadge() {
  const { user } = useAuth();

  const { data: piketList = [] } = useQuery({
    queryKey: ['jadwal-piket'],
    queryFn: () => base44.entities.JadwalPiket.list(),
  });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list(),
  });

  const myPiketDays = useMemo(() => {
    if (!user?.full_name) return [];
    const guru = guruList.find(g => g.nama === user.full_name);
    if (!guru) return [];
    const days = [];
    piketList.forEach(p => {
      if (p.aktif === false) return;
      const petugas = p.petugas || [];
      if (petugas.some(pt => pt.guru_id === guru.id || pt.nama_pegawai === user.full_name)) {
        days.push(p.hari);
      }
    });
    return days;
  }, [piketList, guruList, user]);

  if (myPiketDays.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium border bg-emerald-50 border-emerald-200 text-emerald-700">
      <ShieldCheck className="w-4 h-4" />
      <span className="hidden sm:inline">Piket:</span>
      <span className="font-semibold">{myPiketDays.join(', ')}</span>
    </div>
  );
}