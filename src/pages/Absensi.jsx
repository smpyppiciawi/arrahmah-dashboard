import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, AlertTriangle, CalendarDays, History, CheckCircle, UserX } from "lucide-react";
import AbsensiKehadiran from '@/components/absensi/AbsensiKehadiran';
import AbsensiJumat from '@/components/absensi/AbsensiJumat';
import RiwayatAbsensi from '@/components/absensi/RiwayatAbsensi';
import RekapFilter from '@/components/absensi/RekapFilter';
import AppHeader from '@/components/appui/AppHeader';
import PillTabs from '@/components/appui/PillTabs';
export default function Absensi() {
  const [activeTab, setActiveTab] = useState('rekap');
  const [rekapMode, setRekapMode] = useState('hari');
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: allAbsensi = [] } = useQuery({
    queryKey: ['absensi-rekap', dateFrom, dateTo],
    queryFn: () => base44.entities.Absensi.list('-tanggal', 2000),
    enabled: activeTab === 'rekap',
  });

  const filteredAbsensi = useMemo(() => allAbsensi.filter(a => a.tanggal >= dateFrom && a.tanggal <= dateTo), [allAbsensi, dateFrom, dateTo]);

  const rekapByDate = useMemo(() => {
    const byDate = {};
    filteredAbsensi.forEach(a => {
      if (!byDate[a.tanggal]) byDate[a.tanggal] = { kehadiran: [], jumat: [] };
      if (a.jenis_absensi === 'Jumat') byDate[a.tanggal].jumat.push(a);
      else byDate[a.tanggal].kehadiran.push(a);
    });
    return byDate;
  }, [filteredAbsensi]);

  const dates = Object.keys(rekapByDate).sort().reverse();

  const tabs = [
    { key: 'rekap', label: 'Rekap', icon: CalendarDays, color: 'bg-emerald-500' },
    { key: 'kehadiran', label: 'Absensi Kehadiran', icon: CheckCircle, color: 'bg-emerald-500' },
    { key: 'jumat', label: 'Absensi Jumat', icon: Users, color: 'bg-emerald-500' },
    { key: 'riwayat', label: 'Riwayat', icon: History, color: 'bg-blue-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <AppHeader icon={Calendar} tint="emerald" title="Absensi Siswa" subtitle="Rekap & pencatatan kehadiran harian" />

        <div className="sticky top-14 lg:top-0 z-30 bg-slate-50/95 backdrop-blur-md -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 py-2.5 border-b border-slate-100">
          <PillTabs
            tabs={tabs.map(t => ({ key: t.key, label: t.label, icon: t.icon }))}
            activeKey={activeTab}
            onChange={setActiveTab}
            tint="emerald"
          />
        </div>

        {activeTab === 'rekap' && (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <RekapFilter mode={rekapMode} setMode={setRekapMode} dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />
              </CardContent>
            </Card>

            {dates.length === 0 ? (
              <Card className="border-0 shadow-sm"><CardContent className="p-16 text-center"><CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Tidak ada data absensi pada rentang tanggal ini</p></CardContent></Card>
            ) : dates.map(tanggal => {
              const data = rekapByDate[tanggal];
              const dateObj = new Date(tanggal);
              const isFriday = dateObj.getDay() === 5;
              const tidakHadir = data.kehadiran.filter(a => a.status !== 'Hadir');
              const jumatTidakHadir = data.jumat.filter(a => a.status === 'Alfa');
              const hadirSekolahIds = data.kehadiran.filter(a => a.status === 'Hadir').map(a => a.siswa_id);
              const jumatAlfaIds = data.jumat.filter(a => a.status === 'Alfa').map(a => a.siswa_id);
              const anomalies = jumatAlfaIds.filter(id => hadirSekolahIds.includes(id));
              const anomalyStudents = data.jumat.filter(a => anomalies.includes(a.siswa_id));

              return (
                <Card key={tanggal} className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      {format(dateObj, 'EEEE, d MMMM yyyy', { locale: idLocale })}
                      {isFriday && <Badge className="bg-indigo-100 text-indigo-700">Jumat</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-emerald-50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-emerald-700">{data.kehadiran.filter(a => a.status === 'Hadir').length}</p><p className="text-xs text-emerald-600">Hadir</p></div>
                      <div className="bg-red-50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-red-700">{tidakHadir.length}</p><p className="text-xs text-red-600">Tidak Hadir</p></div>
                      {isFriday && <div className="bg-indigo-50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-indigo-700">{jumatTidakHadir.length}</p><p className="text-xs text-indigo-600">Tidak Jumat</p></div>}
                      {anomalies.length > 0 && <div className="bg-amber-50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-amber-700">{anomalies.length}</p><p className="text-xs text-amber-600">Hadir≠Jumat</p></div>}
                    </div>

                    {tidakHadir.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1"><UserX className="w-3 h-3 text-red-500" /> Tidak Hadir Sekolah (per Kelas):</p>
                        <div className="space-y-2">
                          {(() => {
                            const byKelas = {};
                            tidakHadir.forEach(a => {
                              const k = a.nama_kelas || 'Tanpa Kelas';
                              if (!byKelas[k]) byKelas[k] = [];
                              byKelas[k].push(a);
                            });
                            return Object.keys(byKelas).sort((a, b) => a.localeCompare(b, 'id')).map(kelas => {
                              const items = byKelas[kelas].sort((a, b) => (a.nama_siswa || '').localeCompare(b.nama_siswa || '', 'id'));
                              return (
                                <div key={kelas} className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                                  <p className="text-[11px] font-bold text-slate-700 mb-1">{kelas} — {items.length} siswa</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {items.map(a => <Badge key={a.id} className={`text-xs ${a.status === 'Sakit' ? 'bg-amber-100 text-amber-700' : a.status === 'Izin' ? 'bg-blue-100 text-blue-700' : a.status === 'Alfa' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{a.nama_siswa} ({a.status}{a.keterangan ? `: ${a.keterangan}` : ''})</Badge>)}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {isFriday && jumatTidakHadir.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1"><Users className="w-3 h-3 text-indigo-500" /> Tidak Ikut Jumat/Keputrian:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {jumatTidakHadir.map(a => <Badge key={a.id} className="text-xs bg-indigo-100 text-indigo-700">{a.nama_siswa}</Badge>)}
                        </div>
                      </div>
                    )}

                    {anomalyStudents.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Hadir Sekolah tapi Tidak Ikut Jumat/Keputrian:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {anomalyStudents.map(a => <Badge key={a.id} className="text-xs bg-amber-100 text-amber-800 border border-amber-300">{a.nama_siswa}</Badge>)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'kehadiran' && <AbsensiKehadiran />}
        {activeTab === 'jumat' && <AbsensiJumat />}
        {activeTab === 'riwayat' && <RiwayatAbsensi />}
      </div>
    </div>
  );
}