import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ScanLine, CheckCircle, XCircle, Clock, User, MessageCircle, Loader2 } from "lucide-react";

export default function ScanAbsensi({ personType = 'Siswa' }) {
  const [scanInput, setScanInput] = useState('');
  const [lastResult, setLastResult] = useState(null);
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

  useEffect(() => { inputRef.current?.focus(); }, []);

  const addLog = (result) => {
    const entry = { ...result, time: format(new Date(), 'HH:mm:ss') };
    setScanLog(prev => [entry, ...prev].slice(0, 20));
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

  const handleScan = async (e) => {
    if (e) e.preventDefault();
    const cardId = scanInput.trim();
    if (!cardId || processing) return;
    setProcessing(true);

    try {
      const kartuList = await base44.entities.KartuAbsensi.filter({ card_id: cardId, status: 'Aktif' });
      if (!kartuList || kartuList.length === 0) {
        const result = { status: 'error', message: `Kartu "${cardId}" tidak terdaftar`, cardId };
        setLastResult(result);
        addLog(result);
        toast({ title: '❌ Kartu tidak terdaftar', variant: 'destructive' });
        return;
      }

      const k = kartuList[0];
      if (k.person_type !== personType) {
        const result = { status: 'error', message: `Kartu ini untuk ${k.person_type}, bukan ${personType}`, cardId, person: k };
        setLastResult(result);
        addLog(result);
        toast({ title: `❌ Kartu untuk ${k.person_type}`, variant: 'destructive' });
        return;
      }

      const now = format(new Date(), 'HH:mm');
      const lateThreshold = personType === 'Pegawai' ? '07:30' : '07:00';
      const isLate = now > lateThreshold;
      const status = isLate ? 'Terlambat' : 'Hadir';

      if (personType === 'Pegawai') {
        const existing = await base44.entities.AbsensiPegawai.filter({ guru_id: k.person_id, tanggal: today });
        if (existing.length > 0 && existing[0].jam_keluar) {
          const result = { status: 'error', message: `${k.nama} sudah absen masuk & keluar hari ini`, cardId, person: k };
          setLastResult(result);
          addLog(result);
          toast({ title: '⚠️ Sudah lengkap', description: `${k.nama} sudah absen masuk & keluar` });
          return;
        }
        if (existing.length > 0) {
          await base44.entities.AbsensiPegawai.update(existing[0].id, { jam_keluar: now });
          const result = { status: 'success', message: `${k.nama} — Keluar: ${now}`, cardId, person: k, type: 'keluar' };
          setLastResult(result);
          addLog(result);
          toast({ title: '✅ Absensi Keluar', description: `${k.nama} — ${now}` });
        } else {
          await base44.entities.AbsensiPegawai.create({
            tanggal: today, guru_id: k.person_id, nip: k.nip_nis,
            nama_pegawai: k.nama, jabatan: k.info,
            jam_masuk: now, status, metode: k.jenis, card_id: cardId,
          });
          const result = { status: 'success', message: `${k.nama} — ${status} — Masuk: ${now}`, cardId, person: k, type: 'masuk' };
          setLastResult(result);
          addLog(result);
          toast({ title: `✅ ${status}`, description: `${k.nama} — ${now}` });
          sendWANotif(k, status, now);
        }
      } else {
        const existing = await base44.entities.Absensi.filter({ siswa_id: k.person_id, tanggal: today, jenis_absensi: 'Kehadiran' });
        if (existing.length > 0) {
          const result = { status: 'error', message: `${k.nama} sudah absen hari ini (${existing[0].jam_masuk})`, cardId, person: k };
          setLastResult(result);
          addLog(result);
          toast({ title: '⚠️ Sudah absen', description: `${k.nama} — ${existing[0].jam_masuk}` });
          return;
        }
        await base44.entities.Absensi.create({
          tanggal: today, siswa_id: k.person_id, nis: k.nip_nis,
          nama_siswa: k.nama, nama_kelas: k.info,
          status, jenis_absensi: 'Kehadiran', jam_masuk: now,
          metode: k.jenis, card_id: cardId,
        });
        const result = { status: 'success', message: `${k.nama} — ${status} — ${now}`, cardId, person: k, type: 'masuk' };
        setLastResult(result);
        addLog(result);
        toast({ title: `✅ ${status}`, description: `${k.nama} — ${now}` });
        sendWANotif(k, status, now);
      }

      queryClient.invalidateQueries({ queryKey: ['scan-today', personType, today] });
    } catch (err) {
      const result = { status: 'error', message: `Error: ${err.message}`, cardId };
      setLastResult(result);
      addLog(result);
      toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
      setScanInput('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-emerald-200 shadow-md">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-3">
              <ScanLine className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Scan Absensi {personType}</h3>
            <p className="text-sm text-slate-500">Tempel kartu / scan QR / scan fingerprint pada reader</p>
          </div>
          <form onSubmit={handleScan}>
            <Input
              ref={inputRef}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Menunggu scan kartu..."
              className="text-center text-lg font-mono h-14 border-2 border-emerald-300 focus:border-emerald-500"
              autoComplete="off"
              readOnly={processing}
            />
            <Button type="submit" className="w-full mt-3 h-12 bg-emerald-600 hover:bg-emerald-700" disabled={processing || !scanInput.trim()}>
              {processing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ScanLine className="w-5 h-5 mr-2" />}
              {processing ? 'Memproses...' : 'Proses Scan'}
            </Button>
          </form>
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
            ) : todayList.sort((a, b) => (b.jam_masuk || '').localeCompare(a.jam_masuk || '')).map((a, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
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
    </div>
  );
}