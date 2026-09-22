import React from 'react';
import { SectionBar, FieldRow, PhotoBox } from './docBits';
import { getFotoPerJenjang, getFotoOrtu } from '@/lib/fotoSiswa';

export default function HalamanDataPribadi({ bundle }) {
  const s = bundle.siswa;
  const kontak = s.kontak_list || [];
  const telp = kontak.map((k) => `${k.no_telp || '-'} (${k.hubungan || '-'})`).join(', ');

  return (
    <div className="grid grid-cols-3 gap-4 flex-1">
      <div className="col-span-2 space-y-2">
        <div className="border border-[#777]">
          <SectionBar>A. KETERANGAN PRIBADI SISWA</SectionBar>
          <div className="grid grid-cols-2 gap-x-5 gap-y-[1px] px-2 py-1.5">
            <FieldRow label="Nama Lengkap" value={s.nama} />
            <FieldRow label="NIS" value={s.nis} />
            <FieldRow label="NISN" value={s.nisn} />
            <FieldRow label="NIK" value={s.nik} />
            <FieldRow label="Jenis Kelamin" value={s.jenis_kelamin} />
            <FieldRow label="Tempat Lahir" value={s.tempat_lahir} />
            <FieldRow label="Tanggal Lahir" value={s.tanggal_lahir} />
            <FieldRow label="Agama" value={s.agama} />
            <FieldRow label="Anak Ke" />
            <FieldRow label="Jumlah Saudara" />
            <FieldRow label="Alamat Tinggal" value={s.alamat} />
            <FieldRow label="RT / RW" value={[s.rt, s.rw].filter(Boolean).join(' / ')} />
            <FieldRow label="Kelurahan / Desa" value={s.kelurahan} />
            <FieldRow label="Kecamatan" value={s.kecamatan} />
            <FieldRow label="Telepon / HP Ortu" value={telp || s.no_telp_ortu} />
            <FieldRow label="Status Siswa" value={s.status} sub={s.tahun_lulus ? `Lulus ${s.tahun_lulus}` : null} />
          </div>
        </div>

        <div className="border border-[#777]">
          <SectionBar>B. DATA UMUM</SectionBar>
          <div className="grid grid-cols-2 gap-x-5 gap-y-[1px] px-2 py-1.5">
            <FieldRow label="Sekolah Asal (SD/MI)" />
            <FieldRow label="No. Ijasah SD/MI" />
            <FieldRow label="Tanggal Diterima di SMP" />
            <FieldRow label="Status Registrasi" value={s.registrasi} />
            <FieldRow label="Penerima KIP" value={s.penerima_kip} />
            <FieldRow label="Pendidikan Sebelumnya" />
          </div>
        </div>

        <div className="border border-[#777]">
          <SectionBar>C. RIWAYAT UMUM</SectionBar>
          <div className="grid grid-cols-2 gap-x-5 gap-y-[1px] px-2 py-1.5">
            <FieldRow label="Riwayat Kesehatan" />
            <FieldRow label="Penyakit Pernah Diderita" />
            <FieldRow label="Golongan Darah" />
            <FieldRow label="Kelainan Jasmani" />
            <FieldRow label="Keterangan" />
          </div>
        </div>

        <div className="border border-[#777]">
          <SectionBar>D. KETERANGAN ORANG TUA KANDUNG</SectionBar>
          <div className="grid grid-cols-2 gap-x-5 gap-y-[1px] px-2 py-1.5">
            <FieldRow label="Nama Ayah Kandung" value={s.nama_ayah_kandung} />
            <FieldRow label="Nama Ibu Kandung" value={s.nama_ibu_kandung} />
            <FieldRow label="Tahun Lahir Ayah" value={s.tahun_lahir_ayah} />
            <FieldRow label="Tahun Lahir Ibu" value={s.tahun_lahir_ibu} />
            <FieldRow label="Pendidikan Ayah" value={s.pendidikan_ayah} />
            <FieldRow label="Pendidikan Ibu" value={s.pendidikan_ibu} />
            <FieldRow label="Pekerjaan Ayah" value={s.pekerjaan_ayah} />
            <FieldRow label="Pekerjaan Ibu" value={s.pekerjaan_ibu} />
            <FieldRow label="Penghasilan Ayah" value={s.penghasilan_ayah} />
            <FieldRow label="Penghasilan Ibu" value={s.penghasilan_ibu} />
            <FieldRow label="NIK Ayah" value={s.nik_ayah} />
            <FieldRow label="NIK Ibu" value={s.nik_ibu} />
          </div>
        </div>

        <div className="border border-[#777]">
          <SectionBar>E. KETERANGAN WALI</SectionBar>
          <div className="grid grid-cols-2 gap-x-5 gap-y-[1px] px-2 py-1.5">
            <FieldRow label="Nama Wali" value={s.nama_wali} />
            <FieldRow label="Hubungan dengan Siswa" />
            <FieldRow label="Tahun Lahir Wali" value={s.tahun_lahir_wali} />
            <FieldRow label="Pendidikan Wali" value={s.pendidikan_wali} />
            <FieldRow label="Pekerjaan Wali" value={s.pekerjaan_wali} />
            <FieldRow label="Penghasilan Wali" value={s.penghasilan_wali} />
            <FieldRow label="NIK Wali" value={s.nik_wali} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="border border-[#777]">
          <SectionBar>FOTO SISWA PER JENJANG</SectionBar>
          <div className="flex flex-col items-center gap-2 py-2">
            {bundle.jenjang.map((j, i) => (
              <div key={j.tingkat} className="flex flex-col items-center gap-1">
                <PhotoBox
                  label={`Foto Kelas ${bundle.kelasNama[i] || `Tingkat ${j.tingkat}`}`}
                  src={getFotoPerJenjang(s, j.tingkat)}
                />
                <span className="text-[8px] text-[#555]">Kelas {bundle.kelasNama[i] || `Tingkat ${j.tingkat}`} — {j.tahunAjaran}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-[#777]">
          <SectionBar>FOTO ORANG TUA / WALI</SectionBar>
          <div className="flex flex-wrap justify-center gap-2 py-2">
            <PhotoBox label="Foto Ayah" src={getFotoOrtu(s, 'ayah')} />
            <PhotoBox label="Foto Ibu" src={getFotoOrtu(s, 'ibu')} />
            <PhotoBox label="Foto Wali" src={getFotoOrtu(s, 'wali')} />
          </div>
        </div>
      </div>
    </div>
  );
}