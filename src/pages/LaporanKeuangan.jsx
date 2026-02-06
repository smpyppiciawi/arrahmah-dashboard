import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { 
  FileText, Printer, Users, TrendingUp, TrendingDown, 
  Wallet, Calendar, Filter, Download, AlertCircle
} from "lucide-react";

export default function LaporanKeuangan() {
  const [activeTab, setActiveTab] = useState('rekening-koran');
  const [filterDateFrom, setFilterDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterDateTo, setFilterDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedSiswa, setSelectedSiswa] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');

  const { data: keuanganList = [] } = useQuery({
    queryKey: ['keuangan'],
    queryFn: () => base44.entities.Keuangan.list('-tanggal'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: tarifIuranList = [] } = useQuery({
    queryKey: ['tarif-iuran'],
    queryFn: () => base44.entities.TarifIuran.filter({ status: 'Aktif' }),
  });

  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  // Filter data by date range
  const filteredData = useMemo(() => {
    return keuanganList.filter(k => {
      if (filterDateFrom && k.tanggal < filterDateFrom) return false;
      if (filterDateTo && k.tanggal > filterDateTo) return false;
      return true;
    });
  }, [keuanganList, filterDateFrom, filterDateTo]);

  // Rekening Koran - semua transaksi dengan running balance
  const rekeningKoran = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
    let balance = 0;
    return sorted.map(t => {
      balance += t.jenis === 'Pemasukan' ? (t.jumlah || 0) : -(t.jumlah || 0);
      return { ...t, saldo: balance };
    });
  }, [filteredData]);

  // Laporan Pemasukan & Pengeluaran
  const laporanPemasukanPengeluaran = useMemo(() => {
    const pemasukan = filteredData.filter(k => k.jenis === 'Pemasukan');
    const pengeluaran = filteredData.filter(k => k.jenis === 'Pengeluaran');
    
    const totalPemasukan = pemasukan.reduce((sum, k) => sum + (k.jumlah || 0), 0);
    const totalPengeluaran = pengeluaran.reduce((sum, k) => sum + (k.jumlah || 0), 0);
    
    // Group by kategori
    const pemasukanByKategori = pemasukan.reduce((acc, k) => {
      const kat = k.kategori || 'Lainnya';
      acc[kat] = (acc[kat] || 0) + (k.jumlah || 0);
      return acc;
    }, {});
    
    const pengeluaranByKategori = pengeluaran.reduce((acc, k) => {
      const kat = k.kategori || 'Lainnya';
      acc[kat] = (acc[kat] || 0) + (k.jumlah || 0);
      return acc;
    }, {});
    
    return { totalPemasukan, totalPengeluaran, pemasukanByKategori, pengeluaranByKategori };
  }, [filteredData]);

  // Filter siswa by kelas
  const filteredSiswaList = useMemo(() => {
    if (!selectedKelas) return siswaList;
    return siswaList.filter(s => s.kelas_id === selectedKelas);
  }, [siswaList, selectedKelas]);

  // Laporan Tunggakan Siswa
  const laporanTunggakan = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const sppTarif = tarifIuranList.find(t => t.nama.toLowerCase().includes('spp'));
    const sppNominal = sppTarif?.nominal || 0;
    
    // Get current month number (1-12)
    const currentMonth = new Date().getMonth() + 1;
    
    return filteredSiswaList.map(siswa => {
      // Get all SPP payments for this siswa
      const sppPayments = keuanganList.filter(k => 
        k.siswa_id === siswa.id && 
        k.tipe_transaksi?.toLowerCase().includes('spp')
      );
      
      const totalDibayar = sppPayments.reduce((sum, p) => sum + (p.jumlah || 0), 0);
      const jumlahBulanBayar = sppNominal > 0 ? Math.floor(totalDibayar / sppNominal) : 0;
      const tunggakan = Math.max(0, (currentMonth - jumlahBulanBayar) * sppNominal);
      
      return {
        ...siswa,
        total_dibayar: totalDibayar,
        bulan_dibayar: jumlahBulanBayar,
        tunggakan: tunggakan,
        status: tunggakan > 0 ? 'Menunggak' : 'Lunas'
      };
    }).filter(s => selectedSiswa ? s.id === selectedSiswa : true);
  }, [filteredSiswaList, keuanganList, tarifIuranList, selectedSiswa]);

  // Print functions
  const printRekeningKoran = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Buku Kas / Rekening Koran</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
            h2 { text-align: center; margin-bottom: 5px; }
            .period { text-align: center; margin-bottom: 15px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 5px; text-align: left; }
            th { background: #f0f0f0; }
            .right { text-align: right; }
            .green { color: green; }
            .red { color: red; }
            .footer { margin-top: 20px; text-align: right; }
          </style>
        </head>
        <body>
          <h2>BUKU KAS / REKENING KORAN</h2>
          <p class="period">Periode: ${format(new Date(filterDateFrom), 'd MMMM yyyy', { locale: idLocale })} - ${format(new Date(filterDateTo), 'd MMMM yyyy', { locale: idLocale })}</p>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Uraian</th>
                <th>Debit</th>
                <th>Kredit</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              ${rekeningKoran.map((t, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${format(new Date(t.tanggal), 'd/M/yyyy')}</td>
                  <td>${t.uraian || t.kategori || '-'}</td>
                  <td class="right green">${t.jenis === 'Pemasukan' ? formatRupiah(t.jumlah) : '-'}</td>
                  <td class="right red">${t.jenis === 'Pengeluaran' ? formatRupiah(t.jumlah) : '-'}</td>
                  <td class="right">${formatRupiah(t.saldo)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>Dicetak: ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: idLocale })}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const printLaporanPemasukanPengeluaran = () => {
    const { totalPemasukan, totalPengeluaran, pemasukanByKategori, pengeluaranByKategori } = laporanPemasukanPengeluaran;
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Pemasukan & Pengeluaran</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
            h2 { text-align: center; margin-bottom: 5px; }
            h3 { margin-top: 20px; border-bottom: 1px solid #000; padding-bottom: 5px; }
            .period { text-align: center; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 5px; }
            th { background: #f0f0f0; }
            .right { text-align: right; }
            .total { font-weight: bold; background: #f9f9f9; }
            .summary { margin-top: 20px; padding: 10px; border: 2px solid #000; }
          </style>
        </head>
        <body>
          <h2>LAPORAN PEMASUKAN & PENGELUARAN</h2>
          <p class="period">Periode: ${format(new Date(filterDateFrom), 'd MMMM yyyy', { locale: idLocale })} - ${format(new Date(filterDateTo), 'd MMMM yyyy', { locale: idLocale })}</p>
          
          <h3>PEMASUKAN</h3>
          <table>
            <tr><th>Kategori</th><th class="right">Jumlah</th></tr>
            ${Object.entries(pemasukanByKategori).map(([kat, jml]) => `
              <tr><td>${kat}</td><td class="right">${formatRupiah(jml)}</td></tr>
            `).join('')}
            <tr class="total"><td>TOTAL PEMASUKAN</td><td class="right">${formatRupiah(totalPemasukan)}</td></tr>
          </table>
          
          <h3>PENGELUARAN</h3>
          <table>
            <tr><th>Kategori</th><th class="right">Jumlah</th></tr>
            ${Object.entries(pengeluaranByKategori).map(([kat, jml]) => `
              <tr><td>${kat}</td><td class="right">${formatRupiah(jml)}</td></tr>
            `).join('')}
            <tr class="total"><td>TOTAL PENGELUARAN</td><td class="right">${formatRupiah(totalPengeluaran)}</td></tr>
          </table>
          
          <div class="summary">
            <p><strong>SALDO AKHIR: ${formatRupiah(totalPemasukan - totalPengeluaran)}</strong></p>
          </div>
          <p style="margin-top: 20px; text-align: right;">Dicetak: ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: idLocale })}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const printLaporanTunggakan = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Tunggakan Siswa</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }
            h2 { text-align: center; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; }
            th { background: #f0f0f0; }
            .right { text-align: right; }
            .red { color: red; }
            .green { color: green; }
          </style>
        </head>
        <body>
          <h2>LAPORAN TUNGGAKAN SPP SISWA</h2>
          <p>Kelas: ${selectedKelas ? kelasList.find(k => k.id === selectedKelas)?.nama_kelas : 'Semua Kelas'}</p>
          <table>
            <tr>
              <th>No</th>
              <th>NIS</th>
              <th>Nama</th>
              <th>Kelas</th>
              <th>Total Bayar</th>
              <th>Tunggakan</th>
              <th>Status</th>
            </tr>
            ${laporanTunggakan.map((s, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${s.nis}</td>
                <td>${s.nama}</td>
                <td>${s.nama_kelas}</td>
                <td class="right">${formatRupiah(s.total_dibayar)}</td>
                <td class="right ${s.tunggakan > 0 ? 'red' : ''}">${formatRupiah(s.tunggakan)}</td>
                <td class="${s.status === 'Lunas' ? 'green' : 'red'}">${s.status}</td>
              </tr>
            `).join('')}
          </table>
          <p style="margin-top: 15px;">Total Siswa Menunggak: ${laporanTunggakan.filter(s => s.tunggakan > 0).length}</p>
          <p>Total Tunggakan: ${formatRupiah(laporanTunggakan.reduce((sum, s) => sum + s.tunggakan, 0))}</p>
          <p style="text-align: right; margin-top: 20px;">Dicetak: ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: idLocale })}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  // Columns for tables
  const rekeningKoranColumns = [
    { key: 'tanggal', label: 'Tanggal', render: (row) => format(new Date(row.tanggal), 'd MMM yyyy', { locale: idLocale }) },
    { key: 'uraian', label: 'Uraian', render: (row) => row.uraian || row.kategori || '-' },
    { key: 'nama', label: 'Nama', render: (row) => row.nama_siswa || row.nama_pegawai || '-' },
    { key: 'debit', label: 'Debit (Masuk)', render: (row) => row.jenis === 'Pemasukan' ? <span className="text-emerald-600 font-medium">{formatRupiah(row.jumlah)}</span> : '-' },
    { key: 'kredit', label: 'Kredit (Keluar)', render: (row) => row.jenis === 'Pengeluaran' ? <span className="text-red-600 font-medium">{formatRupiah(row.jumlah)}</span> : '-' },
    { key: 'saldo', label: 'Saldo', render: (row) => <span className="font-medium">{formatRupiah(row.saldo)}</span> }
  ];

  const tunggakanColumns = [
    { key: 'nis', label: 'NIS' },
    { key: 'nama', label: 'Nama' },
    { key: 'nama_kelas', label: 'Kelas' },
    { key: 'total_dibayar', label: 'Total Dibayar', render: (row) => formatRupiah(row.total_dibayar) },
    { key: 'bulan_dibayar', label: 'Bulan Lunas', render: (row) => `${row.bulan_dibayar} bulan` },
    { key: 'tunggakan', label: 'Tunggakan', render: (row) => <span className={row.tunggakan > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}>{formatRupiah(row.tunggakan)}</span> },
    { key: 'status', label: 'Status', render: (row) => <Badge className={row.status === 'Lunas' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{row.status}</Badge> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-500" />
              Laporan Keuangan
            </h1>
            <p className="text-slate-500 mt-1">Rekap dan cetak laporan keuangan</p>
          </div>
        </div>

        {/* Filter Tanggal */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-600">Periode:</span>
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
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="rekening-koran">Buku Kas</TabsTrigger>
            <TabsTrigger value="pemasukan-pengeluaran">Pemasukan & Pengeluaran</TabsTrigger>
            <TabsTrigger value="tunggakan">Tunggakan Siswa</TabsTrigger>
          </TabsList>

          {/* Rekening Koran */}
          <TabsContent value="rekening-koran">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Buku Kas / Rekening Koran</CardTitle>
                <Button onClick={printRekeningKoran} variant="outline">
                  <Printer className="w-4 h-4 mr-2" /> Cetak
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable columns={rekeningKoranColumns} data={rekeningKoran} pageSize={15} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pemasukan & Pengeluaran */}
          <TabsContent value="pemasukan-pengeluaran">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card className="border-0 shadow-sm bg-emerald-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-700">
                    <TrendingUp className="w-5 h-5" /> Total Pemasukan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-emerald-700">{formatRupiah(laporanPemasukanPengeluaran.totalPemasukan)}</p>
                  <div className="mt-4 space-y-2">
                    {Object.entries(laporanPemasukanPengeluaran.pemasukanByKategori).map(([kat, jml]) => (
                      <div key={kat} className="flex justify-between text-sm">
                        <span>{kat}</span>
                        <span className="font-medium">{formatRupiah(jml)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <TrendingDown className="w-5 h-5" /> Total Pengeluaran
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-700">{formatRupiah(laporanPemasukanPengeluaran.totalPengeluaran)}</p>
                  <div className="mt-4 space-y-2">
                    {Object.entries(laporanPemasukanPengeluaran.pengeluaranByKategori).map(([kat, jml]) => (
                      <div key={kat} className="flex justify-between text-sm">
                        <span>{kat}</span>
                        <span className="font-medium">{formatRupiah(jml)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Saldo Akhir: {formatRupiah(laporanPemasukanPengeluaran.totalPemasukan - laporanPemasukanPengeluaran.totalPengeluaran)}
                </CardTitle>
                <Button onClick={printLaporanPemasukanPengeluaran} variant="outline">
                  <Printer className="w-4 h-4 mr-2" /> Cetak Laporan
                </Button>
              </CardHeader>
            </Card>
          </TabsContent>

          {/* Tunggakan Siswa */}
          <TabsContent value="tunggakan">
            <Card className="border-0 shadow-sm mb-4">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <Label className="text-xs">Filter Kelas</Label>
                    <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Semua Kelas</SelectItem>
                        {kelasList.map(k => (
                          <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Filter Siswa</Label>
                    <Select value={selectedSiswa} onValueChange={setSelectedSiswa}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Semua Siswa" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Semua Siswa</SelectItem>
                        {filteredSiswaList.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <Card className="border-0 shadow-sm bg-blue-50">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-600">Total Siswa</p>
                  <p className="text-2xl font-bold text-blue-700">{laporanTunggakan.length}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-red-50">
                <CardContent className="p-4">
                  <p className="text-sm text-red-600">Siswa Menunggak</p>
                  <p className="text-2xl font-bold text-red-700">{laporanTunggakan.filter(s => s.tunggakan > 0).length}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-amber-50">
                <CardContent className="p-4">
                  <p className="text-sm text-amber-600">Total Tunggakan</p>
                  <p className="text-2xl font-bold text-amber-700">{formatRupiah(laporanTunggakan.reduce((sum, s) => sum + s.tunggakan, 0))}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Data Tunggakan Siswa</CardTitle>
                <Button onClick={printLaporanTunggakan} variant="outline">
                  <Printer className="w-4 h-4 mr-2" /> Cetak
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable columns={tunggakanColumns} data={laporanTunggakan} pageSize={10} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}