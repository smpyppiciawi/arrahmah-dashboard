import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { addPending, getAllPending, removePending, savePending } from '@/lib/offlineDB';
import { useToast } from '@/components/ui/use-toast';

/**
 * Offline-first hook for Absensi module.
 * - Queues failed saves to IndexedDB
 * - Syncs per-record: satu record gagal tidak membatalkan batch lain
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

  // Sinkron satu record: update existing_id; jika rujukan basi, cari (siswa+tanggal+jenis) lalu update/create
  const syncRecord = async (record) => {
    if (record.existing_id) {
      try {
        await base44.entities.Absensi.update(record.existing_id, record.payload);
        return;
      } catch {
        // existing_id sudah tidak ada (mis. dihapus pembersihan duplikat) — fallback pencarian di bawah
      }
    }
    const existingCheck = await base44.entities.Absensi.filter({
      siswa_id: record.siswa_id,
      tanggal: record.payload.tanggal,
      jenis_absensi: record.payload.jenis_absensi || 'Kehadiran',
    });
    if (existingCheck.length > 0) {
      await base44.entities.Absensi.update(existingCheck[0].id, record.payload);
    } else {
      await base44.entities.Absensi.create(record.payload);
    }
  };

  /**
   * Sinkron antrian per-record: record gagal tetap di antrian, record lain tetap tersinkron.
   * opts: { silent } — true untuk auto-sync senyap (mis. saat mount).
   */
  const syncNow = useCallback(async (opts) => {
    const silent = opts === true || opts?.silent === true;
    const batches = await getAllPending();
    const totalPending = batches.reduce((n, b) => n + (b.records?.length || 0), 0);
    if (totalPending === 0) return { totalSynced: 0, failed: 0 };

    setSyncing(true);
    let totalSynced = 0;

    for (const batch of batches) {
      const remaining = [];
      for (const record of batch.records || []) {
        try {
          await syncRecord(record);
          totalSynced++;
        } catch {
          remaining.push(record);
        }
      }
      // Perbarui antrian per batch: hapus batch yang habis, simpan sisa record yang masih gagal
      if (remaining.length === 0) {
        await removePending(batch.id);
      } else if (remaining.length !== (batch.records || []).length) {
        await savePending({ ...batch, records: remaining });
      }
    }

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