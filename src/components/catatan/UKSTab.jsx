import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Stethoscope, Filter, GraduationCap, Send, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";
import SiswaLulusRecordsDialog from './SiswaLulusRecordsDialog';
import WaSendDialog, { buildWaTargets } from './WaSendDialog';
import { KELUHAN_DATA, KATEGORI_TRIASE_CONFIG } from '@/lib/triaseData';

function KeluhanPicker({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return KELUHAN_DATA;
    return KELUHAN_DATA.filter(k => k.label.toLowerCase().includes(search.toLowerCase()) || k.kategori.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const selected = KELUHAN_DATA.find(k => k.label === value);

  return (
    <div className="space-y-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-white text-sm hover:border-slate-400 transition"
        >
          <span className={value ? 'text-slate-800' : 'text-slate-400'}>
            {value || 'Pilih keluhan...'}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl max-h-72 overflow-hidden flex flex-col">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 text-sm border rounded outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Cari keluhan..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {['Hijau', 'Kuning', 'Merah'].map(kategori => {
                const items = filtered.filter(k => k.kategori === kategori);
                if (!items.length) return null;
                const cfg = KATEGORI_TRIASE_CONFIG[kategori];
                return (
                  <div key={kategori}>
                    <div className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${cfg.color} border-b`}>
                      {cfg.label}
                    </div>
                    {items.map(k => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => { onChange(k.label, k.kategori, k.indikator); setOpen(false); setSearch(''); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 ${value === k.label ? 'bg-blue-50 font-medium' : ''}`}
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>
                );
              })}
              {filtered.length === 0 && <div className="px-3 py-4 text-sm text-slate-400 text-center">Tidak ditemukan</div>}
            </div>
          </div>
        )}
      </div>
      {selected && (
        <div className={`p-2.5 rounded-lg border text-xs ${KATEGORI_TRIASE_CONFIG[selected.kategori]?.color}`}>
          <span className="font-semibold">Indikator: </span>{selected.indikator}
        </div>
      )}
    </div>
  );
}

export default function UKSTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [lulusOpen, setLulusOpen] = useState(false);
  const [waTarget, setWaTarget] = useState(null);
  const [siswaSearch, setSiswaSearch] = useState('');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
    jam_masuk: '', jam_keluar: '', keluhan: '', kategori_triase: '', indikator_triase: '',
    diagnosa: '', penanganan: '', suhu_badan: '', status: 'Di UKS', keterangan: ''
  });

  const { data: uksList = [] } = useQuery({ queryKey: ['uks'], queryFn: () => base44.entities.UKS.list('-tanggal') });
  const { data: siswaList = [] } = useQuery({ queryKey: ['siswa'], queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }) });
  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list('nama'), staleTime: 60000 });

  const siswaMap = useMemo(() => { const m = {}; siswaList.forEach(s => { m[s.id] = s; }); return m; }, [siswaList]);
  const activeSiswaIds = useMemo(() => new Set(siswaList.map(s => s.id)), [siswaList]);

  const filteredUksList = useMemo(() => uksList.filter(u => {
    if (!activeSiswaIds.has(u.siswa_id)) return false;
    if (filterDateFrom && u.tanggal < filterDateFrom) return false;
    if (filterDateTo && u.tanggal > filterDateTo) return false;
    return true;
  }), [uksList, filterDateFrom, filterDateTo, activeSiswaIds]);

  // Siswa search
  const filteredSiswaForForm = useMemo(() => {
    return siswaList
      .filter(s => !siswaSearch || s.nama.toLowerCase().includes(siswaSearch.toLowerCase()) || s.nis?.includes(siswaSearch))
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaList, siswaSearch]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.UKS.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['uks'] }); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UKS.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['uks'] }); resetForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UKS.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['uks'] }),
  });

  const resetForm = () => {
    setFormData({ tanggal: new Date().toISOString().split('T')[0], siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '', jam_masuk: '', jam_keluar: '', keluhan: '', kategori_triase: '', indikator_triase: '', diagnosa: '', penanganan: '', suhu_badan: '', status: 'Di UKS', keterangan: '' });
    setSiswaSearch('');
    setEditing(null);
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = (item) => {
    setEditing(item);
    setFormData(item);
    setIsOpen(true);
  };

  const handleSiswaChange = (siswaId) => {
    const siswa = siswaList.find(s => s.id === siswaId);
    if (siswa) setFormData(prev => ({ ...prev, siswa_id: siswa.id, nis: siswa.nis, nama_siswa: siswa.nama, kelas_id: siswa.kelas_id, nama_kelas: siswa.nama_kelas }));
  };

  const handleKeluhanChange = (label, kategori, indikator) => {
    setFormData(prev => ({ ...prev, keluhan: label, kategori_triase: kategori, indikator_triase: indikator }));
  };

  const buildUksMessage = (r) => `*NOTIFIKASI KUNJUNGAN UKS*\n\nNama: ${r.nama_siswa}\nKelas: ${r.nama_kelas}\nTanggal: ${r.tanggal}\nJam Masuk: ${r.jam_masuk || '-'}\nKeluhan: ${r.keluhan || '-'}\nKategori Triase: ${r.kategori_triase || '-'}\nDiagnosa: ${r.diagnosa || '-'}\nPenanganan: ${r.penanganan || '-'}\nSuhu: ${r.suhu_badan ? r.suhu_badan + '°C' : '-'}\nStatus: ${r.status}\nKeterangan: ${r.keterangan || '-'}`;

  const handleSendWa = (row) => {
    const siswa = siswaMap[row.siswa_id];
    const kelas = kelasList.find(k => k.id === row.kelas_id);
    setWaTarget({ row, targets: buildWaTargets(siswa, kelas, guruList), message: buildUksMessage(row) });
  };

  const triaseBadge = (kategori) => {
    const cfg = KATEGORI_TRIASE_CONFIG[kategori];
    if (!cfg) return null;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}><span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{kategori}</span>;
  };

  const uksColumns = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'nama_siswa', label: 'Siswa' },
    { key: 'nama_kelas', label: 'Kelas', render: (row) => <Badge variant="secondary" className="bg-blue-100 text-blue-700">{row.nama_kelas}</Badge> },
    { key: 'jam_masuk', label: 'Jam Masuk' },
    { key: 'keluhan', label: 'Keluhan', render: (row) => <span className="max-w-xs truncate block">{row.keluhan}</span> },
    { key: 'kategori_triase', label: 'Triase', render: (row) => triaseBadge(row.kategori_triase) || '-' },
    { key: 'status', label: 'Status', render: (row) => (
      <Badge className={
        row.status === 'Di UKS' ? 'bg-amber-100 text-amber-700' :
        row.status === 'Pulang' ? 'bg-red-100 text-red-700' :
        row.status === 'Tindakan Klinik' || row.status === 'Tindakan IGD' ? 'bg-purple-100 text-purple-700' :
        'bg-emerald-100 text-emerald-700'
      }>{row.status}</Badge>
    )},
    { key: 'aksi', label: 'Aksi', sortable: false, filterable: false, render: (row) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" className="text-green-600" onClick={() => handleSendWa(row)}><Send className="w-4 h-4" /></Button>
        <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}><Edit2 className="w-4 h-4" /></Button>
        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteMutation.mutate(row.id)}><Trash2 className="w-4 h-4" /></Button>
      </div>
    )},
  ];

  const triaseCfg = KATEGORI_TRIASE_CONFIG[formData.kategori_triase];

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-rose-700"><Stethoscope className="w-5 h-5" />Data Kunjungan UKS</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => setLulusOpen(true)} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                <GraduationCap className="w-4 h-4 mr-2" /> Siswa Lulus/Keluar
              </Button>
              <Button onClick={() => setIsOpen(true)} className="bg-rose-600 hover:bg-rose-700">
                <Plus className="w-4 h-4 mr-2" /> Tambah Kunjungan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">Filter Tanggal:</span>
            <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-40" />
            <span className="text-slate-400">s/d</span>
            <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-40" />
            {(filterDateFrom || filterDateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}>Reset</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ringkasan Triase */}
      <div className="grid grid-cols-3 gap-3">
        {['Hijau', 'Kuning', 'Merah'].map(k => {
          const cfg = KATEGORI_TRIASE_CONFIG[k];
          const count = filteredUksList.filter(u => u.kategori_triase === k).length;
          return (
            <div key={k} className={`p-3 rounded-xl border ${cfg.color} text-center`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-semibold mt-0.5">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <DataTable columns={uksColumns} data={filteredUksList} pageSize={10} />
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Kunjungan' : 'Tambah Kunjungan UKS'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal</Label>
                <Input type="date" value={formData.tanggal} onChange={(e) => setFormData(p => ({ ...p, tanggal: e.target.value }))} required />
              </div>
              <div>
                <Label>Jam Masuk</Label>
                <Input type="time" value={formData.jam_masuk} onChange={(e) => setFormData(p => ({ ...p, jam_masuk: e.target.value }))} required />
              </div>
            </div>

            {/* Pilih Siswa dengan search */}
            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Label className="text-blue-700 font-semibold text-xs uppercase tracking-wide">Pilih Siswa</Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                  placeholder="Cari nama/NIS siswa..."
                  value={siswaSearch}
                  onChange={e => setSiswaSearch(e.target.value)}
                />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-md bg-white">
                {filteredSiswaForForm.slice(0, 50).map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSiswaChange(s.id)}
                    className={`w-full text-left px-3 py-2 text-sm border-b border-slate-50 hover:bg-blue-50 flex items-center justify-between ${formData.siswa_id === s.id ? 'bg-blue-100 font-semibold' : ''}`}
                  >
                    <span>{s.nama}</span>
                    <span className="text-xs text-slate-400">{s.nama_kelas}</span>
                  </button>
                ))}
                {filteredSiswaForForm.length === 0 && <p className="text-center text-sm text-slate-400 py-3">Tidak ditemukan</p>}
              </div>
              {formData.nama_siswa && (
                <div className="flex items-center gap-2 p-2 bg-white rounded border">
                  <span className="text-sm font-medium">{formData.nama_siswa}</span>
                  <Badge className="bg-blue-100 text-blue-700 text-xs">{formData.nama_kelas}</Badge>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jam Keluar</Label>
                <Input type="time" value={formData.jam_keluar} onChange={(e) => setFormData(p => ({ ...p, jam_keluar: e.target.value }))} />
              </div>
              <div>
                <Label>Suhu Badan (°C)</Label>
                <Input value={formData.suhu_badan} onChange={(e) => setFormData(p => ({ ...p, suhu_badan: e.target.value }))} placeholder="36.5" />
              </div>
            </div>

            <div>
              <Label>Keluhan <span className="text-red-500">*</span></Label>
              <KeluhanPicker value={formData.keluhan} onChange={handleKeluhanChange} />
            </div>

            {triaseCfg && (
              <div className={`p-3 rounded-lg border flex items-center gap-2 ${triaseCfg.color}`}>
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${triaseCfg.dot}`} />
                <div>
                  <p className="text-xs font-bold">{triaseCfg.label}</p>
                  {formData.indikator_triase && <p className="text-xs mt-0.5">{formData.indikator_triase}</p>}
                </div>
              </div>
            )}

            <div>
              <Label>Diagnosa Awal</Label>
              <Textarea value={formData.diagnosa} onChange={(e) => setFormData(p => ({ ...p, diagnosa: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Penanganan</Label>
              <Textarea value={formData.penanganan} onChange={(e) => setFormData(p => ({ ...p, penanganan: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Di UKS">Di UKS</SelectItem>
                  <SelectItem value="Kembali ke Kelas">Kembali ke Kelas</SelectItem>
                  <SelectItem value="Pulang">Pulang</SelectItem>
                  <SelectItem value="Tindakan Klinik">Tindakan Klinik</SelectItem>
                  <SelectItem value="Tindakan IGD">Tindakan IGD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Keterangan</Label>
              <Textarea value={formData.keterangan} onChange={(e) => setFormData(p => ({ ...p, keterangan: e.target.value }))} rows={2} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
              <Button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700">
                {editing ? 'Simpan Perubahan' : 'Tambah Kunjungan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SiswaLulusRecordsDialog
        open={lulusOpen}
        onOpenChange={setLulusOpen}
        entityName="UKS"
        queryKey="uks-lulus"
        title="Data UKS Siswa Lulus/Keluar"
        extraColumns={[
          { key: 'keluhan', label: 'Keluhan', render: (row) => <span className="max-w-xs truncate block">{row.keluhan}</span> },
          { key: 'status', label: 'Status' },
        ]}
      />

      {waTarget && (
        <WaSendDialog
          open={!!waTarget}
          onOpenChange={(open) => !open && setWaTarget(null)}
          targets={waTarget.targets}
          message={waTarget.message}
          onSent={() => queryClient.invalidateQueries({ queryKey: ['uks'] })}
        />
      )}
    </div>
  );
}