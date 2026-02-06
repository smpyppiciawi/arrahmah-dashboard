import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, AlertTriangle, Award, Heart, Wallet, BookOpen,
  TrendingUp, TrendingDown, Eye, MessageCircle
} from "lucide-react";

export default function DataOverview({ 
  siswaBermasalah, 
  nilaiBermasalah, 
  pelanggaranAktif, 
  prestasiTerbaru,
  uksTerbaru,
  tunggakanSiswa,
  formatRupiah,
  onViewDetail,
  onWhatsApp
}) {
  return (
    <Tabs defaultValue="siswa-bermasalah" className="w-full">
      <TabsList className="grid w-full grid-cols-6 h-auto">
        <TabsTrigger value="siswa-bermasalah" className="text-xs py-2">
          <AlertTriangle className="w-3 h-3 mr-1" /> Perhatian
        </TabsTrigger>
        <TabsTrigger value="nilai" className="text-xs py-2">
          <TrendingDown className="w-3 h-3 mr-1" /> Nilai
        </TabsTrigger>
        <TabsTrigger value="pelanggaran" className="text-xs py-2">
          <AlertTriangle className="w-3 h-3 mr-1" /> Pelanggaran
        </TabsTrigger>
        <TabsTrigger value="prestasi" className="text-xs py-2">
          <Award className="w-3 h-3 mr-1" /> Prestasi
        </TabsTrigger>
        <TabsTrigger value="uks" className="text-xs py-2">
          <Heart className="w-3 h-3 mr-1" /> UKS
        </TabsTrigger>
        <TabsTrigger value="tunggakan" className="text-xs py-2">
          <Wallet className="w-3 h-3 mr-1" /> Tunggakan
        </TabsTrigger>
      </TabsList>

      {/* Siswa Bermasalah */}
      <TabsContent value="siswa-bermasalah">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Siswa Perlu Perhatian Khusus
              <Badge className="bg-red-100 text-red-700 ml-auto">{siswaBermasalah.length} siswa</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {siswaBermasalah.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Tidak ada siswa bermasalah</p>
            ) : (
              <div className="space-y-2">
                {siswaBermasalah.map((siswa, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div>
                      <p className="font-medium text-sm">{siswa.nama}</p>
                      <p className="text-xs text-slate-500">{siswa.nama_kelas} - NIS: {siswa.nis}</p>
                      <div className="flex gap-1 mt-1">
                        {siswa.totalPoin > 0 && <Badge className="bg-red-100 text-red-700 text-[10px]">Poin: {siswa.totalPoin}</Badge>}
                        {siswa.nilaiRendah > 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Nilai Rendah: {siswa.nilaiRendah}</Badge>}
                        {siswa.alfaCount > 0 && <Badge className="bg-slate-100 text-slate-700 text-[10px]">Alfa: {siswa.alfaCount}x</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {siswa.no_telp_ortu && (
                        <Button size="sm" variant="ghost" className="h-8 text-emerald-600" onClick={() => onWhatsApp(siswa.no_telp_ortu, `Yth. Bapak/Ibu Orang Tua ${siswa.nama},\n\nKami dari pihak sekolah ingin menyampaikan informasi mengenai perkembangan putra/putri Bapak/Ibu.`)}>
                          <MessageCircle className="w-3 h-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => onViewDetail('siswa', siswa)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Nilai Bermasalah */}
      <TabsContent value="nilai">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-500" />
              Siswa dengan Nilai di Bawah KKM
              <Badge className="bg-amber-100 text-amber-700 ml-auto">{nilaiBermasalah.length} data</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {nilaiBermasalah.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Semua nilai di atas KKM</p>
            ) : (
              <div className="space-y-2">
                {nilaiBermasalah.slice(0, 20).map((nilai, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div>
                      <p className="font-medium text-sm">{nilai.nama_siswa}</p>
                      <p className="text-xs text-slate-500">{nilai.nama_kelas} - {nilai.mapel}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-red-100 text-red-700">{nilai.nilai}</Badge>
                      <p className="text-[10px] text-slate-400 mt-1">KKM: {nilai.kkm || 75}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Pelanggaran Aktif */}
      <TabsContent value="pelanggaran">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Pelanggaran Belum Selesai
              <Badge className="bg-red-100 text-red-700 ml-auto">{pelanggaranAktif.length} kasus</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {pelanggaranAktif.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Tidak ada pelanggaran aktif</p>
            ) : (
              <div className="space-y-2">
                {pelanggaranAktif.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div>
                      <p className="font-medium text-sm">{p.nama_siswa}</p>
                      <p className="text-xs text-slate-500">{p.nama_kelas} - {p.tanggal}</p>
                      <p className="text-xs text-red-600 mt-1">{p.uraian?.substring(0, 50)}...</p>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        p.jenis_pelanggaran === 'Sangat Berat' || p.jenis_pelanggaran === 'Berat' ? 'bg-red-500 text-white' :
                        p.jenis_pelanggaran === 'Sedang' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'
                      }>
                        {p.jenis_pelanggaran}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">Poin: {p.poin}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Prestasi */}
      <TabsContent value="prestasi">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              Prestasi Terbaru
              <Badge className="bg-yellow-100 text-yellow-700 ml-auto">{prestasiTerbaru.length} prestasi</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {prestasiTerbaru.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Belum ada data prestasi</p>
            ) : (
              <div className="space-y-2">
                {prestasiTerbaru.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <div>
                      <p className="font-medium text-sm">{p.nama_siswa}</p>
                      <p className="text-xs text-slate-500">{p.nama_kelas} - {p.tanggal}</p>
                      <p className="text-xs text-yellow-700 mt-1">{p.nama_prestasi}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-yellow-500 text-white">{p.kategori}</Badge>
                      <p className="text-xs text-slate-500 mt-1">{p.tingkat}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* UKS */}
      <TabsContent value="uks">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              Kunjungan UKS Terbaru
              <Badge className="bg-pink-100 text-pink-700 ml-auto">{uksTerbaru.length} kunjungan</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {uksTerbaru.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Tidak ada data UKS</p>
            ) : (
              <div className="space-y-2">
                {uksTerbaru.map((u, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-100">
                    <div>
                      <p className="font-medium text-sm">{u.nama_siswa}</p>
                      <p className="text-xs text-slate-500">{u.nama_kelas} - {u.tanggal}</p>
                      <p className="text-xs text-pink-700 mt-1">{u.keluhan}</p>
                    </div>
                    <Badge className={
                      u.status === 'Di UKS' ? 'bg-amber-500 text-white' :
                      u.status === 'Pulang' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                    }>
                      {u.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tunggakan */}
      <TabsContent value="tunggakan">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-red-500" />
              Siswa dengan Tunggakan
              <Badge className="bg-red-100 text-red-700 ml-auto">{tunggakanSiswa.length} siswa</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {tunggakanSiswa.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Tidak ada tunggakan</p>
            ) : (
              <div className="space-y-2">
                {tunggakanSiswa.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div>
                      <p className="font-medium text-sm">{s.nama}</p>
                      <p className="text-xs text-slate-500">{s.nama_kelas} - NIS: {s.nis}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{formatRupiah(s.tunggakan)}</p>
                      {s.no_telp_ortu && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-emerald-600 mt-1" onClick={() => onWhatsApp(s.no_telp_ortu, `Yth. Bapak/Ibu Orang Tua ${s.nama},\n\nKami dari pihak sekolah ingin mengingatkan mengenai tunggakan pembayaran sebesar ${formatRupiah(s.tunggakan)}.`)}>
                          <MessageCircle className="w-3 h-3 mr-1" /> Ingatkan
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}