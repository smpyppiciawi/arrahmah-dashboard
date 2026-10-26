import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X, Loader2, Paperclip } from "lucide-react";

// Unggah lebih dari satu bukti transaksi (nota / struk / bukti transfer).
// value: array URL, onChange(array) dipanggil setiap ada tambah/hapus.
export default function BuktiUpload({ value = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const files = Array.isArray(value) ? value.filter(Boolean) : [];

  const handleFileChange = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    try {
      setUploading(true);
      const uploaded = [];
      for (const file of picked) {
        const result = await base44.integrations.Core.UploadPublicFile({ file });
        if (result?.file_url) uploaded.push(result.file_url);
      }
      onChange([...files, ...uploaded]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAt = (index) => onChange(files.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <Label>
        Bukti Transaksi{' '}
        <span className="text-slate-400 text-xs font-normal">
          (Opsional — bisa lebih dari 1, bisa disusul)
        </span>
      </Label>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((url, i) => (
            <div key={`${url}-${i}`} className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-700 hover:underline flex-1 truncate"
              >
                Bukti {i + 1} — lihat berkas
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeAt(i)}
                className="text-red-500 hover:text-red-600 h-7 w-7 p-0"
                title="Hapus bukti ini"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <label className="flex items-center gap-2 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition">
        {uploading ? (
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 text-slate-400" />
        )}
        <span className="text-sm text-slate-500 flex-1">
          {uploading
            ? 'Mengunggah...'
            : files.length > 0
              ? 'Tambah bukti lain (bisa pilih beberapa berkas sekaligus)'
              : 'Klik untuk upload bukti (nota / struk / bukti transfer)'}
        </span>
        {!uploading && <Paperclip className="w-3.5 h-3.5 text-slate-300" />}
        <input
          type="file"
          className="hidden"
          multiple
          onChange={handleFileChange}
          accept="image/*,.pdf"
          disabled={uploading}
        />
      </label>
    </div>
  );
}