import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { Award } from 'lucide-react';

// Kartu Nilai TKA pada Beranda Akun Siswa — hanya tampil jika diaktifkan Admin (Tab TKA, Menu Nilai)
export default function TkaCard({ siswa }) {
  const { activeAcademicYear, pengaturan } = useActiveAcademicYear();
  const tkaAktif = !!pengaturan?.tka_tampil_beranda;

  const { data: tkaList = [] } = useQuery({
    queryKey: ['siswa-tka', siswa?.nis],
    queryFn: () => base44.entities.NilaiTKA.filter({ nis: siswa.nis }),
    enabled: tkaAktif && !!siswa?.nis,
  });

  if (!tkaAktif) return null;
  const tka = tkaList.find(t => t.tahun_ajaran === activeAcademicYear) || tkaList[0];
  if (!tka) return null;

  const rows = [
    { mapel: 'Matematika', nilai: tka.nilai_matematika, kriteria: tka.kriteria_matematika },
    { mapel: 'Bahasa Indonesia', nilai: tka.nilai_bahasa_indonesia, kriteria: tka.kriteria_bahasa_indonesia },
  ].filter(r => r.nilai != null || r.kriteria);
  if (rows.length === 0) return null;

  return (
    <div className="px-4 mb-4">
      <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl p-5 text-white shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4" />
          <p className="font-bold text-sm">Nilai TKA</p>
          <span className="text-[10px] text-white/70">Tes Kemampuan Akademik</span>
        </div>
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.mapel} className="flex items-center justify-between bg-white/10 rounded-2xl px-4 py-2.5">
              <span className="text-xs font-medium">{r.mapel}</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black">{r.nilai != null ? r.nilai : '-'}</span>
                {r.kriteria && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">{r.kriteria}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}