import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { School, Printer, QrCode } from "lucide-react";

export default function IDCardPreview({ personType = 'Pegawai' }) {
  const [selectedPerson, setSelectedPerson] = useState('');

  const entityName = personType === 'Pegawai' ? 'Guru' : 'Siswa';
  const { data: personList = [] } = useQuery({
    queryKey: ['person-list-idcard', personType],
    queryFn: () => base44.entities[entityName].filter(personType === 'Pegawai' ? { status: 'Aktif' } : { status: 'Aktif' }),
  });

  const { data: kartuList = [] } = useQuery({
    queryKey: ['kartu-person-idcard', personType, selectedPerson],
    queryFn: () => base44.entities.KartuAbsensi.filter({ person_id: selectedPerson, jenis: 'QRCode', status: 'Aktif' }),
    enabled: !!selectedPerson,
  });

  const selected = personList.find(p => p.id === selectedPerson);
  const qrCard = kartuList[0];

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm print:hidden">
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Pilih {personType}</Label>
            <Select value={selectedPerson} onValueChange={setSelectedPerson}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={`Pilih ${personType}...`} /></SelectTrigger>
              <SelectContent>
                {personList.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <div className="flex flex-col items-center gap-4">
          {/* ID Card */}
          <div className="w-[340px] h-[214px] rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 relative bg-white" id="id-card-print">
            {/* Top bar */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-3 py-2 flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <School className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-[10px] font-bold leading-none">YPPI ARRAHMAH</p>
                <p className="text-white/70 text-[7px]">KARTU IDENTITAS {personType.toUpperCase()}</p>
              </div>
            </div>

            {/* Body */}
            <div className="flex p-3 gap-3 h-[168px]">
              {/* Photo */}
              <div className="w-16 h-20 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 border border-slate-200">
                <span className="text-2xl font-black text-slate-300">{selected.nama?.charAt(0) || '?'}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[8px] text-slate-400 font-medium">Nama</p>
                <p className="text-xs font-bold text-slate-800 leading-tight truncate">{selected.nama}</p>
                <p className="text-[8px] text-slate-400 font-medium mt-1">{personType === 'Pegawai' ? 'NIP' : 'NIS'}</p>
                <p className="text-[10px] font-mono text-slate-700">{personType === 'Pegawai' ? (selected.nip || '-') : (selected.nis || '-')}</p>
                <p className="text-[8px] text-slate-400 font-medium mt-1">{personType === 'Pegawai' ? 'Jabatan' : 'Kelas'}</p>
                <p className="text-[10px] text-slate-700">{personType === 'Pegawai' ? (selected.jabatan || '-') : (selected.nama_kelas || '-')}</p>
              </div>

              {/* QR Code */}
              <div className="shrink-0 flex flex-col items-center">
                {qrCard ? (
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&margin=0&data=${encodeURIComponent(qrCard.card_id)}`} alt="QR" className="w-[70px] h-[70px] rounded-lg border border-slate-200" />
                ) : (
                  <div className="w-[70px] h-[70px] bg-slate-100 rounded-lg flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-slate-300" />
                  </div>
                )}
                <p className="text-[6px] text-slate-400 mt-0.5">Scan untuk absensi</p>
              </div>
            </div>
          </div>

          {!qrCard && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-amber-700">⚠️ Belum ada QR Code terdaftar. Daftarkan di tab Pendaftaran Kartu.</p>
            </div>
          )}

          <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 print:hidden">
            <Printer className="w-4 h-4 mr-2" /> Cetak Kartu ID
          </Button>
        </div>
      )}
    </div>
  );
}