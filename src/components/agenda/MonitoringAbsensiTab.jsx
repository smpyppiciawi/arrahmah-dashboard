import React, { useMemo, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatTanggal, statusChip, statusLetter } from '@/lib/agendaUtils';

export default function MonitoringAbsensiTab({
  tanggal, onTanggalChange, kelasList = [], defaultKelasIds = [], canViewAll,
  siswaList = [], agendaList = [], absensiList = [],
}) {
  const opsiKelas = canViewAll ? kelasList : kelasList.filter((k) => defaultKelasIds.includes(k.id));
  const [kelasId, setKelasId] = useState(opsiKelas[0]?.id || '');

  React.useEffect(() => {
    if (!opsiKelas.some((k) => k.id === kelasId)) setKelasId(opsiKelas[0]?.id || '');
  }, [opsiKelas.map((k) => k.id).join(','), kelasId]);

  const siswaKelas = useMemo(
    () => siswaList.filter((s) => s.kelas_id === kelasId).sort((a, b) => (a.nama || '').localeCompare(b.nama || '')),
    [siswaList, kelasId],
  );

  const piketMap = useMemo(() => {
    const map = {};
    absensiList.forEach((a) => {
      if (a.jenis_absensi === 'Jumat') return;
      if (kelasId && a.kelas_id && a.kelas_id !== kelasId) return;
      map[a.siswa_id] = a.status;
    });
    return map;
  }, [absensiList, kelasId]);

  const agendas = useMemo(
    () => agendaList
      .filter((a) => a.tanggal === tanggal && a.kelas_id === kelasId)
      .sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || '')),
    [agendaList, tanggal, kelasId],
  );

  const agendaMaps = useMemo(
    () => agendas.map((a) => ({
      ...a,
      petaStatus: new Map((a.absensi_agenda || []).map((x) => [x.siswa_id, x.status_agenda])),
    })),
    [agendas],
  );

  const selisih = useMemo(() => {
    return siswaKelas.filter((s) => {
      if (piketMap[s.id] !== 'Hadir') return false;
      return agendaMaps.some((a) => a.petaStatus.has(s.id) && a.petaStatus.get(s.id) !== 'Hadir');
    }).length;
  }, [siswaKelas, piketMap, agendaMaps]);

  return (
    <div className="space-y-3">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-500" />
              Kesesuaian Absensi — {formatTanggal(tanggal)}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Bandingkan absensi petugas piket dengan absensi agenda KBM.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {opsiKelas.length > 1 && (
              <Select value={kelasId} onValueChange={setKelasId}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Kelas" /></SelectTrigger>
                <SelectContent>
                  {opsiKelas.map((k) => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {opsiKelas.length === 1 && (
              <Badge variant="secondary">{opsiKelas[0]?.nama_kelas}</Badge>
            )}
            <Input type="date" value={tanggal} onChange={(e) => onTanggalChange(e.target.value)} className="w-[150px]" />
          </div>
        </CardContent>
      </Card>

      {opsiKelas.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center text-sm text-slate-400">
            Belum ada kelas yang Anda ampu sebagai wali kelas.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-0 shadow-sm"><CardContent className="p-3">
              <p className="text-[11px] text-slate-500">Siswa</p>
              <p className="text-lg font-semibold text-slate-800">{siswaKelas.length}</p>
            </CardContent></Card>
            <Card className="border-0 shadow-sm"><CardContent className="p-3">
              <p className="text-[11px] text-slate-500">Agenda KBM</p>
              <p className="text-lg font-semibold text-slate-800">{agendaMaps.length}</p>
            </CardContent></Card>
            <Card className="border-0 shadow-sm"><CardContent className="p-3">
              <p className="text-[11px] text-slate-500">Tidak ikut KBM</p>
              <p className={`text-lg font-semibold ${selisih > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{selisih}</p>
            </CardContent></Card>
          </div>

          {agendaMaps.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-10 text-center">
                <AlertTriangle className="w-9 h-9 text-amber-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Belum ada agenda KBM pada tanggal ini</p>
                <p className="text-xs text-slate-400 mt-1">Pilih tanggal lain atau tunggu guru mapel mengisi agenda.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="text-left px-3 py-2 sticky left-0 bg-slate-50 min-w-[150px]">Nama Siswa</th>
                      <th className="text-center px-2 py-2 min-w-[78px]">Piket</th>
                      {agendaMaps.map((a) => (
                        <th key={a.id} className="text-center px-2 py-2 min-w-[86px]">
                          <span className="block truncate max-w-[86px]">{a.mapel}</span>
                          <span className="block text-[10px] font-normal normal-case text-slate-400">{a.jam_mulai}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {siswaKelas.map((s) => {
                      const piket = piketMap[s.id] || '';
                      const beda = piket === 'Hadir' && agendaMaps.some((a) => a.petaStatus.has(s.id) && a.petaStatus.get(s.id) !== 'Hadir');
                      return (
                        <tr key={s.id} className={`border-t ${beda ? 'bg-amber-50/70' : ''}`}>
                          <td className="px-3 py-1.5 sticky left-0 bg-inherit">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-800 truncate max-w-[150px]">{s.nama}</span>
                              {beda && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                            </div>
                          </td>
                          <td className="text-center px-2 py-1.5">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md border text-[11px] font-bold ${statusChip(piket)}`}>
                              {statusLetter(piket)}
                            </span>
                          </td>
                          {agendaMaps.map((a) => {
                            const st = a.petaStatus.get(s.id) || '';
                            return (
                              <td key={a.id} className="text-center px-2 py-1.5">
                                {st ? (
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md border text-[11px] font-bold ${statusChip(st)}`}>
                                    {statusLetter(st)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">–</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t px-3 py-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> H=Hadir · I=Izin · S=Sakit · A=Alfa</span>
                <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" /> Hadir di piket tetapi tidak hadir di KBM</span>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}