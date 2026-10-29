import React from 'react';
import { MessageCircle, Mail, Activity } from 'lucide-react';

// Rincian fitur otomatis yang tunduk pada sakelar gateway notifikasi per kategori.
// kanal: 'wa' | 'email' — mengikuti kolom sakelar pada kartu Notifikasi Gateway.
export const FITUR_GATEWAY = {
  siswa: [
    {
      nama: 'Absensi Siswa',
      detail: 'Status kehadiran (Hadir/Izin/Sakit/Alfa) ke orang tua/wali — dari Absensi Harian, Jumat, Scan, dan Absensi Mandiri.',
      kanal: ['wa', 'email'],
    },
    {
      nama: 'Peringatan Absen 3 Hari',
      detail: 'Peringatan otomatis untuk siswa beruntun 3 hari, akumulasi 3 hari per minggu, atau sama hari 3 minggu.',
      kanal: ['wa', 'email'],
    },
  ],
  pegawai: [
    {
      nama: 'Absensi Pegawai',
      detail: 'Status kehadiran pegawai dikirim ke nomor WA dan email pegawai yang bersangkutan.',
      kanal: ['wa', 'email'],
    },
    {
      nama: 'Pengingat Tugas H-1',
      detail: 'Pengingat tugas yang jatuh tempo besok, dikirim sehari sebelumnya ke pegawai terkait.',
      kanal: ['wa'],
    },
    {
      nama: 'Pengingat Kalender H-2',
      detail: 'Pengingat kegiatan sekolah dua hari sebelumnya, dikirim ke email pegawai.',
      kanal: ['email'],
    },
  ],
  lainnya: [
    {
      nama: 'Tamu Ingin Bertemu',
      detail: 'Tamu Orang Tua/Wali di Buku Tamu yang memilih pegawai — pegawai menerima rincian tamu.',
      kanal: ['wa', 'email'],
    },
  ],
};

const KANAL_META = {
  wa: { label: 'WhatsApp', icon: MessageCircle },
  email: { label: 'Email', icon: Mail },
};

function KanalChip({ kanal, aktif }) {
  const meta = KANAL_META[kanal];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${
        aktif
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-400 border-slate-200'
      }`}
    >
      <Icon className="w-3 h-3" />
      {meta.label}
      <span className="opacity-70">{aktif ? '· aktif' : '· dijeda'}</span>
    </span>
  );
}

export default function NotifikasiFiturTray({ kategori, isOn }) {
  const fitur = FITUR_GATEWAY[kategori] || [];
  return (
    <div className="col-span-3 mt-1 mb-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
        <Activity className="w-3.5 h-3.5" />
        Rincian fitur otomatis ({fitur.length})
      </p>
      <div className="space-y-2">
        {fitur.map((f) => (
          <div key={f.nama} className="rounded-lg bg-white border border-slate-200 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-700 leading-tight">{f.nama}</p>
              <div className="flex flex-wrap justify-end gap-1 flex-shrink-0">
                {f.kanal.map((k) => (
                  <KanalChip key={k} kanal={k} aktif={isOn(k, kategori)} />
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">{f.detail}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">
        Status mengikuti sakelar kanal pada baris kategori di atas. Pengiriman manual (tombol WA di menu lain) tidak terpengaruh.
      </p>
    </div>
  );
}