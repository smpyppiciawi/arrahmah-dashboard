import React from 'react';

// Bar filter sticky di bawah header mobile / atas konten desktop
export default function StickyFilterBar({ children, className }) {
  return (
    <div className={`sticky top-14 lg:top-0 z-30 bg-slate-50/95 backdrop-blur-md border-b border-slate-100 py-3 ${className || ''}`}>
      {children}
    </div>
  );
}