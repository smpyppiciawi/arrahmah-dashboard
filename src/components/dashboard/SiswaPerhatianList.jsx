import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, UserX, BookX } from "lucide-react";

export default function SiswaPerhatianList({ siswaAbsen = [], siswaNilai = [] }) {
  const allSiswa = [...siswaAbsen.map(s => ({ ...s, type: 'absen' })), ...siswaNilai.map(s => ({ ...s, type: 'nilai' }))];

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-lg font-semibold text-slate-800">Siswa Perlu Perhatian</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {allSiswa.length > 0 ? (
          <div className="space-y-3 max-h-[240px] overflow-y-auto">
            {allSiswa.slice(0, 5).map((siswa, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${siswa.type === 'absen' ? 'bg-red-100' : 'bg-amber-100'}`}>
                    {siswa.type === 'absen' ? (
                      <UserX className="w-4 h-4 text-red-500" />
                    ) : (
                      <BookX className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-700 text-sm">{siswa.nama}</p>
                    <p className="text-xs text-slate-400">{siswa.kelas}</p>
                  </div>
                </div>
                <Badge variant="secondary" className={siswa.type === 'absen' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                  {siswa.type === 'absen' ? `${siswa.jumlah}x Alfa` : `${siswa.jumlah} Belum Tuntas`}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-slate-400">
            <div className="p-4 bg-emerald-50 rounded-full mb-3">
              <AlertTriangle className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm">Semua siswa dalam kondisi baik!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}