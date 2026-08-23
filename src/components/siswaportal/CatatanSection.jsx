import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function CatatanSection({ siswa, pelanggaranList = [], pelanggaranImprovementList = [], improvementList = [], prestasiList = [], absensiList = [] }) {
  const isFemale = siswa?.jenis_kelamin === 'Perempuan';
  const isMale = siswa?.jenis_kelamin === 'Laki-laki';

  const { data: uksList = [] } = useQuery({
    queryKey: ['siswa-uks', siswa?.id],
    queryFn: () => base44.entities.UKS.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
  });

  const { data: izinList = [] } = useQuery({
    queryKey: ['siswa-izin', siswa?.id],
    queryFn: () => base44.entities.IzinSiswa.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id,
  });

  const { data: menstruasiList = [] } = useQuery({
    queryKey: ['siswa-menstruasi', siswa?.id],
    queryFn: () => base44.entities.Menstruasi.filter({ siswa_id: siswa.id }),
    enabled: !!siswa?.id && isFemale,
  });

  // Jumat absensi: Keputrian for female, Jumatan for male
  const jumatList = absensiList.filter(a => a.jenis_absensi === 'Jumat');

  const totalPoin = pelanggaranList.reduce((s, p) => s + (p.poin || 0), 0);
  const totalPoinImprovement = pelanggaranImprovementList.reduce((s, p) => s + (p.poin || 0), 0);
  const totalPengurangan = improvementList.filter(i => i.status === 'Aktif').reduce((s, i) => s + (i.poin_pengurangan || 0), 0);
  const poinBersih = totalPoin + totalPoinImprovement - totalPengurangan;

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 px-5 pt-10 pb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
        <h2 className="text-white font-black text-2xl flex items-center gap-3 relative">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl">📋</div>
          Catatan
        </h2>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Ringkasan Poin Bersih */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-5 text-white shadow-lg">
          <p className="text-slate-300 text-xs font-medium mb-2">Ringkasan Poin Disiplin</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-black">{poinBersih}</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Poin Bersih (Net)</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-red-300 text-xs">Pelanggaran: {totalPoin + totalPoinImprovement}</p>
              <p className="text-emerald-300 text-xs">Pengurangan: {totalPengurangan}</p>
            </div>
          </div>
        </div>

        {/* Pelanggaran */}
        <Section title="⚠️ Pelanggaran" badge={`${totalPoin + totalPoinImprovement} poin`} badgeColor={(totalPoin + totalPoinImprovement) === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
          {pelanggaranList.length === 0 && pelanggaranImprovementList.length === 0 ? (
            <EmptyCard emoji="✅" title="Hebat! Tidak ada pelanggaran" subtitle="Tetap pertahankan ya!" color="emerald" />
          ) : (
            <div className="space-y-2">
              {pelanggaranImprovementList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).map((p, idx) => (
                <div key={`imp-${idx}`} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">{p.kode}</span>
                        <span className="text-[9px] text-slate-400">{p.kategori_utama}</span>
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">{p.uraian_pelanggaran}</p>
                      {p.rincian && <p className="text-slate-400 text-xs mt-0.5">{p.rincian}</p>}
                      <p className="text-slate-400 text-xs mt-1">{p.tanggal} · {p.pelapor_nama || '-'}</p>
                      {p.tindak_lanjut && <p className="text-amber-500 text-xs mt-1">📋 {p.tindak_lanjut}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-red-600 font-black text-lg">{p.poin}</span>
                      <span className="text-[9px] text-red-400">poin</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                    </div>
                  </div>
                </div>
              ))}
              {pelanggaranList.map((p, idx) => (
                <div key={`leg-${idx}`} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-sm">{p.uraian}</p>
                      <p className="text-slate-400 text-xs mt-1">{p.tanggal} · {p.jenis_pelanggaran}</p>
                      {p.sanksi && <p className="text-red-500 text-xs mt-1">⚡ {p.sanksi}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-red-600 font-black text-lg">{p.poin}</span>
                      <span className="text-[9px] text-red-400">poin</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Improvement */}
        <Section title="🌱 Improvement" badge={`${totalPengurangan} poin`} badgeColor={totalPengurangan === 0 ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}>
          {improvementList.length === 0 ? (
            <EmptyCard emoji="🌱" title="Belum ada kegiatan improvement" subtitle="Ikuti pembinaan untuk kurangi poin" color="slate" />
          ) : (
            <div className="space-y-2">
              {improvementList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).map((i, idx) => (
                <div key={idx} className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{i.kategori}</span>
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">{i.kegiatan_pembinaan_nama || i.uraian}</p>
                      {i.uraian && i.kegiatan_pembinaan_nama && <p className="text-slate-400 text-xs mt-0.5">{i.uraian}</p>}
                      <p className="text-slate-400 text-xs mt-1">{i.tanggal} · {i.validator_nama || '-'}</p>
                      {i.catatan && <p className="text-slate-500 text-xs mt-1">📝 {i.catatan}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-emerald-600 font-black text-lg">-{i.poin_pengurangan}</span>
                      <span className="text-[9px] text-emerald-500">poin</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${i.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{i.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Prestasi */}
        <Section title="🏆 Prestasi" badge={`${prestasiList.length} pencapaian`} badgeColor="bg-yellow-100 text-yellow-700">
          {prestasiList.length === 0 ? (
            <EmptyCard emoji="🏅" title="Belum ada prestasi tercatat" subtitle="Terus semangat berprestasi!" color="slate" />
          ) : (
            <div className="space-y-2">
              {prestasiList.map((p, idx) => (
                <div key={idx} className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-2xl flex items-center justify-center text-xl shrink-0">🏆</div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 text-sm">{p.nama_prestasi}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{p.tanggal} · {p.jenis_prestasi}</p>
                      {p.penyelenggara && <p className="text-slate-400 text-xs">{p.penyelenggara}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">{p.kategori}</span>
                      <span className="text-[10px] text-slate-400">{p.tingkat}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* UKS */}
        <Section title="💊 UKS" badge={`${uksList.length} catatan`} badgeColor="bg-rose-100 text-rose-700">
          {uksList.length === 0 ? (
            <EmptyCard emoji="✅" title="Tidak ada catatan UKS" subtitle="Siswa dalam keadaan sehat" color="emerald" />
          ) : (
            <div className="space-y-2">
              {uksList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).map((u, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center shrink-0">💊</div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-sm">{u.keluhan || u.diagnosa || 'Kunjungan UKS'}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{u.tanggal} · {u.jam_masuk}</p>
                      {u.penanganan && <p className="text-slate-500 text-xs mt-1">🩹 {u.penanganan}</p>}
                      <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${u.status === 'Di UKS' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{u.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Izin */}
        <Section title="📝 Izin" badge={`${izinList.length} izin`} badgeColor="bg-blue-100 text-blue-700">
          {izinList.length === 0 ? (
            <EmptyCard emoji="📋" title="Belum ada data izin" subtitle="-" color="slate" />
          ) : (
            <div className="space-y-2">
              {izinList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).map((iz, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-sm">{iz.alasan_manual || iz.alasan}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{iz.tanggal} · Jam {iz.jam_izin}</p>
                      {iz.keterangan && <p className="text-slate-500 text-xs mt-1">{iz.keterangan}</p>}
                    </div>
                    <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">{iz.alasan}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Menstruasi (Female only) */}
        {isFemale && (
          <Section title="🌙 Menstruasi" badge={`${menstruasiList.length} catatan`} badgeColor="bg-pink-100 text-pink-700">
            {menstruasiList.length === 0 ? (
              <EmptyCard emoji="📋" title="Belum ada data menstruasi" subtitle="-" color="slate" />
            ) : (
              <div className="space-y-2">
                {menstruasiList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).map((m, idx) => (
                  <div key={idx} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-2xl flex items-center justify-center shrink-0">🌙</div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{m.tanggal}</p>
                      <p className="text-slate-400 text-xs">{m.nama_kelas}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Keputrian (Female) / Jumatan (Male) */}
        {(isFemale || isMale) && (
          <Section title={isFemale ? "🕌 Keputrian" : "🕌 Jumatan"} badge={`${jumatList.length} catatan`} badgeColor="bg-violet-100 text-violet-700">
            {jumatList.length === 0 ? (
              <EmptyCard emoji="📋" title={`Belum ada data ${isFemale ? 'Keputrian' : 'Jumatan'}`} subtitle="-" color="slate" />
            ) : (
              <div className="space-y-2">
                {jumatList.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)).map((j, idx) => (
                  <div key={idx} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-violet-100 rounded-2xl flex items-center justify-center shrink-0">🕌</div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{j.tanggal}</p>
                        {j.keterangan && <p className="text-slate-400 text-xs">{j.keterangan}</p>}
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      j.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700' :
                      j.status === 'Alfa' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{j.status}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, badge, badgeColor, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-700 font-bold text-sm">{title}</p>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${badgeColor}`}>{badge}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyCard({ emoji, title, subtitle, color }) {
  const colors = {
    emerald: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
    slate: 'bg-white text-slate-500',
  };
  return (
    <div className={`${colors[color] || colors.slate} ${color === 'emerald' ? 'border' : ''} rounded-3xl p-6 text-center shadow-sm`}>
      <span className="text-4xl block mb-2">{emoji}</span>
      <p className="font-bold text-sm">{title}</p>
      {subtitle !== '-' && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
    </div>
  );
}