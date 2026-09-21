import React from 'react';
import { SectionBar, EmptyNote, TBL, THD, THD_C, TDC, TDC_C } from './docBits';

function PoinBox({ label, value, color }) {
  return (
    <div className="border border-[#777] px-2 py-1 text-center">
      <p className="text-[8px] text-[#555] tracking-wide">{label}</p>
      <p className={`text-[13px] font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function HalamanCatatanSiswa({ bundle }) {
  const c = bundle.catatan;
  const poin = c.poin;

  const menstruasiPerTa = {};
  (c.menstruasi || []).forEach((m) => {
    const ta = m.tahun_ajaran || 'Lainnya';
    menstruasiPerTa[ta] = (menstruasiPerTa[ta] || 0) + 1;
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <PoinBox label="POIN PELANGGARAN" value={poin.poin} color="text-[#b91c1c]" />
        <PoinBox label="POIN PENGURANG (IMPROVEMENT)" value={poin.pengurang} color="text-[#15803d]" />
        <PoinBox label="POIN BERSIH" value={poin.bersih} color="text-[#1d4ed8]" />
      </div>

      <div className="border border-[#777]">
        <SectionBar>PRESTASI</SectionBar>
        {c.prestasi.length === 0 ? (
          <EmptyNote text="Tidak ada catatan prestasi." />
        ) : (
          <table className={TBL}>
            <thead>
              <tr>
                <th className={THD}>Tanggal</th>
                <th className={THD}>Nama Prestasi</th>
                <th className={THD}>Jenis</th>
                <th className={THD}>Kategori</th>
                <th className={THD}>Tingkat</th>
              </tr>
            </thead>
            <tbody>
              {c.prestasi.map((r, i) => (
                <tr key={i}>
                  <td className={TDC}>{r.tanggal}</td>
                  <td className={TDC}>{r.nama_prestasi}</td>
                  <td className={TDC}>{r.jenis_prestasi}</td>
                  <td className={TDC}>{r.kategori}</td>
                  <td className={TDC}>{r.tingkat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border border-[#777]">
        <SectionBar>RIWAYAT PELANGGARAN</SectionBar>
        {c.pelanggaran.length === 0 ? (
          <EmptyNote text="Tidak ada catatan pelanggaran." />
        ) : (
          <table className={TBL}>
            <thead>
              <tr>
                <th className={THD}>Tanggal</th>
                <th className={THD}>Kode</th>
                <th className={THD}>Uraian Pelanggaran</th>
                <th className={THD_C}>Poin</th>
                <th className={THD}>Status</th>
              </tr>
            </thead>
            <tbody>
              {c.pelanggaran.map((r, i) => (
                <tr key={i}>
                  <td className={TDC}>{r.tanggal}</td>
                  <td className={TDC}>{r.kode}</td>
                  <td className={TDC}>{r.uraian_pelanggaran}</td>
                  <td className={TDC_C}>{r.poin}</td>
                  <td className={TDC}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border border-[#777]">
        <SectionBar>RIWAYAT IMPROVEMENT</SectionBar>
        {c.improvement.length === 0 ? (
          <EmptyNote text="Tidak ada catatan improvement." />
        ) : (
          <table className={TBL}>
            <thead>
              <tr>
                <th className={THD}>Tanggal</th>
                <th className={THD}>Kegiatan Pembinaan</th>
                <th className={THD}>Kategori</th>
                <th className={THD_C}>Poin Pengurang</th>
              </tr>
            </thead>
            <tbody>
              {c.improvement.map((r, i) => (
                <tr key={i}>
                  <td className={TDC}>{r.tanggal}</td>
                  <td className={TDC}>{r.kegiatan_pembinaan_nama}</td>
                  <td className={TDC}>{r.kategori}</td>
                  <td className={TDC_C}>{r.poin_pengurangan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border border-[#777]">
        <SectionBar>RIWAYAT UKS</SectionBar>
        {c.uks.length === 0 ? (
          <EmptyNote text="Tidak ada catatan kunjungan UKS." />
        ) : (
          <table className={TBL}>
            <thead>
              <tr>
                <th className={THD}>Tanggal</th>
                <th className={THD}>Keluhan</th>
                <th className={THD}>Penanganan</th>
                <th className={THD}>Status</th>
              </tr>
            </thead>
            <tbody>
              {c.uks.map((r, i) => (
                <tr key={i}>
                  <td className={TDC}>{r.tanggal}</td>
                  <td className={TDC}>{r.keluhan}</td>
                  <td className={TDC}>{r.penanganan}</td>
                  <td className={TDC}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border border-[#777]">
        <SectionBar>RIWAYAT IZIN</SectionBar>
        {c.izin.length === 0 ? (
          <EmptyNote text="Tidak ada catatan izin." />
        ) : (
          <table className={TBL}>
            <thead>
              <tr>
                <th className={THD}>Tanggal</th>
                <th className={THD_C}>Jam</th>
                <th className={THD}>Alasan</th>
                <th className={THD}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {c.izin.map((r, i) => (
                <tr key={i}>
                  <td className={TDC}>{r.tanggal}</td>
                  <td className={TDC_C}>{r.jam_izin}</td>
                  <td className={TDC}>{r.alasan_manual || r.alasan}</td>
                  <td className={TDC}>{r.keterangan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {bundle.isPerempuan && (
        <div className="border border-[#777]">
          <SectionBar>CATATAN MENSTRUASI</SectionBar>
          {Object.keys(menstruasiPerTa).length === 0 ? (
            <EmptyNote text="Tidak ada catatan menstruasi." />
          ) : (
            <table className={TBL}>
              <thead>
                <tr>
                  <th className={THD}>Tahun Ajaran</th>
                  <th className={THD_C}>Jumlah Hari Tercatat</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(menstruasiPerTa).map(([ta, n]) => (
                  <tr key={ta}>
                    <td className={TDC}>{ta}</td>
                    <td className={TDC_C}>{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}