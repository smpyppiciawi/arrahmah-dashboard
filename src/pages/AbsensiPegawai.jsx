import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, TrendingUp, Send, ClipboardCheck } from "lucide-react";
import PengajuanIzin from '@/components/absensi/PengajuanIzin';
import TugasPiketTab from '@/components/absensi/TugasPiketTab';
import RekapFilter from '@/components/absensi/RekapFilter';
import { useAuth } from '@/lib/AuthContext';
export default function AbsensiPegawai() {
  const { user: currentUser } = useAuth();
  const userRole = currentUser?.role || 'guru';
  const [activeTab, setActiveTab] = useState('pengajuan');
  const [rekapMode, setRekapMode] = useState('hari');
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: rekapList = [] } = useQuery({
    queryKey: ['absensi-pegawai-rekap', dateFrom, dateTo],
    queryFn: () => base44.entities.AbsensiPegawai.list('-tanggal', 2000),
    enabled: activeTab === 'rekap',
  });

  const filteredRekap = useMemo(() => rekapList.filter(a => a.tanggal >= dateFrom && a.tanggal <= dateTo), [rekapList, dateFrom, dateTo]);

  const rekapByDate = useMemo(() => {
    const byDate = {};
    filteredRekap.forEach(a => {
      if (!byDate[a.tanggal]) byDate[a.tanggal] = [];
      byDate[a.tanggal].push(a);
    });
    return byDate;
  }, [filteredRekap]);

  const dates = Object.keys(rekapByDate).sort().reverse();

  const tabs = [
    { key: 'pengajuan', label: 'Pengajuan Izin', icon: Send, color: 'bg-emerald-500' },
    ...(userRole === 'operator' ? [{ key: 'tugas', label: 'Tugas', icon: ClipboardCheck, color: 'bg-amber-500' }] : []),
    { key: 'rekap', label: 'Rekap', icon: TrendingUp, color: 'bg-indigo-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 md:w-7 md:h-7 text-emerald-500" /> Absensi Pegawai
          </h1>
          <p className="text-slate-500 mt-1 text-xs md:text-sm">Sistem absensi otomatis dengan RFID/NFC, QR Code, dan Fingerprint</p>
        </div>

        <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm overflow-x-auto scrollbar-thin w-full lg:w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? `${tab.color} text-white shadow-sm` : 'text-slate-500 hover:text-slate-700'}`}>
                <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'pengajuan' && <PengajuanIzin />}

        {activeTab === 'tugas' && <TugasPiketTab />}

        {activeTab === 'rekap' && (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <RekapFilter mode={rekapMode} setMode={setRekapMode} dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />
              </CardContent>
            </Card>

            {dates.length === 0 ? (
              <Card className="border-0 shadow-sm"><CardContent className="p-16 text-center"><Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Tidak ada data absensi</p></CardContent></Card>
            ) : dates.map(tanggal => {
              const data = rekapByDate[tanggal];
              const hadir = data.filter(a => a.status === 'Hadir').length;
              const terlambat = data.filter(a => a.status === 'Terlambat').length;
              const tidakHadir = data.filter(a => a.status === 'Izin' || a.status === 'Sakit' || a.status === 'Alfa').length;
              return (
                <Card key={tanggal} className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      {format(new Date(tanggal), 'EEEE, d MMMM yyyy')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-emerald-50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-emerald-700">{hadir}</p><p className="text-xs text-emerald-600">Hadir</p></div>
                      <div className="bg-orange-50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-orange-700">{terlambat}</p><p className="text-xs text-orange-600">Terlambat</p></div>
                      <div className="bg-red-50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-red-700">{tidakHadir}</p><p className="text-xs text-red-600">Tidak Hadir</p></div>
                    </div>
                    <div className="space-y-1">
                      {data.sort((a, b) => (a.jam_masuk || '').localeCompare(b.jam_masuk || '')).map((a, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center"><User className="w-4 h-4 text-emerald-600" /></div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">{a.nama_pegawai}</p>
                              <p className="text-xs text-slate-400">{a.jabatan} · {a.nip || '-'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono text-slate-600">{a.jam_masuk}{a.jam_keluar ? ` → ${a.jam_keluar}` : ''}</p>
                            <div className="flex items-center gap-1 justify-end">
                              {a.metode && a.metode !== 'Manual' && <span className="text-[9px] text-slate-400">{a.metode}</span>}
                              <Badge className={`text-[9px] ${a.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700' : a.status === 'Terlambat' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{a.status}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}