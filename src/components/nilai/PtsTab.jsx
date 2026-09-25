import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Table2, User, Users, Layers, Search, Printer, Settings2, CalendarDays, Link2, ListChecks, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { buatRaporPtsPdf, buatLeggerPtsPdf, formatTanggalIndo, muatAsetKop } from '@/lib/ptsPdf';
import { normalisasiNama } from '@/lib/mapelTemplate';
import PtsPreviewDialog from '@/components/nilai/PtsPreviewDialog';
import PemetaanMapelDialog from '@/components/nilai/PemetaanMapelDialog';
import PtsStatusMapelView from '@/components/nilai/PtsStatusMapelView';
import PtsProgressDetailDialog from '@/components/nilai/PtsProgressDetailDialog';
import PaginationBar from '@/components/appui/PaginationBar';
import PillTabs from '@/components/appui/PillTabs';
import LeggerDownloadDialog from '@/components/nilai/LeggerDownloadDialog';

const SORT_SISWA = [
  { value: 'nama', label: 'Nama A-Z' },
  { value: 'nama_desc', label: 'Nama Z-A' },
  { value: 'jumlah_desc', label: 'Jumlah Tertinggi' },
  { value: 'rata_desc', label: 'Rata-Rata Tertinggi' },
  { value: 'peringkat_asc', label: 'Peringkat Terbaik' },
];
const SORT_STATUS = [
  { value: 'mapel', label: 'Mapel & Kelas' },
  { value: 'progress_desc', label: 'Progres Tertinggi' },
  { value: 'progress_asc', label: 'Progres Terendah' },
  { value: 'kelas', label: 'Urut Kelas' },
];

export default function PtsTab({ nilaiList, siswaList, kelasList, availableKelas, activeAcademicYear }) {
  const [filterKelas, setFilterKelas] = useState('all');
  const [semester, setSemester] = useState('Ganjil');
  const [tahun, setTahun] = useState(activeAcademicYear || '');
  const [tanggalRapor, setTanggalRapor] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortSiswa, setSortSiswa] = useState('nama');
  const [sortStatus, setSortStatus] = useState('mapel');
  const [subView, setSubView] = useState('siswa');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pemetaanOpen, setPemetaanOpen] = useState(false);
  const [leggerDlOpen, setLeggerDlOpen] = useState(false);
  const [statusDetail, setStatusDetail] = useState(null);
  const [preview, setPreview] = useState(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const canKelola = ['admin', 'tu', 'kepsek'].includes(currentUser?.role);

  const { data: profilList = [] } = useQuery({
    queryKey: ['profil-sekolah'],
    queryFn: () => base44.entities.ProfilSekolah.list(),
    staleTime: 300000,
  });
  const profil = profilList[0];

  const { data: mapelList = [] } = useQuery({
    queryKey: ['mapel-list'],
    queryFn: () => base44.entities.Mapel.list(),
    staleTime: 300000,
  });

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru-list-pts'],
    queryFn: () => base44.entities.Guru.list(),
    staleTime: 300000,
  });

  const { data: pengaturanList = [] } = useQuery({
    queryKey: ['pengaturan-aplikasi'],
    queryFn: () => base44.entities.PengaturanAplikasi.list(),
    staleTime: 60000,
  });
  const kkmPts = Number(pengaturanList[0]?.kkm_pts) || 75;

  const simpanKkmPts = async (v) => {
    const list = await base44.entities.PengaturanAplikasi.list();
    if (list[0]) await base44.entities.PengaturanAplikasi.update(list[0].id, { kkm_pts: v });
    else await base44.entities.PengaturanAplikasi.create({ tahun_ajaran_aktif: activeAcademicYear || '', kkm_pts: v });
    await queryClient.invalidateQueries({ queryKey: ['pengaturan-aplikasi'] });
  };

  const tahunOptions = useMemo(
    () => [...new Set([...kelasList.map(k => k.tahun_ajaran), ...nilaiList.map(n => n.tahun_ajaran)].filter(Boolean))].sort().reverse(),
    [kelasList, nilaiList]
  );

  const labelSemester = semester === 'all' ? 'Ganjil & Genap' : semester;
  const tahunAjaran = tahun || activeAcademicYear || '-';
  const tanggalRaporTeks = formatTanggalIndo(tanggalRapor);

  const ptsRecords = useMemo(
    () => nilaiList
      .filter(n => n.jenis_penilaian === 'PTS' &&
        (!tahun || n.tahun_ajaran === tahun) &&
        (semester === 'all' || n.semester === semester)),
    [nilaiList, tahun, semester]
  );

  // Definisi baris Rapor hasil pemetaan Mapel (label, kelompok, kode legger, urutan)
  const rowsDef = useMemo(() => {
    const byLabel = new Map();
    mapelList.forEach(m => {
      if (!m.nama_di_rapor) return;
      const kelompok = m.kelompok_rapor || 'Nasional';
      const key = `${kelompok}::${m.nama_di_rapor}`;
      if (!byLabel.has(key)) {
        byLabel.set(key, { label: m.nama_di_rapor, kelompok, kode: '', urutan: 99, sources: [] });
      }
      const row = byLabel.get(key);
      row.sources.push(m.nama);
      if (m.kode_legger) row.kode = m.kode_legger;
      if (m.urutan_rapor && m.urutan_rapor < row.urutan) row.urutan = m.urutan_rapor;
    });
    return [...byLabel.values()].sort((a, b) =>
      a.kelompok === b.kelompok
        ? a.urutan - b.urutan
        : (a.kelompok === 'Nasional' ? -1 : 1)
    );
  }, [mapelList]);

  const namaToRow = useMemo(() => {
    const map = new Map();
    rowsDef.forEach(r => r.sources.forEach(n => map.set(normalisasiNama(n), r)));
    return map;
  }, [rowsDef]);

  // Agregasi nilai per siswa berdasarkan baris rapor terpetakan; KKM memakai KKM PTS global
  const dataPerSiswa = useMemo(() => {
    const bySiswa = new Map();
    ptsRecords.forEach(n => {
      const row = namaToRow.get(normalisasiNama(n.mapel));
      if (!row || !n.siswa_id) return;
      if (!bySiswa.has(n.siswa_id)) {
        bySiswa.set(n.siswa_id, { nis: n.nis, nama: n.nama_siswa, kelas_id: n.kelas_id, nama_kelas: n.nama_kelas, byRow: new Map() });
      }
      const rec = bySiswa.get(n.siswa_id);
      if (!rec.byRow.has(row.label)) rec.byRow.set(row.label, { nilai: [] });
      if (n.nilai !== null && n.nilai !== undefined && n.nilai !== '') {
        rec.byRow.get(row.label).nilai.push(Number(n.nilai));
      }
    });

    const hasil = [];
    bySiswa.forEach((rec, siswaId) => {
      const siswa = siswaList.find(s => s.id === siswaId);
      const kelas = kelasList.find(k => k.id === (siswa?.kelas_id || rec.kelas_id));
      const waliNama = kelas?.wali_kelas || '';
      const guru = guruList.find(g => g.nama && waliNama && g.nama.toLowerCase() === waliNama.toLowerCase());

      const rowsNilai = rowsDef.map(r => {
        const agg = rec.byRow.get(r.label);
        const nilai = agg && agg.nilai.length
          ? Math.round((agg.nilai.reduce((a, b) => a + b, 0) / agg.nilai.length) * 10) / 10
          : null;
        return {
          label: r.label, kode: r.kode, nilai, kkm: kkmPts,
          keterangan: nilai === null ? '' : (nilai >= kkmPts ? 'Tuntas' : 'Belum Tuntas'),
        };
      });
      const ada = rowsNilai.filter(r => r.nilai !== null);
      const jumlah = ada.length ? Math.round(ada.reduce((a, r) => a + r.nilai, 0) * 10) / 10 : null;
      const rata = ada.length ? Math.round((jumlah / ada.length) * 100) / 100 : null;
      const predikat = rata === null ? '' : (rata > 80 ? 'Baik' : (rata >= kkmPts ? 'Cukup' : 'Kurang'));

      hasil.push({
        siswa_id: siswaId,
        nama: siswa?.nama || rec.nama,
        nis: siswa?.nis || rec.nis,
        kelas_id: siswa?.kelas_id || rec.kelas_id,
        nama_kelas: kelas?.nama_kelas || siswa?.nama_kelas || rec.nama_kelas,
        wali_kelas: waliNama,
        nuptk_wali: guru?.nip || '',
        rowsNilai,
        rowValues: Object.fromEntries(rowsNilai.map(r => [r.label, { nilai: r.nilai, kkm: r.kkm, keterangan: r.keterangan }])),
        nilaiByRow: Object.fromEntries(rowsNilai.map(r => [r.label, r.nilai])),
        jumlah, rata, predikat,
        peringkat: null, total_siswa: null,
      });
    });

    // Peringkat (rank rata-rata dalam kelas) & total siswa per kelas
    const perKelas = new Map();
    hasil.forEach(s => {
      if (!perKelas.has(s.kelas_id)) perKelas.set(s.kelas_id, []);
      perKelas.get(s.kelas_id).push(s);
    });
    perKelas.forEach(list => {
      const sorted = [...list].sort((a, b) => (b.rata ?? -1) - (a.rata ?? -1));
      let lastRata = null, lastRank = 0;
      sorted.forEach((s, i) => {
        s.peringkat = (s.rata === lastRata) ? lastRank : i + 1;
        lastRata = s.rata;
        lastRank = s.peringkat;
      });
    });
    perKelas.forEach((list, kid) => {
      const total = siswaList.filter(s => s.kelas_id === kid && (s.status || 'Aktif') === 'Aktif').length || list.length;
      list.forEach(s => { s.total_siswa = total; });
    });

    return hasil.sort((a, b) => (a.nama_kelas || '').localeCompare(b.nama_kelas || '') || a.nama.localeCompare(b.nama));
  }, [ptsRecords, siswaList, kelasList, guruList, rowsDef, namaToRow, kkmPts]);

  const perluPemetaan = rowsDef.length === 0;

  /* ===== View 1: Nilai per Siswa — cari, sortir, paginasi ===== */
  const siswaTerfilter = useMemo(
    () => (filterKelas === 'all' ? dataPerSiswa : dataPerSiswa.filter(s => s.kelas_id === filterKelas)),
    [dataPerSiswa, filterKelas]
  );
  const siswaSearched = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return siswaTerfilter.filter(s => !q || s.nama?.toLowerCase().includes(q) || String(s.nis || '').includes(searchQuery));
  }, [siswaTerfilter, searchQuery]);
  const siswaSorted = useMemo(() => {
    const arr = [...siswaSearched];
    switch (sortSiswa) {
      case 'nama_desc': return arr.sort((a, b) => b.nama.localeCompare(a.nama));
      case 'jumlah_desc': return arr.sort((a, b) => (b.jumlah ?? -1) - (a.jumlah ?? -1));
      case 'rata_desc': return arr.sort((a, b) => (b.rata ?? -1) - (a.rata ?? -1));
      case 'peringkat_asc': return arr.sort((a, b) => (a.peringkat ?? 999) - (b.peringkat ?? 999));
      default: return arr.sort((a, b) => a.nama.localeCompare(b.nama));
    }
  }, [siswaSearched, sortSiswa]);
  const totalPagesSiswa = Math.max(1, Math.ceil(siswaSorted.length / pageSize));
  const effPageSiswa = Math.min(page, totalPagesSiswa);
  const pagedSiswa = siswaSorted.slice((effPageSiswa - 1) * pageSize, effPageSiswa * pageSize);

  /* ===== View 2: Status Penilaian Mapel — progres input nilai PTS per kelas ===== */
  const nilaiIdx = useMemo(() => {
    const idx = new Map();
    ptsRecords.forEach(n => {
      if (!n.kelas_id || !n.mapel || !n.siswa_id) return;
      const key = `${n.kelas_id}__${n.mapel}`;
      if (!idx.has(key)) idx.set(key, new Map());
      const m = idx.get(key);
      if (!m.has(n.siswa_id)) m.set(n.siswa_id, []);
      if (n.nilai !== null && n.nilai !== undefined && n.nilai !== '') m.get(n.siswa_id).push(Number(n.nilai));
    });
    return idx;
  }, [ptsRecords]);

  const mapelDbNames = useMemo(
    () => [...new Set(mapelList.map(m => m?.nama).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [mapelList]
  );

  const statusAll = useMemo(() => {
    const kelasIds = filterKelas === 'all' ? availableKelas.map(k => k.id) : [filterKelas];
    const rows = [];
    mapelDbNames.forEach(mapel => {
      kelasIds.forEach(kid => {
        const kelas = kelasList.find(k => k.id === kid);
        const siswaKelas = siswaList.filter(s => s.kelas_id === kid && (s.status || 'Aktif') === 'Aktif');
        const m = nilaiIdx.get(`${kid}__${mapel}`);
        const dinilai = siswaKelas.filter(s => m?.has(s.id)).length;
        rows.push({
          mapel, kelas_id: kid, nama_kelas: kelas?.nama_kelas || '',
          total: siswaKelas.length, dinilai,
          persen: siswaKelas.length ? Math.round(dinilai / siswaKelas.length * 100) : 0,
        });
      });
    });
    return rows;
  }, [mapelDbNames, filterKelas, availableKelas, kelasList, siswaList, nilaiIdx]);

  const statusSearched = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return statusAll.filter(r => !q || r.mapel?.toLowerCase().includes(q) || r.nama_kelas?.toLowerCase().includes(q));
  }, [statusAll, searchQuery]);
  const statusSorted = useMemo(() => {
    const arr = [...statusSearched];
    switch (sortStatus) {
      case 'progress_desc': return arr.sort((a, b) => b.persen - a.persen || a.mapel.localeCompare(b.mapel));
      case 'progress_asc': return arr.sort((a, b) => a.persen - b.persen || a.mapel.localeCompare(b.mapel));
      case 'kelas': return arr.sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas) || a.mapel.localeCompare(b.mapel));
      default: return arr.sort((a, b) => a.mapel.localeCompare(b.mapel) || a.nama_kelas.localeCompare(b.nama_kelas));
    }
  }, [statusSearched, sortStatus]);
  const totalPagesStatus = Math.max(1, Math.ceil(statusSorted.length / pageSize));
  const effPageStatus = Math.min(page, totalPagesStatus);
  const pagedStatus = statusSorted.slice((effPageStatus - 1) * pageSize, effPageStatus * pageSize);

  // Reset halaman saat filter/beralih view berubah
  useEffect(() => { setPage(1); }, [filterKelas, semester, tahun, searchQuery, subView, pageSize]);

  const bukaStatusDetail = (row) => {
    const m = nilaiIdx.get(`${row.kelas_id}__${row.mapel}`) || new Map();
    const siswaKelas = siswaList
      .filter(s => s.kelas_id === row.kelas_id && (s.status || 'Aktif') === 'Aktif')
      .sort((a, b) => a.nama.localeCompare(b.nama))
      .map(s => ({
        siswa_id: s.id, nama: s.nama, nis: s.nis,
        nilai: m.has(s.id) ? Math.round(m.get(s.id).reduce((a, b) => a + b, 0) / m.get(s.id).length * 10) / 10 : null,
      }));
    setStatusDetail({ ...row, siswa: siswaKelas });
  };

  // Preload gambar kop agar PDF pertama tidak menunggu unduhan gambar
  useEffect(() => { muatAsetKop(); }, []);

  const bukaRapor = async (list, filename) => {
    if (perluPemetaan) {
      toast({ title: 'Pemetaan mapel belum diatur', description: 'Atur pemetaan Mapel Database → Mapel Rapor terlebih dahulu.', variant: 'destructive' });
      return;
    }
    if (!list.length) {
      toast({ title: 'Belum ada data', description: 'Tidak ada data nilai PTS sesuai filter yang dipilih.', variant: 'destructive' });
      return;
    }
    const doc = await buatRaporPtsPdf({ profil, siswaList: list, semesterLabel: labelSemester, tahunAjaran, tanggalRapor: tanggalRaporTeks, rows: rowsDef });
    setPreview({ doc, url: doc.output('bloburl'), filename });
  };

  const bukaLegger = async (kelasId) => {
    if (perluPemetaan) {
      toast({ title: 'Pemetaan mapel belum diatur', description: 'Atur pemetaan Mapel Database → Mapel Rapor terlebih dahulu.', variant: 'destructive' });
      return;
    }
    const kelasIds = kelasId ? [kelasId] : [...new Set(dataPerSiswa.map(s => s.kelas_id))];
    if (!kelasIds.length) {
      toast({ title: 'Belum ada data', description: 'Tidak ada data nilai PTS untuk dibuat legger.', variant: 'destructive' });
      return;
    }
    const kelasData = kelasIds.map(kid => {
      const kelas = kelasList.find(k => k.id === kid);
      return {
        nama_kelas: kelas?.nama_kelas || '-',
        wali_kelas: kelas?.wali_kelas || '',
        siswaList: dataPerSiswa.filter(s => s.kelas_id === kid).map(s => ({
          nis: s.nis, nama: s.nama, nilaiByRow: s.nilaiByRow, jumlah: s.jumlah, rata: s.rata,
        })),
      };
    });
    const doc = await buatLeggerPtsPdf({ profil, kelasList: kelasData, rows: rowsDef, semesterLabel: labelSemester, tahunAjaran });
    const nama = kelasId ? (kelasList.find(k => k.id === kelasId)?.nama_kelas || 'Kelas') : 'Semua_Kelas';
    setPreview({ doc, url: doc.output('bloburl'), filename: `Legger_PTS_${String(nama).replace(/\s+/g, '_')}.pdf` });
  };

  const namaFileKelas = (prefix) => `${prefix}_${filterKelas === 'all' ? 'Semua_Kelas' : (kelasList.find(k => k.id === filterKelas)?.nama_kelas || 'Kelas').replace(/\s+/g, '_')}.pdf`;
  const isViewSiswa = subView === 'siswa';

  return (
    <div className="pb-24">
      {/* Pemetaan belum diatur */}
      {perluPemetaan && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm mb-5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Link2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Pemetaan Mapel Rapor belum diatur</p>
                <p className="text-xs text-slate-500">Petakan mapel database ke baris Rapor LHBS & kolom Legger agar dokumen PTS bisa dibuat.</p>
              </div>
            </div>
            {canKelola && (
              <Button size="sm" className="gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0" onClick={() => setPemetaanOpen(true)}>
                <Settings2 className="w-4 h-4" /> Atur Pemetaan
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Kartu ringkasan — dibawah barisan tab menu */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
            <div className="text-slate-500 text-xs mb-1">Data Total Nilai</div>
            <div className="text-2xl font-bold text-slate-800 tabular-nums">{ptsRecords.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Total data nilai PTS terinput</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
            <div className="text-slate-500 text-xs mb-1">Pemetaan Mapel</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-amber-500 tabular-nums">{rowsDef.length}</div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">KKM PTS: {kkmPts}</span>
            </div>
            {canKelola && (
              <button className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 mt-1 inline-flex items-center gap-1" onClick={() => setPemetaanOpen(true)}>
                <Settings2 className="w-3 h-3" /> Atur Pemetaan & KKM
              </button>
            )}
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
            <div className="text-slate-500 text-xs mb-1">Data PTS</div>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">{siswaTerfilter.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Siswa dengan nilai PTS</div>
          </div>
        </div>
      </div>

      {/* Aksi cetak Rapor & Legger */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Rapor LHBS</p>
                <p className="text-xs text-slate-500">Jumlah, rata-rata, predikat & peringkat otomatis</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                  <CalendarDays className="w-3.5 h-3.5" /> Tanggal Rapor
                </label>
                <Input type="date" value={tanggalRapor} onChange={(e) => setTanggalRapor(e.target.value)} className="rounded-xl h-9" />
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => setPickerOpen(true)}>
                  <User className="w-4 h-4" /> Per Siswa
                </Button>
                <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => bukaRapor(siswaTerfilter, namaFileKelas('LHBS_PTS'))}>
                  <Users className="w-4 h-4" /> {filterKelas === 'all' ? 'Semua' : 'Kelas Ini'}
                </Button>
                {filterKelas !== 'all' && (
                  <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => bukaRapor(dataPerSiswa, 'LHBS_PTS_Semua_Kelas.pdf')}>
                    <Layers className="w-4 h-4" /> Semua Kelas
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Table2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Legger PTS</p>
                <p className="text-xs text-slate-500">Daftar nilai per kelas — JML, RATA2 & RANK otomatis</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => bukaLegger(filterKelas === 'all' ? null : filterKelas)}>
                <Printer className="w-4 h-4" /> {filterKelas === 'all' ? 'Legger Semua Kelas' : `Legger Kelas ${kelasList.find(k => k.id === filterKelas)?.nama_kelas || ''}`}
              </Button>
              <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => setLeggerDlOpen(true)}>
                <Download className="w-4 h-4" /> Download Excel/CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar freeze: Cari, Filter, Sortir, Paginasi */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur py-3 space-y-3 mb-4 border-b border-slate-200 shadow-sm">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={isViewSiswa ? 'Cari siswa atau NIS...' : 'Cari mapel atau kelas...'}
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 h-auto rounded-xl bg-white border-slate-300"
            />
          </div>
          {isViewSiswa ? (
            <Select value={sortSiswa} onValueChange={setSortSiswa}>
              <SelectTrigger className="flex-none h-auto rounded-full border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 shadow-sm w-auto"><SelectValue /></SelectTrigger>
              <SelectContent>{SORT_SISWA.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <Select value={sortStatus} onValueChange={setSortStatus}>
              <SelectTrigger className="flex-none h-auto rounded-full border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 shadow-sm w-auto"><SelectValue /></SelectTrigger>
              <SelectContent>{SORT_STATUS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={filterKelas} onValueChange={setFilterKelas}>
            <SelectTrigger className="flex-none h-auto rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm w-auto"><SelectValue placeholder="Kelas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {availableKelas.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="flex-none h-auto rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Ganjil">Semester Ganjil</SelectItem>
              <SelectItem value="Genap">Semester Genap</SelectItem>
              <SelectItem value="all">Semua Semester</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tahun} onValueChange={setTahun}>
            <SelectTrigger className="flex-none h-auto rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm w-auto"><SelectValue placeholder="Tahun Ajaran" /></SelectTrigger>
            <SelectContent>{tahunOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <div className="ml-auto">
            <PaginationBar
              page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize}
              total={isViewSiswa ? siswaSorted.length : statusSorted.length}
            />
          </div>
        </div>
      </div>

      {/* Dua tampilan daftar data */}
      <PillTabs
        tabs={[
          { key: 'siswa', label: 'Nilai per Siswa', icon: User },
          { key: 'status', label: 'Status Penilaian Mapel', icon: ListChecks },
        ]}
        activeKey={subView}
        onChange={setSubView}
        tint="amber"
        className="mb-4"
      />

      {isViewSiswa ? (
        pagedSiswa.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">Belum ada data nilai PTS</p>
              <p className="text-slate-400 text-sm mt-1">{perluPemetaan ? 'Atur pemetaan mapel terlebih dahulu.' : 'Input nilai dengan jenis penilaian PTS terlebih dahulu.'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {pagedSiswa.map(s => (
              <Card key={s.siswa_id} className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{s.nama}</p>
                      <p className="text-xs text-slate-500">NIS {s.nis || '-'} • Kelas {s.nama_kelas || '-'}</p>
                      {s.rata != null && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Rata-rata {s.rata} • Predikat {s.predikat} • Peringkat {s.peringkat} dari {s.total_siswa}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 flex-shrink-0" onClick={() => bukaRapor([s], `LHBS_PTS_${String(s.nama).replace(/\s+/g, '_')}.pdf`)}>
                      <FileText className="w-4 h-4" /> Rapor
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {s.rowsNilai.map(m => (
                      <span key={m.label} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                        m.keterangan === 'Tuntas' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : m.keterangan === 'Belum Tuntas' ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        {m.label}: {m.nilai ?? '-'}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <PtsStatusMapelView rows={pagedStatus} onDetail={bukaStatusDetail} />
      )}

      {/* Dialog pilih siswa untuk rapor */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Pilih Siswa</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {siswaSorted.map(s => (
              <button
                key={s.siswa_id}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                onClick={() => { setPickerOpen(false); bukaRapor([s], `LHBS_PTS_${String(s.nama).replace(/\s+/g, '_')}.pdf`); }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.nama}</p>
                  <p className="text-xs text-slate-500">{s.nama_kelas} • {s.rowsNilai.filter(r => r.nilai !== null).length} mapel</p>
                </div>
                <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
              </button>
            ))}
            {siswaSorted.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">Tidak ada siswa sesuai pencarian.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PemetaanMapelDialog open={pemetaanOpen} onOpenChange={setPemetaanOpen} mapelList={mapelList} kkmPts={kkmPts} onSaveKkm={simpanKkmPts} />
      <LeggerDownloadDialog
        open={leggerDlOpen}
        onOpenChange={setLeggerDlOpen}
        availableKelas={availableKelas}
        kelasList={kelasList}
        dataPerSiswa={dataPerSiswa}
        rowsDef={rowsDef}
        semesterLabel={labelSemester}
        tahunAjaran={tahunAjaran}
        initialKelas={filterKelas}
      />
      <PtsProgressDetailDialog open={!!statusDetail} onOpenChange={(v) => !v && setStatusDetail(null)} detail={statusDetail} />
      <PtsPreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}