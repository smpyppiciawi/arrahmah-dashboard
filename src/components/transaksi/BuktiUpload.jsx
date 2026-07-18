import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X, Loader2, Paperclip } from "lucide-react";

export default function BuktiUpload({ buktiFile, onUpload, onClear }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const result = await base44.integrations.Core.UploadFile({ file });
      onUpload(result.file_url);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (buktiFile) {
    return (
      <div className="space-y-2">
        <Label>Bukti Transaksi</Label>
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <a
            href={buktiFile}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-emerald-700 hover:underline flex-1 truncate"
          >
            Lihat bukti transaksi
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-red-500 hover:text-red-600 h-7 w-7 p-0"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>
        Bukti Transaksi <span className="text-slate-400 text-xs font-normal">(Opsional — bisa disusul)</span>
      </Label>
      <label className="flex items-center gap-2 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition">
        {uploading ? (
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 text-slate-400" />
        )}
        <span className="text-sm text-slate-500 flex-1">
          {uploading ? 'Mengunggah...' : 'Klik untuk upload bukti (nota / struk / bukti transfer)'}
        </span>
        {!uploading && <Paperclip className="w-3.5 h-3.5 text-slate-300" />}
        <input
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,.pdf"
          disabled={uploading}
        />
      </label>
    </div>
  );
}