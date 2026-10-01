import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { HandHeart, Users } from 'lucide-react';

const KATEGORI = [
  { nama: 'Yatim/Yatim Piatu Full', warna: '#f97316' },
  { nama: 'Yatim', warna: '#f59e0b' },
  { nama: 'Beasiswa Yayasan', warna: '#8b5cf6' },
  { nama: 'Kurang Mampu', warna: '#f43f5e' },
  { nama: 'Prestasi', warna: '#0ea5e9' },
];

// Laporan Siswa Dibantu/Beasiswa — siswa yang terdata menerima keringanan
// (BiayaKhusus). Filter jenis beasiswa lewat chip, sekaligus total per jenis.
export default function BeasiswaDibantuWidget({ biayaKhususList = [], siswaList = [], isDark, t }) {
  const [filter, setFilter] = useState('Semua');

  const { groups, total } = useMemo(() => {
    const siswaById = {};
    (siswaList || []).forEach(s => { siswaById[s.id] = s; });
    const map = {}; // kategori -> { siswa_id: { nama, kelas } }
    (biayaKhususList || []).forEach(b => {
      if (!b.siswa_id || !KATEGORI.some(k => k.nama === b.kategori)) return; // Lainnya tidak ditampilkan
      if (!map[b.kategori]) map[b.kategori] = {};
      const sw = siswaById[b.siswa_id];
      map[b.kategori][b.siswa_id] = {
        nama: sw?.nama || b.nama_siswa || b.siswa_id,
        kelas: sw?.nama_kelas || b.nama_kelas || '',
      };
    });
    const groups = KATEGORI
      .filter(k => map[k.nama])
      .map(k => ({
        kategori: k.nama,
        warna: k.warna,
        siswa: Object.entries(map[k.nama]).map(([id, v]) => ({ id, ...v })),
      }));
    const total = groups.reduce((s, g) => s + g.siswa.length, 0);
    return { groups, total };
  }, [biayaKhususList, siswaList]);

  const visible = filter === 'Semua' ? groups : groups.filter(g => g.kategori === filter);

  return (
    <div className={`rounded-2xl ${t.card} p-3 md:p-4`}>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className={`${t.text} font-bold text-sm flex items-center gap-2`}>
          <HandHeart className="w-4 h-4 text-orange-500" /> Siswa Dibantu / Beasiswa
        </h3>
        <Badge className="bg-orange-100 text-orange-700"><Users className="w-3 h-3 mr-1" /> {total} siswa</Badge>
      </div>

      {groups.length === 0 ? (
        <p className={`text-center py-6 text-xs ${t.textMuted}`}>Belum ada data keringanan (Biaya Khusus)</p>
      ) : (
        <>
          {/* Filter + Total per Jenis Beasiswa */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-3">
            {groups.map(g => {
              const active = filter === g.kategori;
              return (
                <button
                  key={g.kategori}
                  onClick={() => setFilter(active ? 'Semua' : g.kategori)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap border transition-all shrink-0 ${active ? 'text-white border-transparent shadow-sm' : isDark ? 'bg-slate-700/40 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  style={active ? { backgroundColor: g.warna } : undefined}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: active ? 'rgba(255,255,255,0.85)' : g.warna }} />
                  {g.kategori}
                  <span className={`px-1.5 rounded-full text-[10px] font-bold ${active ? 'bg-white/25' : isDark ? 'bg-slate-600/60' : 'bg-slate-100'}`}>{g.siswa.length}</span>
                </button>
              );
            })}
          </div>

          {/* Daftar siswa per kategori terpilih */}
          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 space-y-2">
            {visible.map(g => (
              <div key={g.kategori}>
                <div className={`flex items-center justify-between px-3 py-1.5 ${isDark ? 'bg-slate-700/40' : 'bg-slate-50'}`}>
                  <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${t.text}`}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: g.warna }} />
                    {g.kategori}
                  </span>
                  <span className={`text-[10px] ${t.textMuted}`}>{g.siswa.length} siswa</span>
                </div>
                {[...g.siswa].sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id')).map(s => (
                  <div key={s.id} className={`flex items-center justify-between px-3 py-1.5 text-xs border-b border-slate-100 last:border-0 ${isDark ? 'bg-slate-800/40' : 'bg-white'}`}>
                    <span className={`font-medium ${t.text} truncate`}>{s.nama}</span>
                    {s.kelas && <Badge className="bg-slate-100 text-slate-600 shrink-0">{s.kelas}</Badge>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}