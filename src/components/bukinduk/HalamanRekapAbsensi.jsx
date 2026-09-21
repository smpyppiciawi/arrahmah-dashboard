import React from 'react';
import { SectionBar, EmptyNote, TBL, THD, THD_C, TDC, TDC_C } from './docBits';

export default function HalamanRekapAbsensi({ bundle }) {
  return (
    <div className="space-y-3">
      {bundle.absensi.map((b) => (
        <div key={b.tingkat} className="border border-[#777]">
          <SectionBar>REKAP KEHADIRAN — TINGKAT {b.tingkat} (T.A. {b.tahunAjaran})</SectionBar>
          {b.months.length === 0 ? (
            <EmptyNote text="Tidak ada data kehadiran pada tahun ajaran ini." />
          ) : (
            <table className={TBL}>
              <thead>
                <tr>
                  <th className={THD}>Bulan</th>
                  <th className={THD_C}>H</th>
                  <th className={THD_C}>S</th>
                  <th className={THD_C}>I</th>
                  <th className={THD_C}>A</th>
                  <th className={THD_C}>T</th>
                  <th className={`${THD_C} w-[24mm]`}>% Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                {b.months.map((m) => (
                  <tr key={m.label}>
                    <td className={TDC}>{m.label}</td>
                    <td className={TDC_C}>{m.H}</td>
                    <td className={TDC_C}>{m.S}</td>
                    <td className={TDC_C}>{m.I}</td>
                    <td className={TDC_C}>{m.A}</td>
                    <td className={TDC_C}>{m.T}</td>
                    <td className={TDC_C}>{m.pct != null ? `${m.pct}%` : '-'}</td>
                  </tr>
                ))}
                <tr className="font-semibold bg-[#eef2f6]">
                  <td className={TDC}>JUMLAH</td>
                  <td className={TDC_C}>{b.total.H}</td>
                  <td className={TDC_C}>{b.total.S}</td>
                  <td className={TDC_C}>{b.total.I}</td>
                  <td className={TDC_C}>{b.total.A}</td>
                  <td className={TDC_C}>{b.total.T}</td>
                  <td className={TDC_C}>{b.total.pct != null ? `${b.total.pct}%` : '-'}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      ))}
      {bundle.absensi.length === 0 && <EmptyNote text="Belum ada data kehadiran yang tercatat." />}
    </div>
  );
}