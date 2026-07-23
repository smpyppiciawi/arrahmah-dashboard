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
import ScanAbsensi from '@/components/absensi/ScanAbsensi';
import PendaftaranKartu from '@/components/absensi/PendaftaranKartu';
import IDCardPreview from '@/components/absensi/IDCardPreview';
import { ScanLine, CreditCard, User as UserIcon } from "lucide-react";
import { useAuth } from '@/lib/AuthContext';

export default function Absensi() {
  const { user: currentUser } = useAuth();
  const userRole = currentUser?.role || 'guru';
  const canManageKartu = ['admin', 'tu', 'kepsek'].includes(userRole);

  const [activeTab, setActiveTab] = useState('rekap');
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
    { key: 'scan', label: 'Scan Absensi', icon: ScanLine, color: 'bg-emerald-500' },
    { key: 'rekap', label: 'Rekap Harian', icon: CalendarDays, color: 'bg-emerald-500' },
    { key: 'kehadiran', label: 'Absensi Kehadiran', icon: CheckCircle, color: 'bg-emerald-500' },
    { key: 'jumat', label: 'Absensi Jumat', icon: Users, color: 'bg-emerald-500' },
    ...(canManageKartu ? [
      { key: 'kartu', label: 'Pendaftaran Kartu', icon: CreditCard, color: 'bg-purple-500' },
      { key: 'idcard', label: 'Kartu ID', icon: UserIcon, color: 'bg-blue-500' },
    ] : []),
    { key: 'riwayat', label: 'Riwayat', icon: History, color: 'bg-blue-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-emerald-500" /> Absensi Siswa
          </h1>
        </div>

        <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm w-fit overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? `${tab.color} text-white` : 'text-slate-500 hover:text-slate-700'}`}>
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'rekap' && (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1"><Label className="text-xs text-slate-500 font-medium mb-1 block">Dari Tanggal</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" /></div>
                  <div className="flex-1"><Label className="text-xs text-slate-500 font-medium mb-1 block">Sampai Tanggal</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" /></div>
                </div>
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
                        <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1"><UserX className="w-3 h-3 text-red-500" /> Tidak Hadir Sekolah:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {tidakHadir.map(a => <Badge key={a.id} className={`text-xs ${a.status === 'Sakit' ? 'bg-amber-100 text-amber-700' : a.status === 'Izin' ? 'bg-blue-100 text-blue-700' : a.status === 'Alfa' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{a.nama_siswa} ({a.status})</Badge>)}
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

        {activeTab === 'scan' && <ScanAbsensi personType="Siswa" />}
        {activeTab === 'kehadiran' && <AbsensiKehadiran />}
        {activeTab === 'jumat' && <AbsensiJumat />}
        {activeTab === 'kartu' && <PendaftaranKartu personType="Siswa" />}
        {activeTab === 'idcard' && <IDCardPreview personType="Siswa" />}
        {activeTab === 'riwayat' && <RiwayatAbsensi />}
      </div>
    </div>
  );
}