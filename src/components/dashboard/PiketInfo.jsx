import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Loader2 } from 'lucide-react';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function PiketInfo({ dateFilter }) {
  const { data: piketList = [], isLoading } = useQuery({
    queryKey: ['jadwal-piket'],
    queryFn: () => base44.entities.JadwalPiket.list(),
  });

  const { data: settings } = useQuery({
    queryKey: ['pengaturan-app'],
    queryFn: () => base44.entities.PengaturanAplikasi.list(),
  });
  const tampilkanStatus = (settings || [])[0]?.tampilkan_status_kehadiran_piket !== false;

  const { data: absensiPegawai = [] } = useQuery({
    queryKey: ['absensi-pegawai-piket', dateFilter],
    queryFn: () => base44.entities.AbsensiPegawai.filter({ tanggal: dateFilter }),
    enabled: tampilkanStatus,
  });

  const hariName = useMemo(() => {
    const d = new Date(dateFilter + 'T00:00:00');
    return HARI[d.getDay()];
  }, [dateFilter]);

  const todayPiket = useMemo(() => {
    const rec = piketList.find(p => p.hari === hariName && p.aktif !== false);
    return rec?.petugas || [];
  }, [piketList, hariName]);

  const getStatus = (guruId) => {
    if (!tampilkanStatus) return null;
    const rec = absensiPegawai.find(a => a.guru_id === guruId);
    if (!rec) return { label: 'Belum', color: 'bg-slate-100 text-slate-500' };
    const s = rec.status;
    if (s === 'Hadir' || s === 'Terlambat') return { label: 'Hadir', color: 'bg-emerald-100 text-emerald-700' };
    if (s === 'Sakit') return { label: 'Sakit', color: 'bg-blue-100 text-blue-700' };
    if (s === 'Izin') return { label: 'Izin', color: 'bg-amber-100 text-amber-700' };
    if (s === 'Alfa') return { label: 'Alfa', color: 'bg-red-100 text-red-700' };
    return { label: s, color: 'bg-slate-100 text-slate-600' };
  };

  if (isLoading) return null;
  if (todayPiket.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-3 mb-4">
      <div className="flex items-center gap-1.5 mb-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Petugas Piket {hariName}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {todayPiket.map((p, idx) => {
          const status = getStatus(p.guru_id);
          return (
            <div key={p.guru_id} className="flex items-center gap-2 bg-white rounded-lg border border-emerald-200 px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-100 w-4 h-4 rounded-full flex items-center justify-center">{idx + 1}</span>
              <span className="text-sm font-medium text-slate-700">{p.nama_pegawai}</span>
              {status && (
                <Badge className={`text-[10px] border-0 ${status.color}`}>{status.label}</Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}