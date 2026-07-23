import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, TrendingUp } from "lucide-react";
import ScanAbsensi from '@/components/absensi/ScanAbsensi';
import PendaftaranKartu from '@/components/absensi/PendaftaranKartu';
import IDCardPreview from '@/components/absensi/IDCardPreview';

export default function AbsensiPegawai() {
  const [activeTab, setActiveTab] = useState('scan');
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
    { key: 'scan', label: 'Scan Absensi', icon: Clock, color: 'bg-emerald-500' },
    { key: 'kartu', label: 'Pendaftaran Kartu', icon: Calendar, color: 'bg-purple-500' },
    { key: 'idcard', label: 'Kartu ID', icon: User, color: 'bg-blue-500' },
    { key: 'rekap', label: 'Rekap Bulanan', icon: TrendingUp, color: 'bg-indigo-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-7 h-7 text-emerald-500" /> Absensi Pegawai
          </h1>
          <p className="text-slate-500 mt-1">Sistem absensi otomatis dengan RFID/NFC, QR Code, dan Fingerprint</p>
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

        {activeTab === 'scan' && <ScanAbsensi personType="Pegawai" />}
        {activeTab === 'kartu' && <PendaftaranKartu personType="Pegawai" />}
        {activeTab === 'idcard' && <IDCardPreview personType="Pegawai" />}

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