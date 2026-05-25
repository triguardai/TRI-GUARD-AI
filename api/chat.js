const rateLimitStore = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

const systemInstruction =
  "Anda adalah asisten TriGuard AI. Jawab dengan bahasa Indonesia yang hangat, natural, dan jelas. Tetap singkat, tetapi terdengar seperti orang yang membantu, bukan template. Boleh memakai sapaan ringan seperlunya. Jelaskan bahwa sistem ini bisa melacak resi, membaca mutasi bank, menerima laporan rekening penipu, dan dipanggil lewat command seperti /rekber. Hindari bahasa yang terlalu kaku, terlalu teknis, atau berulang.";

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

const toGeminiHistory = (history = []) =>
  history
    .slice(-10)
    .filter((msg) => msg && typeof msg.text === "string")
    .map((msg) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.text.slice(0, 1200) }],
    }));

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const clientId = getClientId(req);
  if (isRateLimited(clientId)) {
    res.status(429).json({ error: "Terlalu banyak request. Coba lagi sebentar." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = process.env.GEMINI_API_URL;

  if (!apiKey || !apiUrl) {
    res.status(503).json({ error: "AI backend belum dikonfigurasi." });
    return;
  }

  const body = parseBody(req.body);
  const message = String(body.message || "").trim().slice(0, 1200);

  if (!message) {
    res.status(400).json({ error: "Pesan wajib diisi." });
    return;
  }

  const payload = {
    contents: [
      ...toGeminiHistory(body.history),
      { role: "user", parts: [{ text: message }] },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
  };

  const endpoint = apiUrl.includes("?") ? `${apiUrl}&key=${apiKey}` : `${apiUrl}?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Gemini request failed");
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    res.status(200).json({
      reply: reply || "Sistem AI sedang memuat ulang. Mohon coba lagi.",
    });
  } catch {
    res.status(502).json({ error: "AI backend sedang tidak tersedia." });
  }
}
