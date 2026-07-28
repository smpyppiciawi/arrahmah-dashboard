import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { addPending, getAllPending, removePending, getPendingCount } from '@/lib/offlineDB';

/**
 * Offline-first hook for Absensi module.
 * - Queues failed saves to IndexedDB
 * - Auto-syncs when network recovers
 * - Exposes pending count + online status for UI banners
 */
export function useOfflineAbsensi() {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
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

  const syncNow = useCallback(async () => {
    const batches = await getAllPending();
    if (batches.length === 0) return;

    setSyncing(true);
    let totalSynced = 0;

    for (const batch of batches) {
      try {
        for (const record of batch.records) {
          if (record.existing_id) {
            await base44.entities.Absensi.update(record.existing_id, record.payload);
          } else {
            await base44.entities.Absensi.create(record.payload);
          }
          totalSynced++;
        }
        await removePending(batch.id);
      } catch (err) {
        // Stop on first batch failure — will retry later
        break;
      }
    }

    await refreshCount();
    if (totalSynced > 0) {
      queryClient.invalidateQueries({ queryKey: ['absensi'] });
    }
    setSyncing(false);
    return totalSynced;
  }, [refreshCount, queryClient]);

  useEffect(() => {
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncNow();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Attempt auto-sync on mount if online with pending items
    if (navigator.onLine) {
      getAllPending().then((items) => {
        if (items.length > 0) syncNow();
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshCount, syncNow]);

  return { pendingCount, syncing, isOnline, queueAbsensi, syncNow, refreshCount };
}