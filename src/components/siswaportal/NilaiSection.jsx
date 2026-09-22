import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { getTingkatAktif } from '@/lib/fotoSiswa';
import { ChevronRight, User } from 'lucide-react';

const isTuntas = (n) => (n.status_ketuntasan ? n.status_ketuntasan === 'Tuntas' : (n.nilai || 0) >= (n.kkm || 75));

export default function NilaiSection({ siswa, nilaiList = [] }) {
  const [selectedMapel, setSelectedMapel] = useState(null);
  const { activeAcademicYear } = useActiveAcademicYear();
  const tingkat = getTingkatAktif(siswa);

  const { data: pembelajaranList = [] } = useQuery({
    queryKey: ['portal-pembelajaran', siswa?.kelas_id],
    queryFn: () => base44.entities.Pembelajaran.filter({ kelas_id: siswa.kelas_id }),
    enabled: !!siswa?.kelas_id,
  });

  // Hanya nilai jenjang aktif (nama_kelas diawali tingkat aktif; tanpa kelas -> cocokkan tahun ajaran aktif)
  const nilaiAktif = useMemo(() => nilaiList.filter(n => {
    if (!tingkat) return true;
    const kelasTingkat = String(n.nama_kelas || '').trim().charAt(0);
    if (kelasTingkat) return kelasTingkat === tingkat;
    return activeAcademicYear ? n.tahun_ajaran === activeAcademicYear : true;
  }), [nilaiList, tingkat, activeAcademicYear]);

  // Ringkasan satu baris per Mapel (gabungan semester)
  const mapelRows = useMemo(() => {
    const map = new Map();
    nilaiAktif.forEach(n => {
      if (!n.mapel) return;
      if (!map.has(n.mapel)) map.set(n.mapel, []);
      map.get(n.mapel).push(n);
    });
    return Array.from(map.entries()).map(([mapel, records]) => {
      const tuntas = records.filter(isTuntas).length;
      const guru = pembelajaranList
        .filter(p => p.mapel === mapel)
        .sort((a, b) => String(b.tahun_ajaran || '').localeCompare(String(a.tahun_ajaran || '')))[0]?.nama_guru || '';
      return {
        mapel,
        guru,
        records: [...records].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
        rata: records.length ? Math.round(records.reduce((s, n) => s + (n.nilai || 0), 0) / records.length) : 0,
        tuntas,
        belum: records.length - tuntas,
        semester: [...new Set(records.map(r => r.semester).filter(Boolean))].join(', '),
        tahunAjaran: [...new Set(records.map(r => r.tahun_ajaran).filter(Boolean))].join(', '),
      };
    }).sort((a, b) => a.mapel.localeCompare(b.mapel));
  }, [nilaiAktif, pembelajaranList]);

  const totalTuntas = useMemo(() => nilaiAktif.filter(isTuntas).length, [nilaiAktif]);
  const rataAll = nilaiAktif.length ? Math.round(nilaiAktif.reduce((s, n) => s + (n.nilai || 0), 0) / nilaiAktif.length) : 0;
  const totalBelum = nilaiAktif.length - totalTuntas;

  // Rincian detail per semester untuk popup
  const detailBySemester = useMemo(() => {
    if (!selectedMapel) return [];
    const sems = ['Ganjil', 'Genap'].filter(s => selectedMapel.records.some(r => r.semester === s));
    const groups = sems.map(s => ({ label: `Semester ${s}`, records: selectedMapel.records.filter(r => r.semester === s) }));
    const others = selectedMapel.records.filter(r => !sems.includes(r.semester));
    if (others.length) groups.push({ label: 'Tanpa Semester', records: others });
    return groups;
  }, [selectedMapel]);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 px-5 pt-10 pb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
        <h2 className="text-white font-black text-2xl flex items-center gap-3 relative">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl backdrop-blur-sm border border-white/30">📊</div>
          Nilai
        </h2>
        <p className="text-white/80 text-xs mt-2 relative">
          Jenjang {tingkat || '-'}{activeAcademicYear ? ` · T.A. ${activeAcademicYear}` : ''}
        </p>
      </div>

      <div className="px-4 mt-4">
        {/* Summary: rata-rata + total tuntas/belum */}
        <div className="bg-white rounded-3xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Rata-rata Nilai{tingkat ? ` · Jenjang ${tingkat}` : ''}</p>
              <p className={`text-4xl font-black ${rataAll >= 75 ? 'text-blue-600' : 'text-red-500'}`}>{nilaiAktif.length ? rataAll : '-'}</p>
            </div>
            <div className="w-20 h-20 rounded-full border-8 border-blue-100 flex items-center justify-center">
              <div className="text-center">
                <p className="text-xs font-bold text-emerald-600">{totalTuntas}</p>
                <p className="text-[9px] text-slate-400">Tuntas</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            <div className="flex-1 bg-emerald-50 rounded-2xl px-3 py-2 text-center">
              <p className="text-lg font-black text-emerald-600">{totalTuntas}</p>
              <p className="text-[10px] text-emerald-500">Tuntas</p>
            </div>
            <div className="flex-1 bg-red-50 rounded-2xl px-3 py-2 text-center">
              <p className="text-lg font-black text-red-500">{totalBelum}</p>
              <p className="text-[10px] text-red-400">Belum Tuntas</p>
            </div>
            <div className="flex-1 bg-blue-50 rounded-2xl px-3 py-2 text-center">
              <p className="text-lg font-black text-blue-600">{nilaiAktif.length}</p>
              <p className="text-[10px] text-blue-400">Total Nilai</p>
            </div>
          </div>
        </div>

        {/* Daftar per Mapel */}
        <div className="space-y-2">
          {mapelRows.map(row => (
            <button
              key={row.mapel}
              onClick={() => setSelectedMapel(row)}
              className="w-full text-left bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm">{row.mapel}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <User className="w-3 h-3 shrink-0" /> {row.guru || 'Guru belum diatur'}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {row.semester && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{row.semester}</span>}
                  {row.tahunAjaran && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{row.tahunAjaran}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-black text-slate-800 leading-none">{row.rata}</p>
                <p className="text-[9px] text-emerald-600 font-semibold mt-1">{row.tuntas} Tuntas</p>
                <p className="text-[9px] text-red-400 font-semibold">{row.belum} Belum</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          ))}
          {mapelRows.length === 0 && (
            <div className="bg-white rounded-3xl shadow-sm py-12 text-center">
              <span className="text-5xl block mb-3">📊</span>
              <p className="text-slate-400 text-sm">Belum ada data nilai jenjang ini</p>
            </div>
          )}
        </div>

        <p className="text-[10px] text-slate-400 text-center mt-4">
          Nilai jenjang sebelumnya dapat dilihat pada Rapor / Rekap Legger di Admin.
        </p>
      </div>

      {/* Popup Detail Nilai per Mapel */}
      <Dialog open={!!selectedMapel} onOpenChange={(o) => !o && setSelectedMapel(null)}>
        <DialogContent className="max-w-md p-0 gap-0 rounded-3xl overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
            <DialogTitle className="text-base font-black text-slate-800">{selectedMapel?.mapel}</DialogTitle>
            <p className="text-xs text-slate-400">
              {selectedMapel?.guru ? `${selectedMapel.guru} · ` : ''}
              {selectedMapel?.semester}{selectedMapel?.tahunAjaran ? ` · ${selectedMapel.tahunAjaran}` : ''}
            </p>
          </DialogHeader>
          <div className="px-4 py-4 overflow-y-auto space-y-4">
            {detailBySemester.map(grp => (
              <div key={grp.label}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">{grp.label}</p>
                <div className="space-y-2">
                  {grp.records.map((n, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700">{n.jenis_penilaian}</p>
                        {n.kompetensi_bab && <p className="text-[10px] text-slate-400 truncate">{n.kompetensi_bab}</p>}
                        {n.tahun_ajaran && <p className="text-[9px] text-slate-400 mt-0.5">{n.tahun_ajaran}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-black ${isTuntas(n) ? 'text-emerald-600' : 'text-red-500'}`}>{n.nilai}</p>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isTuntas(n) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {isTuntas(n) ? 'Tuntas' : 'Belum Tuntas'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}