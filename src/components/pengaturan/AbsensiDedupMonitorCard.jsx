import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CalendarCheck, ScanLine, CheckCircle2, AlertTriangle } from 'lucide-react';

// Monitor integritas Absensi: deteksi record ganda per tanggal (siswa + tanggal + jenis absensi).
// Pembersihan berjalan otomatis harian (workflow senyap) — kartu ini hanya pemantauan.
export default function AbsensiDedupMonitorCard() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['absensi', 'monitor-dedup', date],
    queryFn: () => base44.entities.Absensi.filter({ tanggal: date }, undefined, 5000),
    enabled: !!date,
  });

  const twinSets = useMemo(() => {
    const groups = {};
    for (const r of records || []) {
      const key = `${r.siswa_id}|${r.jenis_absensi || 'Kehadiran'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return Object.entries(groups)
      .filter(([, list]) => list.length > 1)
      .map(([key, list]) => {
        list.sort((a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());
        const head = list[list.length - 1];
        return {
          key,
          nama_siswa: head.nama_siswa,
          nama_kelas: head.nama_kelas,
          nis: head.nis,
          jenis: head.jenis_absensi || 'Kehadiran',
          status: head.status,
          count: list.length,
        };
      })
      .sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));
  }, [records]);

  const totalDupRecords = twinSets.reduce((n, s) => n + (s.count - 1), 0);
  const clean = twinSets.length === 0;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            Integritas Absensi (Monitor)
          </CardTitle>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44 text-sm h-8" />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Pemantauan record absensi ganda (siswa tercatat lebih dari sekali per tanggal &amp; jenis) untuk tanggal terpilih. Pembersihan berjalan otomatis harian — tidak perlu aktifasi.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Siswa Tercatat Dobel" value={twinSets.length} tone={clean ? 'emerald' : 'amber'} icon={ScanLine} />
          <StatBox label="Record Kelebihan" value={totalDupRecords} tone={clean ? 'emerald' : 'red'} icon={AlertTriangle} />
        </div>

        {clean ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-800">
              {isLoading ? 'Memeriksa...' : 'Data absensi bersih — setiap siswa tercatat tepat satu kali pada tanggal ini.'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {twinSets.map(s => (
                <div key={s.key} className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50/40">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.nama_siswa}</p>
                    <p className="text-[11px] text-slate-500">{s.nama_kelas} · NIS {s.nis || '-'} · {s.jenis}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className="bg-slate-900 text-white text-[11px]">{s.status}</Badge>
                    <Badge className="bg-amber-100 text-amber-700 text-[11px]">×{s.count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-[11px] text-slate-400">
          Kunci deteksi: siswa + tanggal + jenis absensi. Pembersihan otomatis mempertahankan record terakhir (koreksi final petugas).
        </p>
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, tone, icon: Icon }) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium opacity-80">{label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums mt-1">{value}</p>
    </div>
  );
}