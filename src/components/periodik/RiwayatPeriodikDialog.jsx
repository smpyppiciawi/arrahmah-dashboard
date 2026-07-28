import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Ruler, Weight, Circle, Trash2, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';

const COLORS = {
  tb: '#8b5cf6',
  bb: '#f59e0b',
  lk: '#06b6d4',
};

function TrendBadge({ current, previous, unit }) {
  if (!current || !previous) return <span className="text-slate-300 text-xs">—</span>;
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return <Badge className="bg-slate-100 text-slate-500 text-xs"><Minus className="w-2.5 h-2.5" /> 0</Badge>;
  const isUp = diff > 0;
  return (
    <Badge className={`text-xs ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
      {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {isUp ? '+' : ''}{diff.toFixed(1)} {unit}
    </Badge>
  );
}

export default function RiwayatPeriodikDialog({ siswa, open, onClose }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const userRole = currentUser?.role || 'guru';
  const canDelete = ['admin', 'tu', 'operator', 'piket'].includes(userRole);

  const { data: riwayat = [], isLoading } = useQuery({
    queryKey: ['periodik-riwayat', siswa?.id],
    queryFn: () => base44.entities.PeriodikSiswa.filter({ siswa_id: siswa?.id }),
    enabled: !!siswa?.id && open,
  });

  // Sort ascending by date for chart; reverse copy for table (newest first)
  const sorted = [...riwayat].sort(
    (a, b) => new Date(a.tanggal) - new Date(b.tanggal)
  );
  const tableData = [...sorted].reverse();

  const chartData = sorted.map((r) => ({
    tanggal: format(new Date(r.tanggal), 'dd/MM/yy'),
    'TB (cm)': r.tinggi_badan ?? null,
    'BB (kg)': r.berat_badan ?? null,
    'LK (cm)': r.lingkar_kepala ?? null,
  }));

  const latest = sorted[sorted.length - 1] || null;
  const previous = sorted[sorted.length - 2] || null;

  const handleDelete = async (id) => {
    if (!confirm('Hapus data pengukuran ini? Tindakan tidak dapat dibatalkan.')) return;
    try {
      await base44.entities.PeriodikSiswa.delete(id);
      queryClient.invalidateQueries({ queryKey: ['periodik-riwayat'] });
      queryClient.invalidateQueries({ queryKey: ['periodikSiswa'] });
      toast({ title: 'Dihapus', description: 'Data pengukuran berhasil dihapus.' });
    } catch (err) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Ruler className="w-5 h-5 text-violet-500" />
            Riwayat Pengukuran
          </DialogTitle>
          {siswa && (
            <div className="flex items-center gap-2 mt-1">
              <span className="font-semibold text-slate-800">{siswa.nama}</span>
              <Badge className="bg-slate-100 text-slate-600 text-xs">{siswa.nama_kelas}</Badge>
              <span className="text-xs text-slate-400 font-mono">NIS: {siswa.nis}</span>
            </div>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Memuat data...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12">
            <Ruler className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Belum ada riwayat pengukuran</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Latest summary cards */}
            {latest && (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-center">
                  <Ruler className="w-4 h-4 text-violet-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-violet-700">{latest.tinggi_badan || '-'}</p>
                  <p className="text-[10px] text-violet-600">Tinggi (cm)</p>
                  {previous && <div className="mt-1"><TrendBadge current={latest.tinggi_badan} previous={previous.tinggi_badan} unit="cm" /></div>}
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                  <Weight className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-amber-700">{latest.berat_badan || '-'}</p>
                  <p className="text-[10px] text-amber-600">Berat (kg)</p>
                  {previous && <div className="mt-1"><TrendBadge current={latest.berat_badan} previous={previous.berat_badan} unit="kg" /></div>}
                </div>
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-center">
                  <Circle className="w-4 h-4 text-cyan-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-cyan-700">{latest.lingkar_kepala || '-'}</p>
                  <p className="text-[10px] text-cyan-600">Lingkar Kepala (cm)</p>
                  {previous && <div className="mt-1"><TrendBadge current={latest.lingkar_kepala} previous={previous.lingkar_kepala} unit="cm" /></div>}
                </div>
              </div>
            )}

            {/* Chart */}
            {chartData.length > 1 && (
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Grafik Tren Pertumbuhan
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="tanggal" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="TB (cm)" stroke={COLORS.tb} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="BB (kg)" stroke={COLORS.bb} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="LK (cm)" stroke={COLORS.lk} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs text-center"><Ruler className="w-3 h-3 mx-auto" /> TB</TableHead>
                    <TableHead className="text-xs text-center"><Weight className="w-3 h-3 mx-auto" /> BB</TableHead>
                    <TableHead className="text-xs text-center"><Circle className="w-3 h-3 mx-auto" /> LK</TableHead>
                    <TableHead className="text-xs">Petugas</TableHead>
                    {canDelete && <TableHead className="text-xs text-center w-12">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((r, i) => (
                    <TableRow key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {format(new Date(r.tanggal), 'd MMM yyyy', { locale: idLocale })}
                      </TableCell>
                      <TableCell className="text-center text-sm font-medium">{r.tinggi_badan || '-'}</TableCell>
                      <TableCell className="text-center text-sm font-medium">{r.berat_badan || '-'}</TableCell>
                      <TableCell className="text-center text-sm font-medium">{r.lingkar_kepala || '-'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{r.input_by || '-'}</TableCell>
                      {canDelete && (
                        <TableCell className="text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => handleDelete(r.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}