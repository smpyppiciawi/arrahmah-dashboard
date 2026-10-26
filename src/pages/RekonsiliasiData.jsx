import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { ShieldCheck, SearchCheck, Loader2, Inbox, Clock, CheckCircle2, Fingerprint } from 'lucide-react';
import RekonsiliasiItemDialog from '@/components/rekonsiliasi/RekonsiliasiItemDialog';
import BackupPanel from '@/components/rekonsiliasi/BackupPanel';
import AuditIdentitasTab from '@/components/rekonsiliasi/AuditIdentitasTab';

const JENIS_LIST = ['NIS Duplikat', 'NIS Tidak Sesuai', 'Keuangan Tanpa Siswa', 'Keuangan Tanpa Pegawai', 'SPMB Belum Tertaut', 'Absensi Tak Dikenal', 'Izin Tak Dikenal'];

const JENIS_BADGE = {
  'NIS Duplikat': 'bg-amber-100 text-amber-700',
  'NIS Tidak Sesuai': 'bg-orange-100 text-orange-700',
  'Keuangan Tanpa Siswa': 'bg-rose-100 text-rose-700',
  'Keuangan Tanpa Pegawai': 'bg-fuchsia-100 text-fuchsia-700',
  'SPMB Belum Tertaut': 'bg-cyan-100 text-cyan-700',
  'Absensi Tak Dikenal': 'bg-orange-100 text-orange-700',
  'Izin Tak Dikenal': 'bg-purple-100 text-purple-700',
};

const STATUS_BADGE = {
  'Menunggu': 'bg-slate-200 text-slate-700',
  'Ditunda': 'bg-amber-100 text-amber-700',
  'Tertaut': 'bg-emerald-100 text-emerald-700',
  'Selesai Tanpa Taut': 'bg-slate-100 text-slate-500',
};

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

// Jenis keuangan yang boleh ditandai massal sebagai transaksi umum (valid, tanpa tautan)
const JENIS_UMUM = ['Keuangan Tanpa Siswa', 'Keuangan Tanpa Pegawai'];

export default function RekonsiliasiData() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [filterJenis, setFilterJenis] = useState('Semua');
  const [filterValidasi, setFilterValidasi] = useState('belum');
  const [filterCari, setFilterCari] = useState('');
  const [selected, setSelected] = useState(null);
  const [umumConfirmOpen, setUmumConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['antrian-rekonsiliasi'],
    queryFn: async () => {
      const page = await base44.entities.AntrianRekonsiliasi.filter({}, { sort: '-created_date', limit: 300 });
      return page.items || [];
    },
    enabled: isAdmin,
  });

  const deteksi = useMutation({
    mutationFn: () => base44.functions.invoke('deteksiRekonsiliasi', {}),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['antrian-rekonsiliasi'] });
      toast({
        title: 'Pemindaian selesai',
        description: `${res?.item_baru ?? 0} temuan baru${res?.spmb_tertaut ? ` · ${res.spmb_tertaut} transaksi SPMB tertaut otomatis` : ''}${res?.uid_dibackfill ? ` · ${res.uid_dibackfill} stempel UID dilengkapi` : ''}.`,
      });
    },
    onError: (err) => toast({ title: 'Pemindaian gagal', description: err.message, variant: 'destructive' }),
  });

  const tandaiUmum = useMutation({
    mutationFn: (queueIds) => base44.functions.invoke('terapkanRekonsiliasi', {
      queue_ids: queueIds,
      tindakan: 'selesai',
      catatan: 'Ditandai sebagai transaksi umum (valid, tanpa tautan siswa/pegawai)',
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['antrian-rekonsiliasi'] });
      toast({ title: 'Transaksi umum ditandai', description: `${res?.diproses ?? 0} item ditutup sebagai transaksi umum yang valid.` });
      setUmumConfirmOpen(false);
    },
    onError: (err) => toast({ title: 'Gagal menandai', description: err.message, variant: 'destructive' }),
  });

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="font-bold text-slate-800">Rekonsiliasi Data</h2>
          <p className="text-sm text-slate-500 mt-1">Menu ini hanya tersedia untuk Admin.</p>
        </div>
      </div>
    );
  }

  const terbuka = items.filter(i => i.status === 'Menunggu' || i.status === 'Ditunda');
  const selesai = items.length - terbuka.length;
  const isValidasi = (i) => i.status === 'Tertaut' || i.status === 'Selesai Tanpa Taut';
  const filtered = items.filter(i => {
    if (filterValidasi === 'sudah' ? !isValidasi(i) : isValidasi(i)) return false;
    if (filterJenis !== 'Semua' && i.jenis !== filterJenis) return false;
    if (filterCari) {
      const q = filterCari.toLowerCase();
      const hay = `${i.nama || ''} ${i.nis || ''} ${i.uraian || ''} ${i.nama_kelas || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const umumTerbuka = JENIS_UMUM.includes(filterJenis)
    ? terbuka.filter(i => i.jenis === filterJenis).map(i => i.id).slice(0, 200)
    : [];

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" /> Rekonsiliasi Data
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Antrean anomali relasi data + audit identitas siswa & pegawai — tidak ada perubahan otomatis untuk data ambigu.
          </p>
        </div>
        <Button onClick={() => deteksi.mutate()} disabled={deteksi.isPending} className="bg-blue-600 hover:bg-blue-700">
          {deteksi.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <SearchCheck className="w-4 h-4 mr-2" />}
          {deteksi.isPending ? 'Memindai…' : 'Pindai Anomali'}
        </Button>
      </div>

      <Tabs defaultValue="antrean">
        <TabsList>
          <TabsTrigger value="antrean">Antrean Rekonsiliasi</TabsTrigger>
          <TabsTrigger value="identitas" className="gap-1.5">
            <Fingerprint className="w-3.5 h-3.5" /> Audit Identitas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="antrean" className="space-y-5 mt-4">
          {/* Ringkasan */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Menunggu Peninjauan</p>
              <p className="text-2xl font-bold text-slate-900">{terbuka.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Selesai Ditangani</p>
              <p className="text-2xl font-bold text-emerald-600">{selesai}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-500 mb-2">Per Jenis (terbuka)</p>
              <div className="flex flex-wrap gap-1.5">
                {JENIS_LIST.map(j => {
                  const n = terbuka.filter(i => i.jenis === j).length;
                  return (
                    <Badge key={j} className={`${JENIS_BADGE[j]} text-[10px]`}>{j}: {n}</Badge>
                  );
                })}
              </div>
            </div>
          </div>

          <BackupPanel />

          {/* Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex flex-wrap gap-1.5">
              {['Semua', ...JENIS_LIST].map(j => (
                <button
                  key={j}
                  onClick={() => setFilterJenis(j)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterJenis === j ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>
            <Input
              placeholder="Cari nama / NIS / uraian…"
              value={filterCari}
              onChange={(e) => setFilterCari(e.target.value)}
              className="sm:max-w-xs ml-auto"
            />
          </div>

          {/* Aksi massal transaksi umum */}
          {umumTerbuka.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-blue-800">
                {umumTerbuka.length} item terbuka. Bila transaksi ini memang umum (tidak memilih siswa/pegawai saat input), tandai sebagai valid tanpa tautan.
              </p>
              <Button size="sm" variant="outline" onClick={() => setUmumConfirmOpen(true)} className="flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Tandai sebagai Transaksi Umum
              </Button>
            </div>
          )}

          {/* Tab status validasi */}
          <Tabs value={filterValidasi} onValueChange={setFilterValidasi}>
            <TabsList>
              <TabsTrigger value="belum" className="gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Belum Validasi ({terbuka.length})
              </TabsTrigger>
              <TabsTrigger value="sudah" className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Validasi ({selesai})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Daftar antrean */}
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center">
                <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Tidak ada item antrean{filterJenis !== 'Semua' ? ' pada filter ini' : ''}. Jalankan pemindaian untuk mendeteksi anomali.</p>
              </div>
            ) : (
              filtered.map(item => (
                <div key={item.id} className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`${JENIS_BADGE[item.jenis] || 'bg-slate-100'} text-[11px]`}>{item.jenis}</Badge>
                      <Badge className={`${STATUS_BADGE[item.status] || 'bg-slate-100'} text-[11px]`}>{item.status}</Badge>
                      {item.jumlah > 0 && <span className="text-xs font-semibold text-slate-700">{formatRupiah(item.jumlah)}</span>}
                    </div>
                    <p className="text-sm font-medium text-slate-800 mt-1.5 truncate">{item.nama || item.uraian}</p>
                    <p className="text-xs text-slate-500 truncate">{item.uraian}</p>
                    {item.detail && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.detail}</p>}
                    {(item.catatan || item.ditangani_oleh) && (
                      <p className="text-[11px] text-emerald-600 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />{item.catatan} {item.ditangani_oleh && `· oleh ${item.ditangani_oleh}`}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelected(item)} className="flex-shrink-0">
                    Tinjau
                  </Button>
                </div>
              ))
            )}
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Pemindaian idempoten: item terbuka tidak diduplikasi. Transaksi tanpa pilihan siswa/pegawai adalah transaksi umum yang valid dan tidak masuk antrean; hanya transaksi dengan bukti keterkaitan (nama/NIS/ID) yang relasinya hilang yang ditinjau.
          </p>
        </TabsContent>

        <TabsContent value="identitas" className="mt-4">
          <AuditIdentitasTab />
        </TabsContent>
      </Tabs>

      {selected && (
        <RekonsiliasiItemDialog
          item={selected}
          onClose={() => {
            setSelected(null);
            queryClient.invalidateQueries({ queryKey: ['antrian-rekonsiliasi'] });
          }}
        />
      )}

      <ConfirmDialog
        open={umumConfirmOpen}
        onOpenChange={setUmumConfirmOpen}
        onConfirm={() => tandaiUmum.mutate(umumTerbuka)}
        title="Tandai sebagai Transaksi Umum"
        description={`${umumTerbuka.length} item akan ditutup sebagai transaksi umum yang valid (tanpa tautan siswa/pegawai). Transaksi umum memang tidak wajib bertaut. Lanjutkan?`}
      />
    </div>
  );
}