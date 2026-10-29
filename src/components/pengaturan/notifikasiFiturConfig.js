import { Users, GraduationCap } from 'lucide-react';

// Daftar fitur Notifikasi Gateway — SATU sakelar On/Off per fitur.
// field = nama field boolean pada entitas PengaturanAplikasi.
// kanal = kanal pengiriman yang berlaku untuk fitur tersebut.
export const KANAL_META = {
  wa: { label: 'WhatsApp' },
  email: { label: 'Email' },
};

export const SECTIONS = [
  {
    key: 'siswa',
    label: 'Siswa',
    icon: Users,
    desc: 'Notifikasi ke orang tua/wali & pengelola kelas untuk siswa',
    features: [
      {
        field: 'notif_siswa_absensi',
        nama: 'Absensi Siswa',
        detail: 'Status kehadiran siswa dikirim ke WhatsApp orang tua/wali (Ibu → Ayah → Wali).',
        kanal: ['wa'],
      },
      {
        field: 'notif_siswa_absen3',
        nama: 'Peringatan Absen 3 Hari',
        detail: 'Peringatan otomatis siswa yang memenuhi kriteria absen 3 hari, dikirim ke WhatsApp wali kelas & waka.',
        kanal: ['wa'],
      },
      {
        field: 'notif_siswa_spp',
        nama: 'Pengingat Tagihan SPP (Tanggal 10)',
        detail: 'Setiap tanggal 10, siswa yang belum membayar SPP bulan berjalan dikirimi redaksi pengingat ke WhatsApp orang tua/wali.',
        kanal: ['wa'],
      },
      {
        field: 'notif_siswa_catatan',
        nama: 'Catatan Siswa UKS/Izin — Kirim Orang Tua',
        detail: 'Pengiriman manual lewat tombol Kirim Orang Tua ke WhatsApp orang tua/wali.',
        kanal: ['wa'],
      },
    ],
  },
  {
    key: 'pegawai',
    label: 'Pegawai',
    icon: GraduationCap,
    desc: 'Notifikasi ke pegawai, wali kelas & penerima tamu',
    features: [
      {
        field: 'notif_pegawai_absensi',
        nama: 'Absensi Pegawai',
        detail: 'Status kehadiran pegawai dikirim ke WhatsApp dan email pegawai yang bersangkutan.',
        kanal: ['wa', 'email'],
      },
      {
        field: 'notif_pegawai_kalender',
        nama: 'Pengingat Kegiatan Kalender Akademik (H-2)',
        detail: 'Pengingat kegiatan sekolah dua hari sebelumnya, dikirim ke email pegawai.',
        kanal: ['email'],
      },
      {
        field: 'notif_pegawai_tamu',
        nama: 'Tamu Ingin Bertemu Pegawai',
        detail: 'Hanya berjalan bila tamu Buku Tamu tertaut ke pegawai tertentu — dikirim ke WhatsApp pegawai terkait.',
        kanal: ['wa'],
      },
      {
        field: 'notif_pegawai_catatan',
        nama: 'Catatan Siswa UKS/Izin — Kirim Wali Kelas',
        detail: 'Pengiriman manual lewat tombol Kirim Wali Kelas ke WhatsApp wali kelas.',
        kanal: ['wa'],
      },
    ],
  },
];