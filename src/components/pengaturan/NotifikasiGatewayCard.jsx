import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { MessageCircle, Mail, Users, GraduationCap, Radio } from 'lucide-react';

const ROWS = [
  { key: 'siswa', label: 'Siswa', icon: Users, desc: 'Absensi siswa & peringatan absen 3 hari ke orang tua/wali' },
  { key: 'pegawai', label: 'Pegawai', icon: GraduationCap, desc: 'Absensi pegawai, pengingat tugas H-1 & kalender H-2' },
  { key: 'lainnya', label: 'Lainnya', icon: Radio, desc: 'Notifikasi otomatis lainnya di luar Siswa & Pegawai' },
];

const COLS = [
  { key: 'wa', label: 'WhatsApp', icon: MessageCircle },
  { key: 'email', label: 'Email', icon: Mail },
];

export default function NotifikasiGatewayCard({ pengaturan, isAdmin }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleMutation = useMutation({
    mutationFn: ({ field, value }) => {
      if (pengaturan?.id) return base44.entities.PengaturanAplikasi.update(pengaturan.id, { [field]: value });
      return base44.entities.PengaturanAplikasi.create({ [field]: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan-aplikasi'] });
      toast({ title: 'Pengaturan tersimpan', description: 'Status gateway notifikasi diperbarui.' });
    },
    onError: () => {
      toast({ title: 'Gagal', description: 'Tidak dapat menyimpan pengaturan gateway.', variant: 'destructive' });
    },
  });

  const isOn = (col, row) => pengaturan?.[`notif_${col}_${row}`] !== false; // default ON

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="w-5 h-5 text-emerald-500" />
            Notifikasi Gateway (WA &amp; Email Otomatis)
          </CardTitle>
          {!isAdmin && <Badge variant="outline" className="text-slate-400">Hanya Admin</Badge>}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          OFF = pengiriman otomatis pada kanal &amp; jenis tersebut dijeda (pesan tidak dikirim, akan lanjut lagi saat ON). ON = berjalan baik dan tepat. Tidak memengaruhi pengiriman manual.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[1fr_72px_72px] sm:grid-cols-[1fr_110px_110px] gap-2 items-center">
          <div />
          {COLS.map((c) => (
            <div key={c.key} className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600">
              <c.icon className="w-3.5 h-3.5" />{c.label}
            </div>
          ))}
          {ROWS.map((r) => (
            <React.Fragment key={r.key}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <r.icon className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700">{r.label}</p>
                  <p className="text-[11px] text-slate-400 truncate">{r.desc}</p>
                </div>
              </div>
              {COLS.map((c) => {
                const field = `notif_${c.key}_${r.key}`;
                return (
                  <div key={field} className="flex justify-center">
                    <Switch
                      checked={isOn(c.key, r.key)}
                      disabled={!isAdmin || toggleMutation.isPending}
                      onCheckedChange={(v) => toggleMutation.mutate({ field, value: v })}
                    />
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}