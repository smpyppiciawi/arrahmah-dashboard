import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SiswaForm from "@/components/siswa/SiswaForm";
import { DataTable } from "@/components/ui/data-table";
import { Users, Plus, Download, Edit2, Trash2, GraduationCap, LogOut, Eye, Images, LayoutList, ClipboardCheck, Archive, DatabaseZap, History, ListChecks } from "lucide-react";
import RiwayatUidDialog from "@/components/uid/RiwayatUidDialog";
import UidAuditDialog from "@/components/uid/UidAuditDialog";
import { Link } from 'react-router-dom';
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import ImportSiswaCSV from "@/components/siswa/ImportSiswaCSV";
import SiswaKeluarDialog from "@/components/siswa/SiswaKeluarDialog";
import SiswaDetailDialog from "@/components/siswa/SiswaDetailDialog";
import SiswaFotoGrid from "@/components/siswa/SiswaFotoGrid";
import SiswaDapoView from "@/components/siswa/SiswaDapoView";
import { formatAlamatLengkap } from '@/lib/dapodikConstants';
import ArsipDialog from "@/components/arsip/ArsipDialog";
import { runMigrasiUid } from '@/lib/uidMigrasi';
import { useToast } from "@/components/ui/use-toast";

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
  const [viewMode, setViewMode] = useState('tabel');
  const [arsipOpen, setArsipOpen] = useState(false);
  const [migrasiUidBerjalan, setMigrasiUidBerjalan] = useState(false);
  const [riwayatSiswa, setRiwayatSiswa] = useState(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
  const isAdmin = userRole === 'admin';

  const { data: siswaList = [], isLoading } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const { data: siswaLulus = [] } = useQuery({
    queryKey: ['siswa', 'lulus'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Lulus' }),
    enabled: viewMode === 'foto',
  });

  // Arsip alih-alih hapus permanen: profil & riwayat tetap tersimpan, dapat dipulihkan lewat menu Arsip
  const archiveMutation = useMutation({
    mutationFn: async (row) => base44.entities.Siswa.update(row.id, {
      is_arsip: true,
      status_sebelum_arsip: row.status || 'Aktif',
      status: 'Keluar',
      arsip_at: new Date().toISOString(),
      arsip_alasan: 'Dihapus dari daftar aktif (diarsipkan)',
      arsip_oleh: currentUser?.full_name || '',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      setDeleteConfirmOpen(false);
      setDeleteId(null);
    },
  });

  const handleDeleteClick = (row) => {
    setDeleteId(row);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      archiveMutation.mutate(deleteId);
    }
  };

  const handleMigrasiUid = async () => {
    setMigrasiUidBerjalan(true);
    try {
      const s = await runMigrasiUid();
      toast({ title: 'Migrasi UID selesai', description: `Siswa: ${s.siswa}, Pegawai: ${s.guru}. Belum ber-UID: ${s.sisa_siswa + s.sisa_guru}.` });
    } catch (e) {
      toast({ title: 'Migrasi UID gagal', description: e.message || 'Terjadi kesalahan.', variant: 'destructive' });
    }
    setMigrasiUidBerjalan(false);
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
          <Button size="sm" variant="ghost" onClick={() => setRiwayatSiswa(row)} title="Riwayat via UID">
            <History className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)} title="Edit">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-orange-500" onClick={() => setKeluarSiswa(row)} title="Keluarkan Siswa">
            <LogOut className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteClick(row)} title="Arsipkan">
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
        title="Arsipkan Data Siswa"
        description="Siswa akan diarsipkan: disembunyikan dari seluruh daftar aktif. Profil dan riwayatnya (absensi, nilai, pelanggaran, dll.) tetap tersimpan dan dapat dipulihkan melalui tombol Arsip. Hapus permanen hanya tersedia di menu Arsip oleh Admin."
      />
      
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm mb-5 overflow-hidden">
          <div className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">Data Siswa</h1>
                <p className="text-xs md:text-sm text-slate-500">
                  {isLoading ? 'Memuat data...' : `${siswaList.length} siswa aktif`} · profil, foto & mutasi
                </p>
              </div>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1 self-start lg:self-auto">
              {[
                { key: 'tabel', label: 'Tabel', icon: LayoutList },
                { key: 'foto', label: 'Foto', icon: Images },
                { key: 'dapo', label: 'Dapo', icon: ClipboardCheck },
              ].map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setViewMode(v.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === v.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <v.icon className="w-4 h-4" />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {canEdit && (
            <div className="px-4 md:px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center gap-2">
              <Button onClick={() => { setEditingData(null); setIsOpen(true); }} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1.5" /> Tambah Siswa
              </Button>
              <Button onClick={handleDownloadTemplate} variant="outline" size="sm" className="bg-white">
                <Download className="w-4 h-4 mr-1.5" /> Template
              </Button>
              <Button onClick={() => setArsipOpen(true)} variant="outline" size="sm" className="bg-white">
                <Archive className="w-4 h-4 mr-1.5" /> Arsip
              </Button>
              <ImportSiswaCSV />
              <Link to="/DataLulusan">
                <Button variant="outline" size="sm" className="bg-white text-amber-600 border-amber-200 hover:bg-amber-50">
                  <GraduationCap className="w-4 h-4 mr-1.5" /> Data Lulusan
                </Button>
              </Link>
              <Link to="/SiswaKeluar">
                <Button variant="outline" size="sm" className="bg-white text-orange-600 border-orange-200 hover:bg-orange-50">
                  <LogOut className="w-4 h-4 mr-1.5" /> Siswa Mutasi
                </Button>
              </Link>

              {isAdmin && (
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button onClick={handleMigrasiUid} variant="outline" size="sm" className="bg-white" disabled={migrasiUidBerjalan}>
                    <DatabaseZap className="w-4 h-4 mr-1.5" /> {migrasiUidBerjalan ? 'Memigrasi...' : 'Migrasi UID'}
                  </Button>
                  <Button onClick={() => setAuditOpen(true)} variant="outline" size="sm" className="bg-white">
                    <ListChecks className="w-4 h-4 mr-1.5" /> Audit UID
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Table with DataTable */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Data Siswa</CardTitle>
          </CardHeader>
          <CardContent>
            {viewMode === 'foto' ? (
              <SiswaFotoGrid
                siswaList={[...siswaList, ...siswaLulus]}
                kelasList={kelasList}
                onSelect={setDetailSiswa}
              />
            ) : viewMode === 'dapo' ? (
              <SiswaDapoView siswaList={siswaList} canEdit={isAdmin} />
            ) : (
              <DataTable columns={siswaColumns} data={siswaList} pageSize={5} />
            )}
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
    {keluarSiswa && <SiswaKeluarDialog siswa={keluarSiswa} onClose={() => setKeluarSiswa(null)} />}
    {canEdit && (
      <ArsipDialog
        open={arsipOpen}
        onOpenChange={setArsipOpen}
        entity="Siswa"
        title="Arsip Siswa"
        subtitle="Cari arsip lewat UID, NIS, atau nama lalu pulihkan. Hapus permanen hanya untuk Admin."
        columns={[
          { key: 'uid', label: 'UID' },
          { key: 'nis', label: 'NIS' },
          { key: 'nama', label: 'Nama Siswa' },
          { key: 'nama_kelas', label: 'Kelas' },
          { key: 'arsip_at', label: 'Diarsipkan', render: (r) => r.arsip_at ? new Date(r.arsip_at).toLocaleDateString('id-ID') : '-' },
        ]}
      />
    )}
    {detailSiswa && <SiswaDetailDialog siswa={detailSiswa} onClose={() => setDetailSiswa(null)} />}
    {riwayatSiswa && (
      <RiwayatUidDialog
        open
        onOpenChange={(o) => !o && setRiwayatSiswa(null)}
        tipe="Siswa"
        uid={riwayatSiswa.uid}
        personId={riwayatSiswa.id}
        nama={riwayatSiswa.nama}
      />
    )}
    {isAdmin && <UidAuditDialog open={auditOpen} onOpenChange={setAuditOpen} />}
    </>
  );
}