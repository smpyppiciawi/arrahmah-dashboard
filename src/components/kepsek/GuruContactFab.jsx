import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { MessageCircle, Phone, Search } from 'lucide-react';

export default function GuruContactFab({ guruList, onWhatsApp, isDark = true }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = guruList.filter(g => g.status === 'Aktif' && (
    !search || g.nama?.toLowerCase().includes(search.toLowerCase()) || g.jabatan?.toLowerCase().includes(search.toLowerCase())
  ));
  const activeCount = guruList.filter(g => g.status === 'Aktif').length;

  const c = isDark ? {
    fab: 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/40',
    dialog: 'bg-slate-900 border-slate-700',
    text: 'text-slate-100',
    textMuted: 'text-slate-400',
    input: 'bg-slate-800 text-slate-300 border-slate-700',
    item: 'bg-slate-800/50 hover:bg-slate-700/50',
  } : {
    fab: 'bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 shadow-emerald-400/30',
    dialog: 'bg-white border-slate-200',
    text: 'text-slate-800',
    textMuted: 'text-slate-500',
    input: 'bg-white text-slate-700 border-slate-200',
    item: 'bg-slate-50 hover:bg-slate-100',
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className={`fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full ${c.fab} text-white shadow-xl flex items-center justify-center transition-all`}
        title="Kontak Guru & Pegawai"
      >
        <Phone className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
          {activeCount}
        </span>
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`max-w-md max-h-[80vh] overflow-hidden flex flex-col ${c.dialog}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${c.text}`}>
              <Phone className="w-5 h-5 text-emerald-500" /> Kontak Guru & Pegawai
            </DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau jabatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-10 pr-3 py-2 rounded-lg border ${c.input} text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400`}
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filtered.map((guru, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${c.item} transition-colors`}>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${c.text}`}>{guru.nama}</p>
                  <p className={`text-xs ${c.textMuted}`}>{guru.jabatan}{guru.no_telp ? ` • ${guru.no_telp}` : ''}</p>
                </div>
                {guru.no_telp && (
                  <button
                    onClick={() => onWhatsApp(guru.no_telp, `Halo ${guru.nama},`)}
                    className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors flex-shrink-0"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className={`text-center py-8 ${c.textMuted}`}>Tidak ada guru ditemukan</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}