import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SiswaForm from "@/components/siswa/SiswaForm";
import { DataTable } from "@/components/ui/data-table";
import { Users, Plus, Download, Edit2, Trash2, GraduationCap, LogOut, Eye } from "lucide-react";
import { Link } from 'react-router-dom';
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import ImportSiswaCSV from "@/components/siswa/ImportSiswaCSV";
import FloatingAddButton from "@/components/ui/FloatingAddButton";
import SiswaKeluarDialog from "@/components/siswa/SiswaKeluarDialog";
import SiswaDetailDialog from "@/components/siswa/SiswaDetailDialog";
import { formatAlamatLengkap } from '@/lib/dapodikConstants';

export default function Siswa() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [keluarSiswa, setKeluarSiswa] = useState(null);
  const [detailSiswa, setDetailSiswa] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const userRole = currentUser?.role || 'guru';
  const canEdit = ['admin', 'tu'].includes(userRole);

  const { data: siswaList = [], isLoading } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Hapus semua data terkait siswa secara cascade
      const [absensiData, nilaiData, pelanggaranData, prestasiData, uksData] = await Promise.all([
        base44.entities.Absensi.filter({ siswa_id: id }),
        base44.entities.Nilai.filter({ siswa_id: id }),
        base44.entities.Pelanggaran.filter({ siswa_id: id }),
        base44.entities.Prestasi.filter({ siswa_id: id }),
        base44.entities.UKS.filter({ siswa_id: id }),
      ]);
      await Promise.all([
        ...absensiData.map(r => base44.entities.Absensi.delete(r.id)),
        ...nilaiData.map(r => base44.entities.Nilai.delete(r.id)),
        ...pelanggaranData.map(r => base44.entities.Pelanggaran.delete(r.id)),
        ...prestasiData.map(r => base44.entities.Prestasi.delete(r.id)),
        ...uksData.map(r => base44.entities.UKS.delete(r.id)),
      ]);
      return base44.entities.Siswa.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      queryClient.invalidateQueries({ queryKey: ['absensi'] });
      queryClient.invalidateQueries({ queryKey: ['nilai'] });
      queryClient.invalidateQueries({ queryKey: ['pelanggaran'] });
      queryClient.invalidateQueries({ queryKey: ['prestasi'] });
      queryClient.invalidateQueries({ queryKey: ['uks'] });
      setDeleteConfirmOpen(false);
      setDeleteId(null);
    },
  });

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['NIS', 'NISN', 'Nama', 'Jenis Kelamin', 'Kelas', 'Tanggal Lahir', 'Alamat', 'Nama Ayah', 'Nama Ibu', 'Nama Wali', 'Pekerjaan Ayah', 'Pekerjaan Ibu', 'Pekerjaan Wali', 'No WA Ayah', 'No WA Ibu', 'No WA Wali', 'Penghasilan Ayah', 'Penghasilan Ibu', 'Penghasilan Wali', 'Koordinat'];
    const csvContent = headers.join(',') + '\n' + '12345,1234567890,Contoh Siswa,Laki-laki,7A,2010-01-01,Jl. Contoh,Budi Sutomo,Siti Aminah,,Wiraswasta,Ibu Rumah Tangga,,08123456789,08123456790,,5000000,3000000,,';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_siswa.csv';
    a.click();
  };

  const handleEdit = (siswa) => {
    setEditingData(siswa);
    setIsOpen(true);
  };

  const siswaColumns = [
    { key: 'nis', label: 'NIS' },
    { key: 'nama', label: 'Nama Siswa' },
    { 
      key: 'nama_kelas', 
      label: 'Kelas',
      render: (row) => (
        <Badge className={
          row.nama_kelas?.startsWith('7') ? 'bg-blue-100 text-blue-700' :
          row.nama_kelas?.startsWith('8') ? 'bg-purple-100 text-purple-700' :
          'bg-emerald-100 text-emerald-700'
        }>
          {row.nama_kelas}
        </Badge>
      )
    },
    { key: 'jenis_kelamin', label: 'JK' },
    { key: 'alamat', label: 'Alamat', render: (row) => (
      <span className="text-xs text-slate-600 line-clamp-2 max-w-[200px] block">{formatAlamatLengkap(row)}</span>
    ) },
    { key: 'kontak', label: 'Kontak WA', render: (row) => {
      const contacts = [];
      if (row.kontak_list?.length > 0) row.kontak_list.forEach(k => { if (k.no_telp) contacts.push(k.no_telp); });
      if (row.no_telp_ortu && !contacts.includes(row.no_telp_ortu)) contacts.push(row.no_telp_ortu);
      return contacts.length > 0 ? <span className="text-xs">{contacts.length} kontak</span> : <span className="text-slate-300 text-xs">-</span>;
    }},
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => (
        <Badge className={
          row.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' :
          row.status === 'Lulus' ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-700'
        }>
          {row.status}
        </Badge>
      )
    },
    {
      key: 'aksi',
      label: 'Aksi',
      sortable: false,
      filterable: false,
      render: (row) => canEdit ? (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDetailSiswa(row)} title="Detail">
            <Eye className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)} title="Edit">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-orange-500" onClick={() => setKeluarSiswa(row)} title="Keluarkan Siswa">
            <LogOut className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteClick(row.id)} title="Hapus">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <span className="text-xs text-slate-400">-</span>
      )
    }
  ];

  return (
    <>
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Hapus Data Siswa"
        description="Apakah Anda yakin? Menghapus siswa ini akan menghapus SEMUA data terkait: absensi, nilai, pelanggaran, prestasi, dan UKS siswa ini secara permanen."
      />
      
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              Data Siswa
            </h1>
            <p className="text-slate-500 mt-1">Kelola data siswa aktif</p>
          </div>
          
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
                <Download className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Template</span>
              </Button>
              <ImportSiswaCSV />
              <Link to="/DataLulusan">
                <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50">
                  <GraduationCap className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Data Lulusan</span>
                </Button>
              </Link>
              <Link to="/SiswaKeluar">
                <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50">
                  <LogOut className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Siswa Mutasi</span>
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Table with DataTable */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Data Siswa</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={siswaColumns} data={siswaList} pageSize={5} />
          </CardContent>
        </Card>

        {isOpen && (
          <SiswaForm
            isOpen={isOpen}
            onClose={() => { setIsOpen(false); setEditingData(null); }}
            editingData={editingData}
            kelasList={kelasList}
          />
        )}
      </div>
    </div>
    {canEdit && <FloatingAddButton onClick={() => { setEditingData(null); setIsOpen(true); }} label="Tambah Siswa" color="blue" icon={Plus} />}
    {keluarSiswa && <SiswaKeluarDialog siswa={keluarSiswa} onClose={() => setKeluarSiswa(null)} />}
    {detailSiswa && <SiswaDetailDialog siswa={detailSiswa} onClose={() => setDetailSiswa(null)} />}
    </>
  );
}