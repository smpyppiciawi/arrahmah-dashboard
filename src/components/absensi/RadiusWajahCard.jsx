import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Ruler, Loader2, Save } from 'lucide-react';

// Pengaturan Radius Scan Wajah (Face Recognition) — ADMIN ONLY.
// Radius dalam meter, dipakai sebagai geofence absensi wajah dengan
// Titik Koordinat Sekolah (ProfilSekolah.koordinat) sebagai pusat validasi.
export default function RadiusWajahCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [radius, setRadius] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: profilList = [], isLoading } = useQuery({
    queryKey: ['profil-sekolah-radius'],
    queryFn: () => base44.entities.ProfilSekolah.list('-updated_date', 1),
  });
  const profil = profilList[0];

  useEffect(() => {
    if (profil) setRadius(profil.radius_absensi_meter ?? 1000);
  }, [profil?.id, profil?.radius_absensi_meter]);

  const save = async () => {
    const val = Number(radius);
    if (!val || val < 10) {
      toast({ title: 'Radius minimal 10 meter', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.ProfilSekolah.update(profil.id, { radius_absensi_meter: val });
      toast({ title: `Radius scan wajah disimpan: ${val} meter` });
      queryClient.invalidateQueries({ queryKey: ['profil-sekolah-radius'] });
    } catch (e) {
      toast({ title: 'Gagal menyimpan', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-2 border-indigo-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Ruler className="w-4 h-4 text-indigo-500" /> Radius Scan Wajah (Face Recognition)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
        ) : !profil ? (
          <p className="text-sm text-slate-500">
            Profil sekolah belum diisi — atur Titik Koordinat Sekolah pada menu Profil Sekolah terlebih dahulu.
          </p>
        ) : (
          <>
            <div className="p-3 bg-indigo-50 rounded-xl flex items-start gap-2 text-xs text-indigo-700">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Titik Koordinat Sekolah (pusat radius)</p>
                <p className="font-mono mt-0.5">{profil.koordinat || 'Belum diatur — isi pada menu Profil Sekolah'}</p>
              </div>
            </div>
            <div>
              <Label className="text-xs">Radius Absensi Wajah (meter)</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  type="number"
                  min="10"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="font-mono"
                  placeholder="1000"
                />
                <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Simpan</>}
                </Button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Pegawai hanya dapat absen wajah dinyatakan Hadir/Tercatat jika berada dalam radius {radius || '-'} meter dari Titik Koordinat Sekolah. Nilai saat ini: {profil.radius_absensi_meter ?? 1000} m.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}