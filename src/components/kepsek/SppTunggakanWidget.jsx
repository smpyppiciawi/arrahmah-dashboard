import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Wallet, CheckCircle2, XCircle } from 'lucide-react';
import { getGratisBulanSPP } from '@/lib/sppUtils';

export default function SppTunggakanWidget({ siswaList, isDark, t }) {
  const activeMonth = format(new Date(), 'MMMM', { locale: idLocale });
  const [tab, setTab] = useState('belum');

  const { data: sppKeuangan = [] } = useQuery({ queryKey: ['spp-kepsek'], queryFn: () => base44.entities.Keuangan.filter({ tipe_transaksi: 'SPP/Bulanan' }), staleTime: 60000 });
  const { data: tarifList = [] } = useQuery({ queryKey: ['tarifIuran'], queryFn: () => base44.entities.TarifIuran.list(), staleTime: 300000 });
  const { data: biayaKhususList = [] } = useQuery({ queryKey: ['biayaKhusus'], queryFn: () => base44.entities.BiayaKhusus.list(), staleTime: 300000 });

  const { lunas, belum } = useMemo(() => {
    const active = (siswaList || []).filter(s => s.status === 'Aktif');
    const lunas = [], belum = [];
    active.forEach(s => {
      const paidMonths = new Set();
      sppKeuangan.filter(k => k.siswa_id === s.id).forEach(k => (k.bulan_dibayar || []).forEach(m => paidMonths.add(m)));
      const gratis = getGratisBulanSPP(s.id, biayaKhususList, tarifList);
      if (paidMonths.has(activeMonth) || gratis.includes(activeMonth)) lunas.push(s);
      else belum.push(s);
    });
    return { lunas, belum };
  }, [siswaList, sppKeuangan, biayaKhususList, tarifList, activeMonth]);

  const renderList = (list) => (
    <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-100">
      {list.length === 0 ? <p className={`text-center py-6 text-xs ${t.textMuted}`}>Tidak ada siswa</p> : list.sort((a, b) => a.nama.localeCompare(b.nama, 'id')).map(s => (
        <div key={s.id} className={`flex items-center justify-between px-3 py-2 text-xs border-b border-slate-100 last:border-0 ${isDark ? 'bg-slate-800/40' : 'bg-white'}`}>
          <span className={`font-medium ${t.text}`}>{s.nama}</span>
          <Badge className="bg-slate-100 text-slate-600">{s.nama_kelas}</Badge>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`rounded-2xl ${t.card} p-3 md:p-4`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className={`${t.text} font-bold text-sm flex items-center gap-2`}><Wallet className="w-4 h-4 text-teal-500" /> SPP Bulan {activeMonth}</h3>
        <div className="flex gap-2">
          <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" /> {lunas.length} Lunas</Badge>
          <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" /> {belum.length} Belum</Badge>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-2">
          <TabsTrigger value="belum">Belum Bayar ({belum.length})</TabsTrigger>
          <TabsTrigger value="lunas">Sudah Bayar ({lunas.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="belum">{renderList(belum)}</TabsContent>
        <TabsContent value="lunas">{renderList(lunas)}</TabsContent>
      </Tabs>
    </div>
  );
}