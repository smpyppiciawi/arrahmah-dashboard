import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Settings, Power } from "lucide-react";

export default function PengaturanImprovementDialog({ open, onOpenChange, isAdmin, canKelola }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pengaturanId, setPengaturanId] = useState(null);
  const [limitUniversal, setLimitUniversal] = useState(30);
  const [limitAktif, setLimitAktif] = useState(true);
  const [pelanggaranAktif, setPelanggaranAktif] = useState(true);
  const [akumulasiLama, setAkumulasiLama] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const fetchPengaturan = async () => {
      setLoading(true);
      try {
        const list = await base44.entities.PengaturanImprovement.list();
        if (list.length > 0) {
          const p = list[0];
          setPengaturanId(p.id);
          setLimitUniversal(p.limit_mingguan_universal ?? 30);
          setLimitAktif(p.limit_universal_aktif ?? true);
          setPelanggaranAktif(p.pelanggaran_module_aktif ?? true);
          setAkumulasiLama(p.akumulasi_poin_lama_aktif ?? false);
        } else {
          setPengaturanId(null);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchPengaturan();
  }, [open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (pengaturanId) {
        return base44.entities.PengaturanImprovement.update(pengaturanId, data);
      }
      return base44.entities.PengaturanImprovement.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan-improvement'] });
      queryClient.invalidateQueries({ queryKey: ['pengaturan-improvement-pelanggaran'] });
      toast({ title: "Pengaturan berhasil disimpan" });
      onOpenChange(false);
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      limit_mingguan_universal: Number(limitUniversal) || 30,
      limit_universal_aktif: limitAktif,
      pelanggaran_module_aktif: pelanggaranAktif,
      akumulasi_poin_lama_aktif: akumulasiLama
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Settings className="w-5 h-5" /> Pengaturan Improvement
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-slate-400">Memuat pengaturan...</div>
        ) : (
          <div className="space-y-5">
            {/* Limit Mingguan Universal */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-emerald-800">Limit Mingguan Universal</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {limitAktif ? "Aktif — sekali atur berlaku untuk seluruh siswa" : "Nonaktif — petugas atur manual per record di form Tambah Improvement"}
                  </p>
                </div>
                <Switch checked={limitAktif} onCheckedChange={setLimitAktif} />
              </div>
              {limitAktif && (
                <div>
                  <Label>Batas Maksimal Poin Pengurangan per Minggu</Label>
                  <Input
                    type="number"
                    min="1"
                    value={limitUniversal}
                    onChange={(e) => setLimitUniversal(e.target.value)}
                    disabled={!limitAktif}
                  />
                  <p className="text-xs text-slate-500 mt-1">Sesuai Ketentuan No. 3: maksimal 30 poin/minggu</p>
                </div>
              )}
            </div>

            {/* Toggle Akumulasi Poin Pelanggaran Lama — Admin/TU/Kepsek */}
            {canKelola && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-amber-800 flex items-center gap-2">
                      <Power className="w-4 h-4" /> Akumulasi Poin Pelanggaran Lama
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {akumulasiLama
                        ? "Aktif — Poin Pelanggaran Lama diakumulasi dengan Poin Pelanggaran Baru dan masuk ke Poin Bersih. Catatan lama tetap tampil di tab Improvement (Cari Record Siswa)."
                        : "Nonaktif — hanya Poin Pelanggaran Baru (Improvement) yang dihitung ke Poin Bersih"}
                    </p>
                  </div>
                  <Switch checked={akumulasiLama} onCheckedChange={setAkumulasiLama} />
                </div>
              </div>
            )}

            {/* Toggle Modul Pelanggaran Lama — Admin only */}
            {isAdmin && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-red-800 flex items-center gap-2">
                      <Power className="w-4 h-4" /> Modul Pelanggaran (Lama)
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      {pelanggaranAktif
                        ? "Aktif — tab Pelanggaran tampil, sistem pelanggaran lama berjalan"
                        : "Nonaktif — tab Pelanggaran disembunyikan, semua pencatatan beralih ke sistem Improvement"}
                    </p>
                  </div>
                  <Switch checked={pelanggaranAktif} onCheckedChange={setPelanggaranAktif} />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Batal</Button>
              <Button type="button" onClick={handleSave} disabled={saveMutation.isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {saveMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}