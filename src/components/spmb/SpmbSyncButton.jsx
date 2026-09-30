import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Download } from 'lucide-react';

export default function SpmbSyncButton() {
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('syncSpmb', {});
      const d = res.data || {};
      await qc.invalidateQueries({ queryKey: ['SiswaSPMB'] });
      qc.invalidateQueries({ queryKey: ['Keuangan'] });
      toast({
        title: 'Sinkronisasi selesai',
        description: `${d.pendaftar || 0} pendaftar diperiksa — ${d.dibuat || 0} baru, ${d.pembayaran_baru || 0} pembayaran baru${d.errors?.length ? ` (${d.errors.length} galat)` : ''}.`,
      });
    } catch (e) {
      toast({
        title: 'Gagal menarik data SPMB',
        description: String(e?.response?.data?.error || e?.message || e),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleSync} disabled={loading} className="gap-2">
      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      Tarik Data SPMB
    </Button>
  );
}