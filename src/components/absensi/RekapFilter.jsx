import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

export default function RekapFilter({ mode, setMode, dateFrom, dateTo, setDateFrom, setDateTo }) {
  const applyPreset = (m) => {
    setMode(m);
    const now = new Date();
    if (m === 'hari') {
      const t = format(now, 'yyyy-MM-dd');
      setDateFrom(t); setDateTo(t);
    } else if (m === 'minggu') {
      setDateFrom(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setDateTo(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    } else if (m === 'bulan') {
      setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
      setDateTo(format(endOfMonth(now), 'yyyy-MM-dd'));
    }
  };

  const modes = [
    { id: 'hari', label: 'Hari' },
    { id: 'minggu', label: 'Minggu' },
    { id: 'bulan', label: 'Bulan' },
    { id: 'custom', label: 'Tanggal ke Tanggal' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {modes.map(m => (
          <Button
            key={m.id}
            size="sm"
            variant={mode === m.id ? 'default' : 'outline'}
            onClick={() => applyPreset(m.id)}
            className={mode === m.id ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            {m.label}
          </Button>
        ))}
      </div>
      {mode === 'custom' && (
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <Label className="text-xs text-slate-500 font-medium mb-1 block">Dari Tanggal</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-slate-500 font-medium mb-1 block">Sampai Tanggal</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
          </div>
        </div>
      )}
    </div>
  );
}