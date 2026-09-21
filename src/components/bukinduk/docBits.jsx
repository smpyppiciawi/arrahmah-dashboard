import React from 'react';

export function SectionBar({ children }) {
  return (
    <div className="bg-[#336699] text-white font-bold text-[10px] px-2 py-[3px] tracking-wide">
      {children}
    </div>
  );
}

export function FieldRow({ label, value, sub }) {
  const hasValue = value != null && value !== '' && value !== undefined;
  return (
    <div className="flex items-start gap-1.5 text-[10px] leading-[17px]">
      <span className="w-[38mm] shrink-0 text-[#333]">{label}</span>
      <span className="flex-1 min-w-0">
        {hasValue ? (
          <span className="font-medium text-[#111] break-words">
            {value}
            {sub ? <span className="text-[#666] font-normal"> — {sub}</span> : null}
          </span>
        ) : (
          <span className="block w-full border-b border-dotted border-[#999] h-[13px]" />
        )}
      </span>
    </div>
  );
}

export function PhotoBox({ label, src }) {
  return (
    <div className="w-[28mm] h-[38mm] border border-dashed border-[#999] bg-[#fafafa] flex items-center justify-center overflow-hidden shrink-0">
      {src ? (
        <img src={src} className="w-full h-full object-cover" alt={label || 'Foto'} />
      ) : (
        <span className="text-[8px] text-[#999] text-center leading-tight px-1">{label}</span>
      )}
    </div>
  );
}

export function EmptyNote({ text }) {
  return <p className="text-[9px] text-[#888] italic px-2 py-1">{text}</p>;
}

export const TBL = 'w-full border-collapse text-[9px]';
export const THD = 'border border-[#555] bg-[#d6e0ec] px-1 py-[2px] text-[8.5px] font-semibold text-left';
export const THD_C = 'border border-[#555] bg-[#d6e0ec] px-1 py-[2px] text-[8.5px] font-semibold text-center';
export const TDC = 'border border-[#777] px-1 py-[2px] align-top';
export const TDC_C = 'border border-[#777] px-1 py-[2px] text-center align-top';