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
import { CreditCard, QrCode, Fingerprint, Plus, Trash2, User } from "lucide-react";

export default function PendaftaranKartu({ personType = 'Pegawai' }) {
  const [selectedPerson, setSelectedPerson] = useState('');
  const [newCardId, setNewCardId] = useState('');
  const [newJenis, setNewJenis] = useState('RFID');
  const [scanMode, setScanMode] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const jenisIcon = { RFID: CreditCard, QRCode: QrCode, Fingerprint: Fingerprint };
  const jenisColor = { RFID: 'bg-purple-100 text-purple-700', QRCode: 'bg-blue-100 text-blue-700', Fingerprint: 'bg-orange-100 text-orange-700' };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-500" /> Pendaftaran Kartu {personType}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Pilih {personType}</Label>
            <Select value={selectedPerson} onValueChange={setSelectedPerson}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={`Pilih ${personType}...`} /></SelectTrigger>
              <SelectContent>
                {personList.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nama} — {personType === 'Pegawai' ? (p.nip || 'No NIP') : (p.nis || 'No NIS')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant={newJenis === 'RFID' ? 'default' : 'outline'} className={newJenis === 'RFID' ? 'bg-purple-600' : ''} onClick={() => { setNewJenis('RFID'); handleScanRFID(); }}>
                    <CreditCard className="w-3 h-3 mr-1" /> RFID
                  </Button>
                  <Button type="button" size="sm" variant={newJenis === 'QRCode' ? 'default' : 'outline'} className={newJenis === 'QRCode' ? 'bg-blue-600' : ''} onClick={() => { setNewJenis('QRCode'); handleGenerateQR(); }}>
                    <QrCode className="w-3 h-3 mr-1" /> QR Code
                  </Button>
                  <Button type="button" size="sm" variant={newJenis === 'Fingerprint' ? 'default' : 'outline'} className={newJenis === 'Fingerprint' ? 'bg-orange-600' : ''} onClick={() => setNewJenis('Fingerprint')}>
                    <Fingerprint className="w-3 h-3 mr-1" /> Fingerprint
                  </Button>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}