import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useWaliKelas } from '@/hooks/useWaliKelas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import { NotebookPen, ClipboardCheck } from 'lucide-react';
import AgendaFilters from '@/components/agenda/AgendaFilters';
import AgendaJadwalList from '@/components/agenda/AgendaJadwalList';
import AgendaDaftarList from '@/components/agenda/AgendaDaftarList';
import AgendaFormDialog from '@/components/agenda/AgendaFormDialog';
import MonitoringAbsensiTab from '@/components/agenda/MonitoringAbsensiTab';
import {
  todayISO, getHari, getMingguKe, getBulanIndex, legacyMateriToAgenda,
} from '@/lib/agendaUtils';

const FILTER_AWAL = { q: '', hari: 'all', minggu: 'all', bulan: 'all', tahunAjaran: 'all' };

export default function Agenda() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = user?.role;
  const isGuru = role === 'guru';
  const canManageAll = ['admin', 'tu', 'kepsek'].includes(role);

  const [tab, setTab] = useState('agenda');
  const [tanggal, setTanggal] = useState(todayISO());
  const [monTanggal, setMonTanggal] = useState(todayISO());
  const [filters, setFilters] = useState(FILTER_AWAL);
  const [dialog, setDialog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { waliKelasIds, isWaliKelas } = useWaliKelas();

  const { data: pengaturan = [] } = useQuery({
    queryKey: ['pengaturan-aplikasi'],
    queryFn: () => base44.entities.PengaturanAplikasi.list(),
  });
  const tahunAjaranAktif = pengaturan?.[0]?.tahun_ajaran_aktif || '';

  const { data: guruList = [] } = useQuery({
    queryKey: ['guru'],
    queryFn: () => base44.entities.Guru.list('nama'),
    staleTime: 60000,
  });

  const guruData = useMemo(() => {
    if (!isGuru) return null;
    return guruList.find((g) => g.email && g.email === user?.email)
      || guruList.find((g) => g.nama && user?.full_name && g.nama.trim() === user.full_name.trim())
      || null;
  }, [guruList, isGuru, user]);

  const { data: jadwalList = [], isLoading: loadingJadwal } = useQuery({
    queryKey: ['jadwal-pelajaran-all'],
    queryFn: () => base44.entities.JadwalPelajaran.list(),
    staleTime: 60000,
  });

  const { data: pembelajaranGuru = [] } = useQuery({
    queryKey: ['pembelajaran-guru-agenda', guruData?.id],
    queryFn: () => base44.entities.Pembelajaran.filter({ guru_id: guruData.id }),
    enabled: isGuru && !!guruData?.id,
    staleTime: 60000,
  });

  const { data: agendaList = [], isLoading: loadingAgenda } = useQuery({
    queryKey: ['agenda-kelas'],
    queryFn: () => base44.entities.AgendaKelas.list('-tanggal'),
  });

  const { data: materiLama = [] } = useQuery({
    queryKey: ['materi'],
    queryFn: () => base44.entities.Materi.list('-created_date'),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-aktif'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas'],
    queryFn: () => base44.entities.Kelas.list('nama_kelas'),
  });

  const absensiTanggal = dialog ? dialog.tanggal : (tab === 'absensi' ? monTanggal : tanggal);
  const { data: absensiList = [] } = useQuery({
    queryKey: ['absensi-agenda', absensiTanggal],
    queryFn: () => base44.entities.Absensi.filter({ tanggal: absensiTanggal }),
    enabled: !!absensiTanggal,
  });

  const assignedMapel = useMemo(() => {
    const dariPembelajaran = pembelajaranGuru.map((p) => p.mapel).filter(Boolean);
    const dariGuru = guruData?.mapel || [];
    return [...new Set([...dariPembelajaran, ...dariGuru])];
  }, [pembelajaranGuru, guruData]);

  const jumlahSiswaMap = useMemo(
    () => siswaList.reduce((acc, s) => {
      if (s.kelas_id) acc[s.kelas_id] = (acc[s.kelas_id] || 0) + 1;
      return acc;
    }, {}),
    [siswaList],
  );

  const jadwalGuru = useMemo(() => {
    if (!isGuru) return jadwalList;
    if (!guruData) return [];
    const pasangan = new Set(pembelajaranGuru.map((p) => `${p.kelas_id}|${p.mapel}`));
    return jadwalList.filter((j) => j.guru_id === guruData.id || pasangan.has(`${j.kelas_id}|${j.mapel}`));
  }, [jadwalList, isGuru, guruData, pembelajaranGuru]);

  const agendaLookup = useMemo(() => {
    const byJadwal = new Map();
    const byKelas = new Map();
    agendaList.forEach((a) => {
      if (a.jadwal_id) byJadwal.set(`${a.tanggal}|${a.jadwal_id}`, a);
      else byKelas.set(`${a.tanggal}|${a.kelas_id}|${a.mapel}`, a);
    });
    return { byJadwal, byKelas };
  }, [agendaList]);

  const jadwalRows = useMemo(() => {
    const hari = getHari(tanggal);
    const q = filters.q.trim().toLowerCase();
    return jadwalGuru
      .filter((j) => j.hari === hari)
      .filter((j) => !q || [j.nama_kelas, j.mapel, j.nama_guru].some((v) => (v || '').toLowerCase().includes(q)))
      .sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || '') || (a.nama_kelas || '').localeCompare(b.nama_kelas || ''))
      .map((j) => ({
        ...j,
        jumlah_siswa: jumlahSiswaMap[j.kelas_id] || 0,
        agenda: agendaLookup.byJadwal.get(`${tanggal}|${j.id}`)
          || agendaLookup.byKelas.get(`${tanggal}|${j.kelas_id}|${j.mapel}`)
          || null,
      }));
  }, [jadwalGuru, tanggal, filters.q, jumlahSiswaMap, agendaLookup]);

  const daftarAgenda = useMemo(() => {
    const semua = [...agendaList, ...materiLama.map(legacyMateriToAgenda)];
    return semua
      .filter((it) => {
        if (isGuru) {
          const milikGuru = it.legacy
            ? assignedMapel.includes(it.mapel) || (guruData && it.nama_guru === guruData.nama)
            : it.guru_id === guruData?.id || it.created_by_id === user?.id || assignedMapel.includes(it.mapel);
          if (!milikGuru) return false;
        }
        const q = filters.q.trim().toLowerCase();
        if (q && ![it.nama_kelas, it.mapel, it.materi_pokok, it.uraian_kegiatan, it.nama_guru]
          .some((v) => (v || '').toLowerCase().includes(q))) return false;
        if (filters.hari !== 'all' && it.hari !== filters.hari) return false;
        if (filters.minggu !== 'all' && Number(filters.minggu) !== (it.minggu_ke || getMingguKe(it.tanggal))) return false;
        if (filters.bulan !== 'all' && getBulanIndex(it.tanggal) !== Number(filters.bulan)) return false;
        if (filters.tahunAjaran !== 'all' && !it.legacy && (it.tahun_ajaran || '') !== filters.tahunAjaran) return false;
        return true;
      })
      .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  }, [agendaList, materiLama, isGuru, assignedMapel, guruData, user, filters]);

  const tahunAjaranOptions = useMemo(() => {
    const set = new Set(agendaList.map((a) => a.tahun_ajaran).filter(Boolean));
    if (tahunAjaranAktif) set.add(tahunAjaranAktif);
    return [...set].sort().reverse();
  }, [agendaList, tahunAjaranAktif]);

  const canEditItem = (item) => {
    if (canManageAll) return true;
    if (item.legacy) return false;
    if (!isGuru) return false;
    if (item.created_by_id && item.created_by_id === user?.id) return true;
    if (guruData && item.guru_id === guruData.id) return true;
    return assignedMapel.includes(item.mapel);
  };

  const openJadwal = (row) => setDialog({ jadwal: row, agenda: row.agenda, tanggal });
  const openAgendaItem = (item) => setDialog({ jadwal: null, agenda: item, tanggal: item.tanggal });

  const dialogKelasId = dialog?.jadwal?.kelas_id || dialog?.agenda?.kelas_id || '';
  const dialogSiswa = useMemo(
    () => siswaList.filter((s) => s.kelas_id === dialogKelasId).sort((a, b) => (a.nama || '').localeCompare(b.nama || '')),
    [siswaList, dialogKelasId],
  );
  const absensiMapDialog = useMemo(() => {
    const map = {};
    absensiList.forEach((a) => {
      if (a.jenis_absensi === 'Jumat') return;
      if (dialogKelasId && a.kelas_id && a.kelas_id !== dialogKelasId) return;
      map[a.siswa_id] = a.status;
    });
    return map;
  }, [absensiList, dialogKelasId]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.AgendaKelas.delete(deleteTarget.id);
    setDeleteTarget(null);
    queryClient.invalidateQueries({ queryKey: ['agenda-kelas'] });
  };

  const showMonitoring = canManageAll || isWaliKelas;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Agenda Kelas</p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2.5 mt-0.5">
            <NotebookPen className="w-7 h-7 text-indigo-500" />
            Kelola Agenda Kelas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Catat materi, kegiatan KBM, dan absensi agenda sesuai jadwal mengajar.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full max-w-xs">
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            {showMonitoring && (
              <TabsTrigger value="absensi">Absensi</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="agenda" className="pt-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-4">
                <AgendaFilters
                  value={filters}
                  onChange={setFilters}
                  tahunAjaranOptions={tahunAjaranOptions}
                  tanggal={tanggal}
                  onTanggalChange={setTanggal}
                />

                <AgendaJadwalList
                  tanggal={tanggal}
                  rows={jadwalRows}
                  loading={loadingJadwal}
                  guruMissing={isGuru && !guruData}
                  onOpen={openJadwal}
                />

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <h2 className="text-sm font-semibold text-slate-700">Daftar Agenda</h2>
                    <span className="text-xs text-slate-400">{daftarAgenda.length} agenda</span>
                  </div>

                  <AgendaDaftarList
                    items={daftarAgenda}
                    loading={loadingAgenda}
                    onOpen={openAgendaItem}
                    onDelete={setDeleteTarget}
                    canEdit={canEditItem}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {showMonitoring && (
            <TabsContent value="absensi" className="pt-3">
              <MonitoringAbsensiTab
                tanggal={monTanggal}
                onTanggalChange={setMonTanggal}
                kelasList={kelasList}
                defaultKelasIds={waliKelasIds}
                canViewAll={canManageAll}
                siswaList={siswaList}
                agendaList={agendaList}
                absensiList={absensiList}
              />
            </TabsContent>
          )}
        </Tabs>

        {tab === 'agenda' && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-start gap-2 text-xs text-slate-500">
              <ClipboardCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <span>
                Absensi agenda disimpan terpisah dan <strong>tidak mengubah</strong> data Absensi Siswa dari petugas piket.
                Kolom absensi petugas piket hanya sebagai pembanding.
              </span>
            </CardContent>
          </Card>
        )}
      </div>

      {dialog && (
        <AgendaFormDialog
          open={!!dialog}
          onClose={() => setDialog(null)}
          jadwal={dialog.jadwal}
          agenda={dialog.agenda}
          tanggal={dialog.tanggal}
          siswaList={dialogSiswa}
          absensiMap={absensiMapDialog}
          tahunAjaran={tahunAjaranAktif}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['agenda-kelas'] })}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Agenda"
        description={deleteTarget ? `Hapus agenda ${deleteTarget.mapel} kelas ${deleteTarget.nama_kelas} (${deleteTarget.tanggal})?` : ''}
      />
    </div>
  );
}