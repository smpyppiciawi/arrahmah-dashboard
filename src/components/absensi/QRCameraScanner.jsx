import React, { useRef, useEffect, useState } from 'react';
import { Camera } from "lucide-react";

export default function QRCameraScanner({ onScan, active }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastScanRef = useRef({ value: '', time: 0 });
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    let intervalId;
    let barcodeDetector;
    const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }

        if (supported) {
          try {
            barcodeDetector = new window.BarcodeDetector({
              formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8']
            });
          } catch {
            barcodeDetector = new window.BarcodeDetector();
          }
          intervalId = setInterval(async () => {
            if (!videoRef.current || !barcodeDetector) return;
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                const value = barcodes[0].rawValue;
                const now = Date.now();
                if (value === lastScanRef.current.value && now - lastScanRef.current.time < 3000) return;
                lastScanRef.current = { value, time: now };
                onScan(value);
              }
            } catch (e) {
              // ignore detect errors
            }
          }, 400);
        } else {
          setError('Browser tidak mendukung pemindaian kamera. Gunakan mode Pembaca (Scanner).');
        }
      } catch (err) {
        setError(`Akses kamera gagal: ${err.message}`);
      }
    };

    startCamera();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setReady(false);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="space-y-2">
      {error ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <Camera className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm text-amber-700">{error}</p>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-slate-900">
          <video ref={videoRef} className="w-full h-56 object-cover" playsInline muted />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white/80 rounded-2xl relative">
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
              <div className="absolute inset-x-2 top-1/2 h-0.5 bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse" />
            </div>
          </div>
          <p className="absolute bottom-2 inset-x-0 text-center text-white/80 text-xs">Arahkan kamera ke QR Code</p>
        </div>
      )}
    </div>
  );
}