import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { CreditCard, QrCode, Fingerprint, Plus, Trash2, User, ScanFace, CheckCircle } from "lucide-react";
import GenerateQRMassal from '@/components/absensi/GenerateQRMassal';
import PersonSearch from '@/components/absensi/PersonSearch';
import NfcScanner from '@/components/absensi/NfcScanner';
import FingerprintScanner from '@/components/absensi/FingerprintScanner';
import FaceRecognition from '@/components/absensi/FaceRecognition';
import { useAuth } from '@/lib/AuthContext';

export default function PendaftaranKartu({ personType = 'Pegawai' }) {
  const [selectedPerson, setSelectedPerson] = useState('');
  const [newCardId, setNewCardId] = useState('');
  const [newJenis, setNewJenis] = useState('RFID');
  const [scanMode, setScanMode] = useState(false);
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const canUseNfc = ['admin', 'tu'].includes(currentUser?.role);

  const entityName = personType === 'Pegawai' ? 'Guru' : 'Siswa';
  const { data: personList = [] } = useQuery({
    queryKey: ['person-list', personType],
    queryFn: () => base44.entities[entityName].filter(personType === 'Pegawai' ? { status: 'Aktif' } : { status: 'Aktif' }),
  });

  const { data: kartuList = [] } = useQuery({
    queryKey: ['kartu-person', personType, selectedPerson],
    queryFn: () => base44.entities.KartuAbsensi.filter({ person_id: selectedPerson }),
    enabled: !!selectedPerson,
  });

  const { data: wajahList = [] } = useQuery({
    queryKey: ['wajah-person', personType, selectedPerson],
    queryFn: () => base44.entities.DataWajah.filter({ person_type: personType, person_id: selectedPerson, status: 'Aktif' }),
    enabled: !!selectedPerson,
  });

  const createKartuMutation = useMutation({
    mutationFn: (data) => base44.entities.KartuAbsensi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kartu-person'] });
      setNewCardId('');
      toast({ title: '✅ Kartu berhasil didaftarkan' });
    },
  });

  const deleteKartuMutation = useMutation({
    mutationFn: (id) => base44.entities.KartuAbsensi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kartu-person'] });
      toast({ title: '🗑️ Kartu dihapus' });
    },
  });

  const deleteWajahMutation = useMutation({
    mutationFn: async (id) => {
      const wajah = await base44.entities.DataWajah.get(id);
      await base44.entities.DataWajah.delete(id);
      if (wajah?.card_id_virtual) {
        const kartuList = await base44.entities.KartuAbsensi.filter({ card_id: wajah.card_id_virtual });
        if (kartuList.length > 0) await base44.entities.KartuAbsensi.delete(kartuList[0].id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wajah-person'] });
      queryClient.invalidateQueries({ queryKey: ['kartu-person'] });
      toast({ title: '🗑️ Data wajah dihapus' });
    },
  });

  const selectedPersonData = personList.find(p => p.id === selectedPerson);

  const handleAddKartu = () => {
    if (!selectedPerson || !newCardId.trim()) {
      toast({ title: 'Pilih person dan isi card ID', variant: 'destructive' });
      return;
    }
    const p = selectedPersonData;
    createKartuMutation.mutate({
      card_id: newCardId.trim(),
      jenis: newJenis,
      person_type: personType,
      person_id: p.id,
      nama: p.nama,
      nip_nis: personType === 'Pegawai' ? p.nip : p.nis,
      info: personType === 'Pegawai' ? p.jabatan : p.nama_kelas,
      no_telp: personType === 'Pegawai' ? p.no_telp : (p.kontak_list?.[0]?.no_telp || p.no_telp_ortu || ''),
      status: 'Aktif',
    });
  };

  const handleGenerateQR = () => {
    if (!selectedPersonData) return;
    const p = selectedPersonData;
    const qrId = `QR-${personType === 'Pegawai' ? (p.nip || p.id) : (p.nis || p.id)}`;
    setNewCardId(qrId);
    setNewJenis('QRCode');
    toast({ title: 'QR Code di-generate', description: qrId });
  };

  const dataURLtoFile = (dataUrl, filename) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const handleFaceRegister = async (descriptor, fotoDataUrl) => {
    if (!selectedPersonData) return;
    const p = selectedPersonData;
    const cardId = `FACE-${p.id}`;
    try {
      let fotoUrl = '';
      try {
        const fotoFile = dataURLtoFile(fotoDataUrl, `wajah-${p.nama}.jpg`);
        const res = await base44.integrations.Core.UploadFile({ file: fotoFile });
        fotoUrl = res.file_url || '';
      } catch (e) { /* photo upload optional */ }
      await base44.entities.DataWajah.create({
        person_type: personType, person_id: p.id, nama: p.nama,
        nip_nis: personType === 'Pegawai' ? p.nip : p.nis,
        info: personType === 'Pegawai' ? p.jabatan : p.nama_kelas,
        descriptor, card_id_virtual: cardId, foto_url: fotoUrl, status: 'Aktif',
      });
      await base44.entities.KartuAbsensi.create({
        card_id: cardId, jenis: 'FaceRecognition', person_type: personType,
        person_id: p.id, nama: p.nama,
        nip_nis: personType === 'Pegawai' ? p.nip : p.nis,
        info: personType === 'Pegawai' ? p.jabatan : p.nama_kelas,
        no_telp: personType === 'Pegawai' ? p.no_telp : (p.kontak_list?.[0]?.no_telp || p.no_telp_ortu || ''),
        status: 'Aktif',
      });
      queryClient.invalidateQueries({ queryKey: ['kartu-person'] });
      queryClient.invalidateQueries({ queryKey: ['wajah-person'] });
      toast({ title: '✅ Wajah berhasil didaftarkan!' });
      setShowFaceRegistration(false);
    } catch (err) {
      toast({ title: '❌ Gagal mendaftarkan wajah', description: err.message, variant: 'destructive' });
    }
  };

  const handleScanRFID = () => {
    setScanMode(true);
    setNewJenis('RFID');
    setNewCardId('');
    toast({ title: '📡 Mode Scan RFID Aktif', description: 'Tempel kartu pada reader sekarang' });
    setTimeout(() => {
      const listener = (e) => {
        if (e.target.tagName === 'INPUT' && e.target.value === newCardId) return;
      };
      document.addEventListener('input', listener, { once: true });
    }, 100);
  };

  const jenisIcon = { RFID: CreditCard, QRCode: QrCode, Fingerprint: Fingerprint, FaceRecognition: ScanFace };
  const jenisColor = { RFID: 'bg-purple-100 text-purple-700', QRCode: 'bg-blue-100 text-blue-700', Fingerprint: 'bg-orange-100 text-orange-700', FaceRecognition: 'bg-indigo-100 text-indigo-700' };

  return (
    <div className="space-y-4">
      {personType === 'Siswa' && <GenerateQRMassal personType={personType} />}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-500" /> Pendaftaran Kartu {personType}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs mb-2 block">Pilih {personType}</Label>
            <PersonSearch personType={personType} personList={personList} selectedPerson={selectedPerson} onPersonSelect={setSelectedPerson} />
          </div>

          {selectedPerson && (
            <>
              {/* Registered Cards */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Kartu Terdaftar ({kartuList.length})</p>
                {kartuList.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">Belum ada kartu terdaftar</p>
                ) : (
                  <div className="space-y-1.5">
                    {kartuList.map(k => {
                      const Icon = jenisIcon[k.jenis] || CreditCard;
                      return (
                        <div key={k.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm"><Icon className="w-4 h-4 text-slate-600" /></div>
                            <div>
                              <p className="text-sm font-mono text-slate-700">{k.card_id}</p>
                              <Badge className={`text-[9px] ${jenisColor[k.jenis]}`}>{k.jenis}</Badge>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="text-red-500 h-8 w-8 p-0" onClick={() => deleteKartuMutation.mutate(k.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add New Card */}
              <div className="border-t pt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Daftarkan Kartu Baru</p>
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" size="sm" variant={newJenis === 'RFID' ? 'default' : 'outline'} className={newJenis === 'RFID' ? 'bg-purple-600' : ''} onClick={() => { setNewJenis('RFID'); handleScanRFID(); }}>
                    <CreditCard className="w-3 h-3 mr-1" /> RFID Reader
                  </Button>
                  {canUseNfc && (
                    <NfcScanner
                      disabled={!selectedPerson}
                      onScan={(uid) => {
                        setNewCardId(uid);
                        setNewJenis('RFID');
                      }}
                    />
                  )}
                  <Button type="button" size="sm" variant={newJenis === 'QRCode' ? 'default' : 'outline'} className={newJenis === 'QRCode' ? 'bg-blue-600' : ''} onClick={() => { setNewJenis('QRCode'); handleGenerateQR(); }}>
                    <QrCode className="w-3 h-3 mr-1" /> QR Code
                  </Button>
                  <Button type="button" size="sm" variant={newJenis === 'Fingerprint' ? 'default' : 'outline'} className={newJenis === 'Fingerprint' ? 'bg-orange-600' : ''} onClick={() => setNewJenis('Fingerprint')}>
                    <Fingerprint className="w-3 h-3 mr-1" /> Fingerprint
                  </Button>
                  {canUseNfc && (
                    <FingerprintScanner
                      mode="register"
                      disabled={!selectedPersonData}
                      userInfo={{ id: selectedPersonData?.id, name: selectedPersonData?.nama }}
                      onScan={(credId) => { setNewCardId(credId); setNewJenis('Fingerprint'); }}
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newCardId}
                    onChange={(e) => setNewCardId(e.target.value)}
                    placeholder={newJenis === 'RFID' ? 'Tempel kartu atau ketik UID...' : newJenis === 'Fingerprint' ? 'Masukkan ID fingerprint...' : 'QR ID akan otomatis muncul...'}
                    className="font-mono"
                    autoFocus={scanMode}
                  />
                  <Button onClick={handleAddKartu} disabled={!newCardId.trim() || createKartuMutation.isPending}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {newJenis === 'QRCode' && newCardId && (
                  <div className="flex justify-center pt-2">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(newCardId)}`} alt="QR Code" className="rounded-xl border-2 border-slate-200" />
                  </div>
                )}
              </div>

              {canUseNfc && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <ScanFace className="w-3 h-3 text-indigo-600" /> Pendaftaran Wajah (Face Recognition)
                  </p>
                  {wajahList.length > 0 ? (
                    <div className="flex items-center gap-2 p-2.5 bg-indigo-50 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs text-indigo-700 font-medium">Wajah terdaftar</span>
                      <Button size="sm" variant="ghost" className="text-red-500 ml-auto h-7 text-xs" onClick={() => deleteWajahMutation.mutate(wajahList[0].id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : showFaceRegistration ? (
                    <FaceRecognition mode="register" onRegister={handleFaceRegister} />
                  ) : (
                    <Button type="button" size="sm" variant="outline" className="text-indigo-600 border-indigo-200" onClick={() => setShowFaceRegistration(true)}>
                      <ScanFace className="w-3 h-3 mr-1" /> Daftarkan Wajah
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}