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
  Wallet, Calendar, Filter, Download, AlertCircle, Megaphone,
  ArrowLeftRight
} from "lucide-react";
import PengumumanBendahara from '@/components/keuangan/PengumumanBendahara';
import TransferDanaDialog from '@/components/transaksi/TransferDanaDialog';
import { computeStatusKeuangan, tarifMatchesTingkat } from '@/lib/sppUtils';
import { useAuth } from '@/lib/AuthContext';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';

export default function LaporanKeuangan() {
  const { activeAcademicYear } = useActiveAcademicYear();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('rekening-koran');
  const [transferOpen, setTransferOpen] = useState(false);
  const [filterKategori, setFilterKategori] = useState('');
  const [filterDonatur, setFilterDonatur] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterDateTo, setFilterDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedSiswa, setSelectedSiswa] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedIuran, setSelectedIuran] = useState('');
  const [selectedTA, setSelectedTA] = useState('__aktif__');

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

  const { data: sumberDanaList = [] } = useQuery({
    queryKey: ['sumber-dana'],
    queryFn: () => base44.entities.SumberDana.list('nama'),
  });

  const { data: transferDanaList = [] } = useQuery({
    queryKey: ['transfer-dana'],
    queryFn: () => base44.entities.TransferDana.list('-tanggal'),
  });

  const { data: donaturList = [] } = useQuery({
    queryKey: ['donatur'],
    queryFn: () => base44.entities.Donatur.list('nama'),
  });

  const { data: kategoriList = [] } = useQuery({
    queryKey: ['kategori-transaksi'],
    queryFn: () => base44.entities.KategoriTransaksi.list('nama'),
  });

  const { data: biayaKhususList = [] } = useQuery({
    queryKey: ['biaya-khusus'],
    queryFn: () => base44.entities.BiayaKhusus.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Calculate saldo per sumber dana
  const saldoPerSumberDana = useMemo(() => {
    const map = {};
    sumberDanaList.forEach(s => { map[s.nama] = 0; });
    keuanganList.forEach(k => {
      if (!k.sumber_rekening) return;
      if (!map[k.sumber_rekening]) map[k.sumber_rekening] = 0;
      map[k.sumber_rekening] += k.jenis === 'Pemasukan' ? (k.jumlah || 0) : -(k.jumlah || 0);
    });
    transferDanaList.forEach(t => {
      if (!map[t.dari_sumber_dana]) map[t.dari_sumber_dana] = 0;
      if (!map[t.ke_sumber_dana]) map[t.ke_sumber_dana] = 0;
      map[t.dari_sumber_dana] -= (t.nominal || 0);
      map[t.ke_sumber_dana] += (t.nominal || 0);
    });
    return map;
  }, [keuanganList, sumberDanaList, transferDanaList]);

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

  // Filter data for Laporan Pemasukan & Pengeluaran tab (kategori + donatur)
  const laporanFilteredData = useMemo(() => {
    let data = [...filteredData];
    if (filterKategori) data = data.filter(k => k.kategori === filterKategori);
    if (filterDonatur) data = data.filter(k => k.nama_donatur === filterDonatur);
    return data;
  }, [filteredData, filterKategori, filterDonatur]);

  // Unique donatur names for filter
  const donaturNames = useMemo(() => {
    const fromEntity = donaturList.map(d => d.nama).filter(Boolean);
    const fromKeuangan = keuanganList.filter(k => k.nama_donatur).map(k => k.nama_donatur).filter(Boolean);
    return [...new Set([...fromEntity, ...fromKeuangan])].sort((a, b) => a.localeCompare(b));
  }, [donaturList, keuanganList]);

  // Unique kategori names for filter
  const kategoriNames = useMemo(() => {
    return kategoriList.map(k => k.nama).sort();
  }, [kategoriList]);

  // Rekening Koran - semua transaksi dengan running balance
  const rekeningKoran = useMemo(() => {
    // Merge transfer records into the ledger
    const transferEntries = transferDanaList
      .filter(t => (!filterDateFrom || t.tanggal >= filterDateFrom) && (!filterDateTo || t.tanggal <= filterDateTo))
      .map(t => ({
        ...t,
        id: `transfer-${t.id}`,
        tanggal: t.tanggal,
        jenis: 'Transfer',
        kategori: 'Transfer',
        uraian: `Transfer: ${t.dari_sumber_dana} → ${t.ke_sumber_dana}`,
        sumber_rekening: t.dari_sumber_dana,
        jumlah: t.nominal,
        is_transfer: true,
      }));
    const allEntries = [...filteredData, ...transferEntries];
    const sorted = [...allEntries].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
    let balance = 0;
    return sorted.map(t => {
      if (!t.is_transfer) {
        balance += t.jenis === 'Pemasukan' ? (t.jumlah || 0) : -(t.jumlah || 0);
      }
      return { ...t, saldo: balance };
    });
  }, [filteredData, transferDanaList, filterDateFrom, filterDateTo]);

  // Laporan Pemasukan & Pengeluaran
  const laporanPemasukanPengeluaran = useMemo(() => {
    const pemasukan = laporanFilteredData.filter(k => k.jenis === 'Pemasukan');
    const pengeluaran = laporanFilteredData.filter(k => k.jenis === 'Pengeluaran');
    
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
  }, [laporanFilteredData]);

  // Unique iuran names for filter
  const iuranNames = useMemo(() => {
    return [...new Set(tarifIuranList.map(t => t.nama))].sort();
  }, [tarifIuranList]);

  // Map kelas_id → tingkat
  const kelasTingkatMap = useMemo(() => {
    const map = {};
    kelasList.forEach(k => { map[k.id] = k.tingkat; });
    return map;
  }, [kelasList]);

  // Helper: get tingkat from siswa
  const getTingkat = (siswa) => {
    return kelasTingkatMap[siswa.kelas_id] || (siswa.nama_kelas?.[0] || '');
  };

  // Tahun ajaran yang bisa dipilih bendahara (default: TA aktif)
  const taOptions = useMemo(() => {
    const set = new Set();
    if (activeAcademicYear) set.add(activeAcademicYear);
    tarifIuranList.forEach(t => { if (t.tahun_ajaran) set.add(t.tahun_ajaran); });
    keuanganList.forEach(k => { if (k.tahun_ajaran) set.add(k.tahun_ajaran); });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [activeAcademicYear, tarifIuranList, keuanganList]);

  // TA yang dipakai perhitungan — '' berarti semua tahun ajaran
  const taTerpilih = selectedTA === '__aktif__' ? (activeAcademicYear || '') : selectedTA;

  // Transaksi dikelompokkan per siswa agar hitungan per siswa ringan
  const keuanganBySiswa = useMemo(() => {
    const map = {};
    keuanganList.forEach(k => {
      if (!k.siswa_id) return;
      if (!map[k.siswa_id]) map[k.siswa_id] = [];
      map[k.siswa_id].push(k);
    });
    return map;
  }, [keuanganList]);

  // Helper: get periode label for iuran
  const getIuranPeriode = (iuranName, tingkat) => {
    const tarif = tarifIuranList.find(t => t.nama === iuranName && tarifMatchesTingkat(t, tingkat));
    if (!tarif) return '-';
    switch (tarif.periode) {
      case 'Bulanan': return `${tarif.periode} (12 bln)`;
      case 'Semester': return `${tarif.periode} (2x)`;
      case 'Tahunan': return `${tarif.periode} (1x)`;
      case 'Sekali': return `${tarif.periode} (1x)`;
      default: return tarif.periode;
    }
  };



  // Filter siswa by kelas
  const filteredSiswaList = useMemo(() => {
    if (!selectedKelas) return siswaList;
    return siswaList.filter(s => s.kelas_id === selectedKelas);
  }, [siswaList, selectedKelas]);

  // Laporan Tunggakan Siswa — logika terpusat (identik dengan Akun Siswa & Wali Kelas)
  const laporanTunggakan = useMemo(() => {
    return filteredSiswaList.map(siswa => {
      const statusKeu = computeStatusKeuangan({
        siswa,
        keuanganList: keuanganBySiswa[siswa.id] || [],
        tarifList: tarifIuranList,
        biayaKhususList,
        kelasList,
        tahunAjaran: taTerpilih,
        iuranNama: selectedIuran || null,
      });
      return {
        ...siswa,
        total_dibayar: statusKeu.totalDibayar,
        sisa_jatuh_tempo: statusKeu.sisaJatuhTempo,
        sisa_setahun: statusKeu.sisaSetahun,
        status_keuangan: statusKeu.status,
        periode: selectedIuran ? getIuranPeriode(selectedIuran, getTingkat(siswa)) : '-',
      };
    }).filter(s => selectedSiswa ? s.id === selectedSiswa : true);
  }, [filteredSiswaList, keuanganBySiswa, tarifIuranList, biayaKhususList, kelasList, taTerpilih, selectedIuran, selectedSiswa]);

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
                <th>Kategori</th>
                <th>Sumber Dana</th>
                <th>Debit</th>
                <th>Kredit</th>
                <th>Transfer</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              ${rekeningKoran.map((t, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${format(new Date(t.tanggal), 'd/M/yyyy')}</td>
                  <td>${t.uraian || t.kategori || '-'}</td>
                  <td>${t.is_transfer ? 'Transfer' : (t.kategori || '-')}</td>
                  <td>${t.sumber_rekening || '-'}</td>
                  <td class="right green">${t.jenis === 'Pemasukan' ? formatRupiah(t.jumlah) : '-'}</td>
                  <td class="right red">${t.jenis === 'Pengeluaran' ? formatRupiah(t.jumlah) : '-'}</td>
                  <td class="right" style="color:teal">${t.is_transfer ? formatRupiah(t.jumlah) : '-'}</td>
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
            .orange { color: #b45300; }
          </style>
        </head>
        <body>
          <h2>LAPORAN TUNGGAKAN IURAN SISWA</h2>
          <p>Tahun Ajaran: ${taTerpilih || 'Semua Tahun Ajaran'} | Kelas: ${selectedKelas ? kelasList.find(k => k.id === selectedKelas)?.nama_kelas : 'Semua Kelas'}${selectedIuran ? ` | Iuran: ${selectedIuran}` : ' | Semua Iuran'}</p>
          <table>
            <tr>
              <th>No</th>
              <th>NIS</th>
              <th>Nama</th>
              <th>Kelas</th>
              <th>Total Bayar</th>
              <th>Sisa Bayar (Jatuh Tempo)</th>
              <th>Sisa Bayar (Setahun)</th>
              ${selectedIuran ? '<th>Periode</th>' : ''}
              <th>Status</th>
            </tr>
            ${laporanTunggakan.map((s, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${s.nis}</td>
                <td>${s.nama}</td>
                <td>${s.nama_kelas}</td>
                <td class="right">${formatRupiah(s.total_dibayar)}</td>
                <td class="right ${s.sisa_jatuh_tempo > 0 ? 'red' : ''}">${formatRupiah(s.sisa_jatuh_tempo)}</td>
                <td class="right ${s.sisa_setahun > 0 ? 'red' : ''}">${formatRupiah(s.sisa_setahun)}</td>
                ${selectedIuran ? `<td>${s.periode}</td>` : ''}
                <td class="${s.status_keuangan === 'Lunas' ? 'green' : s.status_keuangan === 'Cicilan' ? 'orange' : 'red'}">${s.status_keuangan}</td>
              </tr>
            `).join('')}
          </table>
          <p style="margin-top: 15px;">Lunas: ${laporanTunggakan.filter(s => s.status_keuangan === 'Lunas').length} siswa | Cicilan: ${laporanTunggakan.filter(s => s.status_keuangan === 'Cicilan').length} siswa | Menunggak: ${laporanTunggakan.filter(s => s.status_keuangan === 'Menunggak').length} siswa</p>
          <p>Total Sisa Bayar (Jatuh Tempo): ${formatRupiah(laporanTunggakan.reduce((sum, s) => sum + s.sisa_jatuh_tempo, 0))} | Total Sisa Bayar (Setahun): ${formatRupiah(laporanTunggakan.reduce((sum, s) => sum + s.sisa_setahun, 0))}</p>
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
    { key: 'uraian', label: 'Uraian', render: (row) => row.is_transfer ? <span className="text-teal-600 font-medium">{row.uraian}</span> : (row.uraian || row.kategori || '-') },
    { key: 'kategori', label: 'Kategori', render: (row) => row.is_transfer ? <Badge className="text-xs bg-teal-100 text-teal-700">Transfer</Badge> : <Badge variant="outline" className="text-xs">{row.kategori || '-'}</Badge> },
    { key: 'sumber_rekening', label: 'Sumber Dana', render: (row) => <span className="text-xs text-slate-500">{row.sumber_rekening || '-'}</span> },
    { key: 'nama', label: 'Nama', render: (row) => row.nama_siswa || row.nama_pegawai || row.nama_donatur || '-' },
    { key: 'debit', label: 'Debit (Masuk)', render: (row) => row.jenis === 'Pemasukan' ? <span className="text-emerald-600 font-medium">{formatRupiah(row.jumlah)}</span> : '-' },
    { key: 'kredit', label: 'Kredit (Keluar)', render: (row) => row.jenis === 'Pengeluaran' ? <span className="text-red-600 font-medium">{formatRupiah(row.jumlah)}</span> : '-' },
    { key: 'transfer', label: 'Transfer', sortable: false, filterable: false, render: (row) => row.is_transfer ? <span className="text-teal-600 font-medium">{formatRupiah(row.jumlah)}</span> : '-' },
    { key: 'saldo', label: 'Saldo', render: (row) => <span className="font-medium">{formatRupiah(row.saldo)}</span> }
  ];

  const statusBadgeCls = (status) => status === 'Lunas'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'Cicilan' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  const sisaRender = (v) => <span className={v > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}>{formatRupiah(v)}</span>;

  const tunggakanColumns = [
    { key: 'nis', label: 'NIS' },
    { key: 'nama', label: 'Nama' },
    { key: 'nama_kelas', label: 'Kelas' },
    { key: 'total_dibayar', label: 'Total Dibayar', render: (row) => formatRupiah(row.total_dibayar) },
    { key: 'sisa_jatuh_tempo', label: 'Sisa Bayar (Jatuh Tempo)', render: sisaRender },
    { key: 'sisa_setahun', label: 'Sisa Bayar (Setahun)', render: sisaRender },
    ...(selectedIuran ? [{ key: 'periode', label: 'Periode', render: (row) => <Badge variant="outline">{row.periode}</Badge> }] : []),
    { key: 'status_keuangan', label: 'Status', render: (row) => <Badge className={statusBadgeCls(row.status_keuangan)}>{row.status_keuangan}</Badge> }
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

        {/* Saldo per Sumber Dana */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Saldo Sumber Dana</h2>
          <Button onClick={() => setTransferOpen(true)} className="bg-teal-600 hover:bg-teal-700" size="sm">
            <ArrowLeftRight className="w-4 h-4 mr-1" /> Transfer
          </Button>
        </div>
        {sumberDanaList.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {sumberDanaList.map(s => {
              const saldo = saldoPerSumberDana[s.nama] || 0;
              return (
                <Card key={s.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="w-4 h-4 text-teal-500" />
                      <p className="text-xs text-slate-500 font-medium truncate">{s.nama}</p>
                    </div>
                    <p className={`text-lg font-bold ${saldo >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                      {formatRupiah(saldo)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

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
          <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="rekening-koran">Buku Kas</TabsTrigger>
            <TabsTrigger value="pemasukan-pengeluaran">Pemasukan & Pengeluaran</TabsTrigger>
            <TabsTrigger value="tunggakan">Tunggakan Siswa</TabsTrigger>
            <TabsTrigger value="pengumuman">
              <Megaphone className="w-3.5 h-3.5 mr-1" /> Pengumuman
            </TabsTrigger>
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
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Saldo Akhir: {formatRupiah(laporanPemasukanPengeluaran.totalPemasukan - laporanPemasukanPengeluaran.totalPengeluaran)}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={filterKategori || 'all'} onValueChange={(v) => setFilterKategori(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      {kategoriNames.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterDonatur || 'all'} onValueChange={(v) => setFilterDonatur(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Semua Donatur" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Donatur</SelectItem>
                      {donaturNames.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {(filterKategori || filterDonatur) && (
                    <Button variant="ghost" size="sm" onClick={() => { setFilterKategori(''); setFilterDonatur(''); }}>Reset</Button>
                  )}
                  <Button onClick={printLaporanPemasukanPengeluaran} variant="outline">
                    <Printer className="w-4 h-4 mr-2" /> Cetak Laporan
                  </Button>
                </div>
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
                  <div>
                    <Label className="text-xs">Filter Jenis Iuran</Label>
                    <Select value={selectedIuran} onValueChange={setSelectedIuran}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Semua Iuran" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Semua Iuran (Total)</SelectItem>
                        {iuranNames.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                        </SelectContent>
                        </Select>
                        </div>
                        <div>
                        <Label className="text-xs">Tahun Ajaran</Label>
                        <Select value={selectedTA} onValueChange={setSelectedTA}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="TA Aktif" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__aktif__">TA Aktif{activeAcademicYear ? ` (${activeAcademicYear})` : ''}</SelectItem>
                          {taOptions.map(ta => (
                            <SelectItem key={ta} value={ta}>{ta}</SelectItem>
                          ))}
                          <SelectItem value={null}>Semua Tahun Ajaran</SelectItem>
                        </SelectContent>
                        </Select>
                        </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <Card className="border-0 shadow-sm bg-blue-50">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-600">Total Siswa</p>
                  <p className="text-2xl font-bold text-blue-700">{laporanTunggakan.length}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-emerald-50">
                <CardContent className="p-4">
                  <p className="text-sm text-emerald-600">Lunas</p>
                  <p className="text-2xl font-bold text-emerald-700">{laporanTunggakan.filter(s => s.status_keuangan === 'Lunas').length}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-amber-50">
                <CardContent className="p-4">
                  <p className="text-sm text-amber-600">Cicilan</p>
                  <p className="text-2xl font-bold text-amber-700">{laporanTunggakan.filter(s => s.status_keuangan === 'Cicilan').length}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-red-50">
                <CardContent className="p-4">
                  <p className="text-sm text-red-600">Menunggak</p>
                  <p className="text-2xl font-bold text-red-700">{laporanTunggakan.filter(s => s.status_keuangan === 'Menunggak').length}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-slate-50">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-600">Total Sisa Bayar</p>
                  <p className="text-lg font-bold text-slate-800">{formatRupiah(laporanTunggakan.reduce((sum, s) => sum + s.sisa_jatuh_tempo, 0))}</p>
                  <p className="text-[11px] text-slate-400">Setahun: {formatRupiah(laporanTunggakan.reduce((sum, s) => sum + s.sisa_setahun, 0))}</p>
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
          {/* Pengumuman */}
          <TabsContent value="pengumuman">
            <PengumumanBendahara />
          </TabsContent>
        </Tabs>

        <TransferDanaDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          sumberDanaList={sumberDanaList}
          keuanganList={keuanganList}
          transferDanaList={transferDanaList}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}