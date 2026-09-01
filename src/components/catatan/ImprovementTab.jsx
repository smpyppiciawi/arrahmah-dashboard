import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, Trash2, Edit2, TrendingDown, AlertTriangle, Database, BookOpen, Plus, Clock } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/use-toast";
import FloatingAddButton from "@/components/ui/FloatingAddButton";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import ImprovementFormDialog from "./ImprovementFormDialog";
import ImprovementSummaryCard from "./ImprovementSummaryCard";
import PelanggaranImprovementFormDialog from "./PelanggaranImprovementFormDialog";
import PengaturanImprovementDialog from "./PengaturanImprovementDialog";
import KelolaKodePelanggaranDialog from "./KelolaKodePelanggaranDialog";
import KelolaKegiatanPembinaanDialog from "./KelolaKegiatanPembinaanDialog";
import ApprovalPoinDialog from "./ApprovalPoinDialog";

const KATEGORI_COLOR = {
  "Hukum & Keselamatan": "bg-red-100 text-red-700",
  "Kesusilaan & Pergaulan": "bg-pink-100 text-pink-700",
  "Penampilan & Seragam": "bg-blue-100 text-blue-700",
  "Kebersihan & Lingkungan": "bg-teal-100 text-teal-700",
  "Ibadah & Adab Islami": "bg-emerald-100 text-emerald-700",
  "Izin & Kehadiran": "bg-cyan-100 text-cyan-700",
  "Sikap & Etika": "bg-purple-100 text-purple-700",
  "Lainnya": "bg-slate-100 text-slate-700"
};

export default function ImprovementTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeAcademicYear: tahunAjaran } = useActiveAcademicYear();
  const [currentUser, setCurrentUser] = useState(null);

  // Dialog states
  const [improvementOpen, setImprovementOpen] = useState(false);
  const [editingImprovement, setEditingImprovement] = useState(null);
  const [prefillSiswa, setPrefillSiswa] = useState(null);

  const [pelanggaranOpen, setPelanggaranOpen] = useState(false);
  const [editingPelanggaran, setEditingPelanggaran] = useState(null);

  const [pengaturanOpen, setPengaturanOpen] = useState(false);
  const [kelolaKodeOpen, setKelolaKodeOpen] = useState(false);
  const [kelolaKegiatanOpen, setKelolaKegiatanOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState(null);

  // Filters
  const [filterKelas, setFilterKelas] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const isAdmin = currentUser?.role === 'admin';
  const canKelolaData = ['admin', 'tu', 'kepsek'].includes(currentUser?.role);
  const canDelete = ['admin', 'tu'].includes(currentUser?.role);

  // Queries
  const { data: improvementList = [] } = useQuery({ queryKey: ['improvement'], queryFn: () => base44.entities.Improvement.list('-tanggal') });
  const { data: pelanggaranImprovementList = [] } = useQuery({ queryKey: ['pelanggaran-improvement'], queryFn: () => base44.entities.PelanggaranImprovement.list('-tanggal') });
  const { data: siswaList = [] } = useQuery({ queryKey: ['siswa'], queryFn: () => base44.entities.Siswa.list() });
  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list('nama') });
  const { data: kodePelanggaranList = [] } = useQuery({ queryKey: ['kode-pelanggaran-improvement'], queryFn: () => base44.entities.KodePelanggaranImprovement.list('kode') });
  const { data: kegiatanList = [] } = useQuery({ queryKey: ['kegiatan-pembinaan'], queryFn: () => base44.entities.KegiatanPembinaan.list('no') });
  const { data: pengaturan } = useQuery({ queryKey: ['pengaturan-improvement'], queryFn: async () => { const l = await base44.entities.PengaturanImprovement.list(); return l[0] || null; } });

  // Approval Poin: ADMIN/TU/KEPSEK atau Guru dgn Tugas Tambahan WAKA KESISWAAN/KURIKULUM
  const myGuru = useMemo(() => (guruList || []).find(g => g.email && g.email === currentUser?.email), [guruList, currentUser]);
  const isWaka = !!myGuru && /waka\s*(kesiswa*n|kurikulum)/i.test(myGuru.tugas_tambahan || '');
  const canApprove = ['admin', 'tu', 'kepsek'].includes(currentUser?.role) || isWaka;
  const pendingApprovalCount = useMemo(() => (pelanggaranImprovementList || []).filter(p => p.status === 'Pending').length, [pelanggaranImprovementList]);

  const siswaMap = useMemo(() => Object.fromEntries(siswaList.map(s => [s.id, s])), [siswaList]);

  const filterFn = (i) => {
    const s = siswaMap[i.siswa_id];
    if (!s || s.status !== 'Aktif') return false;
    if (filterKelas && i.kelas_id !== filterKelas) return false;
    if (filterDateFrom && i.tanggal < filterDateFrom) return false;
    if (filterDateTo && i.tanggal > filterDateTo) return false;
    return true;
  };

  const filteredImprovement = useMemo(() => improvementList.filter(filterFn), [improvementList, siswaMap, filterKelas, filterDateFrom, filterDateTo]);
  const filteredPelanggaran = useMemo(() => pelanggaranImprovementList.filter(filterFn), [pelanggaranImprovementList, siswaMap, filterKelas, filterDateFrom, filterDateTo]);

  const deleteImprovementMutation = useMutation({
    mutationFn: (id) => base44.entities.Improvement.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['improvement'] }); toast({ title: "Record improvement dihapus" }); setDeleteTarget(null); setDeleteType(null); }
  });
  const deletePelanggaranMutation = useMutation({
    mutationFn: (id) => base44.entities.PelanggaranImprovement.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pelanggaran-improvement'] }); toast({ title: "Record pelanggaran dihapus" }); setDeleteTarget(null); setDeleteType(null); }
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteType === 'improvement') deleteImprovementMutation.mutate(deleteTarget.id);
    else deletePelanggaranMutation.mutate(deleteTarget.id);
  };

  const handleTambahImprovement = (siswa = null) => {
    setEditingImprovement(null);
    setPrefillSiswa(siswa);
    setImprovementOpen(true);
  };

  const handleEditImprovement = (row) => { setEditingImprovement(row); setPrefillSiswa(null); setImprovementOpen(true); };
  const handleTambahPelanggaran = () => { setEditingPelanggaran(null); setPelanggaranOpen(true); };
  const handleEditPelanggaran = (row) => { setEditingPelanggaran(row); setPelanggaranOpen(true); };

  const improvementColumns = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'nama_siswa', label: 'Siswa', filterAccessor: (r) => `${r.nama_siswa} ${r.nis || ''}` },
    { key: 'nama_kelas', label: 'Kelas', render: (r) => <Badge variant="secondary" className="bg-blue-100 text-blue-700">{r.nama_kelas}</Badge> },
    { key: 'kegiatan_pembinaan_nama', label: 'Kegiatan Pembinaan', render: (r) => <span className="max-w-xs truncate block">{r.kegiatan_pembinaan_nama || r.uraian}</span> },
    { key: 'poin_pengurangan', label: 'Poin', render: (r) => <Badge className="bg-emerald-100 text-emerald-700">−{r.poin_pengurangan} poin</Badge> },
    { key: 'minggu_key', label: 'Minggu' },
    { key: 'validator_nama', label: 'Validator' },
    { key: 'status', label: 'Status', render: (r) => <Badge className={r.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}>{r.status}</Badge> },
    { key: 'aksi', label: 'Aksi', sortable: false, filterable: false, render: (r) => (
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => handleEditImprovement(r)}><Edit2 className="w-4 h-4" /></Button>
        {canDelete && <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { setDeleteTarget(r); setDeleteType('improvement'); }}><Trash2 className="w-4 h-4" /></Button>}
      </div>
    ) }
  ];

  const pelanggaranColumns = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'nama_siswa', label: 'Siswa', filterAccessor: (r) => `${r.nama_siswa} ${r.nis || ''}` },
    { key: 'nama_kelas', label: 'Kelas', render: (r) => <Badge variant="secondary" className="bg-blue-100 text-blue-700">{r.nama_kelas}</Badge> },
    { key: 'kode', label: 'Kode', render: (r) => <Badge className="bg-slate-700 text-white font-mono text-xs">{r.kode}</Badge> },
    { key: 'kategori_utama', label: 'Kategori', render: (r) => <Badge className={KATEGORI_COLOR[r.kategori_utama] || KATEGORI_COLOR.Lainnya}>{r.kategori_utama}</Badge> },
    { key: 'uraian_pelanggaran', label: 'Uraian', render: (r) => <span className="max-w-xs truncate block">{r.uraian_pelanggaran}</span> },
    { key: 'tindak_lanjut', label: 'Tindak Lanjut', render: (r) => <Badge variant="outline" className="text-xs">{r.tindak_lanjut}</Badge> },
    { key: 'poin', label: 'Poin', render: (r) => <Badge className="bg-red-100 text-red-700">{r.poin} poin</Badge> },
    { key: 'pelapor_nama', label: 'Pelapor' },
    { key: 'status', label: 'Status', render: (r) => <Badge className={r.status === 'Pending' ? 'bg-amber-100 text-amber-700' : r.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : r.status === 'Dibatalkan' ? 'bg-slate-200 text-slate-500 line-through' : 'bg-blue-100 text-blue-700'}>{r.status}</Badge> },
    { key: 'aksi', label: 'Aksi', sortable: false, filterable: false, render: (r) => (
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => handleEditPelanggaran(r)}><Edit2 className="w-4 h-4" /></Button>
        {canDelete && <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { setDeleteTarget(r); setDeleteType('pelanggaran'); }}><Trash2 className="w-4 h-4" /></Button>}
      </div>
    ) }
  ];

  const FilterBar = () => (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-lg">
      <Filter className="w-4 h-4 text-slate-500" />
      <Select value={filterKelas} onValueChange={setFilterKelas}>
        <SelectTrigger className="w-36 h-8"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>Semua Kelas</SelectItem>
          {kelasList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-36 h-8" />
      <span className="text-slate-400">s/d</span>
      <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-36 h-8" />
      {(filterKelas || filterDateFrom || filterDateTo) && (
        <Button variant="ghost" size="sm" onClick={() => { setFilterKelas(''); setFilterDateFrom(''); setFilterDateTo(''); }}>Reset</Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <ImprovementSummaryCard
        pelanggaranImprovementList={pelanggaranImprovementList}
        improvementList={improvementList}
        siswaList={siswaList}
        onTambahImprovement={handleTambahImprovement}
        onAturLimit={() => setPengaturanOpen(true)}
        canAnulir={['admin', 'kepsek'].includes(currentUser?.role)}
      />

      {/* Kelola Data & Approval Poin — ADMIN/TU/KEPSEK (serta Guru WAKA untuk Approval) */}
      {(canKelolaData || canApprove) && (
      <div className="flex flex-wrap gap-2">
        {canApprove && (
        <Button variant="outline" onClick={() => setApprovalOpen(true)} className="border-amber-400 text-amber-700 hover:bg-amber-50 relative">
          <Clock className="w-4 h-4 mr-2" /> Approval Poin
          {pendingApprovalCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
              {pendingApprovalCount}
            </span>
          )}
        </Button>
        )}
        {canKelolaData && (
        <Button variant="outline" onClick={() => setKelolaKodeOpen(true)} className="border-slate-300 text-slate-700 hover:bg-slate-50">
          <Database className="w-4 h-4 mr-2" /> Kelola Kode Pelanggaran
        </Button>
        )}
        {canKelolaData && (
        <Button variant="outline" onClick={() => setKelolaKegiatanOpen(true)} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
          <BookOpen className="w-4 h-4 mr-2" /> Kelola Kegiatan Pembinaan
        </Button>
        )}
      </div>
      )}

      <Tabs defaultValue="pelanggaran" className="w-full">
        <TabsList className="flex w-fit gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          <TabsTrigger value="pelanggaran" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm data-[state=active]:bg-red-500 data-[state=active]:text-white transition-all">
            <AlertTriangle className="w-4 h-4" />
            <span>Pelanggaran ({filteredPelanggaran.length})</span>
          </TabsTrigger>
          <TabsTrigger value="improvement" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white transition-all">
            <TrendingDown className="w-4 h-4" />
            <span>Improvement ({filteredImprovement.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pelanggaran">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" /> Pelanggaran Siswa (Sistem Improvement)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button onClick={handleTambahPelanggaran} className="bg-red-600 hover:bg-red-700">
                    <Plus className="w-4 h-4 mr-1" /> Tambah Pelanggaran
                  </Button>
                </div>
              </div>
              <div className="mt-3"><FilterBar /></div>
            </CardHeader>
            <CardContent>
              <DataTable columns={pelanggaranColumns} data={filteredPelanggaran} pageSize={10} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="improvement">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-emerald-700">
                  <TrendingDown className="w-5 h-5" /> Data Improvement Siswa
                </CardTitle>
                <Button onClick={() => handleTambahImprovement(null)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-1" /> Tambah Improvement
                </Button>
              </div>
              <div className="mt-3"><FilterBar /></div>
            </CardHeader>
            <CardContent>
              <DataTable columns={improvementColumns} data={filteredImprovement} pageSize={10} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FloatingAddButton onClick={() => handleTambahImprovement(null)} label="Tambah Improvement" color="green" icon={TrendingDown} />

      <ImprovementFormDialog
        open={improvementOpen}
        onOpenChange={setImprovementOpen}
        editing={editingImprovement}
        siswaList={siswaList}
        guruList={guruList}
        currentUser={currentUser}
        improvementList={improvementList}
        kegiatanList={kegiatanList}
        pengaturan={pengaturan}
        tahunAjaran={tahunAjaran}
        prefillSiswa={prefillSiswa}
      />

      <PelanggaranImprovementFormDialog
        open={pelanggaranOpen}
        onOpenChange={setPelanggaranOpen}
        editing={editingPelanggaran}
        siswaList={siswaList}
        kelasList={kelasList}
        guruList={guruList}
        currentUser={currentUser}
        kodePelanggaranList={kodePelanggaranList}
        tahunAjaran={tahunAjaran}
      />

      <PengaturanImprovementDialog open={pengaturanOpen} onOpenChange={setPengaturanOpen} isAdmin={isAdmin} canKelola={canKelolaData} />

      <KelolaKodePelanggaranDialog open={kelolaKodeOpen} onOpenChange={setKelolaKodeOpen} />
      <KelolaKegiatanPembinaanDialog open={kelolaKegiatanOpen} onOpenChange={setKelolaKegiatanOpen} />

      <ApprovalPoinDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        pelanggaranList={pelanggaranImprovementList}
        siswaList={siswaList}
        currentUser={currentUser}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteType(null); } }}
        onConfirm={handleDelete}
        title={deleteType === 'improvement' ? "Hapus Record Improvement" : "Hapus Record Pelanggaran"}
        description={deleteType === 'improvement'
          ? `Hapus improvement "${deleteTarget?.kegiatan_pembinaan_nama || deleteTarget?.uraian}"?`
          : `Hapus pelanggaran "[${deleteTarget?.kode}] ${deleteTarget?.uraian_pelanggaran}"?`}
      />
    </div>
  );
}