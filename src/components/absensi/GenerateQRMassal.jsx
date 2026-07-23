import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { QrCode, Zap, CheckCircle, AlertCircle } from "lucide-react";

export default function GenerateQRMassal({ personType = 'Siswa' }) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-aktif-qr-massal'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: existingCards = [] } = useQuery({
    queryKey: ['kartu-qrcode-existing', personType],
    queryFn: () => base44.entities.KartuAbsensi.filter({ person_type: personType, jenis: 'QRCode' }),
  });

  const existingPersonIds = new Set(existingCards.map(c => c.person_id));
  const siswaWithoutQR = siswaList.filter(s => !existingPersonIds.has(s.id));
  const siswaWithNIS = siswaWithoutQR.filter(s => s.nis);
  const siswaWithoutNIS = siswaWithoutQR.filter(s => !s.nis);

  const handleGenerateAll = async () => {
    if (siswaWithNIS.length === 0) {
      toast({ title: 'ℹ️ Semua siswa sudah memiliki QR Code' });
      return;
    }

    setGenerating(true);
    setProgress({ done: 0, total: siswaWithNIS.length });

    const records = siswaWithNIS.map(s => ({
      card_id: `QR-${s.nis}`,
      jenis: 'QRCode',
      person_type: 'Siswa',
      person_id: s.id,
      nama: s.nama,
      nip_nis: s.nis,
      info: s.nama_kelas || '',
      no_telp: s.kontak_list?.[0]?.no_telp || s.no_telp_ortu || '',
      status: 'Aktif',
    }));

    try {
      const batchSize = 400;
      let created = 0;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await base44.entities.KartuAbsensi.bulkCreate(batch);
        created += batch.length;
        setProgress({ done: created, total: records.length });
      }

      queryClient.invalidateQueries({ queryKey: ['kartu-qrcode-existing'] });
      queryClient.invalidateQueries({ queryKey: ['kartu-person'] });
      queryClient.invalidateQueries({ queryKey: ['kartu-person-idcard'] });

      toast({
        title: '✅ Generate QR Massal Selesai',
        description: `${created} QR Code berhasil dibuat berdasarkan NIS`,
      });
    } catch (err) {
      toast({ title: '❌ Gagal generate QR', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-500" /> Generate QR Code Massal
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          Generate QR Code otomatis untuk seluruh siswa aktif berdasarkan NIS. Kartu langsung tersimpan dan tersedia di tab Kartu ID.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-slate-700">{siswaList.length}</p>
            <p className="text-[10px] text-slate-500">Total Siswa Aktif</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-emerald-700">{existingCards.length}</p>
            <p className="text-[10px] text-emerald-600">Sudah Punya QR</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-blue-700">{siswaWithNIS.length}</p>
            <p className="text-[10px] text-blue-600">Perlu Generate</p>
          </div>
        </div>

        {siswaWithoutNIS.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              {siswaWithoutNIS.length} siswa tidak memiliki NIS dan akan dilewati. Lengkapi data NIS di menu Siswa.
            </p>
          </div>
        )}

        {generating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Menggenerate...</span>
              <span className="font-mono text-blue-600">{progress.done}/{progress.total}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {!generating && siswaWithNIS.length > 0 && (
          <Button onClick={handleGenerateAll} className="w-full bg-blue-600 hover:bg-blue-700">
            <QrCode className="w-4 h-4 mr-2" /> Generate {siswaWithNIS.length} QR Code Sekaligus
          </Button>
        )}

        {!generating && siswaWithNIS.length === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 justify-center">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <p className="text-sm text-emerald-700">Semua siswa sudah memiliki QR Code</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}