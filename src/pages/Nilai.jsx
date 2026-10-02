import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Plus, Search, TrendingUp, Calculator, CheckCircle, XCircle, Award, Users, User, FileText, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import AnalisisNilai from "@/components/nilai/AnalisisNilai";
import PengelolaanNilai from "@/components/nilai/PengelolaanNilai";
import TkaTab from "@/components/nilai/TkaTab";
import NilaiCardList from "@/components/nilai/NilaiCardList";
import NilaiEditSheet from "@/components/nilai/NilaiEditSheet";
import PtsTab from "@/components/nilai/PtsTab";
import PtsGuruView from "@/components/nilai/PtsGuruView";
import { useToast } from "@/components/ui/use-toast";
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { fetchAllNilai } from '@/lib/nilaiLoad';

// Daftar mapel lama — hanya dipakai sebagai cadangan jika data Mapel kosong
const MAPEL_FALLBACK = [
  "PAI", "Bahasa Indonesia", "Matematika", "IPA", "IPS",
  "Bahasa Inggris", "PJOK", "Seni Musik", "Seni Rupa",
  "Akidah Akhlak", "BTAQ"
];

const TABS = [
  { key: 'input', label: 'Input Nilai', icon: BookOpen },
  { key: 'analisis', label: 'Analisis', icon: TrendingUp },
  { key: 'pengelolaan', label: 'Pengelolaan', icon: Calculator },
  { key: 'pts', label: 'PTS', icon: FileText },
];

export default function Nilai() {
  // Semester aktif tahun ajaran: Juli-Desember = Ganjil, Januari-Juni = Genap (otomatis)
  const semesterAktif = new Date().getMonth() + 1 >= 7 ? 'Ganjil' : 'Genap';
  const [activeTab, setActiveTab] = useState('input');
  const [isOpen, setIsOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [filterMapel, setFilterMapel] = useState('all');
  const [filterJenisPenilaian, setFilterJenisPenilaian] = useState('all');
  const [filterKelasInput, setFilterKelasInput] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [sheetRow, setSheetRow] = useState(null);
  const [kelasInputOpen, setKelasInputOpen] = useState(false);
  const [inputChoiceOpen, setInputChoiceOpen] = useState(false);
  const [kelasFormData, setKelasFormData] = useState({
    kelas_id: '', mapel: '', kategori: '', jenis_penilaian: '',
    semester: semesterAktif, tahun_ajaran: '', nama_guru: ''
  });
  const [kelasNilaiData, setKelasNilaiData] = useState([]);
  const [kelasLabels, setKelasLabels] = useState([]);
  const labelCounterRef = useRef(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeAcademicYear } = useActiveAcademicYear();
  const { data: pengaturanList = [] } = useQuery({ queryKey: ['pengaturan-aplikasi'], queryFn: () => base44.entities.PengaturanAplikasi.list(), staleTime: 300000 });
  const kkmPts = Number(pengaturanList[0]?.kkm_pts) || 75;

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  // Default tahun_ajaran ke tahun ajaran aktif
  useEffect(() => {
    if (activeAcademicYear) {
      setFormData(prev => prev.tahun_ajaran ? prev : { ...prev, tahun_ajaran: activeAcademicYear });
      setKelasFormData(prev => prev.tahun_ajaran ? prev : { ...prev, tahun_ajaran: activeAcademicYear });
    }
  }, [activeAcademicYear]);

  const userRole = currentUser?.role || 'guru';
  const canEdit = ['admin', 'guru', 'tu', 'kepsek', 'operator'].includes(userRole);
  const isGuruRole = userRole === 'guru';

  const [formData, setFormData] = useState({
    siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '',
    mapel: '', semester: semesterAktif, tahun_ajaran: '', kategori: '', jenis_penilaian: '',
    kompetensi_bab: '', nilai: '', kkm: 75, status_ketuntasan: '', nama_guru: ''
  });

  const { data: siswaList = [] } = useQuery({ queryKey: ['siswa'], queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }) });
  const { data: kelasList = [] } = useQuery({ queryKey: ['kelas'], queryFn: () => base44.entities.Kelas.list('nama_kelas') });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list('nama'), staleTime: 60000 });
  const { data: mapelList = [] } = useQuery({ queryKey: ['mapel'], queryFn: () => base44.entities.Mapel.list('nama'), staleTime: 60000 });

  const guruData = guruList.find(g => g.email === currentUser?.email);

  // Akses Tab TKA: Admin/TU/Kepsek, Guru Wali Kelas 9, atau Guru Waka Kurikulum/Kesiswaan
  const tugasTambahanLc = String(guruData?.tugas_tambahan || '').toLowerCase();
  const isWakaTKA = userRole === 'guru' && tugasTambahanLc.includes('waka') && (tugasTambahanLc.includes('kurikulum') || tugasTambahanLc.includes('kesiswaan'));
  const isWaliKelas9TKA = userRole === 'guru' && kelasList.some(k =>
    String(k.nama_kelas || '').trim().startsWith('9') &&
    (k.wali_kelas === guruData?.nama || k.wali_kelas === currentUser?.full_name)
  );
  const canAccessTKA = ['admin', 'tu', 'kepsek'].includes(userRole) || isWakaTKA || isWaliKelas9TKA;
  const tabs = [...TABS, ...(canAccessTKA ? [{ key: 'tka', label: 'TKA', icon: Award }] : [])];

  // Fetch Pembelajaran assignments for guru
  const { data: pembelajaranGuru = [], isSuccess: pembelajaranGuruLoaded } = useQuery({
    queryKey: ['pembelajaran-guru', guruData?.id],
    queryFn: () => base44.entities.Pembelajaran.filter({ guru_id: guruData?.id }),
    enabled: isGuruRole && !!guruData?.id,
    staleTime: 60000,
  });

  const assignedKelasIds = useMemo(() => isGuruRole ? [...new Set(pembelajaranGuru.map(p => p.kelas_id))] : [], [isGuruRole, pembelajaranGuru]);
  const assignedMapel = useMemo(() => isGuruRole ? [...new Set(pembelajaranGuru.map(p => p.mapel))] : [], [isGuruRole, pembelajaranGuru]);
  const availableKelas = isGuruRole ? kelasList.filter(k => assignedKelasIds.includes(k.id)) : kelasList;
  // Daftar mapel dinamis dari data Mapel terdaftar (fallback ke daftar lama jika kosong)
  const daftarMapel = useMemo(() => {
    const nama = [...new Set(mapelList.map(m => m?.nama).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return nama.length > 0 ? nama : MAPEL_FALLBACK;
  }, [mapelList]);
  const availableMapel = isGuruRole ? assignedMapel : daftarMapel;

  // Data Pembelajaran seluruh kelas (untuk auto Nama Guru pada akun non-Guru)
  const { data: pembelajaranAll = [] } = useQuery({
    queryKey: ['pembelajaran-list-pts'],
    queryFn: () => base44.entities.Pembelajaran.list(),
    enabled: !isGuruRole,
    staleTime: 300000,
  });

  // Nama guru pengampu dari pasangan tugas Pembelajaran (kelas + mapel)
  const namaGuruPengampu = (kelasId, mapel) => {
    if (isGuruRole) return guruData?.nama || '';
    const p = pembelajaranAll.find(x => x.kelas_id === kelasId && x.mapel === mapel);
    return p?.nama_guru || '';
  };

  // Mapel yang diampu pada kelas terpilih (akun Guru: hanya pasangan dari Pembelajaran)
  const mapelUntukKelas = (kelasId) => {
    if (!isGuruRole) return daftarMapel;
    if (!kelasId) return assignedMapel;
    return [...new Set(pembelajaranGuru.filter(p => p.kelas_id === kelasId).map(p => p.mapel))];
  };

  const { data: nilaiList = [], isLoading } = useQuery({
    queryKey: ['nilai', currentUser?.email, userRole, assignedKelasIds, assignedMapel],
    queryFn: async () => {
      const all = await fetchAllNilai();
      if (isGuruRole) {
        return all.filter(n => assignedKelasIds.includes(n.kelas_id) && assignedMapel.includes(n.mapel));
      }
      return all;
    },
    // Tunggu data penugasan selesai termuat agar daftar nilai tidak di-fetch dua kali (rate limit)
    enabled: !isGuruRole || (!!currentUser && !!guruData && pembelajaranGuruLoaded),
    staleTime: 60000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Nilai.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['nilai'] }); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Nilai.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['nilai'] }); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Nilai.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['nilai'] }); setDeleteConfirmOpen(false); setDeleteId(null); },
  });

  const resetForm = () => {
    setFormData({ siswa_id: '', nis: '', nama_siswa: '', kelas_id: '', nama_kelas: '', mapel: '', semester: semesterAktif, tahun_ajaran: activeAcademicYear || '', kategori: '', jenis_penilaian: '', kompetensi_bab: '', nilai: '', kkm: 75, status_ketuntasan: '', nama_guru: '' });
    setEditingData(null);
    setIsOpen(false);
  };

  const handleSiswaChange = (siswaId) => {
    const siswa = siswaList.find(s => s.id === siswaId);
    if (!siswa) return;
    // Mapel yang bisa dipilih mengikuti penugasan Pembelajaran di kelas siswa tersebut
    const mapelBoleh = mapelUntukKelas(siswa.kelas_id);
    const mapelDipakai = formData.mapel && mapelBoleh.includes(formData.mapel) ? formData.mapel : '';
    setFormData({
      ...formData, siswa_id: siswaId, nis: siswa.nis, nama_siswa: siswa.nama,
      kelas_id: siswa.kelas_id, nama_kelas: siswa.nama_kelas,
      mapel: mapelDipakai, nama_guru: namaGuruPengampu(siswa.kelas_id, mapelDipakai),
    });
  };

  // Pilihan mapel menentukan Nama Guru otomatis (dari data Pembelajaran)
  const handleMapelChangeSiswa = (mapel) => {
    setFormData(prev => ({ ...prev, mapel, nama_guru: namaGuruPengampu(prev.kelas_id, mapel) }));
  };

  const handleNilaiChange = (nilai) => {
    const numNilai = Number(nilai);
    setFormData({ ...formData, nilai: numNilai, status_ketuntasan: numNilai >= kkmPts ? 'Tuntas' : 'Belum Tuntas' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.siswa_id || !formData.mapel) {
      toast({ title: 'Lengkapi data', description: 'Siswa dan Mata Pelajaran wajib dipilih.', variant: 'destructive' });
      return;
    }
    if (!formData.kategori) {
      toast({ title: 'Kategori Nilai wajib dipilih', description: 'Pilih kategori Nilai Harian atau Nilai Ujian sebelum menyimpan.', variant: 'destructive' });
      return;
    }
    const isHarian = formData.kategori === 'Nilai Harian';
    if (isHarian && !String(formData.kompetensi_bab || '').trim()) {
      toast({ title: 'Label Nilai wajib diisi', description: 'Isi label BAB/materi untuk Nilai Harian (contoh: Nilai BAB 1).', variant: 'destructive' });
      return;
    }
    if (!isHarian && !formData.jenis_penilaian) {
      toast({ title: 'Jenis Penilaian wajib dipilih', description: 'Pilih jenis Nilai Ujian (PTS/PAS/US/UP) sebelum menyimpan.', variant: 'destructive' });
      return;
    }
    const labelHarian = isHarian ? String(formData.kompetensi_bab || '').trim() : '';
    const payload = {
      ...formData,
      jenis_penilaian: isHarian ? 'Harian' : formData.jenis_penilaian,
      kompetensi_bab: labelHarian,
      label: labelHarian,
      nilai: Number(formData.nilai), kkm: kkmPts, tahun_ajaran: formData.tahun_ajaran || activeAcademicYear || '',
    };
    if (editingData) updateMutation.mutate({ id: editingData.id, data: payload });
    else createMutation.mutate(payload);
  };

  const handleEdit = (data) => {
    setEditingData(data);
    setFormData({
      ...data, nama_guru: data.nama_guru || '',
      kategori: data.kategori || (['Harian', 'Ulangan Harian', 'Tugas', 'Praktik'].includes(data.jenis_penilaian) ? 'Nilai Harian' : 'Nilai Ujian'),
    });
    setIsOpen(true);
  };

  // Simpan dari Bottom Sheet (edit cepat nilai)
  const handleSheetSave = (nilai) => {
    if (!sheetRow) return;
    const numNilai = Number(nilai);
    updateMutation.mutate({
      id: sheetRow.id,
      data: { ...sheetRow, nilai: numNilai, status_ketuntasan: numNilai >= kkmPts ? 'Tuntas' : 'Belum Tuntas' }
    });
    setSheetRow(null);
  };

  /* ===== Input Per Kelas: nilai tersimpan otomatis terisi kembali saat kombinasi sama dibuka ===== */
  const comboKey = [kelasFormData.kategori, kelasFormData.jenis_penilaian, kelasFormData.kelas_id, kelasFormData.mapel, kelasFormData.semester, kelasFormData.tahun_ajaran || activeAcademicYear || ''].join('|');
  const lastComboRef = useRef('');
  const isHarianKategori = kelasFormData.kategori === 'Nilai Harian';

  const existingForCombo = useMemo(() => {
    if (!kelasFormData.kategori) return [];
    const jenisList = isHarianKategori ? ['Harian', 'Ulangan Harian', 'Tugas', 'Praktik'] : [kelasFormData.jenis_penilaian];
    if (!jenisList[0]) return [];
    return nilaiList.filter(n =>
      n.kelas_id === kelasFormData.kelas_id && n.mapel === kelasFormData.mapel &&
      jenisList.includes(n.jenis_penilaian) && n.semester === kelasFormData.semester &&
      (n.tahun_ajaran || '') === (kelasFormData.tahun_ajaran || activeAcademicYear || ''));
  }, [nilaiList, isHarianKategori, kelasFormData]);

  useEffect(() => {
    if (!kelasFormData.kelas_id || !kelasFormData.kategori) { setKelasLabels([]); setKelasNilaiData([]); return; }
    const samaCombo = comboKey === lastComboRef.current;
    if (!samaCombo) {
      lastComboRef.current = comboKey;
      const labelServer = [...new Set(existingForCombo.map(n => (n.kompetensi_bab || n.label || 'Nilai Harian')))];
      setKelasLabels(isHarianKategori ? labelServer.map(t => ({ id: t, text: t })) : []);
    }
    const kelas = kelasList.find(k => k.id === kelasFormData.kelas_id);
    const roster = siswaList.filter(s => s.kelas_id === kelasFormData.kelas_id).sort((a, b) => a.nama.localeCompare(b.nama));
    setKelasNilaiData(prev => roster.map(s => {
      // Pertahankan nilai yang sedang diedit (belum disimpan) bila kombinasi tidak berubah
      if (samaCombo) {
        const lama = prev.find(x => x.siswa_id === s.id);
        if (lama) return lama;
      }
      const existing = {};
      existingForCombo.filter(n => n.siswa_id === s.id).forEach(n => {
        const lid = isHarianKategori ? (n.kompetensi_bab || n.label || 'Nilai Harian') : 'ujian';
        existing[lid] = { id: n.id, nilai: n.nilai };
      });
      return { siswa_id: s.id, nis: s.nis, nama_siswa: s.nama, nama_kelas: kelas?.nama_kelas || '', values: {}, existing };
    }));
  }, [comboKey, existingForCombo, siswaList, kelasList, kelasFormData.kelas_id, kelasFormData.kategori, isHarianKategori]);

  const handleKelasChange = (kelasId) => {
    setKelasFormData(prev => ({ ...prev, kelas_id: kelasId, mapel: '', nama_guru: '' }));
  };

  const handleMapelChange = (mapel) => {
    setKelasFormData(prev => ({ ...prev, mapel, nama_guru: namaGuruPengampu(prev.kelas_id, mapel) }));
  };

  // Fitur Tambah Nilai: menambah kolom label Nilai Harian (teks bebas per BAB/materi)
  const tambahLabel = () => {
    labelCounterRef.current += 1;
    setKelasLabels(prev => [...prev, { id: `baru${labelCounterRef.current}`, text: `Nilai BAB ${prev.length + 1}` }]);
  };
  const ubahLabel = (id, text) => setKelasLabels(prev => prev.map(l => l.id === id ? { ...l, text } : l));
  const hapusLabel = (id) => {
    if (kelasNilaiData.some(r => r.existing[id])) {
      toast({ title: 'Kolom tidak bisa dihapus', description: 'Kolom ini sudah punya nilai tersimpan. Hapus lewat daftar nilai terlebih dahulu.', variant: 'destructive' });
      return;
    }
    setKelasLabels(prev => prev.filter(l => l.id !== id));
    setKelasNilaiData(prev => prev.map(r => { const v = { ...r.values }; delete v[id]; return { ...r, values: v }; }));
  };
  const setNilaiCell = (siswaId, labelId, nilai) => setKelasNilaiData(prev => prev.map(r => r.siswa_id === siswaId ? { ...r, values: { ...r.values, [labelId]: nilai } } : r));

  const handleKelasSubmit = async (e) => {
    e.preventDefault();
    if (!kelasFormData.kelas_id || !kelasFormData.mapel || !kelasFormData.kategori) {
      toast({ title: 'Lengkapi data', description: 'Kelas, Mata Pelajaran & Kategori Nilai wajib dipilih.', variant: 'destructive' });
      return;
    }
    if (!isHarianKategori && !kelasFormData.jenis_penilaian) {
      toast({ title: 'Jenis Penilaian wajib dipilih', description: 'Pilih jenis Nilai Ujian (PTS/PAS/US/UP) sebelum menyimpan.', variant: 'destructive' });
      return;
    }
    const finalTahunAjaran = kelasFormData.tahun_ajaran || activeAcademicYear || '';
    const namaGuruFinal = kelasFormData.nama_guru || namaGuruPengampu(kelasFormData.kelas_id, kelasFormData.mapel);
    // Kolom Nilai Harian = label bebas per BAB/materi; Nilai Ujian = satu kolom saja (1 kali pelaksanaan)
    const kolom = (isHarianKategori ? kelasLabels : [{ id: 'ujian', label: '' }])
      .map(k => ({ id: k.id, label: isHarianKategori ? String(k.text || '').trim() : '' }));
    if (isHarianKategori && (kolom.length === 0 || kolom.some(k => !k.label))) {
      toast({ title: 'Label belum lengkap', description: 'Isi label setiap kolom Nilai Harian (contoh: Nilai BAB 1) atau hapus kolom yang kosong.', variant: 'destructive' });
      return;
    }
    const cells = [];
    for (const k of kolom) {
      for (const row of kelasNilaiData) {
        const v = row.values[k.id];
        if (v === '' || v === null || v === undefined) continue;
        cells.push({ row, k, nilai: Number(v) });
      }
    }
    if (!cells.length) {
      toast({ title: 'Tidak ada nilai terisi', description: 'Isi nilai siswa yang ingin disimpan — sel kosong dilewati.', variant: 'destructive' });
      return;
    }
    // Guard anti simpan ganda: cek ulang keberadaan record kombinasi sama di server
    const existingServer = await base44.entities.Nilai.filter({
      kelas_id: kelasFormData.kelas_id, mapel: kelasFormData.mapel,
      jenis_penilaian: isHarianKategori ? 'Harian' : kelasFormData.jenis_penilaian,
      semester: kelasFormData.semester, tahun_ajaran: finalTahunAjaran,
    });
    const byKeyServer = new Map(existingServer.map(n => [`${n.siswa_id}|${n.kompetensi_bab || ''}`, n]));
    const toCreate = [], toUpdate = [];
    const usedTarget = new Set();
    for (const c of cells) {
      const key = `${c.row.siswa_id}|${c.k.label}`;
      const server = byKeyServer.get(key);
      const existingRec = c.row.existing[c.k.id];
      const targetId = server?.id || existingRec?.id || null;
      if (targetId && usedTarget.has(targetId)) continue;
      if (targetId) usedTarget.add(targetId);
      const status = Number(c.nilai) >= kkmPts ? 'Tuntas' : 'Belum Tuntas';
      const payload = {
        kategori: kelasFormData.kategori,
        jenis_penilaian: isHarianKategori ? 'Harian' : kelasFormData.jenis_penilaian,
        kompetensi_bab: c.k.label, label: c.k.label,
        semester: kelasFormData.semester, tahun_ajaran: finalTahunAjaran,
        kkm: kkmPts, nama_guru: namaGuruFinal,
        nilai: Number(c.nilai), status_ketuntasan: status,
      };
      if (targetId) toUpdate.push({ id: targetId, ...payload });
      else toCreate.push({
        ...payload, siswa_id: c.row.siswa_id, nis: c.row.nis,
        nama_siswa: c.row.nama_siswa, nama_kelas: c.row.nama_kelas,
      });
    }
    if (toCreate.length) await base44.entities.Nilai.bulkCreate(toCreate);
    if (toUpdate.length) await base44.entities.Nilai.bulkUpdate(toUpdate);
    queryClient.invalidateQueries({ queryKey: ['nilai'] });
    toast({ title: 'Nilai tersimpan', description: `${toCreate.length} nilai baru, ${toUpdate.length} nilai diperbarui.` });
    setKelasInputOpen(false);
    setKelasFormData({ kelas_id: '', mapel: '', kategori: '', jenis_penilaian: '', semester: semesterAktif, tahun_ajaran: activeAcademicYear || '', nama_guru: '' });
    setKelasLabels([]);
    setKelasNilaiData([]);
  };

  const filteredData = nilaiList.filter(item => {
    const matchSearch = item.nama_siswa?.toLowerCase().includes(searchQuery.toLowerCase()) || item.nis?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKelas = filterKelas === 'all' || item.kelas_id === filterKelas;
    const matchMapel = filterMapel === 'all' || item.mapel === filterMapel;
    const matchJenis = filterJenisPenilaian === 'all' || item.jenis_penilaian === filterJenisPenilaian;
    return matchSearch && matchKelas && matchMapel && matchJenis;
  });

  const totalSiswa = filteredData.length;
  const totalTuntas = filteredData.filter(n => n.status_ketuntasan === 'Tuntas').length;
  const totalBelumTuntas = filteredData.filter(n => n.status_ketuntasan === 'Belum Tuntas').length;
  const persentaseTuntas = totalSiswa > 0 ? ((totalTuntas / totalSiswa) * 100).toFixed(1) : 0;

  const kolomAktif = isHarianKategori ? kelasLabels : [{ id: 'ujian', label: '' }];
  const totalTerisi = kelasNilaiData.reduce((s, r) => s + kolomAktif.filter(k => r.values[k.id] !== '' && r.values[k.id] != null).length, 0);

  const filteredSiswaForInput = (filterKelasInput
    ? siswaList.filter(s => s.kelas_id === filterKelasInput)
    : isGuruRole
      ? siswaList.filter(s => assignedKelasIds.includes(s.kelas_id))
      : siswaList
  ).sort((a, b) => a.nama.localeCompare(b.nama));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header — App Bar Style */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">Nilai Siswa</h1>
              <p className="text-xs text-slate-500 font-medium">Tahun Ajaran {activeAcademicYear || '-'}</p>
            </div>
          </div>

        </div>

        {/* Tab Navigation — grid 2 kolom di mobile agar rapi tanpa geser */}
        <div className="grid grid-cols-2 sm:flex sm:flex-nowrap sm:gap-1.5 gap-2 mb-5 bg-white border border-slate-200 p-1.5 sm:p-1 rounded-2xl shadow-sm sm:w-fit max-w-full">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'analisis' && <AnalisisNilai />}
        {activeTab === 'pengelolaan' && <PengelolaanNilai />}
        {activeTab === 'tka' && <TkaTab userRole={userRole} guruData={guruData} kelasList={kelasList} siswaList={siswaList} currentUser={currentUser} />}
        {activeTab === 'pts' && (isGuruRole
          ? <PtsGuruView activeAcademicYear={activeAcademicYear} />
          : <PtsTab nilaiList={nilaiList} siswaList={siswaList} kelasList={kelasList} availableKelas={availableKelas} activeAcademicYear={activeAcademicYear} />)}

        {activeTab === 'input' && (
          <div className="space-y-5">
            {canEdit && (
              <>
                <Dialog open={kelasInputOpen} onOpenChange={setKelasInputOpen}>
                  <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Input Nilai Per Kelas</DialogTitle></DialogHeader>
                    <form onSubmit={handleKelasSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Kelas</Label>
                          <Select value={kelasFormData.kelas_id} onValueChange={handleKelasChange}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                            <SelectContent>{availableKelas.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Mata Pelajaran</Label>
                          <Select value={kelasFormData.mapel} onValueChange={handleMapelChange}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>{mapelUntukKelas(kelasFormData.kelas_id).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Kategori Nilai</Label>
                          <Select value={kelasFormData.kategori} onValueChange={(v) => setKelasFormData({...kelasFormData, kategori: v, jenis_penilaian: v === 'Nilai Harian' ? 'Harian' : ''})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Nilai Harian">Nilai Harian</SelectItem>
                              <SelectItem value="Nilai Ujian">Nilai Ujian</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Semester (Otomatis)</Label>
                          <Select value={kelasFormData.semester} onValueChange={(v) => setKelasFormData({...kelasFormData, semester: v})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent><SelectItem value="Ganjil">Ganjil</SelectItem><SelectItem value="Genap">Genap</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">KKM (Global)</Label>
                          <Input type="number" value={kkmPts} disabled className="mt-1 text-center bg-slate-50 font-semibold" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Nama Guru</Label>
                          <Input value={kelasFormData.nama_guru} disabled placeholder="Otomatis dari Pembelajaran" className="mt-1 bg-slate-50" />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">{isHarianKategori ? 'Jenis (Otomatis)' : 'Jenis Penilaian Ujian'}</Label>
                          {isHarianKategori ? (
                            <Input value="Harian (per BAB/Materi)" disabled className="mt-1 text-center bg-slate-50" />
                          ) : (
                            <Select value={kelasFormData.jenis_penilaian} onValueChange={(v) => setKelasFormData({...kelasFormData, jenis_penilaian: v})}>
                              <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                              <SelectContent>
                                {['PTS','PAS','US','UP'].map(j => <SelectItem key={j} value={j}>{j === 'US' ? 'US (Ujian Sekolah)' : j === 'UP' ? 'UP (Ujian Praktik)' : j}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Tahun Ajaran</Label>
                          <Select value={kelasFormData.tahun_ajaran} onValueChange={(v) => setKelasFormData({...kelasFormData, tahun_ajaran: v})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>{[...new Set(kelasList.map(k => k.tahun_ajaran).filter(Boolean))].map(ta => <SelectItem key={ta} value={ta}>{ta}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      {kelasNilaiData.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">Daftar Siswa ({kelasNilaiData.length})</p>
                            <p className="text-[11px] text-slate-500">
                              Terisi {totalTerisi} • Tersimpan {kelasNilaiData.filter(i => Object.keys(i.existing).length > 0).length}
                            </p>
                          </div>
                          {isHarianKategori && (
                            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                              <p className="text-[11px] text-slate-500">Label Nilai Harian ({kelasLabels.length}) — teks bebas per BAB/materi</p>
                              <Button type="button" size="sm" variant="outline" onClick={tambahLabel}>
                                <Plus className="w-4 h-4 mr-1" /> Tambah Nilai
                              </Button>
                            </div>
                          )}
                          <div className="max-h-72 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="text-left px-4 py-2 font-semibold text-slate-600 bg-slate-50">Siswa</th>
                                  {kolomAktif.map(k => (
                                    <th key={k.id} className="px-2 py-1.5 min-w-[140px] bg-slate-50">
                                      {isHarianKategori ? (
                                        <div className="flex items-center gap-1">
                                          <Input value={k.text || ''} onChange={(e) => ubahLabel(k.id, e.target.value)} placeholder="Label Nilai" className="h-7 text-xs px-2" />
                                          <button type="button" onClick={() => hapusLabel(k.id)} className="text-slate-300 hover:text-red-500 flex-shrink-0" title="Hapus kolom">
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-xs font-semibold text-slate-600">Nilai {kelasFormData.jenis_penilaian || 'Ujian'}</span>
                                      )}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {kelasNilaiData.map((item) => (
                                  <tr key={item.siswa_id}>
                                    <td className="px-4 py-2 text-sm text-slate-700 truncate max-w-[180px] sticky left-0 bg-white">
                                      {item.nama_siswa}
                                      {Object.keys(item.existing).length > 0 && <CheckCircle className="inline w-3.5 h-3.5 text-emerald-500 ml-1 -mt-0.5" />}
                                    </td>
                                    {kolomAktif.map(k => {
                                      const val = item.values[k.id] ?? item.existing[k.id]?.nilai ?? '';
                                      return (
                                        <td key={k.id} className="px-2 py-1.5">
                                          <Input
                                            type="number" min="0" max="100" placeholder="0"
                                            className={`w-20 text-center h-8 text-sm font-medium ${val !== '' && val != null ? (Number(val) >= kkmPts ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-700') : ''}`}
                                            value={val}
                                            onChange={(e) => setNilaiCell(item.siswa_id, k.id, e.target.value)}
                                          />
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="px-4 py-2 text-[11px] text-slate-400 bg-slate-50 border-t border-slate-100">Baris kosong tidak tersimpan; nilai yang sudah ada otomatis diperbarui saat disimpan.</p>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setKelasInputOpen(false)} className="flex-1">Batal</Button>
                        <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" disabled={totalTerisi === 0}>
                          Simpan Nilai Terisi ({totalTerisi})
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editingData ? 'Edit Nilai' : 'Input Nilai Baru'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label className="text-xs text-slate-500">Filter Kelas</Label>
                        <Select value={filterKelasInput} onValueChange={setFilterKelasInput}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                          <SelectContent>
                            {availableKelas.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Siswa</Label>
                        <Select value={formData.siswa_id} onValueChange={handleSiswaChange}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Siswa" /></SelectTrigger>
                          <SelectContent>
                            {filteredSiswaForInput.map(s => <SelectItem key={s.id} value={s.id}>{s.nama} - {s.nama_kelas}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Mata Pelajaran</Label>
                          <Select value={formData.mapel} onValueChange={handleMapelChangeSiswa}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>{mapelUntukKelas(formData.kelas_id).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Kategori Nilai</Label>
                          <Select value={formData.kategori} onValueChange={(v) => setFormData({...formData, kategori: v, jenis_penilaian: v === 'Nilai Harian' ? 'Harian' : ''})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Nilai Harian">Nilai Harian</SelectItem>
                              <SelectItem value="Nilai Ujian">Nilai Ujian</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Semester (Otomatis)</Label>
                          <Select value={formData.semester} onValueChange={(v) => setFormData({...formData, semester: v})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent><SelectItem value="Ganjil">Ganjil</SelectItem><SelectItem value="Genap">Genap</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Tahun Ajaran</Label>
                          <Select value={formData.tahun_ajaran} onValueChange={(v) => setFormData({...formData, tahun_ajaran: v})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>{[...new Set(kelasList.map(k => k.tahun_ajaran).filter(Boolean))].map(ta => <SelectItem key={ta} value={ta}>{ta}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Nama Guru (Otomatis dari Pembelajaran)</Label>
                        <Input value={formData.nama_guru || ''} disabled placeholder="Otomatis" className="mt-1 bg-slate-50" />
                      </div>
                      {formData.kategori === 'Nilai Harian' && (
                        <div>
                          <Label className="text-xs text-slate-500">Label Nilai (Bebas — mis. Nilai BAB 1, Nilai BAB 2)</Label>
                          <Input className="mt-1" value={formData.kompetensi_bab} onChange={(e) => setFormData({...formData, kompetensi_bab: e.target.value})} placeholder="Contoh: Nilai BAB 1" />
                        </div>
                      )}
                      {formData.kategori === 'Nilai Ujian' && (
                        <div>
                          <Label className="text-xs text-slate-500">Jenis Penilaian Ujian</Label>
                          <Select value={formData.jenis_penilaian} onValueChange={(v) => setFormData({...formData, jenis_penilaian: v})}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>
                              {['PTS','PAS','US','UP'].map(j => <SelectItem key={j} value={j}>{j === 'US' ? 'US (Ujian Sekolah)' : j === 'UP' ? 'UP (Ujian Praktik)' : j}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="grid gap-4 grid-cols-3">
                        <div>
                          <Label className="text-xs text-slate-500">Nilai</Label>
                          <Input type="number" min="0" max="100" value={formData.nilai} onChange={(e) => handleNilaiChange(e.target.value)} required className="mt-1 text-center font-bold text-lg" />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">KKM (Global)</Label>
                          <Input type="number" value={kkmPts} disabled className="mt-1 text-center bg-slate-50 font-semibold" />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Status</Label>
                          <div className={`mt-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold ${
                            formData.status_ketuntasan === 'Tuntas' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : formData.status_ketuntasan === 'Belum Tuntas' ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-50 text-slate-400 border border-slate-200'
                          }`}>
                            {formData.status_ketuntasan === 'Tuntas' ? <CheckCircle className="w-3.5 h-3.5" /> : formData.status_ketuntasan === 'Belum Tuntas' ? <XCircle className="w-3.5 h-3.5" /> : null}
                            {formData.status_ketuntasan || '-'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                        <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
                          {editingData ? 'Simpan' : 'Tambah'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {isGuruRole && assignedKelasIds.length === 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium">Belum ada penugasan pembelajaran</p>
                  <p className="text-slate-400 text-sm mt-1">Hubungi admin untuk penugasan mapel & kelas.</p>
                </CardContent>
              </Card>
            )}

            {/* Ringkasan Data — kartu scroll horizontal */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 mb-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Ringkasan Data</p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x">
                {[
                  { label: 'Total Data', val: totalSiswa, text: 'text-slate-800', bar: 'bg-blue-500' },
                  { label: 'Tuntas', val: totalTuntas, text: 'text-emerald-600', bar: 'bg-emerald-500' },
                  { label: 'Blm Tuntas', val: totalBelumTuntas, text: 'text-red-500', bar: 'bg-red-500' },
                  { label: 'Ketuntasan', val: `${persentaseTuntas}%`, text: 'text-amber-500', bar: 'bg-amber-500' },
                ].map(s => (
                  <div key={s.label} className="min-w-[120px] flex-none bg-white border border-slate-200 rounded-2xl p-3 shadow-sm snap-start">
                    <div className="text-slate-500 text-xs mb-1">{s.label}</div>
                    <div className={`text-2xl font-bold ${s.text}`}>{s.val}</div>
                    <div className={`mt-2 w-6 h-1 ${s.bar} rounded-full`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Pencarian & Filter — sticky, app style */}
            <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur py-3 mb-3 shadow-sm border-b border-slate-200">
              <div className="relative mb-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Cari siswa atau NIS..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2.5 h-auto rounded-xl bg-white border-slate-300" />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <Select value={filterKelas} onValueChange={setFilterKelas}>
                  <SelectTrigger className="flex-none h-auto rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm w-auto">
                    <SelectValue placeholder="Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {availableKelas.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterMapel} onValueChange={setFilterMapel}>
                  <SelectTrigger className="flex-none h-auto rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm w-auto">
                    <SelectValue placeholder="Mapel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Mapel</SelectItem>
                    {availableMapel.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterJenisPenilaian} onValueChange={setFilterJenisPenilaian}>
                  <SelectTrigger className="flex-none h-auto rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm w-auto">
                    <SelectValue placeholder="Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis</SelectItem>
                    {['Harian','PTS','PAS','US','UP'].map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Daftar Siswa — kartu app style */}
            <div className="pb-24">
              <NilaiCardList
                data={filteredData}
                canEdit={canEdit}
                onEdit={(row) => setSheetRow(row)}
              />
            </div>

            <ConfirmDialog
              open={deleteConfirmOpen}
              onOpenChange={setDeleteConfirmOpen}
              onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
              title="Hapus Data Nilai"
              description="Apakah Anda yakin ingin menghapus data nilai ini?"
            />

            {/* Bottom Sheet — Detail & Edit Nilai */}
            <NilaiEditSheet
              row={sheetRow}
              open={!!sheetRow}
              onOpenChange={(v) => !v && setSheetRow(null)}
              onSave={handleSheetSave}
              onDelete={(row) => { setSheetRow(null); setDeleteId(row.id); setDeleteConfirmOpen(true); }}
            />

            {/* Dialog pilih mode input nilai */}
            <Dialog open={inputChoiceOpen} onOpenChange={setInputChoiceOpen}>
              <DialogContent className="w-[95vw] max-w-sm">
                <DialogHeader><DialogTitle>Tambah Nilai</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <button
                    className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-colors text-left"
                    onClick={() => { setInputChoiceOpen(false); resetForm(); setIsOpen(true); }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Input Nilai Per Siswa</p>
                      <p className="text-xs text-slate-500">Tambah nilai untuk satu siswa</p>
                    </div>
                  </button>
                  <button
                    className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-colors text-left"
                    onClick={() => {
                      setInputChoiceOpen(false);
                      setKelasFormData({ kelas_id: '', mapel: '', kategori: '', jenis_penilaian: '', semester: semesterAktif, tahun_ajaran: activeAcademicYear || '', nama_guru: '' });
                      setKelasLabels([]);
                      setKelasNilaiData([]);
                      setKelasInputOpen(true);
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Input Nilai Per Kelas</p>
                      <p className="text-xs text-slate-500">Tambah nilai seluruh siswa satu kelas</p>
                    </div>
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            {/* FAB — Tambah Nilai */}
            {canEdit && (
              <button
                onClick={() => setInputChoiceOpen(true)}
                className="fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-40 w-14 h-14 bg-amber-500 text-white rounded-2xl shadow-[0_8px_16px_rgba(245,158,11,0.35)] flex items-center justify-center active:scale-95 transition-transform"
                title="Tambah Nilai"
              >
                <Plus className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}