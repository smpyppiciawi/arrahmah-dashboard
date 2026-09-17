import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Edit2, Trash2, ExternalLink, Users, X, Check } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import FloatingAddButton from "@/components/ui/FloatingAddButton";
import { useToast } from "@/components/ui/use-toast";
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const KATEGORI_CONFIG = {
  'Hari Libur Nasional':  { color: 'bg-red-500',    light: 'bg-red-50 text-red-700 border-red-200' },
  'Libur Sekolah':        { color: 'bg-orange-500',  light: 'bg-orange-50 text-orange-700 border-orange-200' },
  'Ujian':                { color: 'bg-purple-500',  light: 'bg-purple-50 text-purple-700 border-purple-200' },
  'Kegiatan Sekolah':     { color: 'bg-blue-500',    light: 'bg-blue-50 text-blue-700 border-blue-200' },
  'Penerimaan Rapor':     { color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'Kegiatan Kesiswaan':   { color: 'bg-cyan-500',    light: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  'Lainnya':              { color: 'bg-slate-400',   light: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const TAHUN_AJARAN_OPTIONS = () => {
  const y = new Date().getFullYear();
  return [`${y-1}/${y}`, `${y}/${y+1}`, `${y+1}/${y+2}`];
};

const EMPTY_FORM = { judul: '', tanggal_mulai: '', tanggal_selesai: '', kategori: '', keterangan: '', tahun_ajaran: '', warna: '', tugas_untuk_aktif: false, pegawai_ids: [] };

export default function KalenderAkademik() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [filterTahun, setFilterTahun] = useState('');
  const [filterKategori, setFilterKategori] = useState('all');
  const [selectedDay, setSelectedDay] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewMode, setViewMode] = useState('kalender'); // 'kalender' | 'daftar'
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeAcademicYear } = useActiveAcademicYear();

  // Default filter & form ke tahun ajaran aktif
  useEffect(() => {
    if (activeAcademicYear && !filterTahun) setFilterTahun(activeAcademicYear);
    if (activeAcademicYear && !formData.tahun_ajaran) {
      setFormData(prev => ({ ...prev, tahun_ajaran: activeAcademicYear }));
    }
  }, [activeAcademicYear]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['kalender'],
    queryFn: () => base44.entities.KalenderAkademik.list('-tanggal_mulai'),
  });
  const { data: guruList = [] } = useQuery({ queryKey: ['guru'], queryFn: () => base44.entities.Guru.list('nama') });
  const [openPegawaiSelect, setOpenPegawaiSelect] = useState(false);
  const togglePegawai = (id) => setFormData(prev => {
    const cur = prev.pegawai_ids || [];
    return { ...prev, pegawai_ids: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
  });

  const sendEventNotifications = async (eventData, isUpdate) => {
    try {
      if (!eventData?.tanggal_mulai) return;
      const guruListLocal = await base44.entities.Guru.list();
      const eventDate = format(parseISO(eventData.tanggal_mulai), 'd MMMM yyyy', { locale: idLocale });
      const eventEndDate = eventData.tanggal_selesai ? ` s/d ${format(parseISO(eventData.tanggal_selesai), 'd MMMM yyyy', { locale: idLocale })}` : '';
      const gcalLink = getGoogleCalendarLink(eventData);
      const tugasAktif = eventData.tugas_untuk_aktif && (eventData.pegawai_ids || []).length > 0;
      let recipients;
      let body;
      if (tugasAktif) {
        // Kegiatan bertugas: email hanya ke pegawai yang ditugaskan (dengan link Google Calendar)
        recipients = guruListLocal.filter(g => g.email && (eventData.pegawai_ids || []).includes(g.id));
        body = `Anda ditugaskan pada kegiatan ${isUpdate ? '(diperbarui)' : 'baru'} di Kalender Akademik:\n\n${eventData.judul}\nTanggal: ${eventDate}${eventEndDate}\nKategori: ${eventData.kategori}${eventData.keterangan ? `\nKeterangan: ${eventData.keterangan}` : ''}\n\nTambahkan ke Google Calendar:\n${gcalLink}\n\n- Sistem Informasi Sekolah YPPI ARRAHMAH`;
      } else {
        recipients = guruListLocal.filter(g => g.email);
        body = `Kegiatan ${isUpdate ? 'diperbarui' : 'baru'} di Kalender Akademik:\n\n${eventData.judul}\nTanggal: ${eventDate}${eventEndDate}\nKategori: ${eventData.kategori}${eventData.keterangan ? `\nKeterangan: ${eventData.keterangan}` : ''}\n\nTambahkan ke Google Calendar:\n${gcalLink}`;
      }
      if (recipients.length === 0) return;
      let sentCount = 0;
      for (const g of recipients) {
        try {
          await base44.integrations.Core.SendEmail({ to: g.email, subject: `📅 ${eventData.judul} - Kalender Akademik`, body });
          sentCount++;
        } catch (e) { /* skip unregistered emails */ }
      }
      if (sentCount > 0) {
        toast({ title: '📧 Notifikasi Email Terkirim', description: tugasAktif ? `${sentCount} pegawai terkait kegiatan diberi notifikasi.` : `${sentCount} guru/pegawai mendapat notifikasi.` });
      }
    } catch (e) { console.error('Email notification error:', e); }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KalenderAkademik.create(data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kalender'] });
      resetForm();
      toast({ title: '✅ Kegiatan ditambahkan' });
      sendEventNotifications(data || variables, false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KalenderAkademik.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kalender'] });
      resetForm();
      toast({ title: '✅ Kegiatan diperbarui' });
      sendEventNotifications(variables?.data || data, true);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KalenderAkademik.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kalender'] }); setDeleteOpen(false); toast({ title: '✅ Kegiatan dihapus' }); },
  });

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM, tahun_ajaran: activeAcademicYear || '' });
    setEditData(null);
    setIsOpen(false);
  };

  const handleEdit = (ev) => { setEditData(ev); setFormData(ev); setIsOpen(true); };
  const handleSubmit = (e) => {
    e.preventDefault();
    // Tugas untuk Pegawai: hanya simpan jika switch ON; Off = bersihkan penugasan
    const pegawai_ids = formData.tugas_untuk_aktif ? (formData.pegawai_ids || []) : [];
    let pegawai_names;
    if (pegawai_ids.length > 0) {
      pegawai_names = pegawai_ids.map(id => guruList.find(g => g.id === id)?.nama).filter(Boolean);
      if (pegawai_names.length === 0) pegawai_names = (editData?.pegawai_names || formData.pegawai_names || []);
    } else {
      pegawai_names = [];
    }
    const finalData = { ...formData, pegawai_ids, pegawai_names, tahun_ajaran: formData.tahun_ajaran || activeAcademicYear || '' };
    if (editData) updateMutation.mutate({ id: editData.id, data: finalData });
    else createMutation.mutate(finalData);
  };

  // Generate Google Calendar "Add to Calendar" link — no OAuth needed
  const getGoogleCalendarLink = (ev) => {
    const fmtGCalDate = (dateStr, isEnd = false) => {
      if (!dateStr) return '';
      const d = parseISO(dateStr);
      // For end dates, add 1 day since Google Calendar end is exclusive for all-day events
      const adjusted = isEnd ? new Date(d.getTime() + 24 * 60 * 60 * 1000) : d;
      return format(adjusted, 'yyyyMMdd');
    };
    const startDate = fmtGCalDate(ev.tanggal_mulai);
    const endDate = ev.tanggal_selesai ? fmtGCalDate(ev.tanggal_selesai, true) : startDate;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: ev.judul,
      dates: `${startDate}/${endDate}`,
      details: ev.keterangan || `Kategori: ${ev.kategori}${ev.tahun_ajaran ? ` | Tahun Ajaran: ${ev.tahun_ajaran}` : ''}`,
      location: '',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Filtered events
  const filteredEvents = useMemo(() => events.filter(ev => {
    const matchTahun = !filterTahun || ev.tahun_ajaran === filterTahun;
    const matchKat = filterKategori === 'all' || ev.kategori === filterKategori;
    return matchTahun && matchKat;
  }), [events, filterTahun, filterKategori]);

  // Calendar days
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOfWeek = getDay(startOfMonth(currentMonth));

  // Get events for a specific day
  const getEventsForDay = (day) => filteredEvents.filter(ev => {
    const start = parseISO(ev.tanggal_mulai);
    const end = ev.tanggal_selesai ? parseISO(ev.tanggal_selesai) : start;
    return isWithinInterval(day, { start, end });
  });

  // Selected day events
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  // List view sorted by date
  const sortedEvents = useMemo(() => [...filteredEvents].sort((a, b) => a.tanggal_mulai.localeCompare(b.tanggal_mulai)), [filteredEvents]);

  // Group list by month
  const groupedByMonth = useMemo(() => {
    const groups = {};
    sortedEvents.forEach(ev => {
      const monthKey = ev.tanggal_mulai.slice(0, 7);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(ev);
    });
    return groups;
  }, [sortedEvents]);

  const tahunOptions = TAHUN_AJARAN_OPTIONS();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-7 h-7 text-indigo-500" />
              Kalender Akademik
            </h1>
            <p className="text-slate-500 mt-0.5 text-sm">Jadwal & kegiatan akademik sepanjang tahun pelajaran</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="w-[95vw] max-w-md">
              <DialogHeader><DialogTitle>{editData ? 'Edit Kegiatan' : 'Tambah Kegiatan'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs text-slate-500">Judul Kegiatan</Label>
                  <Input className="mt-1" value={formData.judul} onChange={(e) => setFormData({...formData, judul: e.target.value})} placeholder="Contoh: Penilaian Akhir Semester Ganjil" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">Tanggal Mulai</Label>
                    <Input type="date" className="mt-1" value={formData.tanggal_mulai} onChange={(e) => setFormData({...formData, tanggal_mulai: e.target.value})} required />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Tanggal Selesai</Label>
                    <Input type="date" className="mt-1" value={formData.tanggal_selesai} onChange={(e) => setFormData({...formData, tanggal_selesai: e.target.value})} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Kategori</Label>
                  <Select value={formData.kategori} onValueChange={(v) => setFormData({...formData, kategori: v})}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(KATEGORI_CONFIG).map(k => (
                        <SelectItem key={k} value={k}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${KATEGORI_CONFIG[k].color}`} />
                            {k}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">
                    Tahun Ajaran
                    {activeAcademicYear && (
                      <span className="text-green-600 ml-1">(Aktif: {activeAcademicYear})</span>
                    )}
                  </Label>
                  <Select value={formData.tahun_ajaran} onValueChange={(v) => setFormData({...formData, tahun_ajaran: v})}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Tahun Ajaran" /></SelectTrigger>
                    <SelectContent>{tahunOptions.map(t => <SelectItem key={t} value={t}>{t}{t === activeAcademicYear ? ' ✓' : ''}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Keterangan (opsional)</Label>
                  <Input className="mt-1" value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} placeholder="Keterangan tambahan..." />
                </div>

                {/* Tugas untuk Pegawai (Switch On/Off) */}
                <div className="rounded-xl border border-slate-200 p-3 space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-600">Tugas untuk Pegawai</Label>
                    <Switch checked={!!formData.tugas_untuk_aktif} onCheckedChange={(v) => setFormData({ ...formData, tugas_untuk_aktif: v })} />
                  </div>
                  {formData.tugas_untuk_aktif && (
                    <>
                      <Popover open={openPegawaiSelect} onOpenChange={setOpenPegawaiSelect}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" type="button" className="w-full justify-start text-left font-normal h-9">
                            <Users className="w-4 h-4 mr-2 text-slate-400" />
                            {(formData.pegawai_ids || []).length ? `${(formData.pegawai_ids || []).length} pegawai dipilih` : 'Pilih pegawai yang ditugaskan...'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Cari nama pegawai..." />
                            <CommandList className="max-h-64">
                              <CommandEmpty>Tidak ditemukan</CommandEmpty>
                              <CommandGroup>
                                {guruList.map(g => (
                                  <CommandItem key={g.id} value={`${g.nama} ${g.jabatan || ''} ${g.tugas_tambahan || ''}`} onSelect={() => togglePegawai(g.id)} className="cursor-pointer">
                                    <div className="flex items-center justify-between w-full">
                                      <span className="text-sm">{g.nama}</span>
                                      {(formData.pegawai_ids || []).includes(g.id)
                                        ? <Check className="w-4 h-4 text-emerald-600" />
                                        : <span className="text-[10px] text-slate-400 truncate max-w-24">{g.jabatan || ''}</span>}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {(formData.pegawai_ids || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(formData.pegawai_ids || []).map(id => {
                            const g = guruList.find(x => x.id === id);
                            return g ? (
                              <Badge key={id} className="bg-indigo-100 text-indigo-700">
                                {g.nama}
                                <button type="button" onClick={() => togglePegawai(id)} className="ml-1 text-indigo-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400">Pegawai terpilih menerima email + link Google Calendar; pengingat WA otomatis dikirim H-1 kegiatan.</p>
                    </>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Batal</Button>
                  <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                    {editData ? 'Simpan' : 'Tambah'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters + View Toggle */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Tampilan</Label>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                  {[
                    { key: 'kalender', label: '📅 Kalender' },
                    { key: 'daftar', label: '📋 Daftar' },
                  ].map(m => (
                    <button key={m.key} onClick={() => setViewMode(m.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === m.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">
                  Tahun Ajaran {activeAcademicYear && (
                    <span className="text-green-600 font-medium">• Aktif: {activeAcademicYear}</span>
                  )}
                </Label>
                <Select value={filterTahun} onValueChange={setFilterTahun}>
                  <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Semua</SelectItem>
                    {tahunOptions.map(t => (
                      <SelectItem key={t} value={t}>
                        {t}{t === activeAcademicYear ? ' ✓' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Kategori</Label>
                <Select value={filterKategori} onValueChange={setFilterKategori}>
                  <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {Object.keys(KATEGORI_CONFIG).map(k => (
                      <SelectItem key={k} value={k}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${KATEGORI_CONFIG[k].color}`} />
                          {k}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legenda */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(KATEGORI_CONFIG).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-2.5 py-1 text-xs text-slate-600 shadow-sm">
              <div className={`w-2 h-2 rounded-full ${v.color}`} />
              {k}
            </div>
          ))}
        </div>

        {/* ===== KALENDER VIEW ===== */}
        {viewMode === 'kalender' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Calendar Grid */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-0 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-slate-800">
                      {format(currentMonth, 'MMMM yyyy', { locale: idLocale })}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentMonth(new Date())}>
                        Hari Ini
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 mb-2">
                    {HARI.map((h, i) => (
                      <div key={h} className={`text-center text-xs font-semibold py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-400'}`}>
                        {h}
                      </div>
                    ))}
                  </div>
                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: startDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-14 sm:h-16" />
                    ))}
                    {daysInMonth.map((day) => {
                      const dayEvents = getEventsForDay(day);
                      const isToday = isSameDay(day, new Date());
                      const isSelected = selectedDay && isSameDay(day, selectedDay);
                      const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => setSelectedDay(isSelected ? null : day)}
                          className={`h-14 sm:h-16 rounded-xl p-1 cursor-pointer transition-all border ${
                            isSelected ? 'border-indigo-400 bg-indigo-50' :
                            isToday ? 'border-indigo-300 bg-indigo-50/50' :
                            dayEvents.length > 0 ? 'border-slate-200 bg-white hover:bg-slate-50' :
                            'border-transparent hover:bg-slate-50'
                          }`}
                        >
                          <div className={`text-xs font-medium mb-0.5 text-right pr-0.5 ${
                            isToday ? 'text-indigo-600 font-bold' :
                            isWeekend ? 'text-red-400' :
                            'text-slate-500'
                          }`}>
                            {format(day, 'd')}
                          </div>
                          <div className="flex flex-col gap-0.5 overflow-hidden">
                            {dayEvents.slice(0, 2).map(ev => (
                              <div
                                key={ev.id}
                                className={`w-full rounded px-1 py-0.5 text-[9px] sm:text-[10px] font-medium truncate text-white leading-tight ${KATEGORI_CONFIG[ev.kategori]?.color || 'bg-slate-400'}`}
                                title={ev.judul}
                              >
                                {ev.judul}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-[9px] text-slate-400 font-medium text-right pr-0.5">+{dayEvents.length - 2} lagi</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-1">
              {selectedDay ? (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold text-slate-700">
                      {format(selectedDay, 'EEEE, d MMMM yyyy', { locale: idLocale })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {selectedDayEvents.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-6">Tidak ada kegiatan</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDayEvents.map(ev => (
                          <div key={ev.id} className={`rounded-xl border p-3 ${KATEGORI_CONFIG[ev.kategori]?.light || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{ev.judul}</p>
                                <Badge className={`mt-1 text-[10px] border ${KATEGORI_CONFIG[ev.kategori]?.light}`}>{ev.kategori}</Badge>
                                {ev.tahun_ajaran && (
                                  <span className="text-[10px] text-slate-500 ml-1">• {ev.tahun_ajaran}</span>
                                )}
                                {ev.tanggal_selesai && ev.tanggal_selesai !== ev.tanggal_mulai && (
                                  <p className="text-[11px] mt-1 opacity-70">
                                    s/d {format(parseISO(ev.tanggal_selesai), 'd MMM yyyy', { locale: idLocale })}
                                  </p>
                                )}
                                {ev.keterangan && <p className="text-xs mt-1 opacity-70">{ev.keterangan}</p>}
                                {(ev.pegawai_names || []).length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                    <span className="text-[10px] text-slate-500 font-medium">Tugas:</span>
                                    {ev.pegawai_names.map(n => <Badge key={n} className="bg-indigo-100 text-indigo-700 text-[10px]">{n}</Badge>)}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <button onClick={() => handleEdit(ev)} className="p-1 rounded hover:bg-white/60 transition-all">
                                  <Edit2 className="w-3.5 h-3.5 opacity-60" />
                                </button>
                                <a href={getGoogleCalendarLink(ev)} target="_blank" rel="noopener noreferrer" title="Tambah ke Google Calendar" className="p-1 rounded hover:bg-white/60 transition-all">
                                  <ExternalLink className="w-3.5 h-3.5 text-blue-500 opacity-70" />
                                </a>
                                <button onClick={() => { setDeleteId(ev.id); setDeleteOpen(true); }} className="p-1 rounded hover:bg-red-100 transition-all">
                                  <Trash2 className="w-3.5 h-3.5 text-red-500 opacity-60" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-10 text-center text-slate-400">
                    <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Klik tanggal untuk melihat detail kegiatan</p>
                  </CardContent>
                </Card>
              )}

              {/* Upcoming this month */}
              <Card className="border-0 shadow-sm mt-4">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Kegiatan Bulan Ini
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {(() => {
                    const monthStart = startOfMonth(currentMonth);
                    const monthEnd = endOfMonth(currentMonth);
                    const monthEvents = filteredEvents.filter(ev => {
                      const d = parseISO(ev.tanggal_mulai);
                      return d >= monthStart && d <= monthEnd;
                    }).sort((a, b) => a.tanggal_mulai.localeCompare(b.tanggal_mulai));
                    return monthEvents.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">Tidak ada kegiatan</p>
                    ) : (
                      <div className="space-y-2">
                        {monthEvents.map(ev => (
                          <div key={ev.id} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${KATEGORI_CONFIG[ev.kategori]?.color || 'bg-slate-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 truncate">{ev.judul}</p>
                              <p className="text-[10px] text-slate-400">
                                {format(parseISO(ev.tanggal_mulai), 'd MMM', { locale: idLocale })}
                                {ev.tanggal_selesai && ev.tanggal_selesai !== ev.tanggal_mulai &&
                                  ` — ${format(parseISO(ev.tanggal_selesai), 'd MMM', { locale: idLocale })}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ===== DAFTAR VIEW ===== */}
        {viewMode === 'daftar' && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-16 text-slate-400 text-sm">Memuat data...</div>
              ) : Object.keys(groupedByMonth).length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Belum ada kegiatan. Tambahkan kegiatan pertama!</p>
                </div>
              ) : Object.entries(groupedByMonth).map(([monthKey, evs]) => (
                <div key={monthKey}>
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {format(parseISO(monthKey + '-01'), 'MMMM yyyy', { locale: idLocale })}
                    </p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {evs.map(ev => (
                      <div key={ev.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                        <div className={`w-1 h-10 rounded-full flex-shrink-0 ${KATEGORI_CONFIG[ev.kategori]?.color || 'bg-slate-300'}`} />
                        <div className="w-20 flex-shrink-0 text-center">
                          <p className="text-xl font-bold text-slate-800">{format(parseISO(ev.tanggal_mulai), 'd')}</p>
                          <p className="text-[10px] text-slate-400">{format(parseISO(ev.tanggal_mulai), 'EEE', { locale: idLocale })}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800">{ev.judul}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge className={`text-[10px] border ${KATEGORI_CONFIG[ev.kategori]?.light}`}>{ev.kategori}</Badge>
                            {ev.tahun_ajaran && <span className="text-[10px] text-slate-400">{ev.tahun_ajaran}</span>}
                            {ev.tanggal_selesai && ev.tanggal_selesai !== ev.tanggal_mulai && (
                              <span className="text-[10px] text-slate-400">
                                s/d {format(parseISO(ev.tanggal_selesai), 'd MMM yyyy', { locale: idLocale })}
                              </span>
                            )}
                            {ev.keterangan && <span className="text-[10px] text-slate-400 truncate">{ev.keterangan}</span>}
                            {(ev.pegawai_names || []).length > 0 && (
                              <span className="text-[10px] text-indigo-600 truncate">Tugas: {ev.pegawai_names.join(', ')}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" asChild className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600">
                            <a href={getGoogleCalendarLink(ev)} target="_blank" rel="noopener noreferrer" title="Tambah ke Google Calendar">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(ev)} className="h-8 w-8 p-0 hover:bg-indigo-50 hover:text-indigo-600">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setDeleteId(ev.id); setDeleteOpen(true); }} className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
          title="Hapus Kegiatan"
          description="Yakin ingin menghapus kegiatan ini?"
        />
        <FloatingAddButton onClick={() => { setEditData(null); setFormData(EMPTY_FORM); setIsOpen(true); }} label="Tambah Kegiatan" color="indigo" icon={Plus} />
      </div>
    </div>
  );
}