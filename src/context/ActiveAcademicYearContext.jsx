import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const ActiveAcademicYearContext = createContext(null);

export function ActiveAcademicYearProvider({ children }) {
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['pengaturan-aplikasi'],
    queryFn: () => base44.entities.PengaturanAplikasi.list(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const pengaturan = settings[0] || null;
  const activeAcademicYear = pengaturan?.tahun_ajaran_aktif || null;

  return (
    <ActiveAcademicYearContext.Provider value={{ activeAcademicYear, pengaturan, isLoading }}>
      {children}
    </ActiveAcademicYearContext.Provider>
  );
}

export function useActiveAcademicYear() {
  const ctx = useContext(ActiveAcademicYearContext);
  if (!ctx) throw new Error('useActiveAcademicYear must be used within ActiveAcademicYearProvider');
  return ctx;
}