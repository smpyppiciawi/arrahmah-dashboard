import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Award, Heart, Droplets, FileText, ClipboardList, ChevronRight } from "lucide-react";

export default function CatatanSiswaDashboardTab({ dateFilter, setDateFilter, pelanggaranList, prestasiList, uksList, menstruasiList, izinList }) {
  const sections = [
    {
      key: 'pelanggaran', title: 'Pelanggaran', icon: AlertTriangle, color: 'text-red-500', items: pelanggaranList || [],
      render: i => ({ main: i.nama_siswa, sub: i.nama_kelas, extra: `${i.poin ?? 0} poin`, tag: i.status, tagCls: i.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700' }),
    },
    {
      key: 'prestasi', title: 'Prestasi', icon: Award, color: 'text-yellow-500', items: prestasiList || [],
      render: i => ({ main: i.nama_siswa, sub: i.nama_kelas, extra: i.nama_prestasi, tag: i.tingkat, tagCls: 'bg-emerald-50 text-emerald-700' }),
    },
    {
      key: 'uks', title: 'UKS', icon: Heart, color: 'text-pink-500', items: uksList || [],
      render: i => ({ main: i.nama_siswa, sub: i.nama_kelas, extra: i.keluhan, tag: i.status, tagCls: i.status === 'Di UKS' ? 'bg-amber-50 text-amber-700' : i.status === 'Pulang' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700' }),
    },
    {
      key: 'menstruasi', title: 'Menstruasi', icon: Droplets, color: 'text-pink-400', items: menstruasiList || [],
      render: i => ({ main: i.nama_siswa, sub: i.nama_kelas, extra: '', tag: '', tagCls: '' }),
    },
    {
      key: 'izin', title: 'Izin', icon: FileText, color: 'text-amber-500', items: izinList || [],
      render: i => ({ main: i.nama_siswa, sub: i.nama_kelas, extra: i.alasan === 'Lainnya' && i.alasan_manual ? i.alasan_manual : i.alasan, tag: i.jam_izin, tagCls: 'bg-amber-50 text-amber-700' }),
    },
  ];

  return (
    <div className="space-y-3">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-violet-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Rekap Catatan Siswa</h3>
          </div>
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-44 text-sm h-8" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sections.map(s => {
          const Icon = s.icon;
          const items = s.items.slice(0, 5);
          return (
            <Card key={s.key} className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Icon className={`w-4 h-4 ${s.color}`} /> {s.title}</CardTitle>
                  <Badge className="bg-slate-100 text-slate-700">{s.items.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-1.5">
                {items.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-4">Tidak ada data</p>
                ) : items.map((i, idx) => {
                  const r = s.render(i);
                  return (
                    <div key={idx} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-slate-100 last:border-0">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{r.main}</p>
                        <p className="text-slate-500 truncate">{r.sub}{r.extra ? ` · ${r.extra}` : ''}</p>
                      </div>
                      {r.tag && <Badge className={`text-[10px] ${r.tagCls}`}>{r.tag}</Badge>}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center">
        <Link to="/CatatanSiswa" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
          Lihat Rekap Lengkap di Menu Catatan Siswa <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}