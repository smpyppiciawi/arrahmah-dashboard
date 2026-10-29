import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SECTIONS, KANAL_META } from './notifikasiFiturConfig';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { MessageCircle, Mail } from 'lucide-react';

function KanalChip({ kanal, aktif }) {
  const Icon = kanal === 'wa' ? MessageCircle : Mail;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${
        aktif
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-400 border-slate-200'
      }`}
    >
      <Icon className="w-3 h-3" />
      {KANAL_META[kanal].label}
      <span className="opacity-70">{aktif ? '· aktif' : '· dijeda'}</span>
    </span>
  );
}

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
      toast({ title: 'Pengaturan tersimpan', description: 'Status notifikasi gateway diperbarui.' });
    },
    onError: () => {
      toast({ title: 'Gagal', description: 'Tidak dapat menyimpan pengaturan gateway.', variant: 'destructive' });
    },
  });

  const isOn = (field) => pengaturan?.[field] !== false; // default ON

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
          OFF = pengiriman otomatis fitur tersebut dijeda (pesan tidak dikirim, akan lanjut lagi saat ON). ON = berjalan baik dan tepat. Tidak memengaruhi pengiriman manual di luar fitur yang diatur di sini.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.key} className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-50/80 border-b border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <SectionIcon className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700">
                    {section.label}
                    <span className="ml-1 text-[11px] font-normal text-slate-400">({section.features.length} fitur)</span>
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{section.desc}</p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {section.features.map((f) => {
                  const aktif = isOn(f.field);
                  return (
                    <div key={f.field} className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700 leading-tight">{f.nama}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{f.detail}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {f.kanal.map((k) => (
                            <KanalChip key={k} kanal={k} aktif={aktif} />
                          ))}
                        </div>
                      </div>
                      <Switch
                        checked={aktif}
                        disabled={!isAdmin || toggleMutation.isPending}
                        onCheckedChange={(v) => toggleMutation.mutate({ field: f.field, value: v })}
                        className="mt-1 flex-shrink-0 data-[state=checked]:bg-slate-900"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <p className="text-[11px] text-slate-400">
          Pengingat Tugas Pegawai H-1 tetap berjalan sesuai pengaturannya masing-masing dan tidak diatur dari kartu ini.
        </p>
      </CardContent>
    </Card>
  );
}