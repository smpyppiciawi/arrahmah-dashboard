import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check, Loader2, GraduationCap } from "lucide-react";
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';

export default function InputPembelajaranGuru({ open, onOpenChange }) {
  const [selectedGuruId, setSelectedGuruId] = useState('');
  const [rows, setRows] = useState([{ mapel: '', selectedKelas: [] }]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();
  const { activeAcademicYear } = useActiveAcademicYear();

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: mapelList = [] } = useQuery({
    queryKey: ['mapel'],
    queryFn: () => base44.entities.Mapel.list('nama'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: existingPembelajaran = [] } = useQuery({
    queryKey: ['pembelajaran-all'],
    queryFn: () => base44.entities.Pembelajaran.list('-updated_date', 500),
    staleTime: 30000,
    enabled: open,
  });

  const selectedGuru = guruList.find(g => g.id === selectedGuruId);

  const availableMapel = useMemo(() => {
    if (!selectedGuru) return [];
    if (selectedGuru.mapel && selectedGuru.mapel.length > 0) return selectedGuru.mapel;
    return mapelList.map(m => m.nama);
  }, [selectedGuru, mapelList]);

  const sortedKelasList = useMemo(() =>
    [...kelasList].sort((a, b) => {
      const ta = parseInt(a.tingkat) || 0;
      const tb = parseInt(b.tingkat) || 0;
      if (ta !== tb) return ta - tb;
      return (a.nama_kelas || '').localeCompare(b.nama_kelas || '');
    }),
    [kelasList]
  );

  const resetForm = () => {
    setSelectedGuruId('');
    setRows([{ mapel: '', selectedKelas: [] }]);
    setResult(null);
  };

  const addRow = () => setRows([...rows, { mapel: '', selectedKelas: [] }]);
  const removeRow = (index) => setRows(rows.filter((_, i) => i !== index));

  const updateRowMapel = (index, mapel) => {
    setRows(rows.map((r, i) => i === index ? { ...r, mapel } : r));
  };

  const toggleKelas = (index, kelasId) => {
    setRows(rows.map((r, i) => {
      if (i !== index) return r;
      const has = r.selectedKelas.includes(kelasId);
      return {
        ...r,
        selectedKelas: has ? r.selectedKelas.filter(k => k !== kelasId) : [...r.selectedKelas, kelasId]
      };
    }));
  };

  const totalRecords = useMemo(() =>
    rows.reduce((sum, r) => sum + (r.mapel ? r.selectedKelas.length : 0), 0),
    [rows]
  );

  const duplicateWarnings = useMemo(() => {
    if (!selectedGuruId) return [];
    const warnings = [];
    rows.forEach((row, idx) => {
      if (!row.mapel) return;
      row.selectedKelas.forEach(kelasId => {
        const exists = existingPembelajaran.find(p =>
          p.guru_id === selectedGuruId && p.kelas_id === kelasId && p.mapel === row.mapel
        );
        if (exists) {
          const kelas = kelasList.find(k => k.id === kelasId);
          warnings.push(`Baris ${idx + 1}: ${row.mapel} di ${kelas?.nama_kelas} sudah ada`);
        }
      });
    });
    return warnings;
  }, [rows, selectedGuruId, existingPembelajaran, kelasList]);

  const handleSubmit = async () => {
    if (!selectedGuruId || totalRecords === 0) return;
    setSaving(true);
    try {
      const records = [];
      rows.forEach(row => {
        if (!row.mapel) return;
        row.selectedKelas.forEach(kelasId => {
          const exists = existingPembelajaran.find(p =>
            p.guru_id === selectedGuruId && p.kelas_id === kelasId && p.mapel === row.mapel
          );
          if (exists) return;
          const kelas = kelasList.find(k => k.id === kelasId);
          records.push({
            kelas_id: kelasId,
            nama_kelas: kelas?.nama_kelas || '',
            mapel: row.mapel,
            guru_id: selectedGuruId,
            nama_guru: selectedGuru?.nama || '',
            tahun_ajaran: activeAcademicYear || '',
          });
        });
      });

      if (records.length > 0) {
        await base44.entities.Pembelajaran.bulkCreate(records);
        queryClient.invalidateQueries({ queryKey: ['pembelajaran'] });
        queryClient.invalidateQueries({ queryKey: ['pembelajaran-all'] });
      }

      setResult({ created: records.length, skipped: totalRecords - records.length });
      setSelectedGuruId('');
      setRows([{ mapel: '', selectedKelas: [] }]);
    } catch (err) {
      console.error('Error saving pembelajaran:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) { onOpenChange(o); if (!o) resetForm(); } }}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-500" />
            Input Pembelajaran Guru
          </DialogTitle>
        </DialogHeader>

        {/* Guru Selection */}
        <div>
          <Label className="text-sm font-medium">Pilih Guru</Label>
          <Select value={selectedGuruId} onValueChange={(v) => { setSelectedGuruId(v); setRows([{ mapel: '', selectedKelas: [] }]); setResult(null); }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Guru..." /></SelectTrigger>
            <SelectContent>
              {guruList.filter(g => g.jabatan === 'Guru Mata Pelajaran' || g.mapel?.length > 0).map(g => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nama} {g.mapel?.length > 0 && `(${g.mapel.length} mapel)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedGuru && selectedGuru.mapel?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedGuru.mapel.map(m => (
                <Badge key={m} variant="secondary" className="text-xs bg-indigo-50 text-indigo-700">{m}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Mapel + Kelas Rows */}
        {selectedGuruId && (
          <div className="space-y-4 pt-2 border-t">
            {rows.map((row, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700">Mata Pelajaran & Kelas</span>
                  </div>
                  {rows.length > 1 && (
                    <Button size="sm" variant="ghost" className="text-red-500 h-7 w-7 p-0" onClick={() => removeRow(index)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div>
                  <Label className="text-xs text-slate-500">Mata Pelajaran</Label>
                  <Select value={row.mapel} onValueChange={(v) => updateRowMapel(index, v)}>
                    <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Pilih Mapel..." /></SelectTrigger>
                    <SelectContent>
                      {availableMapel.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {row.mapel && (
                  <div>
                    <Label className="text-xs text-slate-500">Centang Kelas yang Diajar</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                      {sortedKelasList.map(kelas => {
                        const isChecked = row.selectedKelas.includes(kelas.id);
                        const alreadyExists = existingPembelajaran.find(p =>
                          p.guru_id === selectedGuruId && p.kelas_id === kelas.id && p.mapel === row.mapel
                        );
                        return (
                          <button
                            key={kelas.id}
                            type="button"
                            onClick={() => toggleKelas(index, kelas.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                              isChecked
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : alreadyExists
                                ? 'border-amber-300 bg-amber-50 text-amber-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span>{kelas.nama_kelas}</span>
                            {alreadyExists && !isChecked && <span className="text-[10px] text-amber-500">ada</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Button variant="outline" onClick={addRow} className="w-full border-dashed">
              <Plus className="w-4 h-4 mr-2" /> Tambah Mapel Lain
            </Button>

            {duplicateWarnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-medium text-amber-700 mb-1">⚠️ Data yang sudah ada (akan dilewati):</p>
                <ul className="text-xs text-amber-600 space-y-0.5">
                  {duplicateWarnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Summary + Actions */}
        {selectedGuruId && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-slate-600">
              Total: <span className="font-bold text-indigo-600">{totalRecords}</span> pemetaan
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>Batal</Button>
              <Button onClick={handleSubmit} disabled={!selectedGuruId || totalRecords === 0 || saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
            <p className="text-emerald-700">✅ <b>{result.created}</b> pemetaan pembelajaran berhasil dibuat.</p>
            {result.skipped > 0 && <p className="text-amber-600 mt-1">⚠️ {result.skipped} data sudah ada, dilewati.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}