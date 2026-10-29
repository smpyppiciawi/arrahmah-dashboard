import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from '@/lib/AuthContext';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import {
  Wallet, Plus, Edit2, Trash2, ArrowUpRight, ArrowDownRight,
  Printer, Users, UserCheck, Filter, Paperclip
} from "lucide-react";
import TransaksiSummary from '@/components/transaksi/TransaksiSummary';
import TransaksiForm from '@/components/transaksi/TransaksiForm';
import FloatingAddButton from '@/components/ui/FloatingAddButton';
import KuitansiPrintDialog from '@/components/transaksi/KuitansiPrintDialog';

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function Transaksi() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [activeTab, setActiveTab] = useState('semua');
  // Default periode = hari ini: daftar langsung ringkas sehingga halaman cepat tampil
  const [filterDateFrom, setFilterDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterDateTo, setFilterDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { user: currentUser } = useAuth();
  const { activeAcademicYear } = useActiveAcademicYear();
  const queryClient = useQueryClient();

  const [currentGuru, setCurrentGuru] = useState(null);

  useEffect(() => {
    const fetchGuru = async () => {
      if (currentUser?.email) {
        try {
          const gurus = await base44.entities.Guru.filter({ email: currentUser.email });
          if (gurus.length > 0) setCurrentGuru(gurus[0]);
        } catch (e) { /* not found */ }
      }
    };
    fetchGuru();
  }, [currentUser]);

  const userRole = currentUser?.role || 'guru';
  const isBendahara = (currentGuru?.tugas_tambahan || '').toLowerCase().includes('bendahara');
  const canEdit = ['admin', 'tu'].includes(userRole) || isBendahara;

  const { data: keuanganList = [] } = useQuery({
    queryKey: ['keuangan'],
    queryFn: () => base44.entities.Keuangan.list('-created_date'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.filter({ status: 'Aktif' }),
  });

  const { data: kategoriList = [] } = useQuery({
    queryKey: ['kategori-transaksi'],
    queryFn: () => base44.entities.KategoriTransaksi.list('nama'),
  });

  const { data: tipeTransaksiList = [] } = useQuery({
    queryKey: ['tipe-transaksi'],
    queryFn: () => base44.entities.TipeTransaksi.list('nama'),
  });

  const { data: sumberDanaList = [] } = useQuery({
    queryKey: ['sumber-dana'],
    queryFn: () => base44.entities.SumberDana.list('nama'),
  });

  const { data: donaturList = [] } = useQuery({
    queryKey: ['donatur'],
    queryFn: () => base44.entities.Donatur.list('nama'),
  });

  const { data: biayaKhususList = [] } = useQuery({
    queryKey: ['biaya-khusus'],
    queryFn: () => base44.entities.BiayaKhusus.list(),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: tarifIuranList = [] } = useQuery({
    queryKey: ['tarif-iuran'],
    queryFn: () => base44.entities.TarifIuran.filter({ status: 'Aktif' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (data) => {
      // Jejak audit penghapusan — identitas pelaku, waktu, ringkasan nilai
      try {
        await base44.entities.LogAuditKeuangan.create({
          transaksi_id: data.id,
          aksi: 'Hapus',
          operator_id: currentUser?.id || '',
          operator_nama: currentUser?.full_name || '',
          waktu: new Date().toISOString(),
          tanggal: data.tanggal || '',
          uraian: data.uraian || data.tipe_transaksi || '',
          jumlah_sebelum: Number(data.jumlah) || 0,
          jumlah_sesudah: 0,
          ringkasan: `Dihapus: ${data.uraian || data.tipe_transaksi || '-'} · ${data.tanggal} · ${formatRupiah(data.jumlah)} · ${data.status_bayar || 'Lunas'}`,
        });
      } catch (e) { /* jejak audit gagal tidak boleh memblokir penghapusan */ }
      return base44.entities.Keuangan.delete(data.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keuangan'] });
      toast({ title: "Transaksi dihapus" });
    },
  });

  const filteredTransaksi = useMemo(() => {
    let data = keuanganList;
    if (activeTab === 'siswa') data = data.filter(t => t.siswa_id);
    else if (activeTab === 'pegawai') data = data.filter(t => t.guru_id || t.nama_pegawai);
    else if (activeTab === 'donatur') data = data.filter(t => t.nama_donatur);
    else if (activeTab === 'pemasukan') data = data.filter(t => t.jenis === 'Pemasukan');
    else if (activeTab === 'pengeluaran') data = data.filter(t => t.jenis === 'Pengeluaran');

    if (filterDateFrom) data = data.filter(t => t.tanggal >= filterDateFrom);
    if (filterDateTo) data = data.filter(t => t.tanggal <= filterDateTo);
    // Urutkan berdasarkan waktu input (created_date) terbaru di atas,
    // sehingga transaksi yang diinput terakhir tampil paling atas meski tanggal sama
    return [...data].sort((a, b) => {
      const ca = new Date(a.created_date || 0).getTime();
      const cb = new Date(b.created_date || 0).getTime();
      return cb - ca;
    });
  }, [keuanganList, activeTab, filterDateFrom, filterDateTo]);

  const filterPeriodeAktif = Boolean(filterDateFrom || filterDateTo);

  const totalPemasukan = keuanganList.filter(k => k.jenis === 'Pemasukan' && !k.aplikasi_iuran_muka && !k.is_saldo_awal).reduce((s, k) => s + (k.jumlah || 0), 0);
  const totalPengeluaran = keuanganList.filter(k => k.jenis === 'Pengeluaran').reduce((s, k) => s + (k.jumlah || 0), 0);
  const saldo = totalPemasukan - totalPengeluaran;

  const handleEdit = (data) => {
    setEditingData(data);
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingData(null);
    setIsOpen(true);
  };

  const handleDelete = (data) => {
    if (window.confirm(`Hapus transaksi "${data.uraian || data.tipe_transaksi}"?`)) {
      deleteMutation.mutate(data);
    }
  };

  const [printDialogTransaksi, setPrintDialogTransaksi] = useState(null);

  const handlePrint = (transaksi) => {
    setPrintDialogTransaksi(transaksi);
  };

  // Pintasan periode — memperkecil data yang dimuat sehingga halaman lebih ringan
  const setPeriode = (mode) => {
    const now = new Date();
    if (mode === 'hari') {
      const t = format(now, 'yyyy-MM-dd');
      setFilterDateFrom(t); setFilterDateTo(t);
    } else if (mode === 'minggu') {
      setFilterDateFrom(format(subDays(now, 6), 'yyyy-MM-dd'));
      setFilterDateTo(format(now, 'yyyy-MM-dd'));
    } else if (mode === 'bulan') {
      setFilterDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
      setFilterDateTo(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else {
      setFilterDateFrom(''); setFilterDateTo('');
    }
  };

  const transaksiColumns = [
    {
      key: 'tanggal',
      label: 'Tanggal',
      render: (row) => format(new Date(row.tanggal), 'd MMM yyyy', { locale: idLocale }),
    },
    {
      key: 'jenis',
      label: 'Jenis',
      render: (row) => (
        <Badge className={row.jenis === 'Pemasukan' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
          {row.jenis === 'Pemasukan' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {row.jenis}
        </Badge>
      ),
    },
    { key: 'tipe_transaksi', label: 'Tipe', render: (row) => row.tipe_transaksi || '-' },
    { key: 'kategori', label: 'Kategori', render: (row) => <Badge variant="outline" className="text-xs">{row.kategori || '-'}</Badge> },
    { key: 'sumber_rekening', label: 'Sumber Dana', render: (row) => <span className="text-xs text-slate-500">{row.sumber_rekening || '-'}</span> },
    {
      key: 'penerima',
      label: 'Sumber / Penerima',
      filterAccessor: (row) => row.nama_siswa || row.nama_pegawai || row.nama_donatur || row.penerima || '',
      render: (row) => {
        if (row.nama_siswa) return (
          <div>
            <span className="text-blue-600 text-sm font-medium">{row.nama_siswa}</span>
            {row.kelas && <span className="block text-xs text-slate-400">{row.kelas}</span>}
          </div>
        );
        if (row.nama_pegawai) return <span className="text-purple-600 text-sm font-medium">{row.nama_pegawai}</span>;
        if (row.nama_donatur) return <span className="text-pink-600 text-sm font-medium">{row.nama_donatur}</span>;
        if (row.penerima) return <span className="text-slate-600 text-sm font-medium">{row.penerima}</span>;
        return <span className="text-slate-400 text-sm">-</span>;
      },
    },
    {
      key: 'uraian',
      label: 'Uraian',
      render: (row) => (
        <div className="max-w-[200px]">
          <span className="text-sm block truncate">{row.uraian || '-'}</span>
          {row.is_saldo_awal && <Badge className="bg-slate-200 text-slate-600 mr-1">Saldo Awal</Badge>}
          {row.bulan_dibayar?.length > 0 && (
            <span className="text-xs text-blue-500">{row.bulan_dibayar.join(', ')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'jumlah',
      label: 'Jumlah',
      render: (row) => (
        <span className={`font-semibold ${row.jenis === 'Pemasukan' ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatRupiah(row.jumlah)}
        </span>
      ),
    },
    {
      key: 'status_bayar',
      label: 'Status',
      render: (row) => (
        <Badge className={
          row.status_bayar === 'Lunas' ? 'bg-emerald-100 text-emerald-700' :
          row.status_bayar === 'Cicilan' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }>
          {row.status_bayar || 'Lunas'}
        </Badge>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      sortable: false,
      filterable: false,
      render: (row) => {
        const buktiList = Array.isArray(row.bukti_files) && row.bukti_files.length > 0
          ? row.bukti_files.filter(Boolean)
          : (row.bukti_file ? [row.bukti_file] : []);
        return (
        <div className="flex gap-1">
          {buktiList.slice(0, 3).map((url, i) => (
            <a key={`${url}-${i}`} href={url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" title={`Lihat bukti ${i + 1} dari ${buktiList.length}`}>
                <Paperclip className="w-4 h-4 text-slate-400" />
              </Button>
            </a>
          ))}
          {buktiList.length > 3 && (
            <span className="self-center text-[10px] font-semibold text-slate-400">+{buktiList.length - 3}</span>
          )}
          <Button size="sm" variant="ghost" onClick={() => handlePrint(row)} title="Cetak Kwitansi">
            <Printer className="w-4 h-4" />
          </Button>
          {canEdit && (
            <>
              <Button size="sm" variant="ghost" onClick={() => handleEdit(row)} title="Edit">
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(row)} title="Hapus">
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Wallet className="w-8 h-8 text-teal-500" />
              Transaksi Keuangan
            </h1>
            <p className="text-slate-500 mt-1">
              Kelola transaksi sekolah {activeAcademicYear && `· TP ${activeAcademicYear}`}
            </p>
          </div>

        </div>

        {/* Summary */}
        <TransaksiSummary
          totalPemasukan={totalPemasukan}
          totalPengeluaran={totalPengeluaran}
          saldo={saldo}
        />

        {/* Filter */}
        <Card className="border-0 shadow-sm mb-4">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">Periode:</span>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-40 h-9"
              />
              <span className="text-slate-400">s/d</span>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-40 h-9"
              />
              <div className="flex flex-wrap gap-1 ml-0 sm:ml-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPeriode('hari')}>Hari Ini</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPeriode('minggu')}>7 Hari</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPeriode('bulan')}>Bulan Ini</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPeriode('semua')}>Semua</Button>
              </div>
              <span className={`text-xs ml-auto ${filterDateFrom || filterDateTo ? 'text-slate-500' : 'text-amber-600'}`}>
                {filterPeriodeAktif ? `${filteredTransaksi.length} transaksi pada periode ini` : 'Menampilkan seluruh data — pilih periode agar lebih cepat'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="semua">Semua</TabsTrigger>
            <TabsTrigger value="siswa" className="flex items-center gap-1">
              <Users className="w-3 h-3" /> Siswa
            </TabsTrigger>
            <TabsTrigger value="pegawai" className="flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> Pegawai
            </TabsTrigger>
            <TabsTrigger value="donatur" className="flex items-center gap-1">
              <Users className="w-3 h-3" /> Donatur
            </TabsTrigger>
            <TabsTrigger value="pemasukan" className="flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Pemasukan
            </TabsTrigger>
            <TabsTrigger value="pengeluaran" className="flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> Pengeluaran
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Daftar Transaksi ({filteredTransaksi.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={transaksiColumns} data={filteredTransaksi} pageSize={10} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Form Dialog */}
        <TransaksiForm
          isOpen={isOpen}
          onClose={() => { setIsOpen(false); setEditingData(null); }}
          editingData={editingData}
          currentUser={currentUser}
          activeAcademicYear={activeAcademicYear}
          siswaList={siswaList}
          guruList={guruList}
          kategoriList={kategoriList}
          tipeTransaksiList={tipeTransaksiList}
          sumberDanaList={sumberDanaList}
          tarifIuranList={tarifIuranList}
          keuanganList={keuanganList}
          donaturList={donaturList}
          biayaKhususList={biayaKhususList}
          kelasList={kelasList}
        />
        {canEdit && <FloatingAddButton onClick={handleAdd} label="Tambah Transaksi" color="teal" icon={Plus} />}

        <KuitansiPrintDialog
          isOpen={!!printDialogTransaksi}
          onClose={() => setPrintDialogTransaksi(null)}
          transaksi={printDialogTransaksi}
        />
      </div>
    </div>
  );
}