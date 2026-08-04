import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function KepsekBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  if (params.get('from') !== 'kepsek') return null;
  return (
    <div className="sticky top-14 lg:top-0 z-30 bg-white border-b border-slate-200 px-4 py-2 shadow-sm">
      <button onClick={() => navigate('/Kepsek')} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard Kepsek
      </button>
    </div>
  );
}