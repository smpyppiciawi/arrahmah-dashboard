import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return Response.json({ error: 'phone and message are required' }, { status: 400 });
    }

    const token = Deno.env.get("WA_FONNTE_TOKEN");
    if (!token) {
      return Response.json({ error: 'WA_FONNTE_TOKEN secret not set' }, { status: 500 });
    }

    const cleanPhone = String(phone).replace(/\D/g, '').replace(/^0/, '62');

    const formData = new FormData();
    formData.append('target', cleanPhone);
    formData.append('message', message);
    formData.append('countryCode', '62');

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': token },
      body: formData,
    });

    const result = await response.json();

    if (result.status === false || result.status === 'false') {
      return Response.json({ error: result.reason || result.message || 'Fonnte API error', detail: result }, { status: 502 });
    }

    return Response.json({ success: true, phone: cleanPhone, fonnte: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});