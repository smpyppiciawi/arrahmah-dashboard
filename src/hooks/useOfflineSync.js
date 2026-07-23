import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'pending_homevisits';

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadPending = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  }, []);

  const updatePending = useCallback((visits) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
    setPendingCount(visits.length);
  }, []);

  const addPending = useCallback((data) => {
    const pending = loadPending();
    pending.push({ id: `draft_${Date.now()}`, data, created_at: new Date().toISOString() });
    updatePending(pending);
  }, [loadPending, updatePending]);

  const syncNow = useCallback(async () => {
    const pending = loadPending();
    if (pending.length === 0) return;
    setSyncing(true);
    const remaining = [];
    let synced = 0;
    for (const item of pending) {
      try {
        await base44.entities.HomeVisit.create(item.data);
        synced++;
      } catch {
        remaining.push(item);
      }
    }
    updatePending(remaining);
    if (synced > 0) {
      queryClient.invalidateQueries({ queryKey: ['homeVisit'] });
    }
    setSyncing(false);
  }, [loadPending, updatePending, queryClient]);

  useEffect(() => {
    setPendingCount(loadPending().length);
    const handleOnline = () => { if (loadPending().length > 0) syncNow(); };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncNow, loadPending]);

  return { pendingCount, syncing, syncNow, addPending };
}