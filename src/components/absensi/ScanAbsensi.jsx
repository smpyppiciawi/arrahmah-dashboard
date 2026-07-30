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
import { ScanLine, CheckCircle, XCircle, Clock, User, CreditCard, QrCode, Fingerprint, Camera, Loader2, Monitor, Wifi, Nfc, ScanFace } from "lucide-react";
import QRCameraScanner from '@/components/absensi/QRCameraScanner';
import NfcScanner from '@/components/absensi/NfcScanner';
import FingerprintScanner from '@/components/absensi/FingerprintScanner';
import FaceRecognition from '@/components/absensi/FaceRecognition';

export default function ScanAbsensi({ personType = 'Siswa' }) {
  const [scanMode, setScanMode] = useState('kartu');
  const [qrSubMode, setQrSubMode] = useState('kamera');
  const [fpSubMode, setFpSubMode] = useState('reader');
  const [scanInput, setScanInput] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [popup, setPopup] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [scanLog, setScanLog] = useState([]);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const today = format(new Date(), 'yyyy-MM-dd');
  const entityName = personType === 'Pegawai' ? 'AbsensiPegawai' : 'Absensi';

  const { data: todayList = [] } = useQuery({
    queryKey: ['scan-today', personType, today],
    queryFn: () => base44.entities[entityName].filter({ tanggal: today }),
  });

  useEffect(() => {
    if (!popup) return;
    const t = setTimeout(() => setPopup(null), 5000);
    return () => clearTimeout(t);
  }, [popup]);

  // Multi-device real-time sync
  useEffect(() => {
    const unsubscribe = base44.entities[entityName].subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        queryClient.invalidateQueries({ queryKey: ['scan-today', personType, today] });
      }
    });
    return unsubscribe;
  }, [entityName, personType, today]);

  useEffect(() => {
    if (scanMode === 'kartu' || (scanMode === 'fingerprint' && fpSubMode === 'reader') || (scanMode === 'qrcode' && qrSubMode === 'pembaca')) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [scanMode, qrSubMode, fpSubMode]);

  const addLog = (result) => {
    const entry = { ...result, time: format(new Date(), 'HH:mm:ss') };
    setScanLog(prev => [entry, ...prev].slice(0, 20));
  };

  const notify = (result) => {
    setLastResult(result);
    addLog(result);
    const jamAbsen = result.jamAbsen || format(new Date(), 'HH:mm:ss');
    setPopup({ ...result, jamAbsen });
  };

  const sendWANotif = async (k, status, now) => {
    if (!k.no_telp) return;
    const cleanPhone = k.no_telp.replace(/\D/g, '').replace(/^0/, '62');
    const msg = personType === 'Pegawai'
      ? `*Notifikasi Absensi Pegawai*\n\nNama: ${k.nama}\nJabatan: ${k.info}\nTanggal: ${today}\nJam: ${now}\nStatus: *${status}*\nMetode: ${k.jenis}`
      : `*Notifikasi Absensi Siswa*\n\nNama: ${k.nama}\nKelas: ${k.info}\nTanggal: ${today}\nJam: ${now}\nStatus: *${status}*\nMetode: ${k.jenis}`;
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

  const processScan = async (cardIdValue) => {
    const cardId = String(cardIdValue || '').trim();
    if (!cardId || processing) return;
    setProcessing(true);

    try {
      const kartuList = await base44.entities.KartuAbsensi.filter({ card_id: cardId, status: 'Aktif' });
      if (!kartuList || kartuList.length === 0) {
        notify({ status: 'error', message: `Kartu "${cardId}" tidak terdaftar`, cardId });
        return;
      }

      const k = kartuList[0];
      if (k.person_type !== personType) {
        notify({ status: 'error', message: `Kartu ini untuk ${k.person_type}, bukan ${personType}`, cardId, person: k, nama: k.nama, statusAbsen: 'Salah Kartu' });
        return;
      }

      const now = format(new Date(), 'HH:mm');
      const lateThreshold = personType === 'Pegawai' ? '07:30' : '07:00';
      const isLate = now > lateThreshold;
      const status = isLate ? 'Terlambat' : 'Hadir';

      if (personType === 'Pegawai') {
        const existing = await base44.entities.AbsensiPegawai.filter({ guru_id: k.person_id, tanggal: today });
        if (existing.length > 0 && existing[0].jam_keluar) {
          notify({ status: 'error', message: `${k.nama} sudah absen masuk & keluar hari ini`, cardId, person: k, nama: k.nama, statusAbsen: 'Sudah Lengkap' });
          return;
        }
        if (existing.length > 0) {
          await base44.entities.AbsensiPegawai.update(existing[0].id, { jam_keluar: now });
          notify({ status: 'success', message: `${k.nama} — Keluar: ${now}`, cardId, person: k, type: 'keluar', nama: k.nama, jamAbsen: now, statusAbsen: 'Keluar' });
        } else {
          await base44.entities.AbsensiPegawai.create({
            tanggal: today, guru_id: k.person_id, nip: k.nip_nis,
            nama_pegawai: k.nama, jabatan: k.info,
            jam_masuk: now, status, metode: k.jenis, card_id: cardId,
          });
          notify({ status: 'success', message: `${k.nama} — ${status} — Masuk: ${now}`, cardId, person: k, type: 'masuk', nama: k.nama, jamAbsen: now, statusAbsen: status });
          sendWANotif(k, status, now);
        }
      } else {
        const existing = await base44.entities.Absensi.filter({ siswa_id: k.person_id, tanggal: today, jenis_absensi: 'Kehadiran' });
        if (existing.length > 0) {
          notify({ status: 'error', message: `${k.nama} sudah absen hari ini (${existing[0].jam_masuk})`, cardId, person: k, nama: k.nama, jamAbsen: existing[0].jam_masuk, statusAbsen: 'Sudah Absen' });
          return;
        }
        await base44.entities.Absensi.create({
          tanggal: today, siswa_id: k.person_id, nis: k.nip_nis,
          nama_siswa: k.nama, nama_kelas: k.info,
          status, jenis_absensi: 'Kehadiran', jam_masuk: now,
          metode: k.jenis, card_id: cardId,
        });
        notify({ status: 'success', message: `${k.nama} — ${status} — ${now}`, cardId, person: k, type: 'masuk', nama: k.nama, jamAbsen: now, statusAbsen: status });
        sendWANotif(k, status, now);
      }

      queryClient.invalidateQueries({ queryKey: ['scan-today', personType, today] });
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
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

  const popupStatusColor = popup?.status === 'success'
    ? { bg: 'bg-emerald-50', ring: 'bg-emerald-100', icon: 'text-emerald-600', text: 'text-emerald-700', border: 'border-emerald-200' }
    : { bg: 'bg-red-50', ring: 'bg-red-100', icon: 'text-red-600', text: 'text-red-700', border: 'border-red-200' };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-emerald-200 shadow-md">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-3">
              <ScanLine className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Scan Absensi {personType}</h3>
            <p className="text-sm text-slate-500">Pilih metode absensi sesuai perangkat</p>
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
            <FaceRecognition mode="scan" personType={personType} onMatch={processScan} disabled={processing} />
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
                  <Badge className={lastResult.person.jenis === 'RFID' ? 'bg-purple-100 text-purple-700' : lastResult.person.jenis === 'QRCode' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}>
                    {lastResult.person.jenis}
                  </Badge>
                  <span className="text-xs text-slate-500">ID: {lastResult.cardId}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" /> Absensi Hari Ini ({todayList.length})
            </h4>
          </div>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {todayList.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">Belum ada absensi hari ini</p>
            ) : todayList.slice().sort((a, b) => (b.jam_masuk || '').localeCompare(a.jam_masuk || '')).map((a, i) => (
              <div key={a.id || i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <User className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{personType === 'Pegawai' ? a.nama_pegawai : a.nama_siswa}</p>
                    <p className="text-xs text-slate-400">{personType === 'Pegawai' ? a.jabatan : a.nama_kelas}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-slate-600">{a.jam_masuk}{a.jam_keluar ? ` → ${a.jam_keluar}` : ''}</p>
                  <div className="flex items-center gap-1 justify-end">
                    {a.metode && a.metode !== 'Manual' && <span className="text-[9px] text-slate-400">{a.metode}</span>}
                    <Badge className={`text-[9px] ${a.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700' : a.status === 'Terlambat' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{a.status}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {scanLog.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h4 className="font-bold text-slate-700 text-sm mb-2">Log Scan Terakhir</h4>
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {scanLog.map((log, i) => (
                <div key={i} className={`text-xs px-2 py-1.5 rounded-lg flex items-center gap-2 ${log.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
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
                  : <XCircle className={`w-12 h-12 ${popupStatusColor.icon}`} />}
              </div>
              <h3 className={`text-lg font-bold ${popupStatusColor.text}`}>
                {popup.status === 'success' ? 'Absensi Tercatat' : 'Gagal'}
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
                      popup.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }>{popup.statusAbsen || (popup.status === 'success' ? 'Tercatat' : 'Gagal')}</Badge>
                  </div>
                </div>
              )}

              {popup.person && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Badge className={popup.person.jenis === 'RFID' ? 'bg-purple-100 text-purple-700' : popup.person.jenis === 'QRCode' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}>
                    {popup.person.jenis}
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