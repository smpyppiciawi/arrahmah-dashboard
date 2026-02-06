import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Users, GraduationCap, Building, Wallet, BookOpen, Calendar, AlertTriangle, Award } from "lucide-react";

export default function StatCards({ stats }) {
  const cards = [
    { label: 'Total Siswa', value: stats.totalSiswa, icon: Users, gradient: 'from-blue-500 to-blue-600', subtext: `${stats.siswaAktif} aktif` },
    { label: 'Total Guru', value: stats.totalGuru, icon: GraduationCap, gradient: 'from-violet-500 to-violet-600', subtext: `${stats.guruAktif} aktif` },
    { label: 'Total Kelas', value: stats.totalKelas, icon: Building, gradient: 'from-emerald-500 to-emerald-600' },
    { label: 'Saldo Keuangan', value: stats.formatRupiah(stats.saldo), icon: Wallet, gradient: stats.saldo >= 0 ? 'from-teal-500 to-teal-600' : 'from-red-500 to-red-600', isSmall: true },
    { label: 'Total Materi', value: stats.totalMateri, icon: BookOpen, gradient: 'from-indigo-500 to-indigo-600' },
    { label: 'Kehadiran Hari Ini', value: `${stats.kehadiranHariIni}%`, icon: Calendar, gradient: 'from-amber-500 to-amber-600' },
    { label: 'Pelanggaran Aktif', value: stats.pelanggaranAktif, icon: AlertTriangle, gradient: stats.pelanggaranAktif > 0 ? 'from-red-500 to-red-600' : 'from-slate-400 to-slate-500' },
    { label: 'Prestasi Bulan Ini', value: stats.prestasiBulanIni, icon: Award, gradient: 'from-yellow-500 to-yellow-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className={`border-0 shadow-sm bg-gradient-to-br ${card.gradient} text-white`}>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <Icon className="w-6 h-6 opacity-80 mb-2" />
                <p className={`font-bold ${card.isSmall ? 'text-sm' : 'text-xl'}`}>{card.value}</p>
                <p className="text-[10px] opacity-80">{card.label}</p>
                {card.subtext && <p className="text-[9px] opacity-60">{card.subtext}</p>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}