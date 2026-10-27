import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Users, CheckCircle2, Circle, CalendarClock } from 'lucide-react';
import { formatTanggal, getHari } from '@/lib/agendaUtils';

export default function AgendaJadwalList({ tanggal, onTanggalChange, rows = [], loading, guruMissing, onOpen }) {
  const terisi = rows.filter((r) => r.agenda).length;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-indigo-500" />
              Jadwal Mengajar — {getHari(tanggal)}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{formatTanggal(tanggal)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              {terisi} terisi
            </Badge>
            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
              {rows.length - terisi} belum
            </Badge>
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => onTanggalChange(e.target.value)}
              className="w-[150px]"
            />
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Memuat jadwal...</p>
          ) : guruMissing ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-slate-600">Akun Anda belum tertaut dengan data Pegawai</p>
              <p className="text-xs text-slate-400 mt-1">Samakan email akun dengan email pada menu Pegawai agar jadwal mengajar muncul. Hubungi Admin/TU.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center">
              <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Tidak ada jadwal mengajar pada {getHari(tanggal)} ini</p>
              <p className="text-xs text-slate-400 mt-1">Pilih tanggal lain yang sesuai hari jadwal mengajar Anda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={`flex flex-col gap-3 rounded-xl border p-3 transition sm:flex-row sm:items-center ${
                    row.agenda ? 'border-emerald-100 bg-emerald-50/40' : 'border-slate-100 bg-white hover:border-indigo-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{row.nama_kelas}</span>
                      <Badge variant="secondary" className="text-[11px]">{row.mapel}</Badge>
                      {row.agenda && (
                        <Badge variant="outline" className="text-[11px] bg-emerald-100 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Sudah diisi
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {row.jam_mulai} – {row.jam_selesai}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {row.jumlah_siswa} siswa
                      </span>
                      <span className="truncate">{row.nama_guru || '—'}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={row.agenda ? 'outline' : 'default'}
                    className={row.agenda ? '' : 'bg-indigo-600 hover:bg-indigo-700'}
                    onClick={() => onOpen(row)}
                  >
                    {row.agenda ? (
                      <><Circle className="w-3.5 h-3.5 mr-1.5 fill-current" /> Buka Agenda</>
                    ) : (
                      'Sesuai Jadwal & Waktu KBM'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}