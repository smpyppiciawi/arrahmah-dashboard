import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Search, ChevronLeft } from "lucide-react";
import { motion } from 'framer-motion';

export default function KontakOrtuFab({ siswaList }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState(null);

  const getSiswaContacts = (siswa) => {
    const contacts = [];
    if (siswa.kontak_list && siswa.kontak_list.length > 0) {
      siswa.kontak_list.forEach(k => { if (k.no_telp) contacts.push({ no_telp: k.no_telp, hubungan: k.hubungan || 'Ortu' }); });
    }
    if (siswa.no_telp_ortu && !contacts.find(c => c.no_telp === siswa.no_telp_ortu)) {
      contacts.push({ no_telp: siswa.no_telp_ortu, hubungan: 'Ortu' });
    }
    return contacts;
  };

  const openWA = (noTelp) => {
    const cleaned = noTelp.replace(/\D/g, '').replace(/^0/, '62');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  };

  const filtered = siswaList.filter(s =>
    !search || s.nama?.toLowerCase().includes(search.toLowerCase()) || s.nis?.includes(search)
  );

  const contacts = selectedSiswa ? getSiswaContacts(selectedSiswa) : [];

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { setOpen(true); setSelectedSiswa(null); setSearch(''); }}
        className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/40 flex items-center justify-center transition-all"
        title="Kontak Orang Tua Siswa"
      >
        <Phone className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-white text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-bold">
          {siswaList.length}
        </span>
      </motion.button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedSiswa(null); setSearch(''); } }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedSiswa ? (
                <>
                  <button onClick={() => setSelectedSiswa(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <MessageCircle className="w-5 h-5 text-green-500" />
                  Kontak Orang Tua
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5 text-green-500" />
                  Kontak Orang Tua Siswa
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedSiswa ? (
            <div className="space-y-2 overflow-y-auto pr-1">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-bold text-slate-800">{selectedSiswa.nama}</p>
                <p className="text-xs text-slate-500">NIS: {selectedSiswa.nis} • {selectedSiswa.nama_kelas}</p>
              </div>
              {contacts.length > 0 ? contacts.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{c.hubungan}</p>
                    <p className="text-xs text-slate-500">{c.no_telp}</p>
                  </div>
                  <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => openWA(c.no_telp)}>
                    <MessageCircle className="w-4 h-4 mr-1" /> WA
                  </Button>
                </div>
              )) : (
                <p className="text-center text-slate-400 py-8">Tidak ada kontak tersedia untuk siswa ini</p>
              )}
            </div>
          ) : (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau NIS siswa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[50vh]">
                {filtered.map((siswa, i) => {
                  const cs = getSiswaContacts(siswa);
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedSiswa(siswa)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-green-50 border border-slate-200 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-slate-800">{siswa.nama}</p>
                        <p className="text-xs text-slate-500">{siswa.nis}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {cs.length > 0 && (
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                            {cs.length} kontak
                          </span>
                        )}
                        <MessageCircle className={`w-4 h-4 ${cs.length > 0 ? 'text-green-500' : 'text-slate-300'}`} />
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="text-center text-slate-400 py-8">Siswa tidak ditemukan</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}