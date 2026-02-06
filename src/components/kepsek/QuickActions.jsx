import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { 
  Users, GraduationCap, Calendar, BookOpen, ClipboardList, 
  Wallet, FileText, Settings, MessageCircle, Phone
} from "lucide-react";

export default function QuickActions({ guruList, onWhatsApp }) {
  const actions = [
    { label: 'Data Siswa', icon: Users, page: 'Siswa', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Data Guru', icon: GraduationCap, page: 'Guru', color: 'bg-violet-500 hover:bg-violet-600' },
    { label: 'Absensi', icon: Calendar, page: 'Absensi', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { label: 'Nilai', icon: BookOpen, page: 'Nilai', color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'Catatan Siswa', icon: ClipboardList, page: 'CatatanSiswa', color: 'bg-purple-500 hover:bg-purple-600' },
    { label: 'Transaksi', icon: Wallet, page: 'Transaksi', color: 'bg-teal-500 hover:bg-teal-600' },
    { label: 'Laporan', icon: FileText, page: 'LaporanKeuangan', color: 'bg-indigo-500 hover:bg-indigo-600' },
    { label: 'Kelola Data', icon: Settings, page: 'KelolaDataKeuangan', color: 'bg-slate-500 hover:bg-slate-600' },
  ];

  return (
    <div className="space-y-4">
      {/* Quick Navigation */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Akses Cepat Menu</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-2">
          {actions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Link key={idx} to={createPageUrl(action.page)}>
                <Button variant="ghost" className={`w-full h-auto flex-col py-3 ${action.color} text-white`}>
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-[10px]">{action.label}</span>
                </Button>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick Contact Guru */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <Phone className="w-4 h-4" /> Hubungi Guru/Pegawai
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
          {guruList.filter(g => g.no_telp).slice(0, 10).map((guru, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">{guru.nama}</p>
                <p className="text-xs text-slate-500">{guru.jabatan}</p>
              </div>
              <Button 
                size="sm" 
                className="bg-emerald-500 hover:bg-emerald-600 h-8"
                onClick={() => onWhatsApp(guru.no_telp, `Halo ${guru.nama},`)}
              >
                <MessageCircle className="w-3 h-3 mr-1" /> WA
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}