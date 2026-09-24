import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Table2, User, Users, Layers, Search, Printer, Settings2, CalendarDays, Link2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { buatRaporPtsPdf, buatLeggerPtsPdf, formatTanggalIndo } from '@/lib/ptsPdf';
import { normalisasiNama } from '@/lib/mapelTemplate';
import PtsPreviewDialog from '@/components/nilai/PtsPreviewDialog';
import PemetaanMapelDialog from '@/components/nilai/PemetaanMapelDialog';

export default function PtsTab({ nilaiList, siswaList, kelasList, availableKelas, activeAcademicYear }) {
  const [filterKelas, setFilterKelas] = useState('all');
  const [semester, setSemester] = useState('Ganjil');
  const [tahun, setTahun] = useState(activeAcademicYear || '');
  const [tanggalRapor, setTanggalRapor] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pemetaanOpen, setPemetaanOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
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

  // Definisi baris Rapor hasil pemetaan Mapel (label, kelompok, kode legger, urutan).
  // Beberapa mapel database dengan nama_di_rapor sama digabung ke satu baris.
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

  // Agregasi nilai per siswa berdasarkan baris rapor terpetakan
  const dataPerSiswa = useMemo(() => {
    const bySiswa = new Map();
    ptsRecords.forEach(n => {
      const row = namaToRow.get(normalisasiNama(n.mapel));
      if (!row || !n.siswa_id) return;
      if (!bySiswa.has(n.siswa_id)) {
        bySiswa.set(n.siswa_id, { nis: n.nis, nama: n.nama_siswa, kelas_id: n.kelas_id, nama_kelas: n.nama_kelas, byRow: new Map() });
      }
      const rec = bySiswa.get(n.siswa_id);
      if (!rec.byRow.has(row.label)) rec.byRow.set(row.label, { nilai: [], kkm: Number(n.kkm) || 75 });
      const agg = rec.byRow.get(row.label);
      if (n.nilai !== null && n.nilai !== undefined && n.nilai !== '') {
        agg.nilai.push(Number(n.nilai));
        if (n.kkm) agg.kkm = Number(n.kkm);
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
        const kkm = agg?.kkm ?? 75;
        return {
          label: r.label, kode: r.kode, nilai, kkm,
          keterangan: nilai === null ? '' : (nilai >= kkm ? 'Tuntas' : 'Belum Tuntas'),
        };
      });
      const ada = rowsNilai.filter(r => r.nilai !== null);
      const jumlah = ada.length ? Math.round(ada.reduce((a, r) => a + r.nilai, 0) * 10) / 10 : null;
      const rata = ada.length ? Math.round((jumlah / ada.length) * 100) / 100 : null;
      const avgKkm = ada.length ? ada.reduce((a, r) => a + r.kkm, 0) / ada.length : 75;
      const predikat = rata === null ? '' : (rata > 80 ? 'Baik' : (rata >= avgKkm ? 'Cukup' : 'Kurang'));

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
  }, [ptsRecords, siswaList, kelasList, guruList, rowsDef, namaToRow]);

  const siswaTerfilter = useMemo(
    () => (filterKelas === 'all' ? dataPerSiswa : dataPerSiswa.filter(s => s.kelas_id === filterKelas)),
    [dataPerSiswa, filterKelas]
  );

  const perluPemetaan = rowsDef.length === 0;

  const bukaRapor = (list, filename) => {
    if (perluPemetaan) {
      toast({ title: 'Pemetaan mapel belum diatur', description: 'Atur pemetaan Mapel Database → Mapel Rapor terlebih dahulu.', variant: 'destructive' });
      return;
    }
    if (!list.length) {
      toast({ title: 'Belum ada data', description: 'Tidak ada data nilai PTS sesuai filter yang dipilih.', variant: 'destructive' });
      return;
    }
    const doc = buatRaporPtsPdf({ profil, siswaList: list, semesterLabel: labelSemester, tahunAjaran, tanggalRapor: tanggalRaporTeks, rows: rowsDef });
    setPreview({ doc, url: doc.output('bloburl'), filename });
  };

  const bukaLegger = (kelasId) => {
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
    const doc = buatLeggerPtsPdf({ profil, kelasList: kelasData, rows: rowsDef, semesterLabel: labelSemester, tahunAjaran });
    const nama = kelasId ? (kelasList.find(k => k.id === kelasId)?.nama_kelas || 'Kelas') : 'Semua_Kelas';
    setPreview({ doc, url: doc.output('bloburl'), filename: `Legger_PTS_${String(nama).replace(/\s+/g, '_')}.pdf` });
  };

  const pickerList = siswaTerfilter.filter(s =>
    s.nama?.toLowerCase().includes(searchQuery.toLowerCase()) || String(s.nis || '').includes(searchQuery)
  );

  const namaFileKelas = (prefix, suffix) => `${prefix}_${filterKelas === 'all' ? 'Semua_Kelas' : (kelasList.find(k => k.id === filterKelas)?.nama_kelas || 'Kelas').replace(/\s+/g, '_')}${suffix}`;

  return (
    <div className="space-y-5 pb-24">
      {/* Pemetaan belum diatur */}
      {perluPemetaan && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
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

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
        {canKelola && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => setPemetaanOpen(true)}>
              <Settings2 className="w-4 h-4" /> Pemetaan Mapel Rapor
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select value={filterKelas} onValueChange={setFilterKelas}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Kelas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {availableKelas.map(k => <SelectItem key={k.id} value={k.id}>{k.nama_kelas}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Semester" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Ganjil">Semester Ganjil</SelectItem>
              <SelectItem value="Genap">Semester Genap</SelectItem>
              <SelectItem value="all">Semua Semester</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tahun} onValueChange={setTahun}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Tahun Ajaran" /></SelectTrigger>
            <SelectContent>
              {tahunOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <div>
            <label className="text-xs text-slate-500 flex items-center gap-1 mb-1">
              <CalendarDays className="w-3.5 h-3.5" /> Tanggal Rapor (tanda tangan)
            </label>
            <Input type="date" value={tanggalRapor} onChange={(e) => setTanggalRapor(e.target.value)} className="rounded-xl" />
          </div>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {[
            { label: 'Siswa Dengan Nilai PTS', val: siswaTerfilter.length, text: 'text-slate-800', bar: 'bg-blue-500' },
            { label: 'Mapel Terpetakan di Rapor', val: rowsDef.length, text: 'text-amber-500', bar: 'bg-amber-500' },
            { label: 'Total Data PTS', val: ptsRecords.length, text: 'text-emerald-600', bar: 'bg-emerald-500' },
          ].map(s => (
            <div key={s.label} className="min-w-[120px] flex-none bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
              <div className="text-slate-500 text-xs mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.text}`}>{s.val}</div>
              <div className={`mt-2 w-6 h-1 ${s.bar} rounded-full`} />
            </div>
          ))}
        </div>
      </div>

      {/* Aksi Cetak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Rapor LHBS</p>
                <p className="text-xs text-slate-500">Format LHBS — jumlah, rata-rata, predikat & peringkat otomatis</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => setPickerOpen(true)}>
                <User className="w-4 h-4" /> Per Siswa
              </Button>
              <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => bukaRapor(siswaTerfilter, namaFileKelas('LHBS_PTS', '.pdf'))}>
                <Users className="w-4 h-4" /> {filterKelas === 'all' ? 'Semua Kelas' : 'Per Kelas'}
              </Button>
              {filterKelas !== 'all' && (
                <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => bukaRapor(dataPerSiswa, 'LHBS_PTS_Semua_Kelas.pdf')}>
                  <Layers className="w-4 h-4" /> Semua Kelas
                </Button>
              )}
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daftar siswa dengan nilai PTS */}
      <div>
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cari siswa atau NIS..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2.5 h-auto rounded-xl bg-white border-slate-300" />
        </div>
        {pickerList.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">Belum ada data nilai PTS</p>
              <p className="text-slate-400 text-sm mt-1">{perluPemetaan ? 'Atur pemetaan mapel terlebih dahulu.' : 'Input nilai dengan jenis penilaian PTS terlebih dahulu.'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {pickerList.map(s => (
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
        )}
      </div>

      {/* Dialog pilih siswa untuk rapor */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Pilih Siswa</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cari nama atau NIS..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <div className="flex-1 overflow-y-auto mt-2 divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {pickerList.map(s => (
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
          </div>
        </DialogContent>
      </Dialog>

      <PemetaanMapelDialog open={pemetaanOpen} onOpenChange={setPemetaanOpen} mapelList={mapelList} />
      <PtsPreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}