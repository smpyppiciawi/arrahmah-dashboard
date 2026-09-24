import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Table2, User, Users, Layers, Search, Printer } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { buatRaporPtsPdf, buatLeggerPtsPdf } from '@/lib/ptsPdf';
import PtsPreviewDialog from '@/components/nilai/PtsPreviewDialog';

export default function PtsTab({ nilaiList, siswaList, kelasList, availableKelas, activeAcademicYear }) {
  const [filterKelas, setFilterKelas] = useState('all');
  const [semester, setSemester] = useState('Ganjil');
  const [tahun, setTahun] = useState(activeAcademicYear || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const { toast } = useToast();

  const { data: profilList = [] } = useQuery({
    queryKey: ['profil-sekolah'],
    queryFn: () => base44.entities.ProfilSekolah.list(),
    staleTime: 300000,
  });
  const profil = profilList[0];

  const tahunOptions = useMemo(
    () => [...new Set([...kelasList.map(k => k.tahun_ajaran), ...nilaiList.map(n => n.tahun_ajaran)].filter(Boolean))].sort().reverse(),
    [kelasList, nilaiList]
  );

  const labelSemester = semester === 'all' ? 'Ganjil & Genap' : semester;
  const tahunAjaran = tahun || activeAcademicYear || '-';

  const ptsRecords = useMemo(
    () => nilaiList
      .filter(n => n.jenis_penilaian === 'PTS' &&
        (!tahun || n.tahun_ajaran === tahun) &&
        (semester === 'all' || n.semester === semester))
      .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')),
    [nilaiList, tahun, semester]
  );

  const mapels = useMemo(
    () => [...new Set(ptsRecords.map(n => n.mapel).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [ptsRecords]
  );

  // Agregasi per siswa: jika ada beberapa nilai PTS pada mapel yang sama (beda bab), gunakan rata-rata
  const dataPerSiswa = useMemo(() => {
    const bySiswa = new Map();
    ptsRecords.forEach(n => {
      if (!n.siswa_id || !n.mapel) return;
      if (!bySiswa.has(n.siswa_id)) {
        bySiswa.set(n.siswa_id, { nis: n.nis, nama: n.nama_siswa, kelas_id: n.kelas_id, nama_kelas: n.nama_kelas, byMapel: new Map() });
      }
      const rec = bySiswa.get(n.siswa_id);
      if (!rec.byMapel.has(n.mapel)) rec.byMapel.set(n.mapel, { nilai: [], kkm: Number(n.kkm) || 75 });
      if (n.nilai !== null && n.nilai !== undefined && n.nilai !== '') {
        rec.byMapel.get(n.mapel).nilai.push(Number(n.nilai));
      }
    });

    const hasil = [];
    bySiswa.forEach((rec, siswaId) => {
      const siswa = siswaList.find(s => s.id === siswaId);
      const kelas = kelasList.find(k => k.id === (siswa?.kelas_id || rec.kelas_id));
      const mapelNilai = [...rec.byMapel.entries()].map(([mapel, m]) => {
        const nilai = m.nilai.length ? Math.round((m.nilai.reduce((a, b) => a + b, 0) / m.nilai.length) * 10) / 10 : null;
        return { mapel, nilai, kkm: m.kkm, status: nilai === null ? '' : (nilai >= m.kkm ? 'Tuntas' : 'Belum Tuntas') };
      }).sort((a, b) => a.mapel.localeCompare(b.mapel));
      hasil.push({
        siswa_id: siswaId,
        nama: siswa?.nama || rec.nama,
        nis: siswa?.nis || rec.nis,
        kelas_id: siswa?.kelas_id || rec.kelas_id,
        nama_kelas: kelas?.nama_kelas || siswa?.nama_kelas || rec.nama_kelas,
        wali_kelas: kelas?.wali_kelas || '',
        mapelNilai,
      });
    });
    return hasil.sort((a, b) => (a.nama_kelas || '').localeCompare(b.nama_kelas || '') || a.nama.localeCompare(b.nama));
  }, [ptsRecords, siswaList, kelasList]);

  const siswaTerfilter = useMemo(
    () => (filterKelas === 'all' ? dataPerSiswa : dataPerSiswa.filter(s => s.kelas_id === filterKelas)),
    [dataPerSiswa, filterKelas]
  );

  const bukaRapor = (list, filename) => {
    if (!list.length) {
      toast({ title: 'Belum ada data', description: 'Tidak ada data nilai PTS sesuai filter yang dipilih.', variant: 'destructive' });
      return;
    }
    const doc = buatRaporPtsPdf({ profil, siswaList: list, semester: labelSemester, tahunAjaran });
    setPreview({ doc, url: doc.output('bloburl'), filename });
  };

  const bukaLegger = (kelasId) => {
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
          nis: s.nis, nama: s.nama,
          nilaiByMapel: Object.fromEntries(s.mapelNilai.map(m => [m.mapel, m.nilai])),
        })),
      };
    });
    const doc = buatLeggerPtsPdf({ profil, kelasList: kelasData, mapels, semester: labelSemester, tahunAjaran });
    const nama = kelasId ? (kelasList.find(k => k.id === kelasId)?.nama_kelas || 'Kelas') : 'Semua_Kelas';
    setPreview({ doc, url: doc.output('bloburl'), filename: `Legger_PTS_${String(nama).replace(/\s+/g, '_')}.pdf` });
  };

  const pickerList = siswaTerfilter.filter(s =>
    s.nama?.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis?.includes(searchQuery)
  );

  return (
    <div className="space-y-5 pb-24">
      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        </div>
      </div>

      {/* Ringkasan */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {[
            { label: 'Siswa Dengan Nilai PTS', val: siswaTerfilter.length, text: 'text-slate-800', bar: 'bg-blue-500' },
            { label: 'Mata Pelajaran', val: mapels.length, text: 'text-amber-500', bar: 'bg-amber-500' },
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
                <p className="font-semibold text-slate-800">Rapor PTS</p>
                <p className="text-xs text-slate-500">Rapor per siswa — nilai, KKM & status ketuntasan</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => setPickerOpen(true)}>
                <User className="w-4 h-4" /> Per Siswa
              </Button>
              <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => bukaRapor(siswaTerfilter, `Rapor_PTS_Kelas_${filterKelas === 'all' ? 'Semua_Kelas' : (kelasList.find(k => k.id === filterKelas)?.nama_kelas || '').replace(/\s+/g, '_')}.pdf`)}>
                <Users className="w-4 h-4" /> {filterKelas === 'all' ? 'Semua Kelas' : 'Per Kelas'}
              </Button>
              {filterKelas !== 'all' && (
                <Button size="sm" variant="outline" className="gap-2 rounded-full" onClick={() => bukaRapor(dataPerSiswa, 'Rapor_PTS_Semua_Kelas.pdf')}>
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
                <p className="text-xs text-slate-500">Grid seluruh siswa × seluruh mapel per kelas</p>
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
              <p className="text-slate-400 text-sm mt-1">Input nilai dengan jenis penilaian PTS terlebih dahulu.</p>
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
                    </div>
                    <Button size="sm" variant="ghost" className="gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 flex-shrink-0" onClick={() => bukaRapor([s], `Rapor_PTS_${String(s.nama).replace(/\s+/g, '_')}.pdf`)}>
                      <FileText className="w-4 h-4" /> Rapor
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {s.mapelNilai.map(m => (
                      <span key={m.mapel} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                        m.status === 'Tuntas' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : m.status === 'Belum Tuntas' ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        {m.mapel}: {m.nilai ?? '-'}
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
                onClick={() => { setPickerOpen(false); bukaRapor([s], `Rapor_PTS_${String(s.nama).replace(/\s+/g, '_')}.pdf`); }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.nama}</p>
                  <p className="text-xs text-slate-500">{s.nama_kelas} • {s.mapelNilai.length} mapel</p>
                </div>
                <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <PtsPreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}