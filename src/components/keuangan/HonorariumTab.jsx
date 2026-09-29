import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RupiahInput from '@/components/ui/RupiahInput';
import { toast } from "@/components/ui/use-toast";
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Plus, Trash2, Award, UserCheck, Eye, Edit2, Loader2 } from "lucide-react";

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

const RINCIAN_FIELDS = [
  { key: 'gaji_pokok', label: 'Gaji Pokok' },
  { key: 'jabatan', label: 'Jabatan' },
  { key: 'bpjs', label: 'BPJS' },
  { key: 't_transport', label: 'T. Transport' },
  { key: 'pembina', label: 'Pembina' },
  { key: 'lembur', label: 'Lembur' },
  { key: 'wali_kelas', label: 'Wali Kelas' },
  { key: 'pulsa', label: 'Pulsa' },
  { key: 't_tidak_tetap', label: 'T. Tidak Tetap' },
  { key: 'pensiun', label: 'Pensiun' },
];

const BULAN_OPTIONS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const emptyRincian = () => RINCIAN_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: 0 }), {});

const sumRincian = (rincian) => {
  if (!rincian) return 0;
  return RINCIAN_FIELDS.reduce((sum, f) => sum + (Number(rincian[f.key]) || 0), 0);
};

function RincianGajiEditor({ rincian, onChange, editable = true }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {RINCIAN_FIELDS.map(f => (
        <div key={f.key}>
          <Label className="text-xs">{f.label}</Label>
          <RupiahInput
            value={rincian?.[f.key] || 0}
            onChange={(val) => onChange({ ...rincian, [f.key]: Number(val) || 0 })}
            placeholder="0"
            disabled={!editable}
          />
        </div>
      ))}
    </div>
  );
}

export default function HonorariumTab() {
  const queryClient = useQueryClient();
  const { activeAcademicYear } = useActiveAcademicYear();
  const [golonganDialog, setGolonganDialog] = useState(false);
  const [detailGuru, setDetailGuru] = useState(null);
  const [riwayatDetail, setRiwayatDetail] = useState(null);
  const [golonganForm, setGolonganForm] = useState({ nama_golongan: '', keterangan: '' });
  const [golonganRincian, setGolonganRincian] = useState(emptyRincian());
  const [pegawaiRincian, setPegawaiRincian] = useState(emptyRincian());
  const [selectedBulan, setSelectedBulan] = useState('');
  const [savingPegawai, setSavingPegawai] = useState(false);

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.filter({ status: 'Aktif' }),
  });

  const { data: golonganList = [] } = useQuery({
    queryKey: ['golongan'],
    queryFn: () => base44.entities.Golongan.list('nama_golongan'),
  });

  const { data: riwayatGaji = [] } = useQuery({
    queryKey: ['riwayat-gaji'],
    queryFn: () => base44.entities.Keuangan.filter({ tipe_transaksi: 'Gaji/Honorarium' }),
  });

  const createGolongan = useMutation({
    mutationFn: (data) => base44.entities.Golongan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['golongan'] });
      setGolonganForm({ nama_golongan: '', keterangan: '' });
      setGolonganRincian(emptyRincian());
      setGolonganDialog(false);
      toast({ title: "Golongan ditambahkan" });
    },
  });

  const deleteGolongan = useMutation({
    mutationFn: (id) => base44.entities.Golongan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['golongan'] }),
  });

  const handleSaveGolongan = (e) => {
    e.preventDefault();
    const total = sumRincian(golonganRincian);
    createGolongan.mutate({
      nama_golongan: golonganForm.nama_golongan,
      nominal: total,
      rincian_gaji: golonganRincian,
      keterangan: golonganForm.keterangan,
    });
  };

  const handleSelectGolonganForPegawai = (golonganId) => {
    const gol = golonganList.find(g => g.id === golonganId);
    if (gol && detailGuru) {
      const rincian = gol.rincian_gaji || emptyRincian();
      setPegawaiRincian(rincian);
    }
  };

  useEffect(() => {
    if (detailGuru) {
      setPegawaiRincian(detailGuru.rincian_gaji || emptyRincian());
      setSelectedBulan(BULAN_OPTIONS[new Date().getMonth()]);
    }
  }, [detailGuru]);

  const handleSavePegawaiGolongan = async () => {
    if (!detailGuru) return;
    const total = sumRincian(pegawaiRincian);
    setSavingPegawai(true);
    try {
      const selectedGol = golonganList.find(g => g.id === detailGuru.golongan_id);
      await base44.entities.Guru.update(detailGuru.id, {
        golongan_id: selectedGol?.id || '',
        nama_golongan: selectedGol?.nama_golongan || '',
        nominal_gaji: total,
        rincian_gaji: pegawaiRincian,
      });
      await base44.entities.Keuangan.create({
        tanggal: format(new Date(), 'yyyy-MM-dd'),
        jenis: 'Pengeluaran',
        tipe_transaksi: 'Gaji/Honorarium',
        kategori: 'Gaji',
        uraian: `Pembayaran Honorarium ${detailGuru.nama} - ${selectedBulan}`,
        jumlah: total,
        bulan: selectedBulan,
        guru_id: detailGuru.id,
        nip_pegawai: detailGuru.nuptk || '',
        nama_pegawai: detailGuru.nama,
        jabatan_pegawai: detailGuru.jabatan || '',
        rincian_gaji: pegawaiRincian,
        status_bayar: 'Lunas',
        tahun_ajaran: activeAcademicYear || '',
      });
      queryClient.invalidateQueries({ queryKey: ['guru'] });
      queryClient.invalidateQueries({ queryKey: ['keuangan'] });
      queryClient.invalidateQueries({ queryKey: ['riwayat-gaji'] });
      toast({ title: "Gaji pegawai disimpan ke riwayat" });
      setDetailGuru(null);
    } catch (err) {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" });
    } finally {
      setSavingPegawai(false);
    }
  };

  const golonganTotal = sumRincian(golonganRincian);
  const pegawaiTotal = sumRincian(pegawaiRincian);

  const guruColumns = [
    {
      key: 'nama', label: 'Nama Pegawai',
      render: (row) => (
        <button onClick={() => setDetailGuru(row)} className="text-blue-600 hover:underline font-medium text-left">
          {row.nama}
        </button>
      )
    },
    { key: 'nuptk', label: 'NUPTK', render: (row) => row.nuptk || '-' },
    { key: 'jabatan', label: 'Jabatan', render: (row) => <Badge variant="outline">{row.jabatan}</Badge> },
    {
      key: 'nama_golongan', label: 'Golongan',
      render: (row) => row.nama_golongan
        ? <Badge className="bg-purple-100 text-purple-700">{row.nama_golongan}</Badge>
        : <span className="text-slate-400 text-sm">Belum diatur</span>
    },
    {
      key: 'nominal_gaji', label: 'Total Gaji',
      render: (row) => <span className="font-medium text-teal-600">{row.nominal_gaji ? formatRupiah(row.nominal_gaji) : '-'}</span>
    },
  ];

  const golonganColumns = [
    { key: 'nama_golongan', label: 'Nama Golongan', render: (row) => <span className="font-medium">{row.nama_golongan}</span> },
    { key: 'nominal', label: 'Total Gaji', render: (row) => <span className="font-medium text-teal-600">{formatRupiah(row.nominal)}</span> },
    { key: 'keterangan', label: 'Keterangan', render: (row) => row.keterangan || '-' },
    {
      key: 'aksi', label: 'Aksi', sortable: false, filterable: false,
      render: (row) => (
        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteGolongan.mutate(row.id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      )
    },
  ];

  const riwayatColumns = [
    { key: 'tanggal', label: 'Tanggal', render: (row) => format(new Date(row.tanggal), 'd MMM yyyy', { locale: idLocale }) },
    { key: 'nama_pegawai', label: 'Pegawai', render: (row) => <span className="font-medium">{row.nama_pegawai}</span> },
    { key: 'bulan', label: 'Bulan', render: (row) => <Badge variant="outline">{row.bulan || '-'}</Badge> },
    { key: 'jumlah', label: 'Total Gaji', render: (row) => <span className="font-medium text-teal-600">{formatRupiah(row.jumlah)}</span> },
    {
      key: 'aksi', label: 'Detail', sortable: false, filterable: false,
      render: (row) => (
        <Button size="sm" variant="ghost" onClick={() => setRiwayatDetail(row)} title="Detail Rincian">
          <Eye className="w-4 h-4" />
        </Button>
      )
    },
  ];

  return (
    <div className="space-y-6">
      {/* Golongan */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-500" /> Daftar Golongan Honorarium
          </CardTitle>
          <Button onClick={() => { setGolonganForm({ nama_golongan: '', keterangan: '' }); setGolonganRincian(emptyRincian()); setGolonganDialog(true); }} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> Tambah Golongan
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable columns={golonganColumns} data={golonganList} pageSize={10} />
        </CardContent>
      </Card>

      {/* Pegawai & Golongan */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-500" /> Daftar Pegawai & Golongan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-3">Klik nama pegawai untuk mengatur golongan & rincian gaji</p>
          <DataTable columns={guruColumns} data={guruList} pageSize={10} />
        </CardContent>
      </Card>

      {/* Riwayat Gaji */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-teal-500" /> Riwayat Gaji Pegawai
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={riwayatColumns} data={riwayatGaji} pageSize={10} />
        </CardContent>
      </Card>

      {/* Dialog: Tambah Golongan */}
      <Dialog open={golonganDialog} onOpenChange={setGolonganDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Golongan Honorarium</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveGolongan} className="space-y-4">
            <div>
              <Label>Nama Golongan</Label>
              <Input value={golonganForm.nama_golongan} onChange={(e) => setGolonganForm({ ...golonganForm, nama_golongan: e.target.value })} placeholder="Contoh: Golongan I, Golongan II" required />
            </div>
            <div>
              <Label className="font-semibold">Rincian Gaji</Label>
              <div className="mt-2">
                <RincianGajiEditor rincian={golonganRincian} onChange={setGolonganRincian} />
              </div>
            </div>
            <div className="p-3 bg-teal-50 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-teal-700">Total Gaji</span>
              <span className="text-lg font-bold text-teal-700">{formatRupiah(golonganTotal)}</span>
            </div>
            <div>
              <Label>Keterangan</Label>
              <Input value={golonganForm.keterangan} onChange={(e) => setGolonganForm({ ...golonganForm, keterangan: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setGolonganDialog(false)} className="flex-1">Batal</Button>
              <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Atur Golongan Pegawai */}
      <Dialog open={!!detailGuru} onOpenChange={(open) => !open && setDetailGuru(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atur Gaji Pegawai</DialogTitle>
          </DialogHeader>
          {detailGuru && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-semibold text-slate-800">{detailGuru.nama}</p>
                <p className="text-sm text-slate-500">NUPTK: {detailGuru.nuptk || '-'}</p>
                <p className="text-sm text-slate-500">Jabatan: {detailGuru.jabatan}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pilih Golongan</Label>
                  <Select
                    value={detailGuru.golongan_id || ''}
                    onValueChange={(v) => {
                      setDetailGuru(prev => ({ ...prev, golongan_id: v }));
                      handleSelectGolonganForPegawai(v);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih golongan" /></SelectTrigger>
                    <SelectContent>
                      {golonganList.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.nama_golongan} — {formatRupiah(g.nominal)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Bulan Gaji</Label>
                  <Select value={selectedBulan} onValueChange={setSelectedBulan}>
                    <SelectTrigger><SelectValue placeholder="Pilih bulan" /></SelectTrigger>
                    <SelectContent>
                      {BULAN_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="font-semibold">Rincian Gaji (dapat diedit untuk pengecualian)</Label>
                <div className="mt-2">
                  <RincianGajiEditor rincian={pegawaiRincian} onChange={setPegawaiRincian} />
                </div>
              </div>
              <div className="p-3 bg-teal-50 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-teal-700">Total Gaji</span>
                <span className="text-lg font-bold text-teal-700">{formatRupiah(pegawaiTotal)}</span>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDetailGuru(null)} className="flex-1" disabled={savingPegawai}>Batal</Button>
                <Button type="button" className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={handleSavePegawaiGolongan} disabled={savingPegawai || !selectedBulan}>
                  {savingPegawai ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan ke Riwayat Gaji'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Detail Riwayat Gaji */}
      <Dialog open={!!riwayatDetail} onOpenChange={(open) => !open && setRiwayatDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Rincian Gaji</DialogTitle>
          </DialogHeader>
          {riwayatDetail && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-semibold text-slate-800">{riwayatDetail.nama_pegawai}</p>
                <p className="text-sm text-slate-500">Bulan: {riwayatDetail.bulan || '-'}</p>
                <p className="text-sm text-slate-500">Tanggal: {format(new Date(riwayatDetail.tanggal), 'd MMM yyyy', { locale: idLocale })}</p>
              </div>
              <div className="border rounded-lg overflow-hidden">
                {RINCIAN_FIELDS.map(f => (
                  <div key={f.key} className="flex justify-between p-2.5 border-b last:border-0 text-sm">
                    <span className="text-slate-600">{f.label}</span>
                    <span className="font-medium">{formatRupiah(riwayatDetail.rincian_gaji?.[f.key] || 0)}</span>
                  </div>
                ))}
                <div className="flex justify-between p-2.5 bg-teal-50 font-bold">
                  <span className="text-teal-700">Total Gaji</span>
                  <span className="text-teal-700">{formatRupiah(riwayatDetail.jumlah)}</span>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setRiwayatDetail(null)}>Tutup</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}