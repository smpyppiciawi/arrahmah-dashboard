import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { NotebookPen, ShieldAlert } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { BULAN_CATATAN, canAksesCatatanKeuangan, hitungRingkasan, formatRupiah } from '@/lib/catatanKeuanganUtils';
import PeriodeFilter from '@/components/catatanKeuangan/PeriodeFilter';
import RingkasanSaldo from '@/components/catatanKeuangan/RingkasanSaldo';
import ItemForm from '@/components/catatanKeuangan/ItemForm';
import ItemList from '@/components/catatanKeuangan/ItemList';

const hariIni = () => new Date().toISOString().slice(0, 10);

export default function CatatanKeuangan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sekarang = new Date();

  const [bulan, setBulan] = useState(sekarang.getMonth() + 1);
  const [tahun, setTahun] = useState(sekarang.getFullYear());
  const [editingIndex, setEditingIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  const bolehAkses = canAksesCatatanKeuangan(user);

  const { data: catatanList = [], isLoading } = useQuery({
    queryKey: ['catatan-keuangan', bulan, tahun],
    queryFn: () => base44.entities.CatatanKeuangan.filter({ bulan, tahun }),
    enabled: bolehAkses,
  });

  const catatan = catatanList[0];
  const items = useMemo(() => catatan?.items || [], [catatan]);
  const ringkasan = useMemo(() => hitungRingkasan(items), [items]);

  if (!bolehAkses) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="mx-auto max-w-lg">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center space-y-2">
              <ShieldAlert className="mx-auto h-10 w-10 text-rose-400" />
              <p className="text-base font-semibold text-slate-800">Menu ini terbatas</p>
              <p className="text-sm text-slate-500">
                Catatan Keuangan hanya dapat dibuka oleh akun GUSTINI dengan role Bendahara atau Kepala Sekolah.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const simpanItems = async (nextItems) => {
    setSaving(true);
    try {
      if (catatan?.id) {
        await base44.entities.CatatanKeuangan.update(catatan.id, { items: nextItems });
      } else {
        await base44.entities.CatatanKeuangan.create({ bulan, tahun, items: nextItems });
      }
      setEditingIndex(null);
      await queryClient.invalidateQueries({ queryKey: ['catatan-keuangan'] });
    } catch (error) {
      toast({ title: 'Gagal menyimpan', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const tambahItem = (item) => {
    const next = editingIndex === null
      ? [...items, item]
      : items.map((it, i) => (i === editingIndex ? item : it));
    simpanItems(next);
  };

  const hapusItem = (index) => simpanItems(items.filter((_, i) => i !== index));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-500">Bendahara</p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2.5 mt-0.5">
            <NotebookPen className="w-7 h-7 text-teal-500" />
            Catatan Keuangan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Catatan bulanan pemasukan &amp; pengeluaran — {BULAN_CATATAN[bulan - 1]} {tahun}.
          </p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <PeriodeFilter
              bulan={bulan}
              tahun={tahun}
              onBulanChange={(v) => { setBulan(v); setEditingIndex(null); }}
              onTahunChange={(v) => { setTahun(v); setEditingIndex(null); }}
            />
          </CardContent>
        </Card>

        <RingkasanSaldo ringkasan={ringkasan} />

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Tambah Item</h2>
              <p className="text-xs text-slate-500">
                Pilih tanggal dan jenis, isi nama item &amp; nominal, lalu tekan tambah item.
              </p>
            </div>

            <ItemForm
              editing={editingIndex === null ? null : items[editingIndex]}
              defaultTanggal={hariIni()}
              saving={saving}
              onSimpan={tambahItem}
              onBatal={() => setEditingIndex(null)}
            />

            <div className="border-t pt-3">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Rincian {BULAN_CATATAN[bulan - 1]} {tahun}</h2>
                <span className="text-xs text-slate-400">{items.length} item · {formatRupiah(ringkasan.saldo)}</span>
              </div>

              {isLoading ? (
                <p className="py-8 text-center text-sm text-slate-400">Memuat catatan...</p>
              ) : (
                <ItemList items={items} onEdit={setEditingIndex} onHapus={hapusItem} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}