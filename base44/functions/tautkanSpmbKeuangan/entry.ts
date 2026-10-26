import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { tautkanSpmbKeuangan } from '../../shared/rekonsiliasiCore.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'tu', 'kepsek', 'bendahara'].includes(user.role)) {
      return Response.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    const hasil = await tautkanSpmbKeuangan(base44.asServiceRole);
    return Response.json({ ok: true, ...hasil });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}