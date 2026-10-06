// Utilitas pengiriman WA via Fonnte — dipakai bersama oleh beberapa backend function.
// Tidak mengimpor 'base44:runtime'; token dikirim dari pemanggil agar modul ini murni.

export function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (!digits.startsWith('62')) digits = '62' + digits;
  return digits;
}

export async function sendFonnteWA(phone, message, token) {
  if (!token) return { sent: false, reason: 'no_token' };
  const clean = normalizePhone(phone);
  if (!clean || clean.length < 8) return { sent: false, reason: 'invalid_phone' };

  const formData = new FormData();
  formData.append('target', clean);
  formData.append('message', message);
  formData.append('countryCode', '62');

  const response = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { Authorization: token },
    body: formData,
  });
  const result = await response.json();
  if (result.status === false || result.status === 'false') {
    return { sent: false, error: result.reason || result.message || 'Fonnte API error' };
  }
  return { sent: true, fonnte: result };
}

// Status sakelar gateway notifikasi (per kanal & jenis) dari PengaturanAplikasi.
// Default ON bila belum diatur; jika PengaturanAplikasi gagal dibaca, kirim tetap diizinkan (fail-open).
export async function getNotifGateway(svc) {
  try {
    const rows = await svc.entities.PengaturanAplikasi.list();
    const p = (rows || [])[0] || {};
    return {
      wa_siswa: p.notif_wa_siswa !== false,
      wa_pegawai: p.notif_wa_pegawai !== false,
      wa_lainnya: p.notif_wa_lainnya !== false,
      email_siswa: p.notif_email_siswa !== false,
      email_pegawai: p.notif_email_pegawai !== false,
      email_lainnya: p.notif_email_lainnya !== false,
    };
  } catch (e) {
    return { wa_siswa: true, wa_pegawai: true, wa_lainnya: true, email_siswa: true, email_pegawai: true, email_lainnya: true };
  }
}