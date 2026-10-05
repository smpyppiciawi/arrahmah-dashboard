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