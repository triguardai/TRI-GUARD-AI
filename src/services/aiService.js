import { buildFallbackReply } from "../utils/fallback";

export async function sendMessage(userText, history = []) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiUrl = import.meta.env.VITE_GEMINI_API_URL;

  if (!apiKey || !apiUrl) {
    await new Promise((r) => setTimeout(r, 700));
    return buildFallbackReply(userText);
  }

  try {
    const formattedHistory = history.map((msg) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    const payload = {
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: userText }] },
      ],
      systemInstruction: {
        parts: [
          {
            text: "Anda adalah asisten TriGuard AI. Jawab dengan bahasa Indonesia yang hangat, natural, dan jelas. Tetap singkat, tetapi terdengar seperti orang yang membantu, bukan template. Boleh memakai sapaan ringan seperlunya. Jelaskan bahwa sistem ini bisa melacak resi, membaca mutasi bank, dan dipanggil lewat command seperti /rekber. Hindari bahasa yang terlalu kaku, terlalu teknis, atau berulang.",
          },
        ],
      },
    };

    const endpoint = apiUrl.includes("?")
      ? `${apiUrl}&key=${apiKey}`
      : `${apiUrl}?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed request");
    }

    const data = await response.json();
    const modelReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return modelReply || "Sistem AI sedang memuat ulang. Mohon coba lagi.";
  } catch (e) {
    return buildFallbackReply(userText);
  }
}

export default { sendMessage };
