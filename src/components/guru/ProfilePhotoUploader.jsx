import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ImageCropper from '@/components/ui/ImageCropper';

export default function ProfilePhotoUploader({ guruId, fotoUrl, nama, avatarClass = '', buttonClass = '' }) {
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSelect = (file) => {
    if (!file || !guruId) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const handleConfirm = async (blob) => {
    setCropSrc(null);
    setUploading(true);
    try {
      const file = new File([blob], 'foto-profil.jpg', { type: 'image/jpeg' });
      const res = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Guru.update(guruId, { foto_url: res.file_url });
      queryClient.invalidateQueries({ queryKey: ['guru'] });
      toast({ title: '✅ Foto profil diperbarui' });
    } catch (e) {
      toast({ title: 'Gagal upload foto', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="relative inline-block">
        <div className={`${avatarClass} overflow-hidden`}>
          {fotoUrl
            ? <img src={fotoUrl} alt={nama} className="w-full h-full object-cover" />
            : <span className="font-black">{nama?.charAt(0) || '?'}</span>}
        </div>
        <label className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white text-violet-600 shadow-md flex items-center justify-center cursor-pointer hover:bg-violet-50 transition-colors ${buttonClass}`}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSelect(e.target.files?.[0])} disabled={uploading} />
        </label>
      </div>
      <ImageCropper open={!!cropSrc} imageSrc={cropSrc} onCancel={() => setCropSrc(null)} onConfirm={handleConfirm} />
    </>
  );
}