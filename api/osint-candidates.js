import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

const isAuthorized = (req) => {
  if (!process.env.ADMIN_OSINT_TOKEN) return true;
  return req.headers["x-admin-token"] === process.env.ADMIN_OSINT_TOKEN;
};

const groupEvidence = (rows = []) =>
  rows.reduce((acc, row) => {
    const list = acc.get(row.bank_account_id) || [];
    if (list.length < 3) list.push(row);
    acc.set(row.bank_account_id, list);
    return acc;
  }, new Map());

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    res.status(200).json({
      configured: false,
      items: [],
      message: "Supabase belum dikonfigurasi.",
    });
    return;
  }

  const status = String(req.query.status || "all");
  const limit = Math.min(Number(req.query.limit || 40), 100);

  let query = supabase
    .from("bank_accounts")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: accounts, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const accountIds = (accounts || []).map((account) => account.id);
  let evidenceByAccount = new Map();

  if (accountIds.length > 0) {
    const { data: evidence, error: evidenceError } = await supabase
      .from("osint_evidence")
      .select("id, bank_account_id, source_url, source_host, title, snippet, confidence_score, created_at, detected_accounts")
      .in("bank_account_id", accountIds)
      .order("created_at", { ascending: false })
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
