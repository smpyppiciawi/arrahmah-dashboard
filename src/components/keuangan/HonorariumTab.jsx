import React, { useState } from 'react';
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
import { Plus, Trash2, Award, UserCheck } from "lucide-react";

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function HonorariumTab() {
  const queryClient = useQueryClient();
  const [golonganDialog, setGolonganDialog] = useState(false);
  const [detailGuru, setDetailGuru] = useState(null);
  const [golonganForm, setGolonganForm] = useState({ nama_golongan: '', nominal: '', keterangan: '' });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.filter({ status: 'Aktif' }),
  });

  const { data: golonganList = [] } = useQuery({
    queryKey: ['golongan'],
    queryFn: () => base44.entities.Golongan.list('nama_golongan'),
  });

  const createGolongan = useMutation({
    mutationFn: (data) => base44.entities.Golongan.create({ ...data, nominal: Number(data.nominal) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['golongan'] });
      setGolonganForm({ nama_golongan: '', nominal: '', keterangan: '' });
      setGolonganDialog(false);
      toast({ title: "Golongan ditambahkan" });
    },
  });

  const deleteGolongan = useMutation({
    mutationFn: (id) => base44.entities.Golongan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['golongan'] }),
  });

  const updateGuruGolongan = useMutation({
    mutationFn: ({ guruId, data }) => base44.entities.Guru.update(guruId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guru'] });
      setDetailGuru(null);
      toast({ title: "Golongan pegawai diperbarui" });
    },
  });

  const handleSetGolongan = (golonganId) => {
    const gol = golonganList.find(g => g.id === golonganId);
    if (gol && detailGuru) {
      updateGuruGolongan.mutate({
        guruId: detailGuru.id,
        data: {
          golongan_id: gol.id,
          nama_golongan: gol.nama_golongan,
          nominal_gaji: gol.nominal,
        },
      });
    }
  };

  const guruColumns = [
    {
      key: 'nama', label: 'Nama Pegawai',
      render: (row) => (
        <button onClick={() => setDetailGuru(row)} className="text-blue-600 hover:underline font-medium text-left">
          {row.nama}
        </button>
      )
    },
    { key: 'nip', label: 'NIP', render: (row) => row.nip || '-' },
    { key: 'jabatan', label: 'Jabatan', render: (row) => <Badge variant="outline">{row.jabatan}</Badge> },
    {
      key: 'nama_golongan', label: 'Golongan',
      render: (row) => row.nama_golongan
        ? <Badge className="bg-purple-100 text-purple-700">{row.nama_golongan}</Badge>
        : <span className="text-slate-400 text-sm">Belum diatur</span>
    },
    {
      key: 'nominal_gaji', label: 'Nominal Gaji',
      render: (row) => <span className="font-medium text-teal-600">{row.nominal_gaji ? formatRupiah(row.nominal_gaji) : '-'}</span>
    },
  ];

  const golonganColumns = [
    { key: 'nama_golongan', label: 'Nama Golongan', render: (row) => <span className="font-medium">{row.nama_golongan}</span> },
    { key: 'nominal', label: 'Nominal', render: (row) => <span className="font-medium text-teal-600">{formatRupiah(row.nominal)}</span> },
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

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-500" /> Daftar Golongan Honorarium
          </CardTitle>
          <Button onClick={() => setGolonganDialog(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> Tambah Golongan
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable columns={golonganColumns} data={golonganList} pageSize={10} />
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-500" /> Daftar Pegawai & Golongan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-3">Klik nama pegawai untuk mengatur golongan honorarium</p>
          <DataTable columns={guruColumns} data={guruList} pageSize={10} />
        </CardContent>
      </Card>

      <Dialog open={golonganDialog} onOpenChange={setGolonganDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Golongan Honorarium</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createGolongan.mutate(golonganForm); }} className="space-y-4">
            <div>
              <Label>Nama Golongan</Label>
              <Input value={golonganForm.nama_golongan} onChange={(e) => setGolonganForm({ ...golonganForm, nama_golongan: e.target.value })} placeholder="Contoh: Golongan I, Golongan II" required />
            </div>
            <div>
              <Label>Nominal Gaji (Rp)</Label>
              <RupiahInput value={golonganForm.nominal} onChange={(val) => setGolonganForm({ ...golonganForm, nominal: val })} placeholder="0" required />
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

      <Dialog open={!!detailGuru} onOpenChange={(open) => !open && setDetailGuru(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atur Golongan Honorarium</DialogTitle>
          </DialogHeader>
          {detailGuru && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-semibold text-slate-800">{detailGuru.nama}</p>
                <p className="text-sm text-slate-500">NIP: {detailGuru.nip || '-'}</p>
                <p className="text-sm text-slate-500">Jabatan: {detailGuru.jabatan}</p>
                {detailGuru.nama_golongan && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-700">{detailGuru.nama_golongan}</Badge>
                    <span className="text-sm font-medium text-teal-600">{formatRupiah(detailGuru.nominal_gaji)}</span>
                  </div>
                )}
              </div>
              <div>
                <Label>Pilih Golongan</Label>
                <Select onValueChange={handleSetGolongan}>
                  <SelectTrigger><SelectValue placeholder={detailGuru.nama_golongan || "Pilih golongan"} /></SelectTrigger>
                  <SelectContent>
                    {golonganList.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.nama_golongan} — {formatRupiah(g.nominal)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {detailGuru.nama_golongan && (
                <Button
                  variant="outline"
                  className="w-full text-red-500"
                  onClick={() => {
                    updateGuruGolongan.mutate({
                      guruId: detailGuru.id,
                      data: { golongan_id: '', nama_golongan: '', nominal_gaji: 0 },
                    });
                  }}
                >
                  Hapus Penetapan Golongan
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}