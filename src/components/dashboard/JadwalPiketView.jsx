import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Loader2, Users } from 'lucide-react';

const HARI_OPTS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function JadwalPiketView() {
  const { data: piketList = [], isLoading } = useQuery({
    queryKey: ['jadwal-piket'],
    queryFn: () => base44.entities.JadwalPiket.list(),
  });

  const piketByHari = useMemo(() => {
    const map = {};
    HARI_OPTS.forEach(h => { map[h] = { petugas: [], aktif: true }; });
    piketList.forEach(p => {
      if (p.hari && map[p.hari]) {
        map[p.hari] = { petugas: p.petugas || [], aktif: p.aktif !== false };
      }
    });
    return map;
  }, [piketList]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Jadwal Petugas Piket Pegawai
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {HARI_OPTS.map(hari => {
            const data = piketByHari[hari];
            return (
              <div
                key={hari}
                className={`rounded-xl border p-3 ${data.aktif ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50 opacity-60'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-slate-800">{hari}</span>
                  {data.aktif ? (
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">Aktif</Badge>
                  ) : (
                    <Badge className="bg-slate-200 text-slate-500 text-[10px] border-0">Nonaktif</Badge>
                  )}
                </div>
                {data.petugas.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">Belum ada petugas</p>
                ) : (
                  <div className="space-y-1">
                    {data.petugas.map((p, idx) => (
                      <div key={p.guru_id} className="flex items-center gap-2 bg-white rounded-lg border border-slate-100 px-2 py-1.5">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                        <Users className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="text-xs font-medium text-slate-700 truncate">{p.nama_pegawai}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}