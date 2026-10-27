import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, FileText, Link2, Pencil, Trash2, Eye, NotebookPen, UserX } from 'lucide-react';
import { formatTanggalSingkat, ringkasAbsensi } from '@/lib/agendaUtils';

export default function AgendaDaftarList({ items = [], loading, onOpen, onDelete, canEdit }) {
  const [preview, setPreview] = useState(null);

  if (loading) {
    return <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center text-sm text-slate-400">Memuat daftar agenda...</CardContent></Card>;
  }

  if (items.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <NotebookPen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Belum ada agenda yang cocok dengan pencarian/filter</p>
          <p className="text-xs text-slate-400 mt-1">Isi agenda dari daftar jadwal mengajar di atas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => {
          const ringkas = ringkasAbsensi(item.absensi_agenda);
          const files = item.file_urls || [];
          return (
            <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-600 border-slate-200">
                    {item.hari}, {formatTanggalSingkat(item.tanggal)}
                  </Badge>
                  <Badge variant="secondary" className="text-[11px]">{item.nama_kelas}</Badge>
                  <Badge variant="outline" className="text-[11px]">{item.mapel}</Badge>
                  {item.legacy && (
                    <Badge className="text-[11px] bg-amber-100 text-amber-700 hover:bg-amber-100">Arsip Materi</Badge>
                  )}
                </div>

                <h3 className="font-medium text-slate-800 leading-snug line-clamp-2">{item.materi_pokok || '—'}</h3>
                {item.uraian_kegiatan && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.uraian_kegiatan}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
                  {item.jam_mulai && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {item.jam_mulai} – {item.jam_selesai}
                    </span>
                  )}
                  {item.nama_guru && <span className="truncate max-w-[160px]">{item.nama_guru}</span>}
                  {!item.legacy && ringkas.total > 0 && (
                    <span className={`inline-flex items-center gap-1 ${ringkas.tidakHadir > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                      <UserX className="w-3.5 h-3.5" /> {ringkas.tidakHadir} tidak hadir KBM
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t">
                  {files.slice(0, 1).map((url) => (
                    <Button key={url} size="sm" variant="outline" className="h-8" asChild>
                      <a href={url} target="_blank" rel="noopener noreferrer"><FileText className="w-3.5 h-3.5 mr-1" /> File</a>
                    </Button>
                  ))}
                  {item.link_materi && (
                    <Button size="sm" variant="outline" className="h-8" asChild>
                      <a href={item.link_materi} target="_blank" rel="noopener noreferrer"><Link2 className="w-3.5 h-3.5 mr-1" /> Tautan</a>
                    </Button>
                  )}
                  <div className="flex-1" />
                  {item.legacy ? (
                    <Button size="sm" variant="ghost" className="h-8 text-slate-600" onClick={() => setPreview(item)}>
                      <Eye className="w-3.5 h-3.5 mr-1" /> Detail
                    </Button>
                  ) : (
                    <>
                      {canEdit(item) && (
                        <>
                          <Button size="sm" variant="ghost" className="h-8 text-indigo-600" onClick={() => onOpen(item)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-rose-500" onClick={() => onDelete(item)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      {!canEdit(item) && (
                        <Button size="sm" variant="ghost" className="h-8 text-slate-600" onClick={() => setPreview(item)}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Lihat
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Agenda</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{preview.hari}, {formatTanggalSingkat(preview.tanggal)}</Badge>
                <Badge variant="secondary">{preview.nama_kelas}</Badge>
                <Badge variant="outline">{preview.mapel}</Badge>
                {preview.legacy && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Arsip Materi</Badge>}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Materi Pokok</p>
                <p className="text-slate-800">{preview.materi_pokok || '—'}</p>
              </div>
              {preview.uraian_kegiatan && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Uraian Kegiatan KBM</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{preview.uraian_kegiatan}</p>
                </div>
              )}
              {preview.deskripsi && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Deskripsi</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{preview.deskripsi}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {(preview.file_urls || []).map((url) => (
                  <Button key={url} size="sm" variant="outline" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer"><FileText className="w-3.5 h-3.5 mr-1" /> Buka File</a>
                  </Button>
                ))}
                {preview.link_materi && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={preview.link_materi} target="_blank" rel="noopener noreferrer"><Link2 className="w-3.5 h-3.5 mr-1" /> Buka Tautan</a>
                  </Button>
                )}
              </div>
              {!preview.legacy && (preview.absensi_agenda || []).length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="text-left px-3 py-2">Nama Siswa</th>
                        <th className="text-center px-3 py-2">Absen Agenda</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.absensi_agenda.map((a) => (
                        <tr key={a.siswa_id} className="border-t">
                          <td className="px-3 py-1.5 text-slate-700">{a.nama_siswa}</td>
                          <td className="px-3 py-1.5 text-center">{a.status_agenda}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={() => setPreview(null)}>Tutup</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}