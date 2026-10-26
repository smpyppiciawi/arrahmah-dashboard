import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { UserPlus, MessagesSquare, CreditCard, UserCheck, ClipboardList, CalendarClock } from 'lucide-react';
import { fmtRp } from '@/lib/spmbUtils';
import { gelombangBerlaku } from '@/lib/spmbDaftar';

const MENU = [
  { page: 'PendaftarSPMB', name: 'Pendaftar', desc: 'Data pendaftar baru, berkas, dan status', icon: UserPlus, color: '#3b82f6' },
  { page: 'WawancaraSPMB', name: 'Wawancara', desc: 'Isi hasil wawancara orang tua/wali', icon: MessagesSquare, color: '#8b5cf6' },
  { page: 'PembayaranSPMB', name: 'Pembayaran SPMB', desc: 'Riwayat transaksi & gelombang pendaftaran', icon: CreditCard, color: '#14b8a6' },
  { page: 'FinalisasiSPMB', name: 'Finalisasi', desc: 'Jadikan pendaftar diterima sebagai siswa aktif', icon: UserCheck, color: '#10b981' },
];

const ROLE_LABEL = { admin: 'Admin', tu: 'Tata Usaha', kepsek: 'Kepala Sekolah', bendahara: 'Bendahara' };

export default function PortalSPMB() {
  const { user } = useAuth();
  const gelombangQ = useQuery({ queryKey: ['GelombangSPMB'], queryFn: () => base44.entities.GelombangSPMB.list('nama') });
  const aktif = gelombangBerlaku(gelombangQ.data || []);
  const canManage = ['admin', 'tu'].includes(user?.role);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-rose-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Portal SPMB</h1>
              <p className="text-slate-400 text-sm">Sistem Penerimaan Murid Baru — terintegrasi Arrahmah Dashboard</p>
            </div>
          </div>

          {aktif && (
            <div className="mt-6 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-slate-200">
              <CalendarClock className="w-4 h-4 text-rose-300" />
              Gelombang berlaku: <b className="text-white">{aktif.nama}</b>
              {aktif.biaya ? <span className="text-slate-400">· Biaya {fmtRp(aktif.biaya)}</span> : null}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 -mt-6 pb-16">
        <div className="grid sm:grid-cols-2 gap-4">
          {MENU.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.page}
                to={createPageUrl(m.page)}
                className="group bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${m.color}1a` }}>
                  <Icon className="w-5 h-5" style={{ color: m.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 group-hover:text-slate-700">{m.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{m.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-600">
            Anda masuk sebagai <b>{ROLE_LABEL[user?.role] || 'Pengguna'}</b>.
            {canManage
              ? ' Anda dapat menambah dan mengubah data pendaftar serta mengisi hasil wawancara.'
              : ' Menu pengelolaan pendaftar dan wawancara hanya dapat diubah oleh Admin dan Tata Usaha.'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Halaman portal ini dapat dibuka oleh seluruh akun. Tindakan pengelolaan tetap mengikuti peran Anda.
          </p>
        </div>
      </div>
    </div>
  );
}