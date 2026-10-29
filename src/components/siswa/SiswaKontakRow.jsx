import React from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const hanyaAngka = (v) => String(v || '').replace(/\D/g, '').replace(/^0/, '62');

export function daftarKontak(siswa) {
  const out = [];
  (siswa?.kontak_list || []).forEach((k) => { if (k?.no_telp) out.push({ no_telp: k.no_telp, hubungan: k.hubungan || 'Ortu' }); });
  if (siswa?.no_telp_ortu && !out.find((c) => hanyaAngka(c.no_telp) === hanyaAngka(siswa.no_telp_ortu))) {
    out.push({ no_telp: siswa.no_telp_ortu, hubungan: 'Ortu' });
  }
  return out;
}

// Nomor utama penerima notifikasi gateway: kontak_utama bila ada, jika tidak Ibu → Ayah → Wali → kontak pertama
export function kontakUtama(siswa) {
  const list = daftarKontak(siswa);
  if (siswa?.kontak_utama) {
    const cocok = list.find((c) => hanyaAngka(c.no_telp) === hanyaAngka(siswa.kontak_utama));
    if (cocok) return cocok.no_telp;
  }
  for (const hub of ['Ibu', 'Ayah', 'Wali']) {
    const c = list.find((k) => k.hubungan === hub);
    if (c) return c.no_telp;
  }
  return list[0]?.no_telp || '';
}

export default function SiswaKontakRow({ siswa, onPilih, aktifkan = false, max = 3 }) {
  const contacts = daftarKontak(siswa).slice(0, max);
  const utama = kontakUtama(siswa);

  if (contacts.length === 0) {
    return <span className="text-[11px] text-slate-400">Kontak WA belum terdaftar</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {contacts.map((c, i) => {
        const isUtama = utama && hanyaAngka(c.no_telp) === hanyaAngka(utama);
        return (
          <button
            key={`${c.no_telp}-${i}`}
            type="button"
            disabled={!aktifkan || isUtama}
            onClick={(e) => { e.stopPropagation(); if (aktifkan && !isUtama) onPilih?.(c.no_telp); }}
            title={isUtama ? `${c.hubungan} — nomor penerima notifikasi gateway` : aktifkan ? `Klik untuk menjadikan nomor ${c.hubungan} sebagai penerima notifikasi gateway` : `${c.hubungan} — ${c.no_telp}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none transition',
              isUtama
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold'
                : 'border-slate-200 bg-white text-slate-500',
              aktifkan && !isUtama && 'hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer'
            )}
          >
            <MessageCircle className={cn('w-3 h-3', isUtama ? 'text-emerald-600' : 'text-slate-400')} />
            <span className="uppercase tracking-wide">{c.hubungan}</span>
            <span className="font-mono">{c.no_telp}</span>
          </button>
        );
      })}
    </div>
  );
}