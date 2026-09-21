import React from 'react';
import { SectionBar, EmptyNote, TBL, THD, THD_C, TDC, TDC_C } from './docBits';

export default function HalamanHapalan({ bundle }) {
  const hasData = bundle.hapalan.some((h) => h.rows.length > 0);
  return (
    <div className="space-y-3">
      {bundle.hapalan.map((h) => (
        <div key={h.tingkat} className="border border-[#777]">
          <SectionBar>HAPALAN — TINGKAT {h.tingkat} (T.A. {h.tahunAjaran})</SectionBar>
          {h.rows.length === 0 ? (
            <EmptyNote text="Tidak ada data hapalan pada jenjang ini." />
          ) : (
            <table className={TBL}>
              <thead>
                <tr>
                  <th className={THD}>Nama Surah / Doa</th>
                  <th className={THD_C}>Jenis</th>
                  <th className={THD_C}>Status</th>
                  <th className={THD_C}>Tanggal Setor</th>
                  <th className={THD}>Validator</th>
                </tr>
              </thead>
              <tbody>
                {h.rows.map((r, i) => (
                  <tr key={i}>
                    <td className={TDC}>{r.nama}</td>
                    <td className={TDC_C}>{r.jenis}</td>
                    <td className={TDC_C}>{r.sudah ? 'Hafal' : 'Belum'}</td>
                    <td className={TDC_C}>{r.tanggal || '-'}</td>
                    <td className={TDC}>{r.validator || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
      {!hasData && <EmptyNote text="Belum ada data hapalan yang tercatat." />}
    </div>
  );
}