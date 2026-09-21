import React from 'react';
import { SectionBar, FieldRow, EmptyNote, TBL, THD, THD_C, TDC, TDC_C } from './docBits';

export default function HalamanDataUmum({ bundle }) {
  const s = bundle.siswa;
  const l = bundle.lulusan;
  const kontak = s.kontak_list || [];

  return (
    <div className="space-y-3">
      <div className="border border-[#777]">
        <SectionBar>DATA UMUM SISWA</SectionBar>
        <div className="grid grid-cols-2 gap-x-5 gap-y-[1px] px-2 py-1.5">
          <FieldRow label="NIS / NISN" value={[s.nis, s.nisn].filter(Boolean).join(' / ')} />
          <FieldRow label="Nama Lengkap" value={s.nama} />
          <FieldRow label="Alamat Lengkap" value={[s.alamat, s.rt && `RT ${s.rt}`, s.rw && `RW ${s.rw}`].filter(Boolean).join(', ')} />
          <FieldRow label="Kelurahan / Kecamatan" value={[s.kelurahan, s.kecamatan].filter(Boolean).join(' / ')} />
          <FieldRow label="Penerima KIP" value={s.penerima_kip} />
          <FieldRow label="Status" value={s.status} sub={s.tahun_lulus ? `Lulus ${s.tahun_lulus}` : null} />
        </div>
        {kontak.length > 0 && (
          <table className={TBL}>
            <thead>
              <tr>
                <th className={THD}>No. HP / WA</th>
                <th className={THD}>Hubungan</th>
              </tr>
            </thead>
            <tbody>
              {kontak.map((k, i) => (
                <tr key={i}>
                  <td className={TDC}>{k.no_telp}</td>
                  <td className={TDC}>{k.hubungan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {l && (
        <div className="border border-[#777]">
          <SectionBar>KELANJUTAN STUDI (DATA LULUSAN)</SectionBar>
          <div className="grid grid-cols-2 gap-x-5 gap-y-[1px] px-2 py-1.5">
            <FieldRow label="Tahun Lulus" value={l.tahun_lulus} />
            <FieldRow label="Status Akhir" value={l.status} />
            <FieldRow label="Jenis Sekolah Lanjutan" value={l.jenis_sekolah_lanjutan} />
            <FieldRow label="Nama Sekolah Lanjutan" value={l.nama_sekolah_lanjutan} />
            <FieldRow label="NPSN Sekolah Lanjutan" value={l.npsn_sekolah_lanjutan} />
            <FieldRow label="Alamat Sekolah Lanjutan" value={l.alamat_sekolah_lanjutan} />
          </div>
        </div>
      )}

      <div className="border border-[#777]">
        <SectionBar>DATA PERIODIK (PENGUKURAN PER JENJANG)</SectionBar>
        <table className={TBL}>
          <thead>
            <tr>
              <th className={THD}>Tingkat</th>
              <th className={THD_C}>Tanggal Ukur</th>
              <th className={THD_C}>Tinggi Badan (cm)</th>
              <th className={THD_C}>Berat Badan (kg)</th>
              <th className={THD_C}>Lingkar Kepala (cm)</th>
            </tr>
          </thead>
          <tbody>
            {bundle.periodik.map((p) => (
              <tr key={p.tingkat}>
                <td className={TDC}>Tingkat {p.tingkat}</td>
                <td className={TDC_C}>{p.data?.tanggal || '-'}</td>
                <td className={TDC_C}>{p.data?.tinggi_badan ?? '-'}</td>
                <td className={TDC_C}>{p.data?.berat_badan ?? '-'}</td>
                <td className={TDC_C}>{p.data?.lingkar_kepala ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bundle.periodik.every((p) => !p.data) && <EmptyNote text="Belum ada data periodik yang tercatat." />}
      </div>
    </div>
  );
}