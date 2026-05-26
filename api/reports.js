import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientId } from './utils/rate-limit.js';

const WINDOW_IN_SECS = 3600; // 1 hour
const MAX_REQUESTS = 10; // 10 reports per hour

const getSupabase = () => {
  let url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  // Clean URL: strip trailing /rest/v1/ if the user accidentally included it
  url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  return createClient(url, key, { auth: { persistSession: false } });
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

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const clientId = getClientId(req);
  const rateLimit = await checkRateLimit(`report_${clientId}`, MAX_REQUESTS, WINDOW_IN_SECS);
  if (!rateLimit.success) {
    res.status(429).json({ error: 'Terlalu banyak laporan. Coba lagi 1 jam lagi.' });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    res.status(500).json({ error: 'Database tidak dikonfigurasi.' });
    return;
  }

  const body = parseBody(req.body);
  const {
    reporterName,
    reporterContact,
    bank,
    accountNumber,
    accountHolder,
    fraudType,
    description,
    evidenceUrl,
    scrapedEvidence,
  } = body;

  if (!bank || !accountNumber || !description) {
    res.status(400).json({ error: 'Bank, nomor rekening, dan kronologi wajib diisi.' });
    return;
  }

  const normalizedAccountNumber = String(accountNumber).replace(/\D/g, '');

  try {
    // 1. Upsert Bank Account
    const { data: account, error: accountError } = await supabase
      .from('bank_accounts')
      .select('id, status')
      .eq('bank_name', bank)
      .eq('normalized_account_number', normalizedAccountNumber)
      .maybeSingle();

    let accountId = account?.id;

    if (accountError) throw accountError;

    if (!accountId) {
      const { data: newAccount, error: insertAccountError } = await supabase
        .from('bank_accounts')
        .insert({
          bank_name: bank,
          account_number: accountNumber,
          normalized_account_number: normalizedAccountNumber,
          account_holder: accountHolder || null,
          status: 'pending_review',
        })
        .select()
        .single();

      if (insertAccountError) throw insertAccountError;
      accountId = newAccount.id;
    }

    // 2. Insert Community Report
    const { data: report, error: reportError } = await supabase
      .from('community_reports')
      .insert({
        bank_account_id: accountId,
        reporter_name: reporterName || 'Pelapor anonim',
        reporter_contact: reporterContact || null,
        fraud_type: fraudType,
        chronology: description,
        evidence_url: evidenceUrl,
        status: 'pending_review',
      })
      .select()
      .single();

    if (reportError) throw reportError;

    // 3. Insert OSINT Evidence if scraped
    if (scrapedEvidence && evidenceUrl) {
      await supabase.from('osint_evidence').insert({
        bank_account_id: accountId,
        source_url: scrapedEvidence.sourceUrl || evidenceUrl,
        source_host: scrapedEvidence.sourceHost,
        title: scrapedEvidence.title,
        snippet: scrapedEvidence.description,
        extracted_text: null, // Minimal storage for now
        detected_accounts: scrapedEvidence.evidenceSignals || [],
        scrape_status: 'scraped',
      });
    }

    res.status(200).json({ ok: true, report });
  } catch (error) {
    console.error('Report insertion error:', error);
    res.status(500).json({ error: 'Gagal menyimpan laporan.' });
  }
}
