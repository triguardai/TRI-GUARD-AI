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
    base64Images,
    scrapedEvidence,
  } = body;

  const normalizedAccountNumber = String(accountNumber || '').replace(/\D/g, '');
  const normalizedBank = String(bank || '')
    .trim()
    .toUpperCase();

  // Hardened Server-side Validation
  if (!normalizedBank) {
    return res.status(400).json({ error: 'Bank atau e-wallet wajib diisi.' });
  }

  if (!/^\d{6,20}$/.test(normalizedAccountNumber)) {
    return res.status(400).json({ error: 'Nomor rekening tidak valid (6-20 digit).' });
  }

  if (!accountHolder || accountHolder.trim().length < 3) {
    return res.status(400).json({ error: 'Nama pemilik rekening wajib diisi (min 3 karakter).' });
  }

  if (!description || description.trim().length < 30) {
    return res.status(400).json({ error: 'Kronologi minimal 30 karakter agar dapat dianalisis.' });
  }

  const hasImages = base64Images && Array.isArray(base64Images) && base64Images.length > 0;
  if (!evidenceUrl && !hasImages && !scrapedEvidence) {
    return res.status(400).json({ error: 'Bukti (URL atau foto) wajib dilampirkan.' });
  }

  try {
    // 1. Upsert Bank Account
    const { data: account, error: accountError } = await supabase
      .from('bank_accounts')
      .select('id, status')
      .eq('bank_name', normalizedBank)
      .eq('normalized_account_number', normalizedAccountNumber)
      .maybeSingle();

    let accountId = account?.id;

    if (accountError) throw accountError;

    if (!accountId) {
      const { data: newAccount, error: insertAccountError } = await supabase
        .from('bank_accounts')
        .insert({
          bank_name: normalizedBank,
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

    // 3. Handle Images (Prototype: acknowledge image count for now...)
    // In a real production app, we would use supabase.storage.from('evidence').upload(...)
    // for each base64 image. For this prototype, we store them as part of the report JSON
    // or just acknowledge they were received.

    // 4. Insert OSINT Evidence if scraped
    if (scrapedEvidence && (evidenceUrl || hasImages)) {
      await supabase.from('osint_evidence').insert({
        bank_account_id: accountId,
        source_url: scrapedEvidence.sourceUrl || evidenceUrl || 'uploaded-file',
        source_host: scrapedEvidence.sourceHost || (hasImages ? 'user-upload' : 'unknown'),
        title: scrapedEvidence.title || 'Laporan Pengguna',
        snippet: scrapedEvidence.description || description.slice(0, 200),
        extracted_text: null,
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
