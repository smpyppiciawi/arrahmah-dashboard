import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Nfc, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

/**
 * NfcScanner — Web NFC API integration for reading Mifare/E-money card UIDs.
 *
 * Requires:
 * - Chrome/Edge on Android (or any browser with Web NFC API support)
 * - HTTPS connection
 * - User gesture (button tap) to initiate scan
 *
 * @param {function} onScan - Callback receiving the card UID (uppercase hex, no colons)
 * @param {boolean} disabled - Disable the button (e.g. when no person selected)
 */
export default function NfcScanner({ onScan, disabled }) {
  const [isScanning, setIsScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const isSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

  const scanNfc = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: 'NFC Tidak Didukung',
        description: 'Gunakan Chrome/Edge di HP Android dengan NFC.',
        variant: 'destructive',
      });
      return;
    }

    setSuccess(false);
    setIsScanning(true);

    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();

      ndef.addEventListener('readingerror', () => {
        setIsScanning(false);
        toast({
          title: 'Kartu Tidak Terbaca',
          description: 'Pastikan kartu NFC/E-money benar dan coba lagi.',
          variant: 'destructive',
        });
      });

      ndef.addEventListener('reading', ({ serialNumber }) => {
        // Normalize UID: uppercase hex, strip colons for consistency with external readers
        const uid = serialNumber.toUpperCase().replace(/:/g, '');
        setIsScanning(false);
        setSuccess(true);
        onScan?.(uid);
        toast({ title: 'UID Kartu Terbaca', description: uid });
        setTimeout(() => setSuccess(false), 2500);
      });
    } catch (err) {
      setIsScanning(false);
      const msg = err?.name === 'NotAllowedError'
        ? 'Izin NFC ditolak. Berikan izin di pengaturan browser.'
        : 'Gagal memulai pemindaian NFC.';
      toast({ title: msg, variant: 'destructive' });
    }
  }, [isSupported, onScan, toast]);

  if (!isSupported) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        title="Browser tidak mendukung Web NFC API. Gunakan Chrome di Android."
      >
        <AlertTriangle className="w-3 h-3 mr-1 text-slate-400" />
        <span className="text-slate-400">NFC HP</span>
      </Button>
    );
  }

  if (isScanning) {
    return (
      <Button type="button" size="sm" className="bg-purple-600 text-white animate-pulse" disabled>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Tempel kartu...
      </Button>
    );
  }

  if (success) {
    return (
      <Button type="button" size="sm" className="bg-emerald-600 text-white" disabled>
        <CheckCircle className="w-3 h-3 mr-1" /> Terbaca!
      </Button>
    );
  }

  return (
    <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={scanNfc}>
      <Nfc className="w-3 h-3 mr-1 text-purple-600" /> NFC HP
    </Button>
  );
}