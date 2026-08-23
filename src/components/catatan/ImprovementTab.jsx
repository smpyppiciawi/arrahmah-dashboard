import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, Trash2, Edit2, TrendingDown } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/use-toast";
import FloatingAddButton from "@/components/ui/FloatingAddButton";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import ImprovementFormDialog from "./ImprovementFormDialog";
import ImprovementSummaryCard from "./ImprovementSummaryCard";

const KATEGORI_COLOR = {
  Akademik: "bg-blue-100 text-blue-700",
  Perilaku: "bg-emerald-100 text-emerald-700",
  Kepedulian: "bg-purple-100 text-purple-700",
  Kebersihan: "bg-cyan-100 text-cyan-700",
  Lainnya: "bg-slate-100 text-slate-700"
};

export default function ImprovementTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [filterKelas, setFilterKelas] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: improvementList = [] } = useQuery({ queryKey: ['improvement'], queryFn: () => base44.entities.Improvement.list('-tanggal') });
  const { data: pelanggaranList = [] } = useQuery({ queryKey: ['pelanggaran'], queryFn: () => base44.entities.Pelanggaran.list('-tanggal') });
  const { data: siswaList = [] } = useQuery({ queryKey: ['siswa'], queryFn: () => base44.entities.Siswa.list() });
  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list('nama') });

  const siswaMap = useMemo(() => Object.fromEntries(siswaList.map(s => [s.id, s])), [siswaList]);

  const filteredList = useMemo(() => improvementList.filter(i => {
    const s = siswaMap[i.siswa_id];
    if (!s || s.status !== 'Aktif') return false;
    if (filterKelas && i.kelas_id !== filterKelas) return false;
    if (filterDateFrom && i.tanggal < filterDateFrom) return false;
    if (filterDateTo && i.tanggal > filterDateTo) return false;
    return true;
  }), [improvementList, siswaMap, filterKelas, filterDateFrom, filterDateTo]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Improvement.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['improvement'] }); toast({ title: "Record improvement dihapus", description: "Jatah poin mingguan kembali tersedia." }); }
  });

  const handleEdit = (row) => { setEditing(row); setIsOpen(true); };
  const handleOpenNew = () => { setEditing(null); setIsOpen(true); };
  const handleDelete = () => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } };

  const columns = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'nama_siswa', label: 'Siswa', filterAccessor: (r) => `${r.nama_siswa} ${r.nis || ''}` },
    { key: 'nama_kelas', label: 'Kelas', render: (r) => <Badge variant="secondary" className="bg-blue-100 text-blue-700">{r.nama_kelas}</Badge> },
    { key: 'kategori', label: 'Kategori', render: (r) => <Badge className={KATEGORI_COLOR[r.kategori] || KATEGORI_COLOR.Lainnya}>{r.kategori}</Badge> },
    { key: 'uraian', label: 'Uraian', render: (r) => <span className="max-w-xs truncate block">{r.uraian}</span> },
    { key: 'poin_pengurangan', label: 'Poin', render: (r) => <Badge className="bg-emerald-100 text-emerald-700">−{r.poin_pengurangan} poin</Badge> },
    { key: 'minggu_key', label: 'Minggu' },
    { key: 'validator_nama', label: 'Validator' },
    { key: 'status', label: 'Status', render: (r) => <Badge className={r.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}>{r.status}</Badge> },
    { key: 'aksi', label: 'Aksi', sortable: false, filterable: false, render: (r) => (
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => handleEdit(r)}><Edit2 className="w-4 h-4" /></Button>
        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleteTarget(r)}><Trash2 className="w-4 h-4" /></Button>
      </div>
    ) }
  ];

  return (
    <div className="space-y-6">
      <ImprovementSummaryCard pelanggaranList={pelanggaranList} improvementList={improvementList} siswaList={siswaList} kelasList={kelasList} />

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <TrendingDown className="w-5 h-5" /> Data Improvement Siswa
            </CardTitle>
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
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredList} pageSize={10} />
        </CardContent>
      </Card>

      <FloatingAddButton onClick={handleOpenNew} label="Tambah Improvement" color="green" icon={TrendingDown} />

      <ImprovementFormDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        editing={editing}
        kelasList={kelasList}
        siswaList={siswaList}
        guruList={guruList}
        currentUser={currentUser}
        improvementList={improvementList}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Record Improvement"
        description={`Hapus improvement "${deleteTarget?.uraian}"? Poin pengurangan akan dikembalikan ke jatah mingguan.`}
      />
    </div>
  );
}