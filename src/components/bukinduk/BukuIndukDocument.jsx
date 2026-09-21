import React from 'react';
import BukuIndukPageShell from './BukuIndukPageShell';
import HalamanDataPribadi from './HalamanDataPribadi';
import HalamanLegerNilai from './HalamanLegerNilai';
import HalamanRekapAbsensi from './HalamanRekapAbsensi';
import HalamanDataUmum from './HalamanDataUmum';
import HalamanCatatanSiswa from './HalamanCatatanSiswa';
import HalamanHapalan from './HalamanHapalan';

export default function BukuIndukDocument({ bundle }) {
  const s = bundle.siswa;
  const ident = `${s.nama} — NIS: ${s.nis}${s.nama_kelas ? ` (${s.nama_kelas})` : ''}`;

  return (
    <div data-bi-student={`${s.nama} (${s.nis})`}>
      <BukuIndukPageShell first subtitle={ident} footerInfo={ident} title="A. LEMBAR REGISTRASI PESERTA DIDIK">
        <HalamanDataPribadi bundle={bundle} />
      </BukuIndukPageShell>
      <BukuIndukPageShell subtitle={ident} footerInfo={ident} title="B. LEGER NILAI">
        <HalamanLegerNilai bundle={bundle} />
      </BukuIndukPageShell>
      <BukuIndukPageShell subtitle={ident} footerInfo={ident} title="C. REKAPITULASI KEHADIRAN">
        <HalamanRekapAbsensi bundle={bundle} />
      </BukuIndukPageShell>
      <BukuIndukPageShell subtitle={ident} footerInfo={ident} title="D. DATA UMUM & DATA PERIODIK">
        <HalamanDataUmum bundle={bundle} />
      </BukuIndukPageShell>
      <BukuIndukPageShell subtitle={ident} footerInfo={ident} title="E. CATATAN SISWA">
        <HalamanCatatanSiswa bundle={bundle} />
      </BukuIndukPageShell>
      <BukuIndukPageShell subtitle={ident} footerInfo={ident} title="F. PROGRES HAPALAN">
        <HalamanHapalan bundle={bundle} />
      </BukuIndukPageShell>
    </div>
  );
}