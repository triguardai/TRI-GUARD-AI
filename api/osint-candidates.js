import { createClient } from '@supabase/supabase-js';

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

  if (!expected) {
    return true; // Allow access for prototype if no token is set
  }

  return req.headers['x-admin-token'] === expected;
};

const groupEvidence = (rows = []) =>
  rows.reduce((acc, row) => {
    const list = acc.get(row.bank_account_id) || [];
    if (list.length < 3) list.push(row);
    acc.set(row.bank_account_id, list);
    return acc;
  }, new Map());

const SIMULATED_RESULTS = [
  {
    id: 'mock-1',
    bank_name: 'BCA',
    account_number: '9988776655',
    normalized_account_number: '9988776655',
    account_holder: 'SANG PENIPU GADUNGAN',
    status: 'candidate',
    risk_score: 92,
    source_count: 3,
    last_seen_at: new Date().toISOString(),
    evidence: [
      {
        id: 'ev-1',
        title: 'Hati-hati Penipuan Jual Beli HP di Facebook',
        source_url: 'https://facebook.com/groups/korbanpenipuan/posts/1',
        source_host: 'facebook.com',
        snippet: 'Awas rek BCA 9988776655 an Sang Penipu Gadungan. Udah transfer 2jt buat iPhone malah di block.'
      }
    ]
  },
  {
    id: 'mock-2',
    bank_name: 'DANA',
    account_number: '081234567890',
    normalized_account_number: '081234567890',
    account_holder: 'AKUN BODONG',
    status: 'candidate',
    risk_score: 85,
    source_count: 1,
    last_seen_at: new Date().toISOString(),
    evidence: [
      {
        id: 'ev-2',
        title: 'Waspada Akun Shopee Palsu',
        source_url: 'https://twitter.com/korban_scam/status/123',
        source_host: 'x.com',
        snippet: 'Baru aja kena tipu sama seller ini, pake no dana 081234567890. Hati-hati ya guys!'
      }
    ]
  }
];

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Helper to send mock data
  const sendMockData = (message) => {
    res.status(200).json({
      configured: false,
      items: SIMULATED_RESULTS,
      message: `Mode Prototipe: ${message}`,
    });
  };

  if (!isAuthorized(req)) {
    return sendMockData('Menampilkan data simulasi (Unauthorized).');
  }

  const supabase = getSupabase();
  if (!supabase) {
    return sendMockData('Supabase belum dikonfigurasi.');
  }

  const status = String(req.query.status || 'all');
  const limit = Math.min(Number(req.query.limit || 40), 100);

  let query = supabase
    .from('bank_accounts')
    .select('*')
    .order('last_seen_at', { ascending: false })
    .limit(limit);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: accounts, error } = await query;
  if (error) {
    // If DB fails (like permission denied), fallback to mock
    return sendMockData(`DB Error: ${error.message}`);
  }

  const accountIds = (accounts || []).map((account) => account.id);
  let evidenceByAccount = new Map();

  if (accountIds.length > 0) {
    const { data: evidence, error: evidenceError } = await supabase
      .from('osint_evidence')
      .select(
        'id, bank_account_id, source_url, source_host, title, snippet, confidence_score, created_at, detected_accounts'
      )
      .in('bank_account_id', accountIds)
      .order('created_at', { ascending: false })
      .limit(accountIds.length * 3);

    if (evidenceError) {
      res.status(500).json({ error: evidenceError.message });
      return;
    }

    evidenceByAccount = groupEvidence(evidence);
  }

  res.status(200).json({
    configured: true,
    items: (accounts || []).map((account) => ({
      ...account,
      evidence: evidenceByAccount.get(account.id) || [],
    })),
  });
}
