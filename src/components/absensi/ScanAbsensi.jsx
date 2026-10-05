import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { ScanLine, CheckCircle, XCircle, Clock, User, CreditCard, QrCode, Fingerprint, Camera, Loader2, Monitor, Wifi, Nfc, ScanFace, Users, UserCog } from "lucide-react";
import QRCameraScanner from '@/components/absensi/QRCameraScanner';
import NfcScanner from '@/components/absensi/NfcScanner';
import FingerprintScanner from '@/components/absensi/FingerprintScanner';
import FaceRecognition from '@/components/absensi/FaceRecognition';

// Komponen Scan Terpadu: Siswa & Pegawai dalam satu halaman.
// Tipe pemilik kartu dikenali otomatis dari record KartuAbsensi (person_type),
// jadi tidak perlu memilih Siswa/Pegawai sebelum scan.

export default function ScanAbsensi() {
  const [scanMode, setScanMode] = useState('kartu');
  const [qrSubMode, setQrSubMode] = useState('kamera');
  const [fpSubMode, setFpSubMode] = useState('reader');
  const [scanInput, setScanInput] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [popup, setPopup] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [scanLog, setScanLog] = useState([]);
  const inputRef = useRef(null);
  const bufferRef = useRef('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const today = format(new Date(), 'yyyy-MM-dd');

  // Rekap terpisah Siswa & Pegawai
  const { data: siswaToday = [] } = useQuery({
    queryKey: ['scan-today-siswa', today],
    queryFn: () => base44.entities.Absensi.filter({ tanggal: today, jenis_absensi: 'Kehadiran' }),
  });

  const { data: pegawaiToday = [] } = useQuery({
    queryKey: ['scan-today-pegawai', today],
    queryFn: () => base44.entities.AbsensiPegawai.filter({ tanggal: today }),
  });

  // Multi-device real-time sync (kedua entitas)
  useEffect(() => {
    const unsubSiswa = base44.entities.Absensi.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        queryClient.invalidateQueries({ queryKey: ['scan-today-siswa', today] });
      }
    });
    const unsubPegawai = base44.entities.AbsensiPegawai.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        queryClient.invalidateQueries({ queryKey: ['scan-today-pegawai', today] });
      }
    });
    return () => { unsubSiswa(); unsubPegawai(); };
  }, [today, queryClient]);

  // Jadwal Absensi dinamis (Jam Masuk + toleransi) untuk menentukan terlambat
  const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayDay = HARI_ID[new Date().getDay()];

  const { data: jadwalMasuk = [] } = useQuery({
    queryKey: ['jadwal-absensi-masuk'],
    queryFn: () => base44.entities.JadwalAbsensi.filter({ jenis: 'Masuk', aktif: true }),
  });

  const { data: jadwalPulang = [] } = useQuery({
    queryKey: ['jadwal-absensi-pulang'],
    queryFn: () => base44.entities.JadwalAbsensi.filter({ jenis: 'Pulang', aktif: true }),
  });

  const addMinutesToHHMM = (hhmm, mins) => {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + (Number(mins) || 0);
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const findJadwal = (list, pt) => (list || []).find(j =>
    (j.person_type === pt || j.person_type === 'Semua') &&
    Array.isArray(j.hari) && j.hari.includes(todayDay)
  );

  const getLateThreshold = (pt) => {
    const match = findJadwal(jadwalMasuk, pt);
    if (match && match.jam) return addMinutesToHHMM(match.jam, match.toleransi_menit);
    return pt === 'Pegawai' ? '07:30' : '07:00';
  };

  // Jika toleransi nonaktif, jam berapapun = Masuk (tidak pernah Terlambat)
  const isToleransiAktif = (pt) => {
    const match = findJadwal(jadwalMasuk, pt);
    return match ? match.toleransi_aktif !== false : true;
  };

  // Apakah waktu sekarang sudah melewati jam Pulang?
  const getPulangJam = (pt) => {
    const match = findJadwal(jadwalPulang, pt);
    return match && match.jam ? match.jam : null;
  };

  useEffect(() => {
    if (!popup) return;
    const t = setTimeout(() => setPopup(null), 5000);
    return () => clearTimeout(t);
  }, [popup]);

  // ====== SCAN OTOMATIS: terima ketikan reader tanpa perlu klik kolom input ======
  const scanModeRef = useRef(scanMode);
  const qrSubModeRef = useRef(qrSubMode);
  const fpSubModeRef = useRef(fpSubMode);
  const processingRef = useRef(processing);
  const processScanRef = useRef(null);
  scanModeRef.current = scanMode;
  qrSubModeRef.current = qrSubMode;
  fpSubModeRef.current = fpSubMode;
  processingRef.current = processing;

  const isInputBasedMode = () =>
    scanModeRef.current === 'kartu' ||
    (scanModeRef.current === 'fingerprint' && fpSubModeRef.current === 'reader') ||
    (scanModeRef.current === 'qrcode' && qrSubModeRef.current === 'pembaca');

  useEffect(() => {
    // Fokuskan input otomatis saat portal scan terbuka
    inputRef.current?.focus();
    const onKeyDown = (e) => {
      if (processingRef.current || !isInputBasedMode()) return;
      const input = inputRef.current;
      const active = document.activeElement;
      // Jika user sedang mengetik di kolom input scan, biarkan form yang menangani
      if (input && active === input) return;
      // Jangan ganggu elemen input lain (jika ada)
      if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) && active !== input) return;
      if (e.key === 'Enter') {
        if (bufferRef.current) {
          const v = bufferRef.current;
          bufferRef.current = '';
          processScanRef.current?.(v);
        }
        e.preventDefault();
        return;
      }
      if (e.key && e.key.length === 1) {
        bufferRef.current += e.key;
        if (input) {
          input.focus();
          setScanInput(bufferRef.current);
        }
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Auto-refokus saat mode berubah
  useEffect(() => {
    if (scanMode === 'kartu' || (scanMode === 'fingerprint' && fpSubMode === 'reader') || (scanMode === 'qrcode' && qrSubMode === 'pembaca')) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [scanMode, qrSubMode, fpSubMode]);

  const addLog = (result) => {
    const entry = { ...result, time: format(new Date(), 'HH:mm:ss') };
    setScanLog(prev => [entry, ...prev].slice(0, 20));
  };

  // Voice feedback menggunakan Web Speech API (Bahasa Indonesia)
  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    } catch (e) { /* noop */ }
  };

  const notify = (result) => {
    setLastResult(result);
    addLog(result);
    const jamAbsen = result.jamAbsen || format(new Date(), 'HH:mm:ss');
    setPopup({ ...result, jamAbsen });

    // Voice feedback berdasarkan hasil scan
    if (result.status === 'success') {
      const keterangan = result.statusAbsen === 'Pulang' ? 'pulang' : 'masuk';
      speak(`${result.nama}, absensi ${keterangan} sudah tercatat`);
    } else if (result.status === 'info') {
      speak(`${result.nama}, anda sudah terdata hari ini`);
    } else {
      speak('Maaf, data absensi gagal terbaca');
    }
  };

  // ====== NOTIFIKASI ======
  // Pegawai: WA & Email SELALU dibaca dari Data Pegawai (Guru) terbaru, bukan snapshot kartu.
  const sendPegawaiNotif = async (k, status, now) => {
    let guru = null;
    try { guru = await base44.entities.Guru.get(k.person_id); } catch (e) { guru = null; }

    // WA — hanya dari no_telp Data Pegawai
    const phone = guru?.no_telp;
    if (!phone) {
      toast({ title: '📵 WA Tidak Terkirim', description: `Nomor WA ${k.nama} tidak terdata di Data Pegawai`, variant: 'destructive' });
    } else {
      const cleanPhone = String(phone).replace(/\D/g, '').replace(/^0/, '62');
      const msg = `*Notifikasi Absensi Pegawai*\n\nNama: ${k.nama}\nJabatan: ${k.info}\nTanggal: ${today}\nJam: ${now}\nStatus: *${status}*\nMetode: ${k.jenis}`;
      try {
        const res = await base44.functions.invoke('sendWANotif', { phone: cleanPhone, message: msg });
        if (res.data?.success) {
          toast({ title: '📲 WA Terkirim', description: `Notifikasi terkirim ke ${k.nama}` });
        } else {
          toast({ title: '⚠️ WA Gagal', description: res.data?.error || 'Gagal mengirim WA', variant: 'destructive' });
        }
      } catch (err) {
        toast({ title: '⚠️ WA Error', description: err.message, variant: 'destructive' });
      }
    }

    // Email — hanya dari email Data Pegawai
    const email = guru?.email;
    if (!email) {
      toast({ title: '📧 Email Tidak Terkirim', description: `Email ${k.nama} tidak terdata di Data Pegawai`, variant: 'destructive' });
      return;
    }
    try {
      const res = await base44.functions.invoke('sendAbsensiEmail', {
        email, nama: k.nama, jabatan: k.info, tanggal: today, jam: now, status, metode: k.jenis,
      });
      if (res.data?.sent) {
        toast({ title: '📧 Email Terkirim', description: `Konfirmasi absensi terkirim ke ${k.nama}` });
      } else {
        toast({ title: '⚠️ Email Gagal', description: res.data?.reason === 'not_registered'
          ? 'Email pegawai belum terdaftar sebagai pengguna aplikasi'
          : (res.data?.error || 'Gagal mengirim email'), variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: '⚠️ Email Error', description: err.message, variant: 'destructive' });
    }
  };

  // Siswa: WA dari nomor terdata pada kartu absensi siswa
  const sendSiswaNotif = async (k, status, now) => {
    if (!k.no_telp) return;
    const cleanPhone = k.no_telp.replace(/\D/g, '').replace(/^0/, '62');
    const msg = `*Notifikasi Absensi Siswa*\n\nNama: ${k.nama}\nKelas: ${k.info}\nTanggal: ${today}\nJam: ${now}\nStatus: *${status}*\nMetode: ${k.jenis}`;
    try {
      const res = await base44.functions.invoke('sendWANotif', { phone: cleanPhone, message: msg });
      if (res.data?.success) {
        toast({ title: '📲 WA Terkirim', description: `Notifikasi terkirim ke ${k.nama}` });
      } else {
        toast({ title: '⚠️ WA Gagal', description: res.data?.error || 'Gagal mengirim WA', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: '⚠️ WA Error', description: err.message, variant: 'destructive' });
    }
  };

  // ====== PROSES SCAN TERPADU ======
  const processScan = async (cardIdValue) => {
    const cardId = String(cardIdValue || '').trim();
    if (!cardId || processingRef.current) return;
    setProcessing(true);

    try {
      const kartuList = await base44.entities.KartuAbsensi.filter({ card_id: cardId, status: 'Aktif' });
      if (!kartuList || kartuList.length === 0) {
        notify({ status: 'error', message: `Kartu "${cardId}" tidak terdaftar`, cardId });
        return;
      }

      const k = kartuList[0];
      const pt = k.person_type === 'Pegawai' ? 'Pegawai' : 'Siswa';
      const now = format(new Date(), 'HH:mm');
      const lateThreshold = getLateThreshold(pt);
      const pulangJam = getPulangJam(pt);
      const isPulangTime = pulangJam && now >= pulangJam;

      if (pt === 'Pegawai') {
        const existing = await base44.entities.AbsensiPegawai.filter({ guru_id: k.person_id, tanggal: today });
        // Scan setelah jam Pulang → catat jam keluar / status Pulang
        if (isPulangTime) {
          if (existing.length > 0 && existing[0].jam_keluar) {
            notify({ status: 'info', message: `${k.nama} sudah scan pulang`, cardId, person: k, nama: k.nama, jamAbsen: existing[0].jam_keluar, statusAbsen: 'Pulang' });
            return;
          }
          if (existing.length > 0) {
            await base44.entities.AbsensiPegawai.update(existing[0].id, { jam_keluar: now, status: 'Pulang' });
          } else {
            await base44.entities.AbsensiPegawai.create({
              tanggal: today, guru_id: k.person_id, nip: k.nip_nis,
              nama_pegawai: k.nama, jabatan: k.info,
              jam_keluar: now, status: 'Pulang', metode: k.jenis, card_id: cardId,
            });
          }
          notify({ status: 'success', message: `${k.nama} — Pulang — ${now}`, cardId, person: k, type: 'pulang', nama: k.nama, jamAbsen: now, statusAbsen: 'Pulang' });
          sendPegawaiNotif(k, 'Pulang', now);
          queryClient.invalidateQueries({ queryKey: ['scan-today-pegawai', today] });
          return;
        }
        if (existing.length > 0) {
          notify({ status: 'info', message: `${k.nama} sudah terdata hari ini`, cardId, person: k, nama: k.nama, jamAbsen: existing[0].jam_masuk, statusAbsen: existing[0].status || 'Hadir' });
          return;
        }
        // Jika toleransi nonaktif → selalu Hadir; jika aktif → cek terlambat
        const isLate = isToleransiAktif(pt) ? now > lateThreshold : false;
        const status = isLate ? 'Terlambat' : 'Hadir';
        await base44.entities.AbsensiPegawai.create({
          tanggal: today, guru_id: k.person_id, nip: k.nip_nis,
          nama_pegawai: k.nama, jabatan: k.info,
          jam_masuk: now, status, metode: k.jenis, card_id: cardId,
        });
        notify({ status: 'success', message: `${k.nama} — ${status} — ${now}`, cardId, person: k, type: 'masuk', nama: k.nama, jamAbsen: now, statusAbsen: status });
        sendPegawaiNotif(k, status, now);
        queryClient.invalidateQueries({ queryKey: ['scan-today-pegawai', today] });
      } else {
        const existing = await base44.entities.Absensi.filter({ siswa_id: k.person_id, tanggal: today, jenis_absensi: 'Kehadiran' });
        if (existing.length > 0) {
          notify({ status: 'info', message: `${k.nama} sudah terdata hari ini`, cardId, person: k, nama: k.nama, jamAbsen: existing[0].jam_masuk, statusAbsen: existing[0].status || 'Hadir' });
          return;
        }
        // Siswa: toleransi nonaktif → selalu Hadir; aktif → cek terlambat (kecuali sudah jam pulang)
        const isLate = (isPulangTime || !isToleransiAktif(pt)) ? false : now > lateThreshold;
        const status = isPulangTime ? 'Hadir' : (isLate ? 'Terlambat' : 'Hadir');
        await base44.entities.Absensi.create({
          tanggal: today, siswa_id: k.person_id, nis: k.nip_nis,
          nama_siswa: k.nama, nama_kelas: k.info,
          status, jenis_absensi: 'Kehadiran', jam_masuk: now,
          metode: k.jenis, card_id: cardId,
        });
        notify({ status: 'success', message: `${k.nama} — ${status} — ${now}`, cardId, person: k, type: 'masuk', nama: k.nama, jamAbsen: now, statusAbsen: status });
        sendSiswaNotif(k, status, now);
        queryClient.invalidateQueries({ queryKey: ['scan-today-siswa', today] });
      }
    } catch (err) {
      notify({ status: 'error', message: `Error: ${err.message}`, cardId });
    } finally {
      setProcessing(false);
      setScanInput('');
      if (scanMode === 'kartu' || (scanMode === 'fingerprint' && fpSubMode === 'reader') || (scanMode === 'qrcode' && qrSubMode === 'pembaca')) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  // Simpan referensi terbaru untuk handler keyboard global
  processScanRef.current = processScan;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    bufferRef.current = '';
    processScan(scanInput);
  };

  const modes = [
    { id: 'kartu', label: 'RFID Reader', icon: CreditCard, color: 'purple', desc: 'Reader eksternal' },
    { id: 'nfc', label: 'NFC HP', icon: Nfc, color: 'emerald', desc: 'Tap kartu di HP' },
    { id: 'qrcode', label: 'QR Code', icon: QrCode, color: 'blue', desc: 'Kamera / Scanner' },
    { id: 'fingerprint', label: 'Fingerprint', icon: Fingerprint, color: 'orange', desc: 'Reader / HP' },
    { id: 'wajah', label: 'Wajah', icon: ScanFace, color: 'indigo', desc: 'Face Recognition' },
  ];

  const modeColorMap = {
    purple: { active: 'bg-purple-600 text-white', idle: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
    emerald: { active: 'bg-emerald-600 text-white', idle: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
    blue: { active: 'bg-blue-600 text-white', idle: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
    orange: { active: 'bg-orange-600 text-white', idle: 'text-orange-600 bg-orange-50 hover:bg-orange-100' },
    indigo: { active: 'bg-indigo-600 text-white', idle: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
  };

  const inputPlaceholder = scanMode === 'kartu'
    ? 'Tempel kartu RFID pada reader...'
    : scanMode === 'fingerprint'
    ? 'Letakkan jari pada fingerprint reader...'
    : 'Arahkan scanner ke QR Code...';

  const isWajahMode = scanMode === 'wajah';
  const isNfcMode = scanMode === 'nfc';
  const isCameraMode = scanMode === 'qrcode' && qrSubMode === 'kamera';
  const isFingerprintHpMode = scanMode === 'fingerprint' && fpSubMode === 'hp';

  const jenisBadgeClass = (jenis) =>
    jenis === 'RFID' ? 'bg-purple-100 text-purple-700'
    : jenis === 'QRCode' ? 'bg-blue-100 text-blue-700'
    : jenis === 'FaceRecognition' ? 'bg-indigo-100 text-indigo-700'
    : 'bg-orange-100 text-orange-700';

  const popupStatusColor = popup?.status === 'success'
    ? { bg: 'bg-emerald-50', ring: 'bg-emerald-100', icon: 'text-emerald-600', text: 'text-emerald-700', border: 'border-emerald-200' }
    : popup?.status === 'info'
    ? { bg: 'bg-blue-50', ring: 'bg-blue-100', icon: 'text-blue-600', text: 'text-blue-700', border: 'border-blue-200' }
    : { bg: 'bg-red-50', ring: 'bg-red-100', icon: 'text-red-600', text: 'text-red-700', border: 'border-red-200' };

  const renderRecapRow = (a, isPegawai) => (
    <div key={a.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
          <User className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">{isPegawai ? a.nama_pegawai : a.nama_siswa}</p>
          <p className="text-xs text-slate-400">{isPegawai ? a.jabatan : a.nama_kelas}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono text-slate-600">{a.jam_masuk}{a.jam_keluar ? ` → ${a.jam_keluar}` : ''}</p>
        <div className="flex items-center gap-1 justify-end">
          {a.metode && a.metode !== 'Manual' && <span className="text-[9px] text-slate-400">{a.metode}</span>}
          <Badge className={`text-[9px] ${a.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700' : a.status === 'Terlambat' ? 'bg-orange-100 text-orange-700' : a.status === 'Pulang' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{a.status}</Badge>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="border-2 border-emerald-200 shadow-md">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-3">
              <ScanLine className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Scan Absensi — Siswa &amp; Pegawai</h3>
            <p className="text-sm text-slate-500">Tipe pemilik kartu dikenali otomatis dari Pendaftaran Kartu</p>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
            {modes.map(m => {
              const Icon = m.icon;
              const isActive = scanMode === m.id;
              const colors = modeColorMap[m.color];
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setScanMode(m.id); setScanInput(''); setLastResult(null); setPopup(null); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    isActive ? `${colors.active} border-transparent shadow-md` : `${colors.idle} border-transparent`
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-semibold">{m.label}</span>
                  <span className={`text-[9px] ${isActive ? 'text-white/70' : 'text-slate-400'}`}>{m.desc}</span>
                </button>
              );
            })}
          </div>

          {/* QR Sub-mode */}
          {scanMode === 'qrcode' && (
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setQrSubMode('kamera')}
                className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                  qrSubMode === 'kamera' ? 'bg-blue-600 text-white border-transparent' : 'bg-blue-50 text-blue-600 border-transparent hover:bg-blue-100'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span className="text-xs font-semibold">Kamera (HP)</span>
              </button>
              <button
                type="button"
                onClick={() => setQrSubMode('pembaca')}
                className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                  qrSubMode === 'pembaca' ? 'bg-blue-600 text-white border-transparent' : 'bg-blue-50 text-blue-600 border-transparent hover:bg-blue-100'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span className="text-xs font-semibold">Pembaca (Scanner)</span>
              </button>
            </div>
          )}

          {/* Fingerprint Sub-mode */}
          {scanMode === 'fingerprint' && (
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setFpSubMode('reader')}
                className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                  fpSubMode === 'reader' ? 'bg-orange-600 text-white border-transparent' : 'bg-orange-50 text-orange-600 border-transparent hover:bg-orange-100'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span className="text-xs font-semibold">Reader Eksternal</span>
              </button>
              <button
                type="button"
                onClick={() => setFpSubMode('hp')}
                className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                  fpSubMode === 'hp' ? 'bg-orange-600 text-white border-transparent' : 'bg-orange-50 text-orange-600 border-transparent hover:bg-orange-100'
                }`}
              >
                <Fingerprint className="w-4 h-4" />
                <span className="text-xs font-semibold">HP (Biometrik)</span>
              </button>
            </div>
          )}

          {/* Wajah Mode */}
          {isWajahMode ? (
            <FaceRecognition mode="scan" personType="Semua" onMatch={processScan} disabled={processing} />
          ) : isNfcMode ? (
            <div className="flex flex-col items-center gap-3 py-6 border-2 border-dashed border-emerald-300 rounded-xl bg-emerald-50/50">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl">
                <Nfc className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">Tempelkan Kartu NFC</p>
                <p className="text-xs text-slate-500 mt-0.5">Dekatkan kartu E-money/RFID ke belakang HP</p>
              </div>
              <NfcScanner onScan={processScan} disabled={processing} />
            </div>
          ) : isCameraMode ? (
            <QRCameraScanner active={isCameraMode && !processing} onScan={processScan} />
          ) : isFingerprintHpMode ? (
            <div className="flex flex-col items-center gap-3 py-6 border-2 border-dashed border-orange-300 rounded-xl bg-orange-50/50">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-2xl">
                <Fingerprint className="w-7 h-7 text-orange-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">Verifikasi Fingerprint</p>
                <p className="text-xs text-slate-500 mt-0.5">Sentuh sensor fingerprint/FaceID HP untuk absensi</p>
              </div>
              <FingerprintScanner mode="scan" onScan={processScan} disabled={processing} />
            </div>
          ) : (
            <form onSubmit={handleFormSubmit}>
              <Input
                ref={inputRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder={inputPlaceholder}
                className="text-center text-lg font-mono h-14 border-2 border-emerald-300 focus:border-emerald-500"
                autoComplete="off"
                readOnly={processing}
              />
              <Button type="submit" className="w-full mt-3 h-12 bg-emerald-600 hover:bg-emerald-700" disabled={processing || !scanInput.trim()}>
                {processing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ScanLine className="w-5 h-5 mr-2" />}
                {processing ? 'Memproses...' : 'Proses Scan'}
              </Button>
            </form>
          )}

          {/* Fingerprint info */}
          {scanMode === 'fingerprint' && fpSubMode === 'reader' && (
            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
              <Fingerprint className="w-6 h-6 text-orange-500 mx-auto mb-1" />
              <p className="text-xs text-orange-700">Pastikan fingerprint reader terhubung. ID fingerprint akan otomatis muncul saat jari ditempel.</p>
            </div>
          )}

          {/* Auto-scan indicator */}
          {isInputBasedMode() && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
              <p className="text-xs text-emerald-700"><b>Scan otomatis aktif</b> — cukup tempel/ketik ID, tanpa perlu klik kolom input.</p>
            </div>
          )}

          {/* Multi-device indicator */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <Wifi className="w-3 h-3 text-emerald-500" />
            <span>Multi-device aktif — sinkron real-time antar perangkat</span>
          </div>
        </CardContent>
      </Card>

      {lastResult && (
        <Card className={`border-2 ${lastResult.status === 'success' ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
          <CardContent className="p-4 flex items-center gap-3">
            {lastResult.status === 'success'
              ? <CheckCircle className="w-10 h-10 text-emerald-500 shrink-0" />
              : <XCircle className="w-10 h-10 text-red-500 shrink-0" />}
            <div>
              <p className={`font-bold ${lastResult.status === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{lastResult.message}</p>
              {lastResult.person && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={jenisBadgeClass(lastResult.person.jenis)}>
                    {lastResult.person.jenis} · {lastResult.person.person_type}
                  </Badge>
                  <span className="text-xs text-slate-500">ID: {lastResult.cardId}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rekap Pegawai Hari Ini */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-3">
            <UserCog className="w-4 h-4 text-indigo-500" /> Rekap Pegawai Hari Ini ({pegawaiToday.length})
          </h4>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {pegawaiToday.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">Belum ada absensi pegawai hari ini</p>
            ) : pegawaiToday.slice().sort((a, b) => (b.jam_masuk || '').localeCompare(a.jam_masuk || '')).map((a) => renderRecapRow(a, true))}
          </div>
        </CardContent>
      </Card>

      {/* Rekap Siswa Hari Ini */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-emerald-500" /> Rekap Siswa Hari Ini ({siswaToday.length})
          </h4>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {siswaToday.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">Belum ada absensi siswa hari ini</p>
            ) : siswaToday.slice().sort((a, b) => (b.jam_masuk || '').localeCompare(a.jam_masuk || '')).map((a) => renderRecapRow(a, false))}
          </div>
        </CardContent>
      </Card>

      {scanLog.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h4 className="font-bold text-slate-700 text-sm mb-2">Log Scan Terakhir</h4>
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {scanLog.map((log, i) => (
                <div key={i} className={`text-xs px-2 py-1.5 rounded-lg flex items-center gap-2 ${log.status === 'success' ? 'bg-emerald-50 text-emerald-600' : log.status === 'info' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                  <span className="font-mono text-slate-400">{log.time}</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Popup Informasi Hasil Scan */}
      <Dialog open={!!popup} onOpenChange={(v) => !v && setPopup(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden border-0">
          {popup && (
            <div className={`text-center ${popupStatusColor.bg} px-6 pt-6 pb-5`}>
              <div className={`inline-flex items-center justify-center w-20 h-20 ${popupStatusColor.ring} rounded-full mb-3`}>
                {popup.status === 'success'
                  ? <CheckCircle className={`w-12 h-12 ${popupStatusColor.icon}`} />
                  : popup.status === 'info'
                  ? <Clock className={`w-12 h-12 ${popupStatusColor.icon}`} />
                  : <XCircle className={`w-12 h-12 ${popupStatusColor.icon}`} />}
              </div>
              <h3 className={`text-lg font-bold ${popupStatusColor.text}`}>
                {popup.status === 'success' ? 'Absensi Tercatat' : popup.status === 'info' ? 'Sudah Terdata' : 'Gagal'}
              </h3>
              <p className="text-sm text-slate-600 mt-0.5">{popup.message}</p>

              {popup.nama && (
                <div className={`mt-4 mx-auto max-w-[240px] bg-white/80 rounded-xl border ${popupStatusColor.border} divide-y divide-slate-100 text-left`}>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-slate-500">Nama</span>
                    <span className="text-sm font-semibold text-slate-800 truncate ml-2">{popup.nama}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-slate-500">Jam Absen</span>
                    <span className="text-sm font-mono font-semibold text-slate-800">{popup.jamAbsen}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-slate-500">Status</span>
                    <Badge className={
                      popup.statusAbsen === 'Hadir' ? 'bg-emerald-100 text-emerald-700' :
                      popup.statusAbsen === 'Terlambat' ? 'bg-orange-100 text-orange-700' :
                      popup.statusAbsen === 'Pulang' ? 'bg-blue-100 text-blue-700' :
                      popup.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                      popup.status === 'info' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                    }>{popup.statusAbsen || (popup.status === 'success' ? 'Tercatat' : popup.status === 'info' ? 'Terdata' : 'Gagal')}</Badge>
                  </div>
                </div>
              )}

              {popup.person && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Badge className={jenisBadgeClass(popup.person.jenis)}>
                    {popup.person.jenis} · {popup.person.person_type}
                  </Badge>
                  <span className="text-[10px] text-slate-400">ID: {popup.cardId}</span>
                </div>
              )}

              <p className="text-[10px] text-slate-400 mt-3">Popup otomatis tertutup dalam 5 detik</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}