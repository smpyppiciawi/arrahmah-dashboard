import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import ScanAbsensi from '@/components/absensi/ScanAbsensi';
import JadwalAbsensiTab from '@/components/absensi/JadwalAbsensiTab';
import PendaftaranKartu from '@/components/absensi/PendaftaranKartu';
import IDCardPreview from '@/components/absensi/IDCardPreview';
import { ScanLine, Users, User, Clock, CreditCard, QrCode } from 'lucide-react';

export default function ScanAbsensiPortal() {
  const { user } = useAuth();
  const userRole = user?.role || 'guru';
  const allowed = ['admin', 'tu', 'operator', 'kepsek'].includes(userRole);
  // Fitur pengaturan (Pendaftaran Kartu, Kartu ID) hanya Admin/TU/Kepala Sekolah.
  // Tab Jadwal & pengelolaannya HANYA Admin.
  const canManage = ['admin', 'tu', 'kepsek'].includes(userRole);
  const isAdmin = userRole === 'admin';
  const [personType, setPersonType] = useState('Siswa');
  const [view, setView] = useState('scan');

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <ScanLine className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Akses Ditolak</p>
          <p className="text-slate-400 text-sm">Portal Scan Absensi khusus Admin / TU / Operator / Kepala Sekolah.</p>
        </div>
      </div>
    );
  }

  const topTabs = [
    { id: 'scan', icon: ScanLine, label: 'Scan' },
    ...(isAdmin ? [{ id: 'jadwal', icon: Clock, label: 'Jadwal' }] : []),
    ...(canManage ? [{ id: 'kartu', icon: CreditCard, label: 'Pendaftaran Kartu' }] : []),
    ...(canManage ? [{ id: 'idcard', icon: QrCode, label: 'Kartu ID' }] : []),
  ];

  // Scan terpadu (tanpa pilih Siswa/Pegawai). Toggle hanya untuk Pendaftaran Kartu & Kartu ID.
  const showPersonToggle = view === 'kartu' || view === 'idcard';

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <ScanLine className="w-6 h-6 md:w-7 md:h-7 text-emerald-500" /> Portal Scan Absensi
          </h1>
          <p className="text-slate-500 mt-1 text-xs md:text-sm">Pusat pemindaian &amp; pengelolaan absensi Siswa &amp; Pegawai</p>
        </div>

        {/* Tab Menu Utama */}
        <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm overflow-x-auto scrollbar-thin w-full sm:w-fit">
          {topTabs.map(v => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${view === v.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Icon className="w-4 h-4" /> {v.label}
              </button>
            );
          })}
        </div>

        {/* Sub-tab Siswa / Pegawai (untuk Pendaftaran Kartu & Kartu ID) */}
        {showPersonToggle && (
          <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm w-full sm:w-fit">
            {[{ id: 'Siswa', icon: Users }, { id: 'Pegawai', icon: User }].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setPersonType(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${personType === t.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Icon className="w-4 h-4" /> {t.id}
                </button>
              );
            })}
          </div>
        )}

        {view === 'scan' && <ScanAbsensi />}
        {view === 'jadwal' && <JadwalAbsensiTab isAdmin={isAdmin} />}
        {view === 'kartu' && <PendaftaranKartu personType={personType} />}
        {view === 'idcard' && <IDCardPreview personType={personType} />}
      </div>
    </div>
  );
}