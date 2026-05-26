import { checkRateLimit, getClientId } from './utils/rate-limit.js';

const WINDOW_IN_SECS = 60;
const MAX_REQUESTS = 5;

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

const getBaseUrl = (req) => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://${req.headers.host || 'localhost:3000'}`;
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const clientId = getClientId(req);
  const rateLimit = await checkRateLimit(`preview_${clientId}`, MAX_REQUESTS, WINDOW_IN_SECS);
  if (!rateLimit.success) {
    res.status(429).json({ error: 'Terlalu banyak request preview. Coba lagi sebentar.' });
    return;
  }

  const body = parseBody(req.body);
  const url = body.url;

  if (!url) {
    res.status(400).json({ error: 'URL tidak valid.' });
    return;
  }

  const internalToken = process.env.INTERNAL_API_TOKEN;
  if (!internalToken) {
    res.status(500).json({ error: 'Server tidak dikonfigurasi untuk scraping.' });
    return;
  }

  try {
    const response = await fetch(`${getBaseUrl(req)}/api/scrape-evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': internalToken,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      res.status(response.status).json({ error: data.error || 'Gagal mengambil metadata URL.' });
      return;
    }

    const data = await response.json();

    // Return minimal data for public preview
    res.status(200).json({
      url: data.url,
      sourceUrl: data.sourceUrl,
      sourceHost: data.sourceHost,
      title: data.title,
      description: data.description,
      image: data.image,
      evidenceSignals: data.evidenceSignals,
      scraper: 'proxy',
    });
  } catch (error) {
    console.error('Scrape proxy error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan internal saat mengambil preview.' });
  }
}
