import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { HandHeart } from 'lucide-react';

const KATEGORI_ORDER = ['Yatim/Yatim Piatu Full', 'Yatim', 'Beasiswa Yayasan', 'Kurang Mampu', 'Prestasi', 'Lainnya'];

// Laporan Siswa Dibantu/Beasiswa — siswa yang terdata menerima keringanan
// (BiayaKhusus): yatim/piatu, beasiswa yayasan, kurang mampu, prestasi, dll.
export default function BeasiswaDibantuWidget({ biayaKhususList = [], siswaList = [], isDark, t }) {
  const { groups, total } = useMemo(() => {
    const siswaById = {};
    (siswaList || []).forEach(s => { siswaById[s.id] = s; });
    const map = {}; // kategori -> { siswa_id: nama }
    (biayaKhususList || []).forEach(b => {
      if (!b.siswa_id) return;
      const kat = b.kategori || 'Lainnya';
      if (!map[kat]) map[kat] = {};
      map[kat][b.siswa_id] = siswaById[b.siswa_id]?.nama || b.nama_siswa || b.siswa_id;
    });
    const groups = Object.entries(map)
      .map(([kategori, siswaMap]) => ({ kategori, siswa: Object.entries(siswaMap).map(([id, nama]) => ({ id, nama })) }))
      .sort((a, b) => (KATEGORI_ORDER.indexOf(a.kategori) + 99) - (KATEGORI_ORDER.indexOf(b.kategori) + 99) || a.kategori.localeCompare(b.kategori));
    const total = groups.reduce((s, g) => s + g.siswa.length, 0);
    return { groups, total };
  }, [biayaKhususList, siswaList]);

  return (
    <div className={`rounded-2xl ${t.card} p-3 md:p-4`}>
      <h3 className={`${t.text} font-bold text-sm flex items-center gap-2 mb-3`}>
        <HandHeart className="w-4 h-4 text-orange-500" /> Siswa Dibantu / Beasiswa
        <Badge className="bg-orange-100 text-orange-700">{total} siswa</Badge>
      </h3>
      {groups.length === 0 ? (
        <p className={`text-center py-6 text-xs ${t.textMuted}`}>Belum ada data keringanan (Biaya Khusus)</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {groups.map(g => (
            <div key={g.kategori} className={`rounded-xl p-2.5 ${isDark ? 'bg-slate-700/40' : 'bg-orange-50/60'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-semibold ${t.text} truncate`}>{g.kategori}</span>
                <Badge className="bg-orange-100 text-orange-700 shrink-0">{g.siswa.length}</Badge>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-0.5">
                {g.siswa.map(s => <p key={s.id} className={`text-[11px] ${t.textMuted} truncate`}>• {s.nama}</p>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}