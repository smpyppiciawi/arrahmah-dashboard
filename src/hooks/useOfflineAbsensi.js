import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { addPending, getAllPending, removePending, savePending } from '@/lib/offlineDB';
import { useToast } from '@/components/ui/use-toast';

/**
 * Offline-first hook for Absensi module.
 * - Queues failed saves to IndexedDB
 * - Sinkron massal (bulk): sedikit panggilan API untuk seluruh antrian, chunk gagal diperiksa ulang per record
 * - Fallback existing_id basi (dihapus pembersihan duplikat): cari (siswa+tanggal+jenis) lalu update/create
 * - Toast hasil sinkron (tombol & auto-sync saat online kembali)
 */
export function useOfflineAbsensi() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Hitung total record tertunda (bukan jumlah batch)
  const refreshCount = useCallback(async () => {
    try {
      const batches = await getAllPending();
      setPendingCount(batches.reduce((n, b) => n + (b.records?.length || 0), 0));
    } catch {
      setPendingCount(0);
    }
  }, []);

  /**
   * Queue a batch of absensi records to IndexedDB.
   * Each record: { payload, existing_id, siswa_id }
   */
  const queueAbsensi = useCallback(
    async (records) => {
      if (!records || records.length === 0) return;
      const batch = {
        id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        records,
        created_at: new Date().toISOString(),
      };
      await addPending(batch);
      await refreshCount();
    },
    [refreshCount]
  );

  const CHUNK = 100;

  /**
   * Sinkron antrian secara massal (bulk): 1-3 panggilan API per kelompok, bukan per record.
   * Record dengan rujukan basi otomatis diarahkan ke pemeriksaan massal (kelas+tanggal+jenis),
   * lalu bulkUpdate yang sudah ada / bulkCreate yang belum. Record yang masih gagal tetap di antrian.
   * opts: { silent } — true untuk auto-sync senyap (mis. saat mount).
   */
  const syncNow = useCallback(async (opts) => {
    const silent = opts === true || opts?.silent === true;
    const batches = await getAllPending();
    const allRecords = batches.flatMap(b => b.records || []);
    const totalPending = allRecords.length;
    if (totalPending === 0) return { totalSynced: 0, failed: 0 };

    setSyncing(true);
    const succeeded = new Set();
    const needsCheck = [];

    // 1. Record dengan rujukan existing_id → bulkUpdate per chunk.
    //    Chunk gagal (kemungkinan ada rujukan basi) → retry per-record; rujukan basi lanjut ke pemeriksaan massal.
    const withExisting = allRecords.filter(r => r.existing_id);
    for (let i = 0; i < withExisting.length; i += CHUNK) {
      const chunk = withExisting.slice(i, i + CHUNK);
      try {
        await base44.entities.Absensi.bulkUpdate(chunk.map(r => ({ id: r.existing_id, ...r.payload })));
        chunk.forEach(r => succeeded.add(r));
      } catch {
        for (const r of chunk) {
          try {
            await base44.entities.Absensi.update(r.existing_id, r.payload);
            succeeded.add(r);
          } catch {
            needsCheck.push(r);
          }
        }
      }
    }

    // 2. Record tanpa rujukan / rujukan basi → cek massal per kelompok (kelas+tanggal+jenis),
    //    lalu bulkUpdate yang sudah ada dan bulkCreate yang belum.
    const noExisting = allRecords.filter(r => !r.existing_id);
    const groups = {};
    [...needsCheck, ...noExisting].forEach(r => {
      const g = `${r.payload.kelas_id}|${r.payload.tanggal}|${r.payload.jenis_absensi || 'Kehadiran'}`;
      (groups[g] = groups[g] || []).push(r);
    });

    for (const groupRecords of Object.values(groups)) {
      // Dedup antrian: siswa dengan >1 record tertunda → pakai yang terakhir, yang lama dianggap tergantikan
      const seen = new Map();
      groupRecords.forEach(r => {
        const prev = seen.get(r.siswa_id);
        if (prev) succeeded.add(prev);
        seen.set(r.siswa_id, r);
      });
      const uniq = [...seen.values()];
      const sample = uniq[0].payload;

      let existingList = [];
      try {
        existingList = await base44.entities.Absensi.filter({
          kelas_id: sample.kelas_id,
          tanggal: sample.tanggal,
          jenis_absensi: sample.jenis_absensi || 'Kehadiran',
        });
      } catch {
        continue; // kelompok ini tetap di antrian
      }

      const bySiswa = new Map(existingList.map(a => [a.siswa_id, a]));
      const toUpdate = [];
      const toCreate = [];
      uniq.forEach(r => {
        const found = bySiswa.get(r.siswa_id);
        if (found) toUpdate.push({ rec: r, id: found.id });
        else toCreate.push(r);
      });

      for (let i = 0; i < toUpdate.length; i += CHUNK) {
        const chunk = toUpdate.slice(i, i + CHUNK);
        try {
          await base44.entities.Absensi.bulkUpdate(chunk.map(({ rec, id }) => ({ id, ...rec.payload })));
          chunk.forEach(({ rec }) => succeeded.add(rec));
        } catch { /* tetap di antrian */ }
      }
      for (let i = 0; i < toCreate.length; i += CHUNK) {
        const chunk = toCreate.slice(i, i + CHUNK);
        try {
          await base44.entities.Absensi.bulkCreate(chunk.map(r => r.payload));
          chunk.forEach(r => succeeded.add(r));
        } catch { /* tetap di antrian */ }
      }
    }

    // Perbarui antrian per batch: hapus batch yang habis, simpan sisa record yang masih gagal
    for (const batch of batches) {
      const recs = batch.records || [];
      const remaining = recs.filter(r => !succeeded.has(r));
      if (remaining.length === 0) {
        await removePending(batch.id);
      } else if (remaining.length !== recs.length) {
        await savePending({ ...batch, records: remaining });
      }
    }

    const totalSynced = succeeded.size;
    const failed = totalPending - totalSynced;
    await refreshCount();
    if (totalSynced > 0) {
      queryClient.invalidateQueries({ queryKey: ['absensi'] });
    }
    setSyncing(false);

    if (!silent) {
      if (failed === 0) {
        toast({ title: '✅ Sinkronisasi Selesai', description: `${totalSynced} absensi berhasil disinkronkan.` });
      } else {
        toast({
          title: '⚠️ Sinkronisasi Selesai Sebagian',
          description: `${totalSynced} tersinkron, ${failed} record masih gagal — periksa koneksi atau data absensi sudah berubah.`,
          variant: 'destructive',
          duration: 5000,
        });
      }
    }

    return { totalSynced, failed };
  }, [refreshCount, queryClient, toast]);

  useEffect(() => {
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync (dengan umpan balik) saat kembali online
      syncNow();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Coba auto-sync senyap saat mount jika online dan ada antrian
    if (navigator.onLine) {
      getAllPending().then((items) => {
        if (items.length > 0) syncNow({ silent: true });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshCount, syncNow]);

  return { pendingCount, syncing, isOnline, queueAbsensi, syncNow, refreshCount };
}