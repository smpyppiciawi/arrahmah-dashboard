import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MessageCircle, Mail, AlertTriangle, CalendarDays, Bell } from 'lucide-react';

export default function KepsekAlerts({ alerts, onWhatsApp, onEmail }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-800/50 backdrop-blur border border-slate-700 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-slate-200 font-medium text-sm">Tidak ada peringatan</p>
          <p className="text-slate-500 text-xs">Semua kondisi dalam batas normal</p>
        </div>
      </div>
    );
  }

  const getAlertStyle = (severity) => {
    if (severity === 'critical') return { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'text-red-400', iconBg: 'bg-red-500/20' };
    if (severity === 'warning') return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-400', iconBg: 'bg-amber-500/20' };
    return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-400', iconBg: 'bg-blue-500/20' };
  };

  return (
    <div className="rounded-2xl bg-slate-800/50 backdrop-blur border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-100 font-bold text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          Peringatan & Notifikasi ({alerts.length})
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 h-7 text-xs gap-1"
          onClick={() => {
            const summary = alerts.map(a => `• ${a.title}: ${a.person || a.event || ''} ${a.kelas || ''}`).join('\n');
            onEmail('Notifikasi Peringatan Sekolah', `Berikut adalah ringkasan peringatan hari ini:\n\n${summary}`);
          }}
        >
          <Mail className="w-3 h-3" /> Kirim Semua ke Email
        </Button>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {alerts.map((alert, idx) => {
          const style = getAlertStyle(alert.severity);
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-xl ${style.bg} border ${style.border} p-3 flex items-center justify-between gap-2`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-9 h-9 rounded-lg ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <AlertTriangle className={`w-4 h-4 ${style.icon}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-slate-100 text-sm font-medium truncate">{alert.title}</p>
                  <p className="text-slate-400 text-xs truncate">
                    {alert.person || alert.event} {alert.kelas ? `• ${alert.kelas}` : ''} {alert.date ? `• ${alert.date}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {alert.waliPhone && (
                  <button
                    onClick={() => onWhatsApp(alert.waliPhone, `Yth. ${alert.waliName || 'Wali Kelas'},\n\nMenginformasikan mengenai: ${alert.title}\nSiswa: ${alert.person} (${alert.kelas})\n\nMohon tindak lanjutnya. Terima kasih.`)}
                    className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center transition-colors"
                    title={`WA Wali Kelas: ${alert.waliName || ''}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
                {alert.ortuPhone && (
                  <button
                    onClick={() => onWhatsApp(alert.ortuPhone, `Yth. Orang Tua dari ${alert.person},\n\nMenginformasikan mengenai: ${alert.title}\n\nMohon konfirmasi dan tindak lanjutnya. Terima kasih.`)}
                    className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 flex items-center justify-center transition-colors"
                    title="WA Orang Tua"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onEmail(`Notifikasi: ${alert.title}`, `Detail Peringatan:\n\nJenis: ${alert.title}\n${alert.person ? `Siswa: ${alert.person}\n` : ''}${alert.kelas ? `Kelas: ${alert.kelas}\n` : ''}${alert.event ? `Kegiatan: ${alert.event}\n` : ''}${alert.date ? `Tanggal: ${alert.date}\n` : ''}\nMohon perhatian dan tindak lanjutnya.`)}
                  className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 flex items-center justify-center transition-colors"
                  title="Kirim Email"
                >
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