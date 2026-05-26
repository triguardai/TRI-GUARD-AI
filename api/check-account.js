import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientId } from './utils/rate-limit.js';

const WINDOW_IN_SECS = 60;
const MAX_REQUESTS = 20;

const getSupabase = () => {
  let url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  // Clean URL: strip trailing /rest/v1/ if the user accidentally included it
  url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  return createClient(url, key, { auth: { persistSession: false } });
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const clientId = getClientId(req);
  const rateLimit = await checkRateLimit(`check_${clientId}`, MAX_REQUESTS, WINDOW_IN_SECS);
  if (!rateLimit.success) {
    res.status(429).json({ error: 'Terlalu banyak request. Coba lagi sebentar.' });
    return;
  }

  const { bank, accountNumber } = req.query;

  if (!accountNumber) {
    res.status(400).json({ error: 'Nomor rekening harus diisi.' });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    res.status(500).json({ error: 'Database tidak dikonfigurasi.' });
    return;
  }

  const normalizedAccountNumber = String(accountNumber).replace(/\D/g, '');
  const normalizedBank = String(bank || '').trim().toUpperCase();

  try {
    let query = supabase
      .from('bank_accounts')
      .select('status, risk_score, source_count')
      .eq('normalized_account_number', normalizedAccountNumber);

    if (normalizedBank) {
      query = query.eq('bank_name', normalizedBank);
    }

    const { data, error } = await query
      .order('risk_score', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      res.status(200).json({ status: 'unknown' });
    } else {
      res.status(200).json({
        status: data.status,
        risk_score: data.risk_score,
        source_count: data.source_count,
      });
    }
  } catch (error) {
    console.error('Check account error:', error);
    res.status(500).json({ error: 'Gagal mengecek rekening.' });
  }
}
