import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { ShieldCheck, Wrench, CheckCircle2, Loader2 } from 'lucide-react';
import { normalizeIuranName, matchIuranItemTransactions } from '@/lib/sppUtils';

const LEVEL_BADGE = {
  fix: 'bg-red-100 text-red-700',
  check: 'bg-amber-100 text-amber-700',
};

const angka = (v) => new Intl.NumberFormat('id-ID').format(v || 0);

export default function PemeriksaanKonsistensi({ activeAcademicYear }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const { data: tarifList = [], isLoading } = useQuery({
    queryKey: ['tarif-iuran'],
    queryFn: () => base44.entities.TarifIuran.list('nama'),
  });
  const { data: keuanganList = [] } = useQuery({
    queryKey: ['keuangan'],
    queryFn: () => base44.entities.Keuangan.list('-tanggal', 3000),
  });
  const { data: biayaKhususList = [] } = useQuery({
    queryKey: ['biaya-khusus'],
    queryFn: () => base44.entities.BiayaKhusus.list(),
  });
  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa'],
    queryFn: () => base44.entities.Siswa.filter({ status: 'Aktif' }),
  });

  const invalidateAll = () => {
    ['tarif-iuran', 'keuangan', 'biaya-khusus', 'keuangan-tunggakan', 'biaya-khusus-siswa'].forEach(key =>
      queryClient.invalidateQueries({ queryKey: [key] })
    );
  };

  const runBulkUpdate = async (entityName, ids, data, label) => {
    setBusy(true);
    try {
      await base44.entities[entityName].bulkUpdate(ids.map(id => ({ id, ...data })));
      invalidateAll();
      toast({ title: label });
    } catch (e) {
      toast({ title: 'Gagal memperbaiki', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  // Perbaikan langsung: isi tahun ajaran / isi NIS
  const doFixRows = async (rows) => {
    setBusy(true);
    try {
      const byType = {};
      rows.forEach(r => { (byType[r.fixType] ||= []).push(r); });
      if (byType['tarif-ta']?.length) {
        await base44.entities.TarifIuran.bulkUpdate(
          byType['tarif-ta'].map(r => ({ id: r.id, tahun_ajaran: activeAcademicYear || '' }))
        );
      }
      if (byType['trans-ta']?.length) {
        await base44.entities.Keuangan.bulkUpdate(
          byType['trans-ta'].map(r => ({ id: r.id, tahun_ajaran: activeAcademicYear || '' }))
        );
      }
      if (byType['trans-nis']?.length) {
        const updates = [];
        byType['trans-nis'].forEach(r => {
          const k = keuanganList.find(x => x.id === r.id);
          const s = k && siswaList.find(x => x.id === k.siswa_id);
          if (s) updates.push({ id: r.id, nis: s.nis, nama_siswa: s.nama, kelas: s.nama_kelas });
        });
        if (updates.length) await base44.entities.Keuangan.bulkUpdate(updates);
      }
      invalidateAll();
      toast({ title: `${rows.length} data berhasil diperbaiki` });
    } catch (e) {
      toast({ title: 'Gagal memperbaiki', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const applyRows = (rows, groupId) => {
    if (groupId === 'tarif-nonaktif') return runBulkUpdate('TarifIuran', rows.map(r => r.id), { status: 'Aktif' }, 'Tarif diaktifkan');
    if (groupId === 'tarif-duplikat') return runBulkUpdate('TarifIuran', rows.map(r => r.id), { status: 'Tidak Aktif' }, 'Tarif duplikat dinonaktifkan');
    return doFixRows(rows);
  };

  const handleFixAll = (group) => {
    const rows = group.rows.filter(r => r.fixType && !r.disabled);
    if (!rows.length) return;
    if (group.id === 'bk-orphan') {
      return setConfirm({
        title: `Hapus ${rows.length} data biaya khusus?`,
        description: 'Data ini menunjuk tarif yang sudah tidak ada dan akan dihapus permanen.',
        run: async () => {
          setBusy(true);
          try {
            for (const r of rows) await base44.entities.BiayaKhusus.delete(r.id);
            invalidateAll();
            toast({ title: `${rows.length} data biaya khusus dihapus` });
          } catch (e) {
            toast({ title: 'Gagal menghapus', description: e?.message, variant: 'destructive' });
          } finally { setBusy(false); setConfirm(null); }
        },
      });
    }
    if (group.confirmAll) {
      return setConfirm({
        title: `Perbaiki ${rows.length} data?`,
        description: 'Perubahan akan diterapkan pada seluruh data dalam kelompok ini.',
        run: () => applyRows(rows, group.id),
      });
    }
    applyRows(rows, group.id);
  };

  const handleFix = (row) => {
    if (row.fixType === 'tarif-aktifkan') {
      return setConfirm({
        title: 'Aktifkan tarif?',
        description: `Tarif "${row.label}" akan diaktifkan kembali dan ikut dihitung dalam tagihan.`,
        run: () => runBulkUpdate('TarifIuran', [row.id], { status: 'Aktif' }, 'Tarif diaktifkan'),
      });
    }
    if (row.fixType === 'tarif-nonaktifkan') {
      return setConfirm({
        title: 'Nonaktifkan tarif?',
        description: `Tarif "${row.label}" akan dinonaktifkan.`,
        run: () => runBulkUpdate('TarifIuran', [row.id], { status: 'Tidak Aktif' }, 'Tarif dinonaktifkan'),
      });
    }
    if (row.fixType === 'bk-hapus') {
      return setConfirm({
        title: 'Hapus data biaya khusus?',
        description: `"${row.label}" akan dihapus permanen.`,
        run: async () => {
          setBusy(true);
          try {
            await base44.entities.BiayaKhusus.delete(row.id);
            invalidateAll();
            toast({ title: 'Data biaya khusus dihapus' });
          } catch (e) {
            toast({ title: 'Gagal menghapus', description: e?.message, variant: 'destructive' });
          } finally { setBusy(false); setConfirm(null); }
        },
      });
    }
    return doFixRows([row]);
  };

  // ===== Pemindaian data master & transaksi =====
  const groups = useMemo(() => {
    const g = [];

    // 1. Tarif tanpa tahun ajaran
    const tarifNoTA = tarifList.filter(t => !t.tahun_ajaran);
    if (tarifNoTA.length) g.push({
      id: 'tarif-ta', level: 'fix',
      judul: 'Tarif iuran tanpa tahun ajaran',
      deskripsi: 'Tarif tanpa tahun ajaran berlaku di semua tahun — hitungan antar tahun bisa tercampur. Klik untuk mengisi tahun ajaran aktif.',
      rows: tarifNoTA.map(t => ({
        id: t.id, label: t.nama, sub: `${t.jenis_iuran || '-'} · ${t.periode} · nominal ${angka(t.nominal)}`,
        fixType: 'tarif-ta', fixLabel: 'Isi TA Aktif',
      })),
    });

    // 2. Transaksi siswa tanpa tahun ajaran
    const transNoTA = keuanganList.filter(k => k.siswa_id && k.jenis === 'Pemasukan' && !k.tahun_ajaran);
    if (transNoTA.length) g.push({
      id: 'trans-ta', level: 'fix',
      judul: 'Transaksi siswa tanpa tahun ajaran',
      deskripsi: 'Transaksi tanpa tahun ajaran dihitung di semua tahun — status bisa meleset. Klik untuk mengisi tahun ajaran aktif.',
      rows: transNoTA.map(k => ({
        id: k.id, label: k.uraian || k.tipe_transaksi || k.tanggal,
        sub: `${k.nama_siswa || '-'} · ${k.tanggal} · ${angka(k.jumlah)}`,
        fixType: 'trans-ta', fixLabel: 'Isi TA Aktif',
      })),
    });

    // 3. Transaksi siswa tanpa NIS
    const transNoNis = keuanganList.filter(k => k.siswa_id && k.jenis === 'Pemasukan' && !k.nis);
    if (transNoNis.length) g.push({
      id: 'trans-nis', level: 'fix',
      judul: 'Transaksi siswa tanpa NIS',
      deskripsi: 'Kolom NIS kosong membuat transaksi sulit dilacak. Klik untuk mengisi otomatis dari data siswa.',
      rows: transNoNis.map(k => {
        const s = siswaList.find(x => x.id === k.siswa_id);
        return {
          id: k.id, label: k.nama_siswa || k.uraian || k.tanggal,
          sub: `${k.tanggal} · ${k.tipe_transaksi || '-'}`,
          fixType: 'trans-nis', fixLabel: 'Isi NIS', disabled: !s,
        };
      }),
    });

    // 4. Tarif non-aktif tapi masih dipakai transaksi
    const usedNonAktif = tarifList
      .filter(t => t.status === 'Tidak Aktif')
      .filter(t => keuanganList.some(k =>
        normalizeIuranName(k.tipe_transaksi) === normalizeIuranName(t.nama) ||
        normalizeIuranName(k.uraian) === normalizeIuranName(t.nama)));
    if (usedNonAktif.length) g.push({
      id: 'tarif-nonaktif', level: 'check', confirmAll: true,
      judul: 'Tarif non-aktif tapi masih dipakai transaksi',
      deskripsi: 'Ada transaksi yang merujuk tarif non-aktif — tagihannya tidak dihitung. Aktifkan kembali bila tarif masih berlaku.',
      rows: usedNonAktif.map(t => ({
        id: t.id, label: t.nama, sub: `${t.jenis_iuran || '-'} · ${t.tahun_ajaran || 'tanpa TA'}`,
        fixType: 'tarif-aktifkan', fixLabel: 'Aktifkan',
      })),
    });

    // 5. Biaya khusus menunjuk tarif yang sudah dihapus
    const bkOrphan = biayaKhususList.filter(b => b.tarif_iuran_id && !tarifList.some(t => t.id === b.tarif_iuran_id));
    if (bkOrphan.length) g.push({
      id: 'bk-orphan', level: 'fix', confirmAll: true,
      judul: 'Biaya khusus menunjuk tarif yang sudah dihapus',
      deskripsi: 'Data ini tidak terbaca dalam hitungan tagihan. Hapus bila tarif memang sudah tidak berlaku.',
      rows: bkOrphan.map(b => ({
        id: b.id, label: `${b.nama_siswa || '-'} · ${b.nama_iuran || '-'}`,
        sub: `${b.nama_kelas || '-'} · nominal ${angka(b.nominal_khusus)}`,
        fixType: 'bk-hapus', fixLabel: 'Hapus',
      })),
    });

    // 6. Duplikat tarif (nama sama per tahun ajaran)
    const seen = new Map();
    const duplikat = [];
    [...tarifList]
      .sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || '')))
      .forEach(t => {
        const key = `${normalizeIuranName(t.nama)}|${t.tahun_ajaran || ''}`;
        if (seen.has(key)) duplikat.push(t);
        else seen.set(key, t);
      });
    if (duplikat.length) g.push({
      id: 'tarif-duplikat', level: 'fix', confirmAll: true,
      judul: 'Duplikat tarif (nama sama per tahun ajaran)',
      deskripsi: 'Nama tarif kembar bisa membuat transaksi terhitung ke item yang salah. Nonaktifkan salah satu bila memang duplikat.',
      rows: duplikat.map(t => ({
        id: t.id, label: t.nama, sub: `${t.jenis_iuran || '-'} · ${t.tahun_ajaran || 'tanpa TA'} · ${angka(t.nominal)}`,
        fixType: 'tarif-nonaktifkan', fixLabel: 'Nonaktifkan',
      })),
    });

    // 7. Siswa tanpa tarif SPP untuk tingkatnya
    const sppAktif = tarifList.filter(t =>
      t.status !== 'Tidak Aktif' && t.periode === 'Bulanan' &&
      (t.jenis_iuran === 'SPP' || (t.nama || '').toLowerCase().includes('spp')));
    const siswaNoSpp = siswaList.filter(s => {
      const tk = s.nama_kelas?.charAt(0) || '';
      return !sppAktif.some(t => {
        const arr = Array.isArray(t.tingkat) ? t.tingkat : (t.tingkat ? [t.tingkat] : ['Semua']);
        return arr.includes('Semua') || arr.includes(tk);
      });
    });
    if (siswaNoSpp.length) g.push({
      id: 'siswa-no-spp', level: 'check',
      judul: 'Siswa tanpa tarif SPP yang berlaku',
      deskripsi: 'Siswa berikut tidak punya tarif SPP bulanan aktif untuk tingkatnya — SPP tidak terhitung. Tambahkan tarif di tab Tarif Iuran.',
      rows: siswaNoSpp.map(s => ({ id: s.id, label: s.nama, sub: `${s.nis || '-'} · ${s.nama_kelas || '-'}` })),
    });

    // 8. Pembayaran nominal nol
    const bayarNol = keuanganList.filter(k => k.jenis === 'Pemasukan' && (!k.jumlah || k.jumlah <= 0));
    if (bayarNol.length) g.push({
      id: 'trans-nol', level: 'check',
      judul: 'Pembayaran dengan nominal nol',
      deskripsi: 'Transaksi pemasukan bernilai 0 kemungkinan salah input. Periksa dan perbaiki lewat menu Transaksi.',
      rows: bayarNol.map(k => ({
        id: k.id, label: k.uraian || k.tipe_transaksi || '-',
        sub: `${k.nama_siswa || '-'} · ${k.tanggal}`,
      })),
    });

    // 9. Transaksi iuran tanpa data siswa
    const namaTarifSet = new Set(tarifList.map(t => normalizeIuranName(t.nama)));
    const transNoSiswa = keuanganList.filter(k =>
      k.jenis === 'Pemasukan' && !k.siswa_id &&
      (namaTarifSet.has(normalizeIuranName(k.tipe_transaksi)) || namaTarifSet.has(normalizeIuranName(k.uraian))));
    if (transNoSiswa.length) g.push({
      id: 'trans-no-siswa', level: 'check',
      judul: 'Transaksi iuran tanpa data siswa',
      deskripsi: 'Transaksi ini merujuk iuran siswa tapi tidak terhubung ke siswa mana pun, sehingga tidak mengurangi tagihan. Catat ulang lewat menu Transaksi dengan memilih siswa.',
      rows: transNoSiswa.map(k => ({
        id: k.id, label: k.uraian || k.tipe_transaksi || '-',
        sub: `${k.tanggal} · ${angka(k.jumlah)}`,
      })),
    });

    // 10. Potensi pembayaran terhitung ganda (sudah bayar manual + transaksi tercatat)
    const keuBySiswa = {};
    keuanganList.forEach(k => {
      if (k.siswa_id && k.jenis !== 'Pengeluaran') (keuBySiswa[k.siswa_id] ||= []).push(k);
    });
    const doubleCount = biayaKhususList.filter(b => {
      if (b.is_gratis || !((b.sudah_bayar || 0) > 0)) return false;
      const tarif = tarifList.find(t => t.id === b.tarif_iuran_id);
      if (!tarif) return false;
      const trans = matchIuranItemTransactions(tarif, keuBySiswa[b.siswa_id] || [], tarifList);
      return trans.reduce((s, k) => s + (k.jumlah || 0), 0) > 0;
    });
    if (doubleCount.length) g.push({
      id: 'bk-double', level: 'check',
      judul: 'Potensi pembayaran terhitung ganda (Biaya Khusus)',
      deskripsi: 'Siswa ini punya isian "Sudah Bayar" manual DAN transaksi tercatat untuk iuran yang sama. Pastikan isian manual hanya berisi pembayaran di luar transaksi — bila sudah termasuk, kosongkan isian manualnya di tab Pilih Siswa.',
      rows: doubleCount.map(b => {
        const tarif = tarifList.find(t => t.id === b.tarif_iuran_id);
        return {
          id: b.id, label: `${b.nama_siswa || '-'} · ${b.nama_iuran || tarif?.nama || '-'}`,
          sub: `Sudah bayar manual: ${angka(b.sudah_bayar)}`,
        };
      }),
    });

    return g;
  }, [tarifList, keuanganList, biayaKhususList, siswaList]);

  const fixable = (group) => group.rows.some(r => r.fixType);

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-white">
        <CardContent className="p-4 flex items-center gap-3">
          <ShieldCheck className="w-9 h-9 text-purple-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-800">Pemeriksaan Konsistensi Data Keuangan</p>
            <p className="text-xs text-slate-500">
              {isLoading ? 'Memuat data...' : groups.length === 0
                ? 'Semua data konsisten — tidak ada masalah ditemukan. Perhitungan transaksi, laporan, dan kelola data sudah sejalan.'
                : `${groups.length} jenis masalah ditemukan. Perbaiki agar hitungan transaksi dan laporan akurat.`}
            </p>
          </div>
        </CardContent>
      </Card>

      {groups.map(group => (
        <Card key={group.id} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-slate-800">{group.judul}</p>
                  <Badge className={LEVEL_BADGE[group.level]}>
                    {group.level === 'fix' ? 'Perlu Perbaikan' : 'Perlu Diperiksa'}
                  </Badge>
                  <Badge variant="outline">{group.rows.length} data</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">{group.deskripsi}</p>
              </div>
              {fixable(group) && (
                <Button
                  size="sm" disabled={busy}
                  onClick={() => handleFixAll(group)}
                  className="bg-purple-600 hover:bg-purple-700 shrink-0"
                >
                  <Wrench className="w-3.5 h-3.5 mr-1" /> Perbaiki Semua
                </Button>
              )}
            </div>
            <div className="mt-3 space-y-1.5">
              {group.rows.slice(0, 8).map(row => (
                <div key={row.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 truncate">{row.label}</p>
                    {row.sub && <p className="text-[11px] text-slate-400 truncate">{row.sub}</p>}
                  </div>
                  {row.fixType && (
                    <Button
                      size="sm" variant="outline" className="h-7 text-xs shrink-0"
                      disabled={busy || row.disabled}
                      onClick={() => handleFix(row)}
                    >
                      {row.fixLabel || 'Perbaiki'}
                    </Button>
                  )}
                </div>
              ))}
              {group.rows.length > 8 && (
                <p className="text-[11px] text-slate-400 pl-2">
                  +{group.rows.length - 8} data lainnya (gunakan Perbaiki Semua)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {!isLoading && groups.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Data keuangan konsisten</p>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        onConfirm={() => confirm?.run?.()}
        title={confirm?.title}
        description={confirm?.description}
      />

      {busy && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 shadow-lg">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memperbaiki data...
        </div>
      )}
    </div>
  );
}