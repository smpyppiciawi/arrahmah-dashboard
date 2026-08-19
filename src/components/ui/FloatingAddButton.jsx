import React, { useState, useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';

const COLOR_MAP = {
  blue: 'from-blue-500 to-blue-600 shadow-blue-500/40',
  teal: 'from-teal-500 to-teal-600 shadow-teal-500/40',
  indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/40',
  purple: 'from-purple-500 to-purple-600 shadow-purple-500/40',
  amber: 'from-amber-500 to-amber-600 shadow-amber-500/40',
  green: 'from-emerald-500 to-emerald-600 shadow-emerald-500/40',
  rose: 'from-rose-500 to-rose-600 shadow-rose-500/40',
};

export default function FloatingAddButton({ onClick, label = "Tambah Data", color = "blue", icon = Plus }) {
  const Icon = icon;
  const [pos, setPos] = useState(null); // null = default position
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const btnRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    didDrag.current = false;
    const rect = btnRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);

    const onMouseMove = (me) => {
      didDrag.current = true;
      const x = me.clientX - dragOffset.current.x;
      const y = me.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - (btnRef.current?.offsetWidth || 160);
      const maxY = window.innerHeight - (btnRef.current?.offsetHeight || 56);
      setPos({ x: Math.max(0, Math.min(x, maxX)), y: Math.max(0, Math.min(y, maxY)) });
    };

    const onMouseUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleTouchStart = useCallback((e) => {
    didDrag.current = false;
    const touch = e.touches[0];
    const rect = btnRef.current.getBoundingClientRect();
    dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    setDragging(true);

    const onTouchMove = (te) => {
      te.preventDefault();
      didDrag.current = true;
      const t = te.touches[0];
      const x = t.clientX - dragOffset.current.x;
      const y = t.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - (btnRef.current?.offsetWidth || 160);
      const maxY = window.innerHeight - (btnRef.current?.offsetHeight || 56);
      setPos({ x: Math.max(0, Math.min(x, maxX)), y: Math.max(0, Math.min(y, maxY)) });
    };

    const onTouchEnd = () => {
      setDragging(false);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, []);

  const handleClick = () => {
    if (!didDrag.current) onClick();
  };

  const style = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, zIndex: 40, cursor: dragging ? 'grabbing' : 'grab' }
    : { position: 'fixed', bottom: '5rem', right: '1rem', zIndex: 40, cursor: dragging ? 'grabbing' : 'grab' };

  // desktop: override bottom/right
  const defaultStyle = pos ? style : {};

  return (
    <button
      ref={btnRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      style={pos ? { position: 'fixed', left: pos.x, top: pos.y, zIndex: 40, cursor: dragging ? 'grabbing' : 'grab' } : { cursor: dragging ? 'grabbing' : 'grab' }}
      className={`${pos ? '' : 'fixed bottom-20 right-4 lg:bottom-6 lg:right-6'} z-40 flex items-center gap-2 px-5 h-14 rounded-2xl bg-gradient-to-r ${COLOR_MAP[color] || COLOR_MAP.blue} text-white shadow-xl font-medium text-sm transition-transform select-none ${dragging ? 'scale-105 opacity-90' : 'hover:scale-105'}`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );
}