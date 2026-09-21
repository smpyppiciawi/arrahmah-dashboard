import React from 'react';

// Satu halaman A4 dokumen Buku Induk
export default function BukuIndukPageShell({ first, title, subtitle, footerInfo, children }) {
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div className="bi-page bg-white w-[210mm] min-h-[297mm] mx-auto shadow-lg flex flex-col text-[#1a1a2e]">
      <div className="px-[10mm] pt-[7mm] pb-2">
        {first ? (
          <div className="text-center">
            <h1 className="text-[15px] font-bold tracking-wide text-[#1e3a5f] leading-tight">BUKU INDUK SISWA</h1>
            <h2 className="text-[17px] font-bold tracking-wide text-[#336699] leading-tight">DATA SISWA SMP YPPI ARRAHMAH</h2>
            {subtitle && <p className="text-[10px] text-[#555] mt-0.5">{subtitle}</p>}
          </div>
        ) : (
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[12px] font-bold text-[#336699] leading-tight">BUKU INDUK — {subtitle}</h2>
            <span className="text-[9px] text-[#777] shrink-0">SMP YPPI ARRAHMAH</span>
          </div>
        )}
        {title && (
          <div className="mt-1.5 bg-[#336699] text-white text-[11px] font-bold px-2.5 py-1 tracking-wide">{title}</div>
        )}
      </div>
      <div className="px-[10mm] flex-1 flex flex-col">{children}</div>
      <div className="px-[10mm] py-2 text-[8px] text-[#999] flex justify-between gap-2">
        <span className="truncate">{footerInfo}</span>
        <span className="shrink-0">Dicetak: {today}</span>
      </div>
    </div>
  );
}