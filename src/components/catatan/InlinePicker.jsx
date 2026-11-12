import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

/**
 * Pemilih gaya dropdown yang dirender inline (bukan portal).
 * Dipakai di dalam Dialog agar daftar panjang bisa digulir normal —
 * Popover portal di dalam Dialog terhalang scroll-lock sehingga tidak bisa digulir.
 */
export default function InlinePicker({
  triggerText, placeholder, search, onSearch, open, onToggle, emptyText, children, icon: Icon = Search,
}) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start text-left font-normal"
        onClick={onToggle}
      >
        <Icon className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
        <span className="truncate">{triggerText}</span>
      </Button>

      {open && (
        <div className="mt-1.5 border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <Input
              autoFocus
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={placeholder}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto overscroll-contain">
            {hasChildren ? children : (
              <p className="px-3 py-4 text-xs text-slate-400 text-center">{emptyText || 'Tidak ditemukan'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}