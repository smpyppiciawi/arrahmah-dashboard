import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Camera, ScanFace, CheckCircle, XCircle, CameraOff, RefreshCw } from "lucide-react";

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';
const MATCH_THRESHOLD = 0.5;
const SCAN_INTERVAL = 1500;

export default function FaceRecognition({ mode = 'scan', personType = 'Siswa', onRegister, onMatch, disabled }) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const faceDataRef = useRef([]);
  const cameraActiveRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => { cameraActiveRef.current = cameraActive; }, [cameraActive]);

  const loadModels = useCallback(async () => {
    if (modelsLoaded || loadingModels) return modelsLoaded;
    setLoadingModels(true);
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      return true;
    } catch (err) {
      toast({ title: 'Gagal memuat model AI', description: 'Periksa koneksi internet.', variant: 'destructive' });
      return false;
    } finally {
      setLoadingModels(false);
    }
  }, [modelsLoaded, loadingModels, toast]);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setScanning(false);
  }, []);

  const findMatch = (scannedDescriptor) => {
    let bestFace = null;
    let bestDistance = Infinity;
    for (const face of faceDataRef.current) {
      const faceDesc = new Float32Array(face.descriptor);
      let sum = 0;
      for (let i = 0; i < scannedDescriptor.length; i++) {
        const diff = scannedDescriptor[i] - faceDesc[i];
        sum += diff * diff;
      }
      const distance = Math.sqrt(sum);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestFace = face;
      }
    }
    return (bestFace && bestDistance < MATCH_THRESHOLD) ? bestFace : null;
  };

  const startScanLoop = useCallback(() => {
    if (faceDataRef.current.length === 0) {
      setResult({ status: 'error', message: 'Belum ada wajah terdaftar.' });
      setScanning(false);
      return;
    }
    setScanning(true);
    setResult({ status: 'info', message: 'Arahkan wajah ke kamera...' });

    let isProcessing = false;
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !modelsLoaded || isProcessing) return;
      isProcessing = true;
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          setResult(prev => (prev && prev.status === 'info') ? prev : { status: 'info', message: 'Arahkan wajah ke kamera...' });
          isProcessing = false;
          return;
        }

        setResult({ status: 'scanning', message: 'Memverifikasi wajah...' });
        const matchedFace = findMatch(detection.descriptor);

        if (matchedFace) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
          setScanning(false);
          setResult({ status: 'success', message: `Dikenali: ${matchedFace.nama}` });
          onMatch?.(matchedFace.card_id_virtual || `FACE-${matchedFace.person_id}`);
          setTimeout(() => {
            if (cameraActiveRef.current) {
              setResult(null);
              startScanLoop();
            }
          }, 3000);
        } else {
          setResult({ status: 'error', message: 'Wajah tidak dikenali.' });
        }
      } catch (err) {
        // silent
      }
      isProcessing = false;
    }, SCAN_INTERVAL);
  }, [modelsLoaded, onMatch]);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({ title: 'Kamera tidak didukung', description: 'Gunakan browser modern dengan HTTPS.', variant: 'destructive' });
      return;
    }
    const ok = await loadModels();
    if (!ok) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      setCameraActive(true);
      setResult(null);

      if (mode === 'scan') {
        const allFaces = await base44.entities.DataWajah.filter({ person_type: personType, status: 'Aktif' });
        faceDataRef.current = allFaces;
      }

      // Wait for React to mount the video element after setCameraActive(true)
      await new Promise(resolve => setTimeout(resolve, 200));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      if (mode === 'scan') {
        startScanLoop();
      }
    } catch (err) {
      toast({ title: 'Gagal mengakses kamera', description: err.message, variant: 'destructive' });
      stopCamera();
    }
  };

  const registerFace = async () => {
    if (!videoRef.current || !modelsLoaded) return;
    setScanning(true);
    setResult(null);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setResult({ status: 'error', message: 'Wajah tidak terdeteksi. Posisikan wajah di tengah.' });
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
      const fotoDataUrl = canvas.toDataURL('image/jpeg', 0.7);

      setResult({ status: 'success', message: 'Wajah berhasil direkam!' });
      onRegister?.(descriptor, fotoDataUrl);
    } catch (err) {
      setResult({ status: 'error', message: err.message });
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  const resultStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    scanning: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="space-y-3">
      {loadingModels && (
        <div className="flex items-center justify-center gap-2 p-4 text-sm text-slate-600 bg-slate-50 rounded-xl">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat model AI wajah...
        </div>
      )}

      {cameraActive ? (
        <>
          <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-[4/3]">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-36 h-44 border-2 border-white/40 rounded-2xl" />
            </div>
            {result && (
              <div className={`absolute bottom-0 left-0 right-0 p-3 border-t ${resultStyles[result.status] || ''}`}>
                <div className="flex items-center gap-2">
                  {result.status === 'scanning' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {result.status === 'success' && <CheckCircle className="w-4 h-4" />}
                  {result.status === 'error' && <XCircle className="w-4 h-4" />}
                  {result.status === 'info' && <ScanFace className="w-4 h-4" />}
                  <span className="text-sm font-medium">{result.message}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {mode === 'register' && (
              <Button type="button" className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700" disabled={scanning} onClick={registerFace}>
                {scanning ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ScanFace className="w-5 h-5 mr-2" />}
                {scanning ? 'Memproses...' : 'Daftarkan Wajah'}
              </Button>
            )}
            {mode === 'scan' && !scanning && (
              <Button type="button" variant="outline" className="flex-1 h-12" onClick={startScanLoop}>
                <RefreshCw className="w-4 h-4 mr-2" /> Scan Ulang
              </Button>
            )}
            <Button type="button" variant="destructive" className="h-12 px-4" onClick={stopCamera}>
              <CameraOff className="w-5 h-5" />
            </Button>
          </div>
        </>
      ) : (
        <Button type="button" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700" disabled={disabled || loadingModels} onClick={startCamera}>
          {loadingModels ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Camera className="w-5 h-5 mr-2" />}
          {loadingModels ? 'Memuat...' : mode === 'register' ? 'Buka Kamera & Daftar Wajah' : 'Buka Kamera & Scan Wajah'}
        </Button>
      )}
    </div>
  );
}