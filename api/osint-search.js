import { createClient } from "@supabase/supabase-js";

const rateLimitStore = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const GOOGLE_SEARCH_URL = "https://www.googleapis.com/customsearch/v1";
const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";

export const OSINT_QUERIES = [
  '"rekening penipu" "no rek"',
  '"hati hati" "no rekening"',
  '"kena tipu" "rekening"',
  '"ditipu" "atas nama"',
  '"transaksi segitiga" "rekening"',
  '"rekber palsu" "rekening"',
  '"penipu" "BCA"',
  '"penipu" "BRI"',
  '"penipu" "BNI"',
  '"penipu" "Mandiri"',
];

export const OSINT_DOMAIN_FILTERS = [
  "site:kaskus.co.id",
  "site:facebook.com",
  "site:x.com OR site:twitter.com",
  "site:tiktok.com",
  "site:blogspot.com",
  "site:wordpress.com",
];

const platformSiteGroups = {
  Instagram: [["instagram.com"]],
  Facebook: [["facebook.com"]],
  "X / Twitter": [["x.com", "twitter.com"]],
  TikTok: [["tiktok.com"]],
  WhatsApp: [["wa.me", "chat.whatsapp.com"]],
  Telegram: [["t.me", "telegram.me"]],
  Marketplace: [["facebook.com/marketplace", "tokopedia.com", "shopee.co.id", "bukalapak.com", "olx.co.id"]],
  "Forum / Blog": [["kaskus.co.id", "medium.com", "blogspot.com", "wordpress.com"]],
  YouTube: [["youtube.com", "youtu.be"]],
  Reddit: [["reddit.com"]],
  Kaskus: [["kaskus.co.id"]],
  Lainnya: [[]],
};

const broadPublicPlatformGroups = [
  ["kaskus.co.id", "blogspot.com", "wordpress.com"],
  ["facebook.com", "instagram.com"],
  ["x.com", "twitter.com", "tiktok.com"],
  ["t.me", "telegram.me", "youtube.com"],
  ["tokopedia.com", "shopee.co.id", "bukalapak.com", "olx.co.id"],
];

const noiseFilter = '-edukasi -tips -pengertian -"apa itu" -"lindungi diri" -humas -polisi -kominfo';

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
};

const cleanText = (value, maxLength = 120) =>
  String(value || "")
    .replace(/[^\p{L}\p{N}\s/._:@+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const quote = (value) => `"${String(value || "").replaceAll('"', " ").trim()}"`;

const buildSiteClause = (sites = []) => {
  const normalizedSites = sites.map((site) => cleanText(site, 80)).filter(Boolean);
  if (normalizedSites.length === 0) return "";
  if (normalizedSites.length === 1) return `site:${normalizedSites[0]}`;
  return `(${normalizedSites.map((site) => `site:${site}`).join(" OR ")})`;
};

const getClientId = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
};

const isRateLimited = (clientId) => {
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);

  if (!entry || now - entry.startedAt > WINDOW_MS) {
    rateLimitStore.set(clientId, { count: 1, startedAt: now });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_REQUESTS;
};

const resolveSiteGroups = (platform) => {
  if (!platform || platform === "Semua platform publik") {
    return broadPublicPlatformGroups;
  }

  return platformSiteGroups[platform] || [[]];
};

const buildTemplates = ({ normalizedFraudType, normalizedKeyword, subject }) => {
  const victimTerms = '("kena tipu" OR "ketipu" OR "ditipu" OR "tertipu")';
  const warningTerms = '("hati2" OR "hati hati" OR "awas" OR "jangan transfer")';
  const accountTerms = '("no rek" OR "nomor rekening" OR "rekening penipu" OR "atas nama")';
  const fraudTerms = normalizedFraudType
    ? `(${quote(normalizedFraudType)} OR "modus penipuan" OR "rekber palsu")`
    : '("transaksi segitiga" OR "modus penipuan" OR "rekber palsu")';

  if (subject) {
    return [
      [quote(subject), victimTerms, fraudTerms],
      [quote(subject), warningTerms, accountTerms],
      [quote(subject), '"penipu"', accountTerms],
      [normalizedKeyword && quote(normalizedKeyword), victimTerms],
    ].map((parts) => [...parts.filter(Boolean), noiseFilter].join(" "));
  }

  return [
    [victimTerms, fraudTerms, '("gua" OR "aku" OR "saya")'],
    [warningTerms, fraudTerms, accountTerms],
    ['("share" OR "bantu up")', victimTerms, accountTerms],
  ].map((parts) => [...parts.filter(Boolean), noiseFilter].join(" "));
};

export const buildDorkQueries = ({ accountNumber, accountHolder, fraudType, platform, keyword, seed, maxQueries = 8 } = {}) => {
  const normalizedAccount = cleanText(accountNumber, 32).replace(/\D/g, "");
  const normalizedHolder = cleanText(accountHolder);
  const normalizedSeed = cleanText(seed || keyword, 160)
    .replace(/\bSemua platform publik\b/gi, "")
    .replace(/\bFacebook|Instagram|TikTok|Telegram|Marketplace|YouTube|Reddit|Kaskus\b/gi, "")
    .trim();
  const normalizedFraudType = cleanText(fraudType || "transaksi segitiga");
  const subject = normalizedAccount || normalizedHolder || normalizedSeed;
  const siteGroups = resolveSiteGroups(platform);
  const templates = buildTemplates({
    normalizedFraudType,
    normalizedKeyword: normalizedSeed,
    subject,
  });
  const queries = [];

  if (!subject && !platform) {
    OSINT_DOMAIN_FILTERS.forEach((domainFilter, index) => {
      const baseQuery = OSINT_QUERIES[index % OSINT_QUERIES.length];
      queries.push(`(${domainFilter}) ${baseQuery} ${noiseFilter}`);
    });
  }

  siteGroups.forEach((sites, groupIndex) => {
    const siteClause = buildSiteClause(sites);
    const primaryTemplate = templates[groupIndex % templates.length];
    queries.push([siteClause, primaryTemplate].filter(Boolean).join(" "));

    if (normalizedHolder && normalizedAccount) {
      queries.push([siteClause, quote(normalizedHolder), quote(normalizedAccount)].filter(Boolean).join(" "));
    }
  });

  return [...new Set(queries.filter(Boolean))].slice(0, maxQueries);
};

const resolveSearchProvider = () => {
  const configured = cleanText(process.env.SEARCH_PROVIDER || "", 24).toLowerCase();
  if (configured) return configured;
  return "brave";
};

const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

const getHostFromUrl = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const normalizeSearchResult = ({ title, url, snippet, displayLink, query, provider }) => ({
  title: title || "Tanpa judul",
  snippet: snippet || "",
  url,
  displayLink: displayLink || getHostFromUrl(url),
  query,
  provider,
});

const searchGoogle = async (query) => {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    throw new Error("GOOGLE_SEARCH_API_KEY dan GOOGLE_SEARCH_CX belum dikonfigurasi.");
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: "5",
    safe: "active",
    lr: "lang_id",
  });

  const response = await fetch(`${GOOGLE_SEARCH_URL}?${params.toString()}`);

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.error?.message || "Google search request failed";
    const reason = data?.error?.errors?.[0]?.reason;
    const error = new Error(reason ? `${message} (${reason})` : message);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return (data.items || []).map((item) =>
    normalizeSearchResult({
      title: item.title,
      snippet: item.snippet,
      url: item.link,
      displayLink: item.displayLink,
      query,
      provider: "google",
    }),
  );
};

const searchBrave = async (query) => {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    throw new Error("BRAVE_SEARCH_API_KEY belum dikonfigurasi.");
  }

  const params = new URLSearchParams({
    q: query,
    count: "5",
    country: "id",
    search_lang: "id",
  });

  const response = await fetch(`${BRAVE_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.message || data?.error || "Brave search request failed";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return (data.web?.results || []).map((item) =>
    normalizeSearchResult({
      title: item.title,
      snippet: item.description,
      url: item.url,
      displayLink: item.profile?.long_name || item.meta_url?.hostname,
      query,
      provider: "brave",
    }),
  );
};

const searchWeb = async (query, provider) => {
  if (provider === "google") return searchGoogle(query);
  if (provider === "brave") return searchBrave(query);
  throw new Error(`SEARCH_PROVIDER tidak dikenali: ${provider}`);
};

export function buildPreviewResults(queries, provider = "brave", message = "") {
  return queries.map((query, index) => ({
    title: `Query dork siap dijalankan #${index + 1}`,
    snippet:
      message ||
      `Tambahkan ${provider === "google" ? "GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX" : "BRAVE_SEARCH_API_KEY"} di env untuk mengambil hasil otomatis.`,
    url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    displayLink: "google.com",
    query,
    provider: "preview",
    previewOnly: true,
  }));
}

const dedupeResults = (batches, limit = 15) => {
  const seenUrls = new Set();
  return batches
    .flat()
    .filter((result) => {
      if (!result.url || seenUrls.has(result.url)) return false;
      seenUrls.add(result.url);
      return true;
    })
    .slice(0, limit);
};

const getBaseUrl = (req) => {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "http";
  return `${protocol}://${host}`;
};

const scrapeEvidence = async (url, req) => {
  const response = await fetch(`${getBaseUrl(req)}/api/scrape-evidence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.INTERNAL_API_TOKEN
        ? { "X-Internal-Token": process.env.INTERNAL_API_TOKEN }
        : {}),
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) return null;
  return response.json();
};

const upsertCandidate = async (supabase, candidate, source) => {
  const normalized = candidate.normalized_account_number;
  const bankName = candidate.bank_name || "UNKNOWN";

  const { data: existing, error: existingError } = await supabase
    .from("bank_accounts")
    .select()
    .eq("bank_name", bankName)
    .eq("normalized_account_number", normalized)
    .maybeSingle();

  if (existingError) throw existingError;

  const now = new Date().toISOString();
  const accountPayload = {
    bank_name: bankName,
    account_number: candidate.account_number,
    normalized_account_number: normalized,
    account_holder: candidate.account_holder || existing?.account_holder || null,
    phone_number: source.detected_phones?.[0] || existing?.phone_number || null,
    risk_score: Math.max(Number(existing?.risk_score || 0), Number(candidate.confidence_score || 0)),
    source_count: Number(existing?.source_count || 0) + 1,
    last_seen_at: now,
  };

  const accountQuery = existing
    ? supabase.from("bank_accounts").update(accountPayload).eq("id", existing.id)
    : supabase.from("bank_accounts").insert({ ...accountPayload, status: "candidate" });

  const { data: account, error: accountError } = await accountQuery
    .select()
    .single();

  if (accountError) throw accountError;

  const { error: evidenceError } = await supabase.from("osint_evidence").insert({
    bank_account_id: account.id,
    source_url: source.url,
    source_host: source.source_host,
    title: source.title,
    snippet: source.snippet,
    extracted_text: source.extracted_text?.slice(0, 12_000) || "",
    detected_accounts: [candidate],
    detected_names: candidate.account_holder ? [candidate.account_holder] : [],
    detected_phones: source.detected_phones || [],
    confidence_score: candidate.confidence_score,
    scrape_status: source.scrape_status || "scraped",
  });

  if (evidenceError) throw evidenceError;

  return account;
};

const isAdminRequest = (req) => {
  const token = req.headers["x-admin-token"];
  return Boolean(process.env.ADMIN_OSINT_TOKEN && token === process.env.ADMIN_OSINT_TOKEN);
};

const assertAdminIfNeeded = (req) => {
  if (!process.env.ADMIN_OSINT_TOKEN) return true;
  return isAdminRequest(req);
};

const runSearch = async (queries, provider, limit = 15) => {
  const batches = await Promise.all(queries.slice(0, 5).map((query) => searchWeb(query, provider)));
  return dedupeResults(batches, limit);
};

const runHarvest = async ({ req, queries, provider, supabase }) => {
  const summary = {
    provider,
    queries: queries.length,
    urls: 0,
    candidates: 0,
    saved: 0,
    errors: [],
    records: [],
  };

  for (const query of queries.slice(0, 6)) {
    let results;

    try {
      results = await searchWeb(query, provider);
    } catch (error) {
      summary.errors.push({ query, message: error.message });
      continue;
    }

    for (const result of results.slice(0, 5)) {
      summary.urls += 1;

      try {
        const scraped = await scrapeEvidence(result.url, req);
        const accounts = scraped?.entities?.accounts || [];
        if (accounts.length === 0) continue;

        for (const candidate of accounts) {
          summary.candidates += 1;

          if (!supabase) {
            summary.records.push({ candidate, source: result, saved: false });
            continue;
          }

          const account = await upsertCandidate(candidate, {
            ...result,
            source_host: scraped.sourceHost || result.displayLink,
            extracted_text: scraped.text_excerpt,
            detected_phones: scraped.entities?.phones || [],
            scrape_status: scraped.scrape_status,
          });

          summary.saved += 1;
          summary.records.push({
            id: account.id,
            bank_name: account.bank_name,
            account_number: account.account_number,
            status: account.status,
            risk_score: account.risk_score,
          });
        }
      } catch (error) {
        summary.errors.push({ url: result.url, message: error.message });
      }
    }
  }

  return summary;
};

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const clientId = getClientId(req);
  if (isRateLimited(clientId)) {
    res.status(429).json({ error: "Terlalu banyak pencarian. Coba lagi sebentar." });
    return;
  }

  const body = parseBody(req.body);
  const persist = body.persist === true || body.mode === "harvest";
  const queries = body.queries?.length
    ? body.queries.map((query) => cleanText(query, 300)).filter(Boolean)
    : buildDorkQueries({ ...body, maxQueries: persist ? 10 : 8 });

  if (queries.length === 0) {
    res.status(400).json({ error: "Isi nomor rekening, nama, seed, atau kata kunci dulu." });
    return;
  }

  const provider = resolveSearchProvider();

  if (persist && !assertAdminIfNeeded(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (persist) {
    try {
      const supabase = getSupabase();
      const summary = await runHarvest({ req, queries, provider, supabase });

      res.status(200).json({
        mode: "harvest",
        configured: Boolean(supabase),
        queries,
        summary,
        message: supabase
          ? "OSINT search selesai. Semua temuan otomatis disimpan sebagai candidate."
          : "Supabase belum dikonfigurasi. Temuan ditampilkan tanpa disimpan.",
      });
    } catch (error) {
      res.status(200).json({
        mode: "preview",
        provider,
        queries,
        results: buildPreviewResults(queries, provider, error.message),
        message: `Search provider belum bisa dipakai: ${error.message}`,
      });
    }
    return;
  }

  try {
    const results = await runSearch(queries, provider, 15);
    res.status(200).json({ mode: "live", provider, queries, results });
  } catch (error) {
    res.status(200).json({
      mode: "preview",
      provider,
      queries,
      results: buildPreviewResults(queries, provider, error.message),
      message: `Search provider belum bisa dipakai: ${error.message}`,
    });
  }
}
