import { createClient } from '@supabase/supabase-js';

const statusByAction = {
  verify: 'verified_risky',
  reject: 'rejected',
  duplicate: 'duplicate',
  dispute: 'disputed',
  pending: 'pending_review',
  candidate: 'candidate',
};

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
};

const getSupabase = () => {
  let url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  // Clean URL: strip trailing /rest/v1/ if the user accidentally included it
  url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  return createClient(url, key, { auth: { persistSession: false } });
};

const isAuthorized = (req) => {
  const expected = process.env.ADMIN_OSINT_TOKEN;

  // Development bypass
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_UNPROTECTED_ADMIN === 'true'
  ) {
    return true;
  }

  if (!expected) {
    return false; // Fail-closed
  }

  return req.headers['x-admin-token'] === expected;
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = parseBody(req.body);
  const id = String(body.id || '');
  const action = String(body.action || '');
  const nextStatus = statusByAction[action];

  if (!id || !nextStatus) {
    res.status(400).json({ error: 'ID rekening dan action moderasi wajib diisi.' });
    return;
  }

  if (!isAuthorized(req)) {
    return res.status(200).json({ ok: true, account: { id, status: nextStatus }, message: 'Mode Prototipe: Moderasi disimulasikan.' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(200).json({ ok: true, account: { id, status: nextStatus }, message: 'Mode Prototipe: Moderasi disimulasikan.' });
  }

  const { data: account, error: updateError } = await supabase
    .from('bank_accounts')
    .update({
      status: nextStatus,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return res.status(200).json({ ok: true, account: { id, status: nextStatus }, message: `Mode Prototipe: Moderasi disimulasikan (${updateError.message}).` });
  }

  const { error: logError } = await supabase.from('moderation_logs').insert({
    bank_account_id: id,
    action,
    note: body.note || null,
    moderator_name: body.moderatorName || 'TriGuard Admin',
  });

  if (logError) {
    res.status(500).json({ error: logError.message });
    return;
  }

  res.status(200).json({ ok: true, account });
}
