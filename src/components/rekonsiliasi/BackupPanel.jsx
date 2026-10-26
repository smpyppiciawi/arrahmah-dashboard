import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { DatabaseBackup, Loader2, ExternalLink, FileCheck2 } from 'lucide-react';

export default function BackupPanel() {
  const [hasil, setHasil] = useState(null);

  const { data: logs = [] } = useQuery({
    queryKey: ['ekspor-backup-log'],
    queryFn: async () => {
      const page = await base44.entities.EksporBackupLog.filter({}, { sort: '-created_date', limit: 5 });
      return page.items || [];
    },
  });

  const ekspor = async () => {
    const t = toast({ title: 'Ekspor berjalan', description: 'Mengunduh, menghash, dan mengunggah data ke Google Drive…' });
    try {
      const res = await base44.functions.invoke('eksporBackup', {});
      setHasil(res);
      toast({ title: 'Ekspor selesai', description: `${res.jumlah_entitas} entitas · ${res.total_record.toLocaleString('id-ID')} record · manifest SHA-256 tervalidasi.` });
    } catch (err) {
      toast({ title: 'Ekspor gagal', description: err.message, variant: 'destructive' });
    } finally {
      t.dismiss?.();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <DatabaseBackup className="w-4 h-4 text-teal-600" /> Ekspor & Backup Terverifikasi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Data JSON per entitas + manifest hash SHA-256, disimpan ke Google Drive Anda. Jalankan sebelum migrasi/cutover.
          </p>
        </div>
        <Button onClick={ekspor} className="bg-teal-600 hover:bg-teal-700 flex-shrink-0">
          <DatabaseBackup className="w-4 h-4 mr-2" /> Jalankan Ekspor
        </Button>
      </div>

      {hasil && (
        <div className="mt-3 bg-teal-50 border border-teal-200 rounded-xl p-3 text-sm space-y-1">
          <p className="font-medium text-teal-800 flex items-center gap-1.5"><FileCheck2 className="w-4 h-4" /> Ekspor terakhir: {hasil.jumlah_entitas} entitas · {hasil.total_record.toLocaleString('id-ID')} record</p>
          <p className="text-xs text-teal-700">Manifest SHA-256: <code className="text-[10px] break-all">{hasil.manifest_sha256}</code></p>
          {hasil.manifest_url && (
            <a href={hasil.manifest_url} target="_blank" rel="noreferrer" className="text-xs text-teal-700 underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Buka manifest di Google Drive
            </a>
          )}
          {hasil.gagal?.length > 0 && <p className="text-xs text-amber-700">Gagal: {hasil.gagal.join(' · ')}</p>}
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-3 space-y-1">
          {logs.map(l => (
            <div key={l.id} className="flex items-center gap-2 text-xs text-slate-500">
              <span>{l.tanggal}</span>
              <span>· {l.jumlah_entitas} entitas · {Number(l.total_record || 0).toLocaleString('id-ID')} record</span>
              {l.manifest_url && (
                <a href={l.manifest_url} target="_blank" rel="noreferrer" className="text-blue-600 underline flex items-center gap-0.5">
                  manifest <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}