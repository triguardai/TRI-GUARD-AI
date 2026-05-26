const REPORT_STORAGE_KEY = 'triguard.communityReports';
const SCRAPE_ENDPOINT = '/api/report-url-preview';
const OSINT_SEARCH_ENDPOINT = '/api/osint-search';

const clientPlatformSiteGroups = {
  Instagram: [['instagram.com']],
  Facebook: [['facebook.com']],
  'X / Twitter': [['x.com', 'twitter.com']],
  TikTok: [['tiktok.com']],
  WhatsApp: [['wa.me', 'chat.whatsapp.com']],
  Telegram: [['t.me', 'telegram.me']],
  Marketplace: [
    ['facebook.com/marketplace', 'tokopedia.com', 'shopee.co.id', 'bukalapak.com', 'olx.co.id'],
  ],
  'Forum / Blog': [['kaskus.co.id', 'medium.com', 'blogspot.com', 'wordpress.com']],
  YouTube: [['youtube.com', 'youtu.be']],
  Reddit: [['reddit.com']],
  Kaskus: [['kaskus.co.id']],
  Lainnya: [[]],
};

const clientBroadPublicPlatformGroups = [
  ['facebook.com', 'instagram.com'],
  ['x.com', 'twitter.com', 'tiktok.com'],
  ['t.me', 'telegram.me', 'youtube.com'],
  ['kaskus.co.id', 'reddit.com', 'medium.com', 'blogspot.com'],
  ['tokopedia.com', 'shopee.co.id', 'bukalapak.com', 'olx.co.id'],
];

export const platformOptions = [
  'Semua platform publik',
  'Instagram',
  'Facebook',
  'X / Twitter',
  'TikTok',
  'WhatsApp',
  'Telegram',
  'Marketplace',
  'Forum / Blog',
  'YouTube',
  'Reddit',
  'Kaskus',
  'Lainnya',
];

export const fraudTypeOptions = [
  'Transaksi segitiga',
  'Barang tidak dikirim',
  'Rekber palsu',
  'Akun marketplace palsu',
  'Social engineering',
  'Lainnya',
];

const isBrowser = () => typeof window !== 'undefined';

const cleanSearchText = (value, maxLength = 120) =>
  String(value || '')
    .replace(/[^\p{L}\p{N}\s/._:@+-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const quoteSearchText = (value) => `"${String(value).replaceAll('"', ' ').trim()}"`;

const buildClientSiteClause = (sites = []) => {
  const normalizedSites = sites.map((site) => cleanSearchText(site, 80)).filter(Boolean);
  if (normalizedSites.length === 0) return '';
  if (normalizedSites.length === 1) return `site:${normalizedSites[0]}`;
  return `(${normalizedSites.map((site) => `site:${site}`).join(' OR ')})`;
};

const clientNoiseFilter =
  '-edukasi -tips -pengertian -"apa itu" -"lindungi diri" -humas -polisi -kominfo';

const resolveClientSiteGroups = (platform) => {
  if (!platform || platform === 'Semua platform publik') {
    return clientBroadPublicPlatformGroups;
  }

  return clientPlatformSiteGroups[platform] || [[]];
};

const buildClientDorkQueries = ({ accountNumber, accountHolder, fraudType, platform, keyword }) => {
  const normalizedAccount = cleanSearchText(accountNumber, 32).replace(/\D/g, '');
  const normalizedHolder = cleanSearchText(accountHolder);
  const normalizedFraudType = cleanSearchText(fraudType || 'transaksi segitiga');
  const normalizedKeyword = cleanSearchText(keyword)
    .replace(/\bSemua platform publik\b/gi, '')
    .replace(/\bFacebook|Instagram|TikTok|Telegram|Marketplace|YouTube|Reddit|Kaskus\b/gi, '')
    .trim();
  const subject = normalizedAccount || normalizedHolder || '';
  const victimTerms = '("kena tipu" OR "ketipu" OR "ditipu" OR "tertipu")';
  const warningTerms = '("hati2" OR "hati hati" OR "awas" OR "jangan transfer")';
  const accountTerms = '("no rek" OR "nomor rekening" OR "rekening penipu" OR "atas nama")';
  const fraudTerms = normalizedFraudType
    ? `(${quoteSearchText(normalizedFraudType)} OR "modus penipuan" OR "rekber palsu")`
    : '("transaksi segitiga" OR "modus penipuan" OR "rekber palsu")';
  const templates = subject
    ? [
        [quoteSearchText(subject), victimTerms, fraudTerms],
        [quoteSearchText(subject), warningTerms, accountTerms],
        [quoteSearchText(subject), '"penipu"', accountTerms],
        [normalizedKeyword && quoteSearchText(normalizedKeyword), victimTerms],
      ]
    : [
        [victimTerms, fraudTerms, '("gua" OR "aku" OR "saya")'],
        [warningTerms, fraudTerms, accountTerms],
        ['("share" OR "bantu up")', victimTerms, accountTerms],
      ];
  const normalizedTemplates = templates.map((parts) =>
    [...parts.filter(Boolean), clientNoiseFilter].join(' ')
  );

  const queries = [];
  resolveClientSiteGroups(platform).forEach((sites, groupIndex) => {
    const siteClause = buildClientSiteClause(sites);
    queries.push(
      [siteClause, normalizedTemplates[groupIndex % normalizedTemplates.length]]
        .filter(Boolean)
        .join(' ')
    );

    if (normalizedHolder && normalizedAccount) {
      queries.push(
        [siteClause, quoteSearchText(normalizedHolder), quoteSearchText(normalizedAccount)]
          .filter(Boolean)
          .join(' ')
      );
    }
  });

  return [...new Set(queries.filter(Boolean))].slice(0, 8);
};

const readStoredReports = () => {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(REPORT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeStoredReports = (reports) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // Local storage can fail in private browsing or when quota is full.
  }
};

const buildCaseId = () => {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `TGA-${datePart}-${randomPart}`;
};

export const estimateRiskScore = (report) => {
  let score = 20;

  if (report.accountNumber?.length >= 8) score += 20;
  if (report.accountHolder?.trim()) score += 8;
  if (report.evidenceUrl?.trim()) score += 18;
  if (report.evidenceFiles?.length) score += 18;
  if (report.description?.trim().length >= 80) score += 12;
  if (report.fraudType === 'Transaksi segitiga') score += 10;

  return Math.min(score, 98);
};

export const validateReportInput = (report) => {
  const errors = {};

  if (!report.bank?.trim()) {
    errors.bank = 'Bank atau e-wallet wajib diisi.';
  }

  if (!/^\d{6,20}$/.test(report.accountNumber || '')) {
    errors.accountNumber = 'Nomor rekening minimal 6 digit dan maksimal 20 digit.';
  }

  if (!report.accountHolder?.trim()) {
    errors.accountHolder = 'Nama pemilik rekening wajib diisi.';
  }

  if (!report.description?.trim() || report.description.trim().length < 30) {
    errors.description = 'Kronologi minimal 30 karakter supaya analis punya konteks.';
  }

  if (!report.evidenceUrl?.trim() && !report.evidenceFiles?.length) {
    errors.evidence = 'Tambahkan bukti foto atau URL postingan publik.';
  }

  if (!report.consent) {
    errors.consent = 'Centang persetujuan pemrosesan laporan.';
  }

  return errors;
};

export const getStoredReports = () => readStoredReports();

export async function submitReport(input) {
  const errors = validateReportInput(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const handleMockFallback = () => {
    console.warn('Backend DB not configured or API failed. Using local storage mock for prototype.');
    const mockReport = { 
      id: buildCaseId(), 
      status: 'pending_review', 
      created_at: new Date().toISOString(),
      ...input 
    };
    const nextReports = [mockReport, ...readStoredReports()].slice(0, 12);
    writeStoredReports(nextReports);
    return { ok: true, report: mockReport, reports: nextReports };
  };

  try {
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      
      if (data.error === 'Database tidak dikonfigurasi.' || response.status === 500 || response.status === 404) {
        return handleMockFallback();
      }

      return { ok: false, errors: { submit: data.error || 'Gagal mengirim laporan.' } };
    }

    const { report } = await response.json();
    const nextReports = [report, ...readStoredReports()].slice(0, 12);
    writeStoredReports(nextReports);

    return { ok: true, report, reports: nextReports };
  } catch {
    return handleMockFallback();
  }
}

export async function scrapeEvidenceUrl(rawUrl) {
  let normalizedUrl;

  try {
    normalizedUrl = new URL(rawUrl).toString();
  } catch {
    throw new Error('URL bukti tidak valid.');
  }

  const response = await fetch(SCRAPE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: normalizedUrl }),
  });

  if (!response.ok) {
    const message = await response
      .json()
      .then((data) => data?.error)
      .catch((error) => {
        console.error('API parse error:', error);
        return null;
      });
    throw new Error(message || 'Gagal mengambil metadata URL.');
  }

  return response.json();
}

export async function searchOsintEvidence(payload) {
  const response = await fetch(OSINT_SEARCH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response
      .json()
      .then((data) => data?.error)
      .catch((error) => {
        console.error('API parse error:', error);
        return null;
      });
    throw new Error(message || 'Pencarian OSINT gagal.');
  }

  return response.json();
}

export function buildClientOsintPreview(payload, message) {
  const queries = buildClientDorkQueries(payload);

  return {
    mode: 'preview',
    queries,
    results: queries.map((query, index) => ({
      title: `Query dork siap dijalankan #${index + 1}`,
      snippet:
        message ||
        'Endpoint /api/osint-search belum aktif. Jalankan dengan vercel.cmd dev dan isi search API key untuk mengambil hasil otomatis.',
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      displayLink: 'google.com',
      query,
      previewOnly: true,
    })),
    message: message || 'Mode preview: buka dari Vercel dev agar pencarian OSINT otomatis aktif.',
  };
}

export function buildClientUrlPreview(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return {
      sourceUrl: url.toString(),
      sourceHost: url.hostname.replace(/^www\./, ''),
      title: 'URL bukti siap direview',
      description:
        'Metadata belum bisa diambil dari browser. Jalankan di Vercel dengan /api/scrape-evidence untuk scraping server-side.',
      evidenceSignals: [],
      scraper: 'client-fallback',
    };
  } catch {
    return null;
  }
}
