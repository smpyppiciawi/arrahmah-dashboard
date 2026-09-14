import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, ScanLine, Trash2, Sparkles, Activity, Gauge, ChevronRight } from 'lucide-react';

const TABS = [
  { key: 'cleanup', label: 'Cleanup Tool', icon: ScanLine },
  { key: 'guard', label: 'Guard Feed', icon: Activity },
  { key: 'monitor', label: 'Trigger Monitor', icon: Gauge },
];

function MonospaceTime({ iso }) {
  const text = iso ? new Date(iso).toISOString().slice(0, 19).replace('T', ' ') + 'Z' : '—';
  return <span className="font-mono text-[11px] text-slate-500 tabular-nums">{text}</span>;
}

export default function AntiDedupAlfa() {
  const { user } = useAuth();
  const role = user?.role || 'guru';
  const canExecute = ['admin', 'kepsek'].includes(role);

  const [tab, setTab] = useState('cleanup');
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const invokeCleanup = async (runDry) => {
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke('cleanupDuplicatePelanggaranAlfa', { dry_run: runDry });
      const data = res && res.data ? res.data : res;
      setResult(data);
    } catch (e) {
      setError(e?.message || 'Gagal menjalankan proses');
    } finally {
      setLoading(false);
    }
  };

  const flagged = result?.flagged || [];
  const keepRows = flagged.filter(f => f.action === 'keep');
  const purgeRows = flagged.filter(f => f.action === 'purge');

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      {/* Top filter scope bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-slate-900 text-sm leading-none truncate">Anti-Dedup Alfa</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Mitigasi data ganda pelanggaran otomatis F-02 / F-05</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">Aktif Tahun Ajaran 2026/2027</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-emerald-600 font-semibold">Active Guarding</span>
          </div>
        </div>
      </div>

      <div className="lg:flex">
        {/* Left rail */}
        <aside className="lg:w-[280px] lg:flex-shrink-0 border-r border-slate-200 bg-white lg:min-h-[calc(100vh-3.5rem)] lg:sticky lg:top-14">
          <div className="p-5 space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Navigasi</p>
              <div className="space-y-1">
                {TABS.map(t => {
                  const Icon = t.icon;
                  const active = tab === t.key;
                  return (
                    <button key={t.key} onClick={() => setTab(t.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">{t.label}</span>
                      {active && <ChevronRight className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-slate-700">Active Guarding</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Re-check race-condition guard aktif pada <span className="font-mono text-slate-600">createPelanggaranFromAlfa</span>. Eksekusi paralel yang lolos pre-check akan menghapus record kembar (keep oldest).
              </p>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Total Poin Diperbaiki</p>
              <p className="font-display font-bold text-3xl text-slate-900 tabular-nums">
                {(result && !result.dry_run ? result.points_restored : 0).toLocaleString('id-ID')}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">poin ganda dikembalikan ke akumulasi siswa</p>
            </div>
          </div>
        </aside>

        {/* Main stage */}
        <main className="flex-1 p-4 md:p-6 space-y-5 min-w-0">
          {tab === 'cleanup' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Cleanup suite (60%) */}
                <Card className="lg:col-span-3 border-slate-200 shadow-sm">
                  <CardHeader className="border-b border-slate-200 pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="font-display text-slate-900 text-base">Cleanup Duplicate Violations</CardTitle>
                      {canExecute ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Dry-run</span>
                          <Switch checked={dryRun} onCheckedChange={setDryRun} />
                        </div>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500">Read-only</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button onClick={() => invokeCleanup(true)} disabled={loading}
                        className="bg-amber-600 hover:bg-amber-700 text-white">
                        <ScanLine className="w-4 h-4 mr-2" /> Scan Duplicates
                      </Button>
                      {canExecute && (
                        <Button onClick={() => invokeCleanup(false)} disabled={loading || dryRun || (result !== null && result.records_purged > 0)}
                          className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40">
                          <Trash2 className="w-4 h-4 mr-2" /> Purge Duplicates
                        </Button>
                      )}
                      {dryRun && canExecute && (
                        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                          Purge dinonaktifkan saat dry-run aktif. Matikan toggle untuk eksekusi.
                        </span>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="text-[11px] text-slate-500">Aksi</TableHead>
                            <TableHead className="text-[11px] text-slate-500">Siswa</TableHead>
                            <TableHead className="text-[11px] text-slate-500">Tanggal</TableHead>
                            <TableHead className="text-[11px] text-slate-500">Kode</TableHead>
                            <TableHead className="text-[11px] text-slate-500 text-right">Poin Ganda</TableHead>
                            <TableHead className="text-[11px] text-slate-500">Timestamp</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {flagged.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                                {loading ? 'Memindai...' : 'Belum ada pemindaian. Tekan "Scan Duplicates" untuk memulai.'}
                              </TableCell>
                            </TableRow>
                          )}
                          {flagged.map(f => (
                            <TableRow key={f.id} className={f.action === 'purge' ? 'bg-red-50/40' : ''}>
                              <TableCell>
                                {f.action === 'keep'
                                  ? <Badge className="bg-emerald-100 text-emerald-700">Keep</Badge>
                                  : <Badge className="bg-red-100 text-red-700">Purge</Badge>}
                              </TableCell>
                              <TableCell>
                                <p className="text-sm font-medium text-slate-900 truncate max-w-[160px]">{f.nama_siswa}</p>
                                <p className="text-[11px] text-slate-400">{f.nama_kelas} · {f.nis}</p>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-slate-600">{f.tanggal}</TableCell>
                              <TableCell><Badge className="bg-slate-900 text-white text-[11px]">{f.kode}</Badge></TableCell>
                              <TableCell className="text-right text-sm font-semibold text-slate-700 tabular-nums">{f.poin}</TableCell>
                              <TableCell><MonospaceTime iso={f.created_date} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                  </CardContent>
                </Card>

                {/* Guard feed (40%) */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                  <CardHeader className="border-b border-slate-200 pb-4">
                    <CardTitle className="font-display text-slate-900 text-base flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-600" /> Deduplication Guard Feed
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-semibold text-emerald-800">Race-condition interception aktif</p>
                      <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                        Setiap <span className="font-mono">create</span> menjalankan re-query; record kembar yang lolos pre-check otomatis dihapus (keep oldest by <span className="font-mono">created_date</span>).
                      </p>
                    </div>
                    {result ? (
                      <div className="space-y-2">
                        <FeedRow label="Mode" value={result.dry_run ? 'Dry-run (scan)' : 'Eksekusi (purge)'} />
                        <FeedRow label="Twin sets terdeteksi" value={`${result.twin_sets ?? 0}`} />
                        <FeedRow label="Record akan dihapus" value={`${purgeRows.length}`} />
                        <FeedRow label="Record dipertahankan" value={`${keepRows.length}`} />
                        {!result.dry_run && (
                          <FeedRow label="Record terhapus" value={`${result.records_purged ?? 0}`} highlight="emerald" />
                        )}
                        {!result.dry_run && (
                          <FeedRow label="Poin dikembalikan" value={`${(result.points_restored ?? 0).toLocaleString('id-ID')}`} highlight="emerald" />
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-4 text-center">Jalankan Scan untuk mengisi feed.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Bottom summary band */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard icon={Sparkles} label="Total Poin Dikembalikan"
                  value={result && !result.dry_run ? (result.points_restored ?? 0).toLocaleString('id-ID') : '0'}
                  tone="emerald" />
                <SummaryCard icon={Trash2} label="Record Yatim Dibersihkan"
                  value={result && !result.dry_run ? `${result.records_purged ?? 0}` : '0'}
                  tone="red" />
                <SummaryCard icon={ShieldCheck} label="Trigger Sanity (snapshot diff)"
                  value="Active" tone="slate" />
              </div>
            </>
          )}

          {tab === 'guard' && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200 pb-4">
                <CardTitle className="font-display text-slate-900 text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" /> Live Intercept Guard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Guard re-check berjalan server-side di dalam <span className="font-mono text-slate-800">createPelanggaranFromAlfa</span> setiap kali workflow "Pelanggaran Otomatis Alfa" memicu pembuatan record. Karena pembersihan terjadi real-time per-event, record kembar tidak bertahan di database.
                </p>
                <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                  <FeedRow label="Sumber pelapor terjaga" value="Admin/Sistem · Sistem-Backfill" />
                  <FeedRow label="Kunci dedup" value="siswa_id + tanggal + kode" />
                  <FeedRow label="Strategi keep" value="Oldest created_date" />
                  <FeedRow label="Pre-check" value="Skip jika record aktif sudah ada" />
                  <FeedRow label="Post-create re-check" value="Hapus overflow paralel" highlight="emerald" />
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'monitor' && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200 pb-4">
                <CardTitle className="font-display text-slate-900 text-base flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-slate-700" /> Workflow Trigger Monitor
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <p className="text-xs text-emerald-800">Snapshot diff check aktif — trigger update hanya memicu jika <span className="font-mono">old_data.status</span> non-null.</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Kondisi trigger aktif</p>
                  <pre className="font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">{`create + status == "Alfa"
OR update + old_data.status != null
        + old_data.status != "Alfa"
        + data.status == "Alfa"
OR update + old_data.status == "Alfa"
        + data.status != "Alfa"`}</pre>
                </div>
                <p className="text-xs text-slate-500">Perubahan mencegah trigger ganda saat update tidak membawa snapshot data lama, penyebab utama duplikasi F-02.</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Mobile sticky scan action */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 p-3">
        <Button onClick={() => invokeCleanup(true)} disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
          <ScanLine className="w-4 h-4 mr-2" /> Scan & Cleanup
        </Button>
      </div>
    </div>
  );
}

function FeedRow({ label, value, highlight }) {
  const tone = highlight === 'emerald' ? 'text-emerald-700 font-semibold' : 'text-slate-700';
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-mono ${tone}`}>{value}</span>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  const tones = {
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    red: 'text-red-600 bg-red-50 border-red-200',
    slate: 'text-slate-600 bg-slate-50 border-slate-200',
  };
  return (
    <Card className={`border ${tones[tone]} shadow-sm`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500">{label}</p>
          <p className="font-display font-bold text-xl text-slate-900 tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}