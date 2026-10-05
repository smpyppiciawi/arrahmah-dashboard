import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { sendFonnteWA, normalizePhone } from '../../shared/waSender.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return Response.json({ error: 'phone and message are required' }, { status: 400 });
    }

    const token = secrets.get('WA_FONNTE_TOKEN');
    if (!token) {
      return Response.json({ error: 'WA_FONNTE_TOKEN secret not set' }, { status: 500 });
    }

    const res = await sendFonnteWA(phone, message, token);
    if (!res.sent) {
      return Response.json(
        { error: res.error || res.reason || 'Fonnte API error', detail: res.fonnte || null },
        { status: 502 }
      );
    }

    return Response.json({ success: true, phone: normalizePhone(phone), fonnte: res.fonnte });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}