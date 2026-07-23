import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Fingerprint, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

/**
 * FingerprintScanner — WebAuthn-based biometric registration & verification.
 *
 * Uses the device's built-in biometric (fingerprint / FaceID) via WebAuthn API.
 * Credentials are device-bound: register & scan must use the same device.
 *
 * @param {string} mode - 'register' (create credential) or 'scan' (verify)
 * @param {function} onScan - Callback receiving the credential ID (base64)
 * @param {object} userInfo - { id, name } required for register mode
 * @param {boolean} disabled
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default function FingerprintScanner({ mode = 'scan', onScan, userInfo, disabled }) {
  const [isScanning, setIsScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const isSupported = typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;

  const handleRegister = useCallback(async () => {
    if (!isSupported) {
      toast({ title: 'Biometrik Tidak Didukung', description: 'Gunakan HP dengan fingerprint/FaceID.', variant: 'destructive' });
      return;
    }

    setSuccess(false);
    setIsScanning(true);

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKey = {
        challenge,
        rp: { name: 'SIS Sekolah' },
        user: {
          id: new TextEncoder().encode(userInfo?.id || 'user-' + Date.now()),
          name: userInfo?.name || 'Pengguna',
          displayName: userInfo?.name || 'Pengguna',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          userVerification: 'required',
          residentKey: 'required',
          authenticatorAttachment: 'platform',
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = await navigator.credentials.create({ publicKey });
      const credId = arrayBufferToBase64(credential.rawId);

      setIsScanning(false);
      setSuccess(true);
      onScan?.(credId);
      toast({ title: 'Fingerprint Terdaftar', description: userInfo?.name });
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setIsScanning(false);
      const msg = err?.name === 'NotAllowedError'
        ? 'Pendaftaran dibatalkan atau ditolak.'
        : 'Gagal mendaftarkan fingerprint.';
      toast({ title: msg, variant: 'destructive' });
    }
  }, [isSupported, userInfo, onScan, toast]);

  const handleScan = useCallback(async () => {
    if (!isSupported) {
      toast({ title: 'Biometrik Tidak Didukung', description: 'Gunakan HP dengan fingerprint/FaceID.', variant: 'destructive' });
      return;
    }

    setSuccess(false);
    setIsScanning(true);

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKey = {
        challenge,
        userVerification: 'required',
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({ publicKey });
      const credId = arrayBufferToBase64(assertion.rawId);

      setIsScanning(false);
      setSuccess(true);
      onScan?.(credId);
      setTimeout(() => setSuccess(false), 1500);
    } catch (err) {
      setIsScanning(false);
      const msg = err?.name === 'NotAllowedError'
        ? 'Verifikasi dibatalkan.'
        : 'Gagal verifikasi fingerprint.';
      toast({ title: msg, variant: 'destructive' });
    }
  }, [isSupported, onScan, toast]);

  const handleClick = mode === 'register' ? handleRegister : handleScan;

  if (!isSupported) {
    return (
      <Button type="button" size="sm" variant="outline" disabled title="Browser tidak mendukung WebAuthn">
        <AlertTriangle className="w-3 h-3 mr-1 text-slate-400" />
        <span className="text-slate-400">Fingerprint HP</span>
      </Button>
    );
  }

  if (isScanning) {
    return (
      <Button type="button" size="sm" className="bg-orange-600 text-white animate-pulse" disabled>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Sentuh sensor...
      </Button>
    );
  }

  if (success) {
    return (
      <Button type="button" size="sm" className="bg-emerald-600 text-white" disabled>
        <CheckCircle className="w-3 h-3 mr-1" /> Terverifikasi!
      </Button>
    );
  }

  return (
    <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={handleClick}>
      <Fingerprint className="w-3 h-3 mr-1 text-orange-600" /> Fingerprint HP
    </Button>
  );
}