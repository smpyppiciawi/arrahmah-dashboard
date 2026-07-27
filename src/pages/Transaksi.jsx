import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
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

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function Transaksi() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [activeTab, setActiveTab] = useState('semua');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
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
    queryFn: () => base44.entities.Keuangan.list('-tanggal'),
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

  const { data: tarifIuranList = [] } = useQuery({
    queryKey: ['tarif-iuran'],
    queryFn: () => base44.entities.TarifIuran.filter({ status: 'Aktif' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Keuangan.delete(id),
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
    return data;
  }, [keuanganList, activeTab, filterDateFrom, filterDateTo]);

  const totalPemasukan = keuanganList.filter(k => k.jenis === 'Pemasukan').reduce((s, k) => s + (k.jumlah || 0), 0);
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
      deleteMutation.mutate(data.id);
    }
  };

  const buildKuitansiHtml = (transaksi) => {
    const tgl = format(new Date(transaksi.tanggal), 'd MMMM yyyy', { locale: idLocale });
    const nominal = new Intl.NumberFormat('id-ID').format(transaksi.jumlah || 0);
    const terbilang = transaksi.terbilang || '';
    const uraian = transaksi.uraian || '-';
    const penerimaName = transaksi.penerima || transaksi.pic || 'Bendahara';

    const isSiswa = !!transaksi.nama_siswa;
    const isDonatur = !!transaksi.nama_donatur && !transaksi.nama_siswa && !transaksi.guru_id;
    const isPegawai = !!transaksi.guru_id || !!transaksi.nama_pegawai;

    // Determine template type
    let jenisLabel = 'UMUM';
    if (isSiswa) jenisLabel = 'SISWA';
    else if (isDonatur) jenisLabel = 'DONATUR';
    else if (isPegawai) jenisLabel = null; // keep old template for pegawai

    // For PEGAWAI: use existing simple template
    if (isPegawai && !isSiswa && !isDonatur) {
      return `
        <!DOCTYPE html><html><head><title>Kuitansi Pegawai</title>
        <style>
          @page { size: A5; margin: 10mm; }
          body { font-family: 'Courier New', monospace; font-size: 11px; margin: 0; padding: 10px; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 10px; }
          .row { display: flex; justify-content: space-between; padding: 3px 0; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .amount { font-size: 14px; font-weight: bold; text-align: center; padding: 10px 0; }
        </style></head><body>
        <div class="header"><h2>KWITANSI PEGAWAI</h2><p>YPPI ARRAHMAH</p></div>
        <div class="row"><span>Tanggal:</span><span>${tgl}</span></div>
        <div class="row"><span>Pegawai:</span><span>${transaksi.nama_pegawai || '-'}</span></div>
        <div class="row"><span>Jabatan:</span><span>${transaksi.jabatan_pegawai || '-'}</span></div>
        <div class="row"><span>Bulan:</span><span>${transaksi.bulan || '-'}</span></div>
        <div class="divider"></div>
        <div class="row"><span>Uraian:</span></div>
        <div style="padding:5px 0">${uraian}</div>
        <div class="divider"></div>
        <div class="amount">Rp. ${nominal}</div>
        ${terbilang ? `<div style="text-align:center;font-style:italic;font-size:10px">${terbilang}</div>` : ''}
        <div class="divider"></div>
        <div style="text-align:right;margin-top:20px">
          <p>Ciawi, ${tgl}</p>
          <p>Penerima,</p>
          <br/><br/>
          <p><strong>${penerimaName}</strong></p>
        </div>
        </body></html>
      `;
    }

    // Common header HTML
    const headerHtml = `
      <div class="kuitansi-header">
        <h1>YAYASAN PENDIDIKAN PEMUDA ISLAM</h1>
        <h2>SMP YPPI AR-RAHMAH</h2>
        <p class="alamat">Jl. R.M. Toha blk 509/30 RT. 4/7 Ds. Bendungan Kec. Ciawi<br/>Kab. Bogor - Prov. Jawa Barat, 16720</p>
        <div class="garis-title"><span class="title-kuitansi">K &nbsp; U &nbsp; I &nbsp; T &nbsp; A &nbsp; N &nbsp; S &nbsp; I</span></div>
        <div class="jenis-label"><em>${jenisLabel}</em></div>
      </div>
    `;

    // Row builder: label with auto-wrap value
    const row = (label, value) => `
      <tr>
        <td class="td-label">${label}</td>
        <td class="td-sep">:</td>
        <td class="td-value">${value || '-'}</td>
      </tr>
    `;

    // Build body rows per type
    let bodyRows = '';
    if (isSiswa) {
      bodyRows = `
        ${row('JENIS', transaksi.jenis === 'Pemasukan' ? 'MASUK' : 'KELUAR')}
        ${row('TELAH TERIMA DARI', transaksi.nama_siswa || '-')}
        ${row('NIS/KELAS', `${transaksi.nis || '-'} / ${transaksi.kelas || '-'}`)}
        <tr><td colspan="3" style="padding:6px 0"></td></tr>
        ${row('URAIAN TRANSAKSI', uraian)}
        <tr><td colspan="3" style="padding:6px 0"></td></tr>
        ${row('NOMINAL', `Rp. ${nominal}`)}
        ${row('TERBILANG', `<em>${terbilang}</em>`)}
      `;
    } else if (isDonatur) {
      bodyRows = `
        ${row('JENIS', 'MASUK')}
        ${row('TELAH TERIMA DARI', 'BENDAHARA SEKOLAH')}
        <tr><td colspan="3" style="padding:6px 0"></td></tr>
        ${row('URAIAN TRANSAKSI', uraian)}
        <tr><td colspan="3" style="padding:6px 0"></td></tr>
        ${row('NOMINAL', `Rp. ${nominal}`)}
        <tr><td colspan="3" style="padding:6px 0"></td></tr>
        ${row('TERBILANG', `<em>${terbilang}</em>`)}
      `;
    } else {
      // UMUM
      bodyRows = `
        ${row('JENIS', transaksi.jenis === 'Pemasukan' ? 'MASUK' : 'KELUAR')}
        ${row('TELAH TERIMA DARI', 'BENDAHARA SEKOLAH')}
        <tr><td colspan="3" style="padding:6px 0"></td></tr>
        ${row('URAIAN TRANSAKSI', uraian)}
        <tr><td colspan="3" style="padding:6px 0"></td></tr>
        ${row('NOMINAL', `Rp. ${nominal}`)}
        <tr><td colspan="3" style="padding:10px 0"></td></tr>
        ${row('TERBILANG', `<em>${terbilang}</em>`)}
      `;
    }

    // Bottom signer name
    const signerName = isSiswa
      ? (transaksi.pic || penerimaName)
      : isDonatur
      ? (transaksi.nama_donatur || '-')
      : penerimaName;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kuitansi</title>
        <style>
          @page { size: A5 landscape; margin: 12mm 15mm; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            margin: 0;
            color: #000;
          }
          .kuitansi-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .kuitansi-header h1 {
            font-size: 15px;
            font-weight: bold;
            margin: 0 0 2px 0;
            letter-spacing: 1px;
          }
          .kuitansi-header h2 {
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 4px 0;
          }
          .kuitansi-header .alamat {
            font-style: italic;
            font-size: 10px;
            margin: 0 0 6px 0;
            line-height: 1.5;
          }
          .garis-title {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px 0;
            margin: 6px 0;
          }
          .title-kuitansi {
            font-weight: bold;
            font-size: 13px;
            letter-spacing: 6px;
          }
          .jenis-label {
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 8px;
            margin: 4px 0 0 0;
          }
          .body-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          .td-label {
            font-weight: bold;
            white-space: nowrap;
            vertical-align: top;
            padding: 3px 8px 3px 0;
            width: 160px;
          }
          .td-sep {
            vertical-align: top;
            padding: 3px 8px 3px 0;
            width: 10px;
          }
          .td-value {
            vertical-align: top;
            padding: 3px 0;
            word-break: break-word;
          }
          .signature-section {
            margin-top: 30px;
            text-align: right;
            float: right;
            width: 220px;
            line-height: 1.8;
          }
          .signer-name {
            margin-top: 50px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        ${headerHtml}
        <table class="body-table">
          ${bodyRows}
        </table>
        <div class="signature-section">
          <p>Ciawi, ${tgl}</p>
          <p>Penerima,</p>
          <p class="signer-name">${signerName}</p>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = (transaksi) => {
    const html = buildKuitansiHtml(transaksi);
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
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
      render: (row) => {
        if (row.nama_siswa) return <span className="text-blue-600 text-sm font-medium">{row.nama_siswa}</span>;
        if (row.nama_pegawai) return <span className="text-purple-600 text-sm font-medium">{row.nama_pegawai}</span>;
        if (row.nama_donatur) return <span className="text-pink-600 text-sm font-medium">{row.nama_donatur}</span>;
        return <span className="text-slate-400 text-sm">-</span>;
      },
    },
    {
      key: 'uraian',
      label: 'Uraian',
      render: (row) => (
        <div className="max-w-[200px]">
          <span className="text-sm block truncate">{row.uraian || '-'}</span>
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
      render: (row) => (
        <div className="flex gap-1">
          {row.bukti_file && (
            <a href={row.bukti_file} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" title="Lihat bukti">
                <Paperclip className="w-4 h-4 text-slate-400" />
              </Button>
            </a>
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
      ),
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
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">Filter Tanggal:</span>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-40"
              />
              <span className="text-slate-400">s/d</span>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-40"
              />
              {(filterDateFrom || filterDateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}>
                  Reset
                </Button>
              )}
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
        />
        {canEdit && <FloatingAddButton onClick={handleAdd} label="Tambah Transaksi" color="teal" icon={Plus} />}
      </div>
    </div>
  );
}