import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TrendingDown, Minus, Scale, CalendarClock } from "lucide-react";
import { getMingguKey } from '@/lib/dapodikConstants';

export default function ImprovementSummaryCard({ pelanggaranList, improvementList, siswaList, kelasList }) {
  const [selectedKelas, setSelectedKelas] = useState('');
  const [siswaId, setSiswaId] = useState('');

  const filteredSiswa = useMemo(
    () => (siswaList || []).filter(s => s.status === 'Aktif' && (!selectedKelas || s.kelas_id === selectedKelas)).sort((a, b) => a.nama.localeCompare(b.nama)),
    [siswaList, selectedKelas]
  );

  const mingguKeyNow = getMingguKey(new Date());

  const stats = useMemo(() => {
    if (!siswaId) return null;
    const poinPelanggaran = pelanggaranList.filter(p => p.siswa_id === siswaId).reduce((s, p) => s + (Number(p.poin) || 0), 0);
    const poinImprovement = improvementList.filter(i => i.siswa_id === siswaId && i.status === 'Aktif').reduce((s, i) => s + (Number(i.poin_pengurangan) || 0), 0);
    const usedMingguan = improvementList.filter(i => i.siswa_id === siswaId && i.status === 'Aktif' && i.minggu_key === mingguKeyNow).reduce((s, i) => s + (Number(i.poin_pengurangan) || 0), 0);
    // ambil limit mingguan dari record minggu berjalan, fallback 30
    const limitMingguan = improvementList.find(i => i.siswa_id === siswaId && i.minggu_key === mingguKeyNow)?.limit_mingguan || 30;
    return { poinPelanggaran, poinImprovement, poinBersih: poinPelanggaran - poinImprovement, usedMingguan, limitMingguan };
  }, [siswaId, pelanggaranList, improvementList, mingguKeyNow]);

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-emerald-800">Ringkasan Akumulatif Poin Siswa</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <Label>Pilih Kelas</Label>
            <Select value={selectedKelas} onValueChange={(v) => { setSelectedKelas(v); setSiswaId(''); }}>
              <SelectTrigger><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Semua Kelas</SelectItem>
                {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pilih Siswa</Label>
            <Select value={siswaId} onValueChange={setSiswaId}>
              <SelectTrigger><SelectValue placeholder="Pilih Siswa" /></SelectTrigger>
              <SelectContent>
                {filteredSiswa.map(s => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile icon={Minus} label="Poin Pelanggaran" value={stats.poinPelanggaran} color="text-red-600 bg-red-50" />
            <StatTile icon={TrendingDown} label="Total Pengurangan" value={stats.poinImprovement} color="text-emerald-600 bg-emerald-50" />
            <StatTile icon={Scale} label="Poin Bersih" value={stats.poinBersih} color={stats.poinBersih > 0 ? "text-amber-600 bg-amber-50" : "text-slate-600 bg-slate-100"} />
            <StatTile icon={CalendarClock} label="Sisa Limit Minggu Ini" value={`${stats.limitMingguan - stats.usedMingguan}/${stats.limitMingguan}`} color="text-blue-600 bg-blue-50" />
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">Pilih siswa untuk melihat ringkasan akumulatif poin.</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({ icon: Icon, label, value, color }) {
  return (
    <div className={`rounded-xl p-3 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}