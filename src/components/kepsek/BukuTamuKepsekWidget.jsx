import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { BookUser, BellRing } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function BukuTamuKepsekWidget({ tamuList, currentUser, guruList, isDark, t }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayTamu = useMemo(() => (tamuList || []).filter(t => t.tanggal === today), [tamuList, today]);
  const myGuru = useMemo(() => (guruList || []).find(g => (currentUser?.full_name && g.nama === currentUser.full_name) || (currentUser?.email && g.email === currentUser.email)), [guruList, currentUser]);
  const isForMe = (t) => (myGuru && t.ingin_bertemu_pegawai_id === myGuru.id) || (t.ingin_bertemu && currentUser?.full_name && t.ingin_bertemu.toLowerCase() === currentUser.full_name.toLowerCase());
  const forMe = useMemo(() => todayTamu.filter(isForMe), [todayTamu, myGuru, currentUser]);
  const namaTamu = (t) => t.jenis_tamu === 'Tamu Orang Tua/Wali' ? (t.nama_ortu_wali || '-') : (t.nama_lengkap || '-');

  return (
    <div className={`rounded-2xl ${t.card} p-3 md:p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`${t.text} font-bold text-sm flex items-center gap-2`}><BookUser className="w-4 h-4 text-cyan-500" /> Buku Tamu Hari Ini</h3>
        {forMe.length > 0 && <Badge className="bg-cyan-100 text-cyan-700 animate-pulse"><BellRing className="w-3 h-3 mr-1" /> {forMe.length} untuk Anda</Badge>}
      </div>
      {todayTamu.length === 0 ? (
        <p className={`${t.textMuted} text-xs text-center py-6`}>Belum ada tamu tercatat hari ini</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {todayTamu.map(t => {
            const mine = isForMe(t);
            return (
              <div key={t.id} className={`flex items-center justify-between rounded-lg p-2 text-xs ${mine ? (isDark ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200') : (isDark ? 'bg-slate-700/40' : 'bg-slate-50')}`}>
                <div className="min-w-0">
                  <p className={`font-medium truncate ${t.text}`}>{namaTamu(t)}</p>
                  <p className={t.textMuted}>{t.jenis_tamu}{t.ingin_bertemu ? ` · menemui ${t.ingin_bertemu}` : ''}{t.keperluan ? ` · ${t.keperluan}` : ''}</p>
                </div>
                {mine && <Badge className="bg-cyan-100 text-cyan-700 shrink-0">Untuk Anda</Badge>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}