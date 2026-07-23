import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { School, Printer, QrCode } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PersonSearch from '@/components/absensi/PersonSearch';

export default function IDCardPreview({ personType = 'Pegawai' }) {
  const { toast } = useToast();
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

  const handlePrint = () => {
    const isPegawai = personType === 'Pegawai';
    const nipNisLabel = isPegawai ? 'NIP' : 'NIS';
    const nipNisValue = isPegawai ? (selected.nip || '-') : (selected.nis || '-');
    const infoLabel = isPegawai ? 'Jabatan' : 'Kelas';
    const infoValue = isPegawai ? (selected.jabatan || '-') : (selected.nama_kelas || '-');
    const qrUrl = qrCard
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(qrCard.card_id)}`
      : '';

    const printHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Kartu ID - ${selected.nama}</title>
<style>
  @page { size: 8.56cm 5.4cm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 0; }
  .card {
    width: 8.56cm; height: 5.4cm;
    overflow: hidden; position: relative; background: white;
    font-family: Arial, Helvetica, sans-serif;
    border-radius: 8px;
  }
  .header {
    background: linear-gradient(to right, #2563eb, #4338ca);
    padding: 5px 10px; display: flex; align-items: center; gap: 8px;
  }
  .header-badge {
    width: 26px; height: 26px; background: rgba(255,255,255,0.2);
    border-radius: 7px; display: flex; align-items: center; justify-content: center;
    font-size: 11px; color: white; font-weight: bold; flex-shrink: 0;
  }
  .header-text h1 { color: white; font-size: 9px; font-weight: bold; line-height: 1.1; }
  .header-text p { color: rgba(255,255,255,0.7); font-size: 6px; }
  .body { display: flex; padding: 8px 10px; gap: 8px; height: calc(5.4cm - 32px); }
  .photo {
    width: 50px; height: 64px; background: #f1f5f9; border-radius: 7px;
    border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 900; color: #cbd5e1; flex-shrink: 0;
  }
  .info { flex: 1; min-width: 0; overflow: hidden; }
  .info-label { font-size: 6.5px; color: #94a3b8; font-weight: 500; text-transform: uppercase; }
  .info-value { font-size: 10px; color: #1e293b; font-weight: bold; line-height: 1.2; }
  .info-value-mono { font-size: 9px; color: #334155; font-family: 'Courier New', monospace; line-height: 1.2; }
  .qr { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; }
  .qr img { width: 58px; height: 58px; border-radius: 5px; border: 1px solid #e2e8f0; }
  .qr-placeholder { width: 58px; height: 58px; background: #f1f5f9; border-radius: 5px; border: 1px solid #e2e8f0; }
  .qr-label { font-size: 5px; color: #94a3b8; margin-top: 2px; text-align: center; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="header-badge">YS</div>
    <div class="header-text">
      <h1>YPPI ARRAHMAH</h1>
      <p>KARTU IDENTITAS ${personType.toUpperCase()}</p>
    </div>
  </div>
  <div class="body">
    <div class="photo">${selected.nama?.charAt(0) || '?'}</div>
    <div class="info">
      <p class="info-label">Nama</p>
      <p class="info-value">${selected.nama}</p>
      <p class="info-label" style="margin-top:3px">${nipNisLabel}</p>
      <p class="info-value-mono">${nipNisValue}</p>
      <p class="info-label" style="margin-top:3px">${infoLabel}</p>
      <p class="info-value-mono">${infoValue}</p>
    </div>
    <div class="qr">
      ${qrUrl
        ? `<img src="${qrUrl}" />`
        : '<div class="qr-placeholder"></div>'}
      <p class="qr-label">Scan untuk absensi</p>
    </div>
  </div>
</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
    setTimeout(function() { window.close(); }, 1000);
  };
</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=400,height=250');
    if (!printWindow) {
      toast({ title: '⚠️ Popup diblokir', description: 'Izinkan popup untuk mencetak kartu', variant: 'destructive' });
      return;
    }
    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm print:hidden">
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-xs mb-2 block">Pilih {personType}</Label>
            <PersonSearch personType={personType} personList={personList} selectedPerson={selectedPerson} onPersonSelect={setSelectedPerson} />
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