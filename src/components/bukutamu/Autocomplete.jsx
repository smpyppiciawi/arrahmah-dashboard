import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

export default function Autocomplete({ value, onChange, onPick, placeholder, suggestions, getLabel, getKey }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const q = (value || '').toLowerCase();
  const filtered = (suggestions || []).filter(s => getLabel(s).toLowerCase().includes(q)).slice(0, 8);

  return (
    <div className="relative" ref={ref}>
      <Input
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.map(s => (
            <button
              type="button"
              key={getKey(s)}
              onMouseDown={(e) => { e.preventDefault(); onPick(s); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-b border-slate-100 last:border-0"
            >
              {getLabel(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}