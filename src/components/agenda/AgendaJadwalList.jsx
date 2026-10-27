import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, Clock, Users, CheckCircle2, Circle, CalendarClock,
  ChevronLeft, ChevronRight, FileText, Check, Minus,
} from 'lucide-react';
import { formatTanggal, getHari, geserTanggal, todayISO } from '@/lib/agendaUtils';

function Indikator({ checked, label }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
      checked
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-slate-50 text-slate-400 border-slate-200'
    }`}>
      {checked ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {label}
    </span>
  );
}

export default function AgendaJadwalList({ tanggal, onTanggalChange, rows = [], loading, guruMissing, onOpen }) {
  const terisi = rows.filter((r) => r.agenda).length;
  const hariIni = todayISO();

  return (
    <div>
      <div className="flex flex-col gap-3 pb-3 border-b md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-indigo-500" />
            Jadwal Mengajar — {getHari(tanggal)}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs text-slate-500">{formatTanggal(tanggal)}</p>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
              {terisi} terisi
            </Badge>
            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[11px]">
              {rows.length - terisi} belum
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTanggalChange(geserTanggal(tanggal, -1))}
            title="Hari sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={tanggal === hariIni}
            onClick={() => onTanggalChange(hariIni)}
          >
            Hari Ini
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTanggalChange(geserTanggal(tanggal, 1))}
            title="Hari berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3">
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
            <p className="text-xs text-slate-400 mt-1">Gunakan tombol panah atau pilih tanggal lain untuk melihat jadwal hari lainnya.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const materiTerisi = !!(row.agenda && (row.agenda.materi_pokok || row.agenda.uraian_kegiatan));
              const absensiTerisi = !!(row.agenda && (row.agenda.absensi_agenda || []).length > 0);
              const lengkap = materiTerisi && absensiTerisi;

              return (
                <div
                  key={row.id}
                  className={`flex flex-col gap-3 rounded-lg border p-3 transition sm:flex-row sm:items-center sm:justify-between ${
                    lengkap
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : row.agenda
                        ? 'border-indigo-100 bg-indigo-50/30'
                        : 'border-slate-200 bg-white hover:border-indigo-200'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-indigo-900 leading-tight truncate">{row.nama_kelas}</p>
                    <p className="text-sm text-slate-600 mt-0.5 truncate">{row.mapel}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {row.jam_mulai} - {row.jam_selesai}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {row.jumlah_siswa} Siswa
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Indikator checked={materiTerisi} label="Materi" />
                      <Indikator checked={absensiTerisi} label="Absensi" />
                      {lengkap && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Lengkap
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
                    onClick={() => onOpen(row)}
                  >
                    {row.agenda ? (
                      <><Circle className="w-3.5 h-3.5 mr-1.5 fill-current" /> Buka Agenda</>
                    ) : (
                      <><FileText className="w-3.5 h-3.5 mr-1.5" /> Isi Agenda</>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}