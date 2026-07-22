import React from 'react';
import { Input } from '@/components/ui/input';

const formatRupiahInput = (val) => {
  const num = String(val ?? '').replace(/\D/g, '');
  if (!num) return '';
  return new Intl.NumberFormat('id-ID').format(Number(num));
};

export default function RupiahInput({ value, onChange, placeholder = '0', ...props }) {
  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    onChange(raw);
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={formatRupiahInput(value)}
      onChange={handleChange}
      placeholder={placeholder}
      {...props}
    />
  );
}