import React from 'react';
import { SectionBar, EmptyNote, TBL, THD, THD_C, TDC, TDC_C } from './docBits';

export default function HalamanLegerNilai({ bundle }) {
  return (
    <div className="space-y-3">
      {bundle.nilai.map((b) => (
        <div key={b.tingkat} className="border border-[#777]">
          <SectionBar>LEGER NILAI — TINGKAT {b.tingkat} (T.A. {b.tahunAjaran})</SectionBar>
          <table className={TBL}>
            <thead>
              <tr>
                <th className={`${THD_C} w-[8mm]`}>No</th>
                <th className={THD}>Mata Pelajaran</th>
                <th className={`${THD_C} w-[22mm]`}>Ganjil</th>
                <th className={`${THD_C} w-[22mm]`}>Genap</th>
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={r.mapel}>
                  <td className={TDC_C}>{i + 1}</td>
                  <td className={TDC}>{r.mapel}</td>
                  <td className={TDC_C}>{r.ganjil != null ? r.ganjil : '-'}</td>
                  <td className={TDC_C}>{r.genap != null ? r.genap : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {bundle.nilai.length === 0 && <EmptyNote text="Belum ada data nilai yang tercatat untuk siswa ini." />}
    </div>
  );
}