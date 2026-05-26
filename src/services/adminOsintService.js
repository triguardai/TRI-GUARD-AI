const CANDIDATES_ENDPOINT = '/api/osint-candidates';
const SEARCH_ENDPOINT = '/api/osint-search';
const MODERATE_ENDPOINT = '/api/osint-moderate';

const readJson = async (response, fallbackMessage) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }
  return data;
};

const authHeaders = (adminToken) => ({
  'Content-Type': 'application/json',
  ...(adminToken ? { 'X-Admin-Token': adminToken } : {}),
});

export async function fetchOsintCandidates({ adminToken, status = 'all' }) {
  const params = new URLSearchParams({ status });
  const response = await fetch(`${CANDIDATES_ENDPOINT}?${params.toString()}`, {
    headers: authHeaders(adminToken),
  });

  return readJson(response, 'Gagal mengambil kandidat OSINT.');
}

export async function runOsintHarvest({ adminToken, seed }) {
  const response = await fetch(SEARCH_ENDPOINT, {
    method: 'POST',
    headers: authHeaders(adminToken),
    body: JSON.stringify({
      mode: 'harvest',
      persist: true,
      seed,
      platform: 'Semua platform publik',
      fraudType: 'Transaksi segitiga',
    }),
  });

  return readJson(response, 'Gagal menjalankan OSINT search.');
}

export async function moderateCandidate({ adminToken, id, action, note }) {
  const response = await fetch(MODERATE_ENDPOINT, {
    method: 'POST',
    headers: authHeaders(adminToken),
    body: JSON.stringify({ id, action, note }),
  });

  return readJson(response, 'Gagal menyimpan keputusan moderasi.');
}
