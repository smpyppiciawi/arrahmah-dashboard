import React, { useMemo, useState } from 'react';
import { AlertTriangle, History, TrendingDown } from 'lucide-react';
import KartuStatistik from './KartuStatistik';
import RiwayatSiswaDialog from './RiwayatSiswaDialog';
import { formatPct } from '@/lib/kehadiranUtils';

const warnaPct = (pct) => (pct >= 90 ? 'text-emerald-600' : pct >= 80 ? 'text-amber-600' : 'text-red-600');

function DaftarSiswa({ data, judul, kosong, onRiwayat }) {
  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-2 pb-1.5 border-b border-slate-100">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{judul}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-10 text-center">Alfa</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-16 text-center">% Hadir</span>
        <span className="w-[74px]" />
      </div>
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-8">{kosong}</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {data.map((r) => (
            <div key={`${r.siswa_id || r.nama}-${r.nama_kelas}`} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-2 py-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 truncate">{r.nama}</p>
                <p className="text-[10px] text-slate-400">{r.nama_kelas} · {r.tidakHadir} tidak hadir</p>
              </div>
              <span className="w-10 text-center text-xs font-bold text-red-600 tabular-nums">{r.Alfa}</span>
              <span className={`w-16 text-center text-xs font-bold tabular-nums ${warnaPct(r.pct)}`}>{formatPct(r.pct)}</span>
              <button
                type="button"
                onClick={() => onRiwayat(r)}
                className="w-[74px] h-7 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 text-[11px] text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                <History className="w-3.5 h-3.5" /> Riwayat
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TabelMonitoringSiswa({ rows = [], absensi = [], jumlahHari = 0 }) {
  const [riwayat, setRiwayat] = useState(null);

  const alfaTerbanyak = useMemo(
    () => [...rows].filter((r) => r.Alfa > 0).sort((a, b) => b.Alfa - a.Alfa || b.tidakHadir - a.tidakHadir).slice(0, 10),
    [rows]
  );
  const kehadiranTerendah = useMemo(
    () => [...rows].filter((r) => r.tidakHadir > 0).sort((a, b) => a.pct - b.pct || b.tidakHadir - a.tidakHadir).slice(0, 10),
    [rows]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <KartuStatistik title="Top 10 Alfa Terbanyak" icon={AlertTriangle} sub="Siswa dengan ketidakhadiran tanpa keterangan terbanyak">
        <DaftarSiswa
          data={alfaTerbanyak}
          judul="Siswa"
          kosong="Tidak ada catatan Alfa pada periode ini"
          onRiwayat={setRiwayat}
        />
      </KartuStatistik>

      <KartuStatistik title="Top 10 Kehadiran Terendah" icon={TrendingDown} sub={`Persentase hadir dari ${jumlahHari} hari efektif`}>
        <DaftarSiswa
          data={kehadiranTerendah}
          judul="Siswa"
          kosong="Tidak ada siswa dengan ketidakhadiran"
          onRiwayat={setRiwayat}
        />
      </KartuStatistik>

      <RiwayatSiswaDialog
        siswa={riwayat}
        absensi={absensi}
        jumlahHari={jumlahHari}
        onClose={() => setRiwayat(null)}
      />
    </div>
  );
}