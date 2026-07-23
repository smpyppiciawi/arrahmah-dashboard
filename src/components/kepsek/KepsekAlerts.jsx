import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MessageCircle, Mail, AlertTriangle, Bell } from 'lucide-react';

export default function KepsekAlerts({ alerts, onWhatsApp, onEmail, isDark = true }) {
  const c = isDark ? {
    container: 'bg-slate-800 border border-slate-700',
    text: 'text-slate-100', textMuted: 'text-slate-400',
    empty: 'bg-emerald-500/20', emptyText: 'text-emerald-400',
    btn: 'border-slate-600 text-slate-300 hover:bg-slate-700',
  } : {
    container: 'bg-white border border-slate-200 shadow-sm',
    text: 'text-slate-800', textMuted: 'text-slate-500',
    empty: 'bg-emerald-100', emptyText: 'text-emerald-600',
    btn: 'border-slate-300 text-slate-600 hover:bg-slate-100',
  };

  if (!alerts || alerts.length === 0) {
    return (
      <div className={`rounded-2xl ${c.container} p-3 flex items-center gap-3`}>
        <div className={`w-10 h-10 rounded-full ${c.empty} flex items-center justify-center`}>
          <Bell className={`w-5 h-5 ${c.emptyText}`} />
        </div>
        <div>
          <p className={`${c.text} font-medium text-sm`}>Tidak ada peringatan</p>
          <p className={`${c.textMuted} text-xs`}>Semua kondisi dalam batas normal</p>
        </div>
      </div>
    );
  }

  const getAlertStyle = (severity) => {
    if (severity === 'critical') return { bg: 'bg-red-500/20', border: 'border-red-500/40', icon: 'text-red-400', iconBg: 'bg-red-500/30' };
    if (severity === 'warning') return { bg: 'bg-amber-500/20', border: 'border-amber-500/40', icon: 'text-amber-400', iconBg: 'bg-amber-500/30' };
    return { bg: 'bg-blue-500/20', border: 'border-blue-500/40', icon: 'text-blue-400', iconBg: 'bg-blue-500/30' };
  };

  return (
    <div className={`rounded-2xl ${c.container} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`${c.text} font-bold text-sm flex items-center gap-2`}>
          <AlertTriangle className="w-4 h-4 text-red-400" /> Peringatan & Notifikasi ({alerts.length})
        </h3>
        <Button size="sm" variant="outline" className={`${c.btn} h-7 text-xs gap-1`}
          onClick={() => {
            const summary = alerts.map(a => `• ${a.title}: ${a.person || a.event || ''} ${a.kelas || ''}`).join('\n');
            onEmail('Notifikasi Peringatan Sekolah', `Berikut adalah ringkasan peringatan hari ini:\n\n${summary}`);
          }}>
          <Mail className="w-3 h-3" /> Kirim Semua ke Email
        </Button>
      </div>
      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
        {alerts.map((alert, idx) => {
          const style = getAlertStyle(alert.severity);
          return (
            <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
              className={`rounded-xl ${style.bg} border ${style.border} p-2.5 flex items-center justify-between gap-2`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-9 h-9 rounded-lg ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <AlertTriangle className={`w-4 h-4 ${style.icon}`} />
                </div>
                <div className="min-w-0">
                  <p className={`${c.text} text-sm font-medium truncate`}>{alert.title}</p>
                  <p className={`${c.textMuted} text-xs truncate`}>
                    {alert.person || alert.event} {alert.kelas ? `• ${alert.kelas}` : ''} {alert.date ? `• ${alert.date}` : ''}
                  </p>
                  {alert.poin !== undefined && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">{alert.poin} poin</span>
                      {alert.durasi && alert.durasi !== '-' && <span className="text-[10px] text-slate-400">⏱ {alert.durasi}</span>}
                      {alert.progress && alert.progress !== '-' && <span className="text-[10px] text-slate-400">📊 {alert.progress}</span>}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${alert.status === 'Selesai' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{alert.status}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {alert.waliPhone && (
                  <button onClick={() => onWhatsApp(alert.waliPhone, `Yth. ${alert.waliName || 'Wali Kelas'},\n\nMenginformasikan mengenai: ${alert.title}\nSiswa: ${alert.person} (${alert.kelas})\n\nMohon tindak lanjutnya. Terima kasih.`)}
                    className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center transition-colors" title={`WA Wali Kelas: ${alert.waliName || ''}`}>
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
                {alert.ortuPhone && (
                  <button onClick={() => onWhatsApp(alert.ortuPhone, `Yth. Orang Tua dari ${alert.person},\n\nMenginformasikan mengenai: ${alert.title}\n\nMohon konfirmasi dan tindak lanjutnya. Terima kasih.`)}
                    className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 flex items-center justify-center transition-colors" title="WA Orang Tua">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => onEmail(`Notifikasi: ${alert.title}`, `Detail Peringatan:\n\nJenis: ${alert.title}\n${alert.person ? `Siswa: ${alert.person}\n` : ''}${alert.kelas ? `Kelas: ${alert.kelas}\n` : ''}${alert.event ? `Kegiatan: ${alert.event}\n` : ''}${alert.date ? `Tanggal: ${alert.date}\n` : ''}\nMohon perhatian dan tindak lanjutnya.`)}
                  className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 flex items-center justify-center transition-colors" title="Kirim Email">
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}