import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ZoomIn, Check, X } from 'lucide-react';

const VIEWPORT = 300;
const OUTPUT = 512;
const MAX_BYTES = 1024 * 1024; // 1 MB

const toBlob = (canvas, quality) =>
  new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));

export default function ImageCropper({ open, imageSrc, onCancel, onConfirm }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [img, setImg] = useState(null);
  const [baseScale, setBaseScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  useEffect(() => {
    if (!open || !imageSrc) return;
    setZoom(1);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      const bs = Math.max(VIEWPORT / image.width, VIEWPORT / image.height);
      setBaseScale(bs);
      setOffset({ x: (VIEWPORT - image.width * bs) / 2, y: (VIEWPORT - image.height * bs) / 2 });
    };
    image.src = imageSrc;
  }, [open, imageSrc]);

  const scale = baseScale * zoom;
  const dispW = img ? img.width * scale : 0;
  const dispH = img ? img.height * scale : 0;

  const clamp = (ox, oy) => {
    if (!img) return { x: 0, y: 0 };
    return {
      x: Math.min(0, Math.max(VIEWPORT - dispW, ox)),
      y: Math.min(0, Math.max(VIEWPORT - dispH, oy)),
    };
  };

  const onPointerDown = (e) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset(clamp(dragStart.current.ox + dx, dragStart.current.oy + dy));
  };
  const onPointerUp = () => setDragging(false);

  const handleZoom = (z) => {
    setZoom(z);
    if (img) {
      const s = baseScale * z;
      setOffset({ x: (VIEWPORT - img.width * s) / 2, y: (VIEWPORT - img.height * s) / 2 });
    }
  };

  const doCrop = async () => {
    if (!img) return;
    const sourceX = -offset.x / scale;
    const sourceY = -offset.y / scale;
    const sourceW = VIEWPORT / scale;
    const sourceH = VIEWPORT / scale;

    let size = OUTPUT;
    let quality = 0.92;
    let blob;

    const draw = (sz, q) => {
      const c = document.createElement('canvas');
      c.width = sz; c.height = sz;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, sz, sz);
      return toBlob(c, q);
    };

    blob = await draw(size, quality);
    while (blob.size > MAX_BYTES && quality > 0.5) {
      quality -= 0.1;
      blob = await draw(size, quality);
    }
    while (blob.size > MAX_BYTES && size > 256) {
      size = Math.floor(size / 1.5);
      blob = await draw(size, 0.85);
    }

    onConfirm(blob);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-[340px] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-center text-base">Atur Foto Profil</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-2 flex flex-col items-center gap-3">
          <div
            className="relative bg-slate-900 overflow-hidden rounded-xl touch-none select-none cursor-grab active:cursor-grabbing"
            style={{ width: VIEWPORT, height: VIEWPORT }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {img && (
              <img
                src={imageSrc}
                alt="preview"
                draggable={false}
                className="absolute top-0 left-0 pointer-events-none max-w-none"
                style={{ width: dispW, height: dispH, transform: `translate(${offset.x}px, ${offset.y}px)` }}
              />
            )}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-4 rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full px-2">
            <ZoomIn className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => handleZoom(Number(e.target.value))}
              className="flex-1 accent-violet-600"
            />
          </div>
          <p className="text-xs text-slate-400 text-center">Seret untuk mengatur posisi & geser slider untuk memperbesar. Foto otomatis dikompres maks. 1 MB.</p>
        </div>
        <DialogFooter className="p-4 pt-2 flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" /> Batal
          </Button>
          <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={doCrop}>
            <Check className="w-4 h-4 mr-1" /> Pilih
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}