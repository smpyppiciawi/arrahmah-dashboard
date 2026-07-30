import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import ScanAbsensi from '@/components/absensi/ScanAbsensi';
import { ScanLine, Users, User } from 'lucide-react';

export default function ScanAbsensiPortal() {
  const { user } = useAuth();
  const userRole = user?.role || 'guru';
  const allowed = ['admin', 'tu', 'operator'].includes(userRole);
  const [personType, setPersonType] = useState('Siswa');

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <ScanLine className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Akses Ditolak</p>
          <p className="text-slate-400 text-sm">Portal Scan Absensi khusus Admin / TU / Operator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <ScanLine className="w-6 h-6 md:w-7 md:h-7 text-emerald-500" /> Portal Scan Absensi
          </h1>
          <p className="text-slate-500 mt-1 text-xs md:text-sm">Pusat pemindaian absensi Siswa &amp; Pegawai</p>
        </div>

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

        <ScanAbsensi personType={personType} />
      </div>
    </div>
  );
}